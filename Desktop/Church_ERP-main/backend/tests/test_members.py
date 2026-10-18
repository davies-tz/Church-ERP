"""Member registration: rich fields, the org-unit tie, and scoped creation via
the manage_members capability."""
import datetime

from sqlalchemy import select

from app.core.db import tenant_session
from app.domain import authz
from app.domain.members import create_member
from app.domain.structure import create_org_unit
from app.domain.templates import seed_levels
from app.models import Member


async def test_create_member_with_full_profile(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await seed_levels(s, tenant_a, "blank")
        church = await create_org_unit(
            s, tenant_id=tenant_a, level_key="church", name="Test Church"
        )
        m = await create_member(
            s, tenant_id=tenant_a, full_name="Grace Mushi", gender="Female",
            dob=datetime.date(1990, 4, 2), occupation="Teacher",
            phone="0712 000 999", region="Arusha", org_unit_id=church.id,
        )
    async with tenant_session(tenant_a) as s:
        got = (
            await s.execute(select(Member).where(Member.id == m.id))
        ).scalar_one()
        assert got.member_no.startswith("MEM-")  # auto-numbered per tenant
        assert got.occupation == "Teacher"
        assert got.dob == datetime.date(1990, 4, 2)
        assert got.org_unit_id == church.id


def test_scoped_member_capability():
    # a secretary scoped to a parish can register under that parish, not above it
    parish_scope = "/root/diocese/parish/"
    grants = [authz.Grant("secretary", parish_scope, authz.role_capabilities("secretary"))]
    community_path = "/root/diocese/parish/community/"
    diocese_path = "/root/diocese/"
    assert authz.can(grants, authz.MANAGE_MEMBERS, community_path) is True
    assert authz.can(grants, authz.MANAGE_MEMBERS, diocese_path) is False
    # with no unit (target None), any manage_members grant qualifies
    assert authz.can(grants, authz.MANAGE_MEMBERS) is True
