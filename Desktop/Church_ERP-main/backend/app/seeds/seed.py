"""Seed two demo churches with distinct branding, an admin each, and some members.
Idempotent: safe to run repeatedly (skips tenants that already exist)."""
import asyncio
import datetime

from sqlalchemy import select

from app.core.db import SessionLocal, engine, tenant_session
from app.core.security import hash_password
from app.domain.assets import add_maintenance, create_asset, create_inventory_item
from app.domain.authz import create_assignment
from app.domain.finance import approve_entry, create_entry
from app.domain.notifications import notify
from app.domain.sacraments import record_sacrament
from app.domain.service_requests import create_service_request
from app.domain.structure import create_org_unit
from app.domain.templates import seed_levels
from app.models import Member, Tenant, TenantBranding, User

DEMO = [
    {
        "slug": "grace",
        "name": "Grace Community Church",
        "branding": {
            "display_name": "Grace Community Church",
            "tagline": "One family in Christ",
            "color_primary": "#6d28d9",
            "color_secondary": "#4c1d95",
            "color_accent": "#f59e0b",
            "default_locale": "en",
        },
        "template": "blank",
        # (level_key, name, parent_ref) — parent_ref indexes an earlier unit in this list
        "units": [
            ("church", "Grace Community Church", None),
            ("group", "Youth Group", 0),
            ("group", "Choir", 0),
        ],
        # (email, name, role_key, unit_ref | None) — scoped staff besides the admin
        "staff": [
            ("treasurer@grace.local", "Grace Treasurer", "treasurer", 0),
        ],
        "member_unit": 0,  # members belong to the church unit
        # (type, name, value, condition, reg_no, unit_index)
        "demo_assets": [
            ("building", "Grace Auditorium", 120000000, "good", None, 0),
            ("equipment", "Sound System", 8000000, "good", None, 0),
        ],
        # (name, quantity, unit, reorder_level)
        "demo_inventory": [
            ("Plastic chairs", 150, "pcs", 30),
            ("Projectors", 1, "pcs", 1),
        ],
        # (category, amount, member_index | None, approved) — recorded by treasurer
        "demo_finance": [
            ("offering", 480000, None, True),
            ("tithe", 300000, 0, True),
            ("utilities", 120000, None, True),
            ("offering", 250000, None, False),  # awaits approval
        ],
        "members": [("Emanuel Thomas", "Male", "0712 000 111"),
                    ("Sarah John", "Female", "0712 000 222")],
        # (member_index, type, iso_date, minister) — shows the master-record flow
        "demo_sacraments": [
            (0, "baptism", "2015-03-15", "Rev. John Paul"),
            (0, "first_communion", "2021-05-09", "Rev. John Paul"),
            (0, "confirmation", "2022-06-12", "Bishop Andrew"),
        ],
        # (member_index, service_type, iso_date) — a pending request to work through
        "demo_requests": [
            (0, "marriage", "2025-08-16"),
        ],
    },
    {
        "slug": "stmarks",
        "name": "St. Mark's Parish",
        "branding": {
            "display_name": "St. Mark's Parish",
            "tagline": "Huduma kwa utaratibu",
            "color_primary": "#047857",
            "color_secondary": "#064e3b",
            "color_accent": "#ca8a04",
            "default_locale": "sw",
        },
        "template": "catholic",
        "units": [
            ("archdiocese", "Archdiocese of Dar es Salaam", None),
            ("diocese", "Diocese of Moshi", 0),
            ("deanery", "Moshi Central Deanery", 1),
            ("parish", "St. Mark's Parish", 2),
        ],
        "staff": [
            ("secretary@stmarks.local", "Parish Secretary", "secretary", 3),
        ],
        "member_unit": 3,  # members belong to the parish
        "demo_assets": [
            ("building", "St. Mark's Cathedral", 250000000, "good", "TB-2019-0456", 3),
            ("land", "Parish Plot (2.5 acres)", 90000000, "good", "DEED-DSM-1122", 3),
            ("vehicle", "Toyota Hiace (Parish bus)", 45000000, "fair", "T123 ABC", 3),
        ],
        # (asset_index, iso_date, action, cost)
        "demo_maintenance": [
            (2, "2026-05-10", "Engine service & new tyres", 350000),
        ],
        "demo_inventory": [
            ("Plastic chairs", 200, "pcs", 50),
            ("PA system", 2, "sets", 1),
            ("Communion wafers", 30, "boxes", 40),
        ],
        "members": [("Neema Joseph", "Female", "0712 000 333")],
    },
]


async def seed() -> None:
    for spec in DEMO:
        async with SessionLocal() as session:
            async with session.begin():
                existing = (
                    await session.execute(
                        select(Tenant).where(Tenant.slug == spec["slug"])
                    )
                ).scalar_one_or_none()
                if existing:
                    print(f"· tenant '{spec['slug']}' already seeded, skipping")
                    continue
                tenant = Tenant(slug=spec["slug"], name=spec["name"])
                tenant.branding = TenantBranding(**spec["branding"])
                session.add(tenant)
                await session.flush()
                tenant_id = str(tenant.id)

        # users, hierarchy, assignments + members are RLS-protected: set tenant context.
        async with tenant_session(tenant_id) as tsession:
            admin = User(
                tenant_id=tenant_id,
                email=f"admin@{spec['slug']}.local",
                password_hash=hash_password("password"),
                name=f"{spec['name']} Admin",
                role="tenant_admin",
            )
            tsession.add(admin)
            await tsession.flush()  # need admin.id for the assignment
            await notify(
                tsession, tenant_id=tenant_id, user_id=str(admin.id),
                title=f"Welcome to {spec['name']}",
                body="Your church ERP workspace is ready.",
                category="info", link="dashboard",
            )

            # hierarchy: level types from template, then the sample tree
            await seed_levels(tsession, tenant_id, spec["template"])
            created: list = []
            for level_key, name, parent_ref in spec["units"]:
                parent_id = str(created[parent_ref].id) if parent_ref is not None else None
                unit = await create_org_unit(
                    tsession,
                    tenant_id=tenant_id,
                    level_key=level_key,
                    name=name,
                    parent_id=parent_id,
                )
                created.append(unit)

            # RBAC: admin holds tenant_admin over the whole tenant (scope "/").
            await create_assignment(
                tsession, tenant_id=tenant_id, user_id=str(admin.id),
                role_key="tenant_admin", org_unit=None,
            )

            # scoped staff: each gets a role at a specific unit.
            staff_by_role: dict = {}
            for email, name, role_key, unit_ref in spec.get("staff", []):
                staff = User(
                    tenant_id=tenant_id,
                    email=email,
                    password_hash=hash_password("password"),
                    name=name,
                    role=role_key,
                )
                tsession.add(staff)
                await tsession.flush()
                staff_by_role[role_key] = staff
                await create_assignment(
                    tsession, tenant_id=tenant_id, user_id=str(staff.id),
                    role_key=role_key, org_unit=created[unit_ref],
                )

            member_unit_idx = spec.get("member_unit")
            member_unit_id = created[member_unit_idx].id if member_unit_idx is not None else None
            member_objs: list[Member] = []
            for i, (name, gender, phone) in enumerate(spec["members"], start=1):
                m = Member(
                    tenant_id=tenant_id,
                    member_no=f"MEM-{i:04d}",
                    full_name=name,
                    gender=gender,
                    phone=phone,
                    org_unit_id=member_unit_id,
                    region="Dar es Salaam",
                    verification_status="verified",
                )
                tsession.add(m)
                member_objs.append(m)
            await tsession.flush()  # need member ids for sacraments

            for mi, stype, sdate, minister in spec.get("demo_sacraments", []):
                await record_sacrament(
                    tsession, tenant_id=tenant_id,
                    member_id=str(member_objs[mi].id), type=stype,
                    date=datetime.date.fromisoformat(sdate), minister_name=minister,
                )

            for mi, stype, sdate in spec.get("demo_requests", []):
                await create_service_request(
                    tsession, tenant_id=tenant_id,
                    member_id=str(member_objs[mi].id), type=stype,
                    requested_by=str(admin.id),
                    scheduled_date=datetime.date.fromisoformat(sdate),
                )

            # finance: treasurer records, admin approves (maker-checker).
            treasurer = staff_by_role.get("treasurer")
            recorder = treasurer or admin
            for category, amount, mi, do_approve in spec.get("demo_finance", []):
                entry = await create_entry(
                    tsession, tenant_id=tenant_id, category=category, amount=amount,
                    method="cash", recorded_by=str(recorder.id),
                    member_id=str(member_objs[mi].id) if mi is not None else None,
                    date=datetime.date(2026, 7, 10),
                )
                if do_approve:
                    await approve_entry(tsession, str(entry.id), approver_id=str(admin.id))

            # assets + maintenance + inventory (diocese-wide register)
            asset_objs: list = []
            for atype, aname, aval, acond, areg, unit_idx in spec.get("demo_assets", []):
                a = await create_asset(
                    tsession, tenant_id=tenant_id, type=atype, name=aname, value=aval,
                    condition=acond, reg_no=areg,
                    org_unit_id=str(created[unit_idx].id) if unit_idx is not None else None,
                )
                asset_objs.append(a)
            for ai, mdate, action, cost in spec.get("demo_maintenance", []):
                await add_maintenance(
                    tsession, tenant_id=tenant_id, asset_id=str(asset_objs[ai].id),
                    date=datetime.date.fromisoformat(mdate), action=action, cost=cost,
                    recorded_by=str(admin.id),
                )
            inv_unit = created[member_unit_idx].id if member_unit_idx is not None else None
            for iname, qty, iunit, reorder in spec.get("demo_inventory", []):
                await create_inventory_item(
                    tsession, tenant_id=tenant_id, name=iname, quantity=qty,
                    unit=iunit, reorder_level=reorder,
                    org_unit_id=str(inv_unit) if inv_unit else None,
                )
        print(f"✓ seeded '{spec['slug']}' ({spec['name']}) — "
              f"{spec['template']} template, {len(spec['units'])} units, "
              f"{1 + len(spec.get('staff', []))} users")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
