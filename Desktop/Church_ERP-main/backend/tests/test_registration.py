"""Public member self-registration: creates a linked User + Member (unverified)."""
import uuid

from sqlalchemy import select

from app.core.db import tenant_session
from app.domain.members import create_member
from app.domain.structure import create_org_unit
from app.domain.templates import seed_levels
from app.models import Member, User


async def test_self_registration_creates_linked_member(two_tenants):
    """Mirrors the register endpoint's core: user + linked unverified member."""
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await seed_levels(s, tenant_a, "blank")
        church = await create_org_unit(
            s, tenant_id=tenant_a, level_key="church", name="New Life"
        )
        user = User(tenant_id=tenant_a, email="joe@example.org",
                    password_hash="x", name="Joe Member", role="member")
        s.add(user)
        await s.flush()
        member = await create_member(
            s, tenant_id=tenant_a, full_name="Joe Member", email="joe@example.org",
            org_unit_id=church.id, user_id=user.id, verification_status="unverified",
        )

    async with tenant_session(tenant_a) as s:
        got = (
            await s.execute(select(Member).where(Member.user_id == user.id))
        ).scalar_one()
        assert got.id == member.id
        assert got.verification_status == "unverified"
        assert got.org_unit_id == church.id
        # the user is linked back
        linked = (
            await s.execute(select(User).where(User.id == got.user_id))
        ).scalar_one()
        assert linked.role == "member"
