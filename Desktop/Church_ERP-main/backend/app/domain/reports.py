"""Reports & dashboards: cross-module consolidated roll-ups (the diocesan executive
view) and CSV exports. All queries are RLS-scoped to the current tenant."""
import csv
import io

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain import assets as assets_domain
from app.domain import finance as finance_domain
from app.domain.finance import CATEGORIES
from app.domain.sacraments import SACRAMENT_TYPES
from app.models import (
    FinanceEntry,
    Member,
    OrgUnit,
    SacramentalRecord,
    ServiceRequest,
    User,
)


async def dashboard(session: AsyncSession) -> dict:
    members_total = (await session.execute(select(func.count(Member.id)))).scalar_one()
    units_total = (await session.execute(select(func.count(OrgUnit.id)))).scalar_one()
    requests_pending = (
        await session.execute(
            select(func.count(ServiceRequest.id)).where(
                ServiceRequest.status == "pending"
            )
        )
    ).scalar_one()

    # sacraments by type
    sac_rows = (
        await session.execute(
            select(SacramentalRecord.type, func.count(SacramentalRecord.id))
            .group_by(SacramentalRecord.type)
        )
    ).all()
    sacraments_by_type = [
        {
            "key": t,
            "label_en": SACRAMENT_TYPES.get(t, (t, t))[0],
            "label_sw": SACRAMENT_TYPES.get(t, (t, t))[1],
            "count": int(c),
        }
        for t, c in sac_rows
    ]

    # members by unit (outer join so unassigned members are counted)
    mu_rows = (
        await session.execute(
            select(OrgUnit.name, func.count(Member.id))
            .select_from(Member)
            .join(OrgUnit, Member.org_unit_id == OrgUnit.id, isouter=True)
            .group_by(OrgUnit.name)
        )
    ).all()
    members_by_unit = [
        {"name": name or "Unassigned", "count": int(c)} for name, c in mu_rows
    ]
    members_by_unit.sort(key=lambda x: x["count"], reverse=True)

    # approved finance by category
    fc_rows = (
        await session.execute(
            select(
                FinanceEntry.category,
                FinanceEntry.direction,
                func.coalesce(func.sum(FinanceEntry.amount), 0),
            )
            .where(FinanceEntry.approval_status == "approved")
            .group_by(FinanceEntry.category, FinanceEntry.direction)
        )
    ).all()
    finance_by_category = [
        {
            "category": cat,
            "label_en": CATEGORIES.get(cat, (cat, cat, direction))[0],
            "label_sw": CATEGORIES.get(cat, (cat, cat, direction))[1],
            "direction": direction,
            "total": float(total),
        }
        for cat, direction, total in fc_rows
    ]
    finance_by_category.sort(key=lambda x: x["total"], reverse=True)

    return {
        "members_total": int(members_total),
        "units_total": int(units_total),
        "requests_pending": int(requests_pending),
        "finance": await finance_domain.summary(session),
        "assets": await assets_domain.summary(session),
        "sacraments_by_type": sacraments_by_type,
        "members_by_unit": members_by_unit,
        "finance_by_category": finance_by_category,
    }


async def _unit_names(session) -> dict:
    return {
        u.id: u.name for u in (await session.execute(select(OrgUnit))).scalars()
    }


async def _member_names(session) -> dict:
    return {
        m.id: m.full_name for m in (await session.execute(select(Member))).scalars()
    }


async def _user_names(session) -> dict:
    return {u.id: u.name for u in (await session.execute(select(User))).scalars()}


def _csv(header: list[str], rows: list[list]) -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(header)
    w.writerows(rows)
    return buf.getvalue()


async def members_csv(session: AsyncSession) -> str:
    units = await _unit_names(session)
    members = (
        await session.execute(select(Member).order_by(Member.member_no))
    ).scalars().all()
    rows = [
        [
            m.member_no, m.full_name, m.gender or "", m.dob or "", m.phone or "",
            m.email or "", m.region or "",
            units.get(m.org_unit_id, "") if m.org_unit_id else "",
        ]
        for m in members
    ]
    return _csv(
        ["member_no", "full_name", "gender", "dob", "phone", "email", "region", "unit"],
        rows,
    )


async def finance_csv(session: AsyncSession) -> str:
    members = await _member_names(session)
    users = await _user_names(session)
    entries = (
        await session.execute(select(FinanceEntry).order_by(FinanceEntry.date))
    ).scalars().all()
    rows = [
        [
            e.date, e.category, e.direction, float(e.amount), e.currency,
            e.approval_status, e.method or "",
            members.get(e.member_id, "") if e.member_id else "",
            users.get(e.recorded_by, "") if e.recorded_by else "",
        ]
        for e in entries
    ]
    return _csv(
        ["date", "category", "direction", "amount", "currency", "status", "method",
         "member", "recorded_by"],
        rows,
    )


async def sacraments_csv(session: AsyncSession) -> str:
    members = await _member_names(session)
    units = await _unit_names(session)
    recs = (
        await session.execute(select(SacramentalRecord).order_by(SacramentalRecord.date))
    ).scalars().all()
    rows = [
        [
            members.get(r.member_id, ""), r.type, r.date, r.minister_name or "",
            r.register_book or "", r.register_page or "",
            units.get(r.org_unit_id, "") if r.org_unit_id else "",
        ]
        for r in recs
    ]
    return _csv(
        ["member", "type", "date", "minister", "register_book", "register_page", "place"],
        rows,
    )
