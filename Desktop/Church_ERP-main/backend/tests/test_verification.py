"""Member verification workflow: request -> pending -> approve/reject."""
import pytest
from sqlalchemy import select

from app.core.db import tenant_session
from app.domain.members import create_member
from app.domain.structure import create_org_unit
from app.domain.templates import seed_levels
from app.domain.verification import (
    VerificationError,
    create_request,
    decide,
    routing_path,
)
from app.models import Member, User


async def _member_with_login(session, tenant_id, church):
    user = User(tenant_id=tenant_id, email="v@x.local", password_hash="x",
                name="Vee", role="member")
    session.add(user)
    await session.flush()
    return await create_member(
        session, tenant_id=tenant_id, full_name="Vee", org_unit_id=church.id,
        user_id=user.id, verification_status="unverified",
    )


async def test_request_sets_pending_and_routes(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await seed_levels(s, tenant_a, "blank")
        church = await create_org_unit(s, tenant_id=tenant_a, level_key="church", name="C")
        member = await _member_with_login(s, tenant_a, church)
        req = await create_request(
            s, tenant_id=tenant_a, member_id=str(member.id),
            baptized_at_unit_id=str(church.id),
        )
        assert req.status == "pending"
        assert await routing_path(s, req) == church.path
    async with tenant_session(tenant_a) as s:
        m = (await s.execute(select(Member).where(Member.id == member.id))).scalar_one()
        assert m.verification_status == "pending"


async def test_duplicate_request_rejected(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await seed_levels(s, tenant_a, "blank")
        church = await create_org_unit(s, tenant_id=tenant_a, level_key="church", name="C")
        member = await _member_with_login(s, tenant_a, church)
        await create_request(s, tenant_id=tenant_a, member_id=str(member.id))
        with pytest.raises(VerificationError):
            await create_request(s, tenant_id=tenant_a, member_id=str(member.id))


async def test_approve_verifies_reject_unverifies(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await seed_levels(s, tenant_a, "blank")
        church = await create_org_unit(s, tenant_id=tenant_a, level_key="church", name="C")
        member = await _member_with_login(s, tenant_a, church)
        req = await create_request(s, tenant_id=tenant_a, member_id=str(member.id))
        await decide(s, str(req.id), by=None, approve=True)
    async with tenant_session(tenant_a) as s:
        m = (await s.execute(select(Member).where(Member.id == member.id))).scalar_one()
        assert m.verification_status == "verified"
        # a second decide on the resolved request fails
        with pytest.raises(VerificationError):
            await decide(s, str(req.id), by=None, approve=False)
