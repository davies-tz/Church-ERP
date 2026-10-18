"""Member transfer workflow: request -> source approves (issues letter) ->
destination approves -> member's org unit moves. Sacramental history is untouched."""
import pytest
from sqlalchemy import select

from app.core.db import tenant_session
from app.domain.members import create_member
from app.domain.structure import create_org_unit
from app.domain.templates import seed_levels
from app.domain.transfers import (
    TransferError,
    approve_destination,
    approve_source,
    create_request,
    reject_source,
    unit_path,
)
from app.models import Member, User


async def _member_with_login(session, tenant_id, church, email="m@x.local"):
    user = User(tenant_id=tenant_id, email=email, password_hash="x",
                name="Mover", role="member")
    session.add(user)
    await session.flush()
    return await create_member(
        session, tenant_id=tenant_id, full_name="Mover", org_unit_id=church.id,
        user_id=user.id, verification_status="verified",
    )


async def test_request_snapshots_from_unit(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await seed_levels(s, tenant_a, "blank")
        old_church = await create_org_unit(s, tenant_id=tenant_a, level_key="church", name="Old")
        new_church = await create_org_unit(s, tenant_id=tenant_a, level_key="church", name="New")
        member = await _member_with_login(s, tenant_a, old_church)
        req = await create_request(
            s, tenant_id=tenant_a, member_id=str(member.id), to_unit_id=str(new_church.id),
        )
        assert req.status == "pending_source"
        assert str(req.from_unit_id) == str(old_church.id)
        assert await unit_path(s, req.from_unit_id) == old_church.path


async def test_duplicate_open_request_rejected(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await seed_levels(s, tenant_a, "blank")
        old_church = await create_org_unit(s, tenant_id=tenant_a, level_key="church", name="Old")
        new_church = await create_org_unit(s, tenant_id=tenant_a, level_key="church", name="New")
        member = await _member_with_login(s, tenant_a, old_church)
        await create_request(s, tenant_id=tenant_a, member_id=str(member.id), to_unit_id=str(new_church.id))
        with pytest.raises(TransferError):
            await create_request(s, tenant_id=tenant_a, member_id=str(member.id), to_unit_id=str(new_church.id))


async def test_cannot_transfer_to_same_church(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await seed_levels(s, tenant_a, "blank")
        church = await create_org_unit(s, tenant_id=tenant_a, level_key="church", name="C")
        member = await _member_with_login(s, tenant_a, church)
        with pytest.raises(TransferError):
            await create_request(s, tenant_id=tenant_a, member_id=str(member.id), to_unit_id=str(church.id))


async def test_full_approval_moves_member_org_unit(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await seed_levels(s, tenant_a, "blank")
        old_church = await create_org_unit(s, tenant_id=tenant_a, level_key="church", name="Old")
        new_church = await create_org_unit(s, tenant_id=tenant_a, level_key="church", name="New")
        member = await _member_with_login(s, tenant_a, old_church)
        req = await create_request(
            s, tenant_id=tenant_a, member_id=str(member.id), to_unit_id=str(new_church.id),
        )
        req = await approve_source(s, str(req.id), by=None, letter_key="k/letter.pdf")
        assert req.status == "pending_destination"
        assert req.letter_key == "k/letter.pdf"
        req = await approve_destination(s, str(req.id), by=None)
        assert req.status == "approved"

    async with tenant_session(tenant_a) as s:
        m = (await s.execute(select(Member).where(Member.id == member.id))).scalar_one()
        assert str(m.org_unit_id) == str(new_church.id)


async def test_source_rejection_stops_the_flow(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await seed_levels(s, tenant_a, "blank")
        old_church = await create_org_unit(s, tenant_id=tenant_a, level_key="church", name="Old")
        new_church = await create_org_unit(s, tenant_id=tenant_a, level_key="church", name="New")
        member = await _member_with_login(s, tenant_a, old_church)
        req = await create_request(
            s, tenant_id=tenant_a, member_id=str(member.id), to_unit_id=str(new_church.id),
        )
        req = await reject_source(s, str(req.id), by=None)
        assert req.status == "rejected"
        with pytest.raises(TransferError):
            await approve_destination(s, str(req.id), by=None)

    async with tenant_session(tenant_a) as s:
        m = (await s.execute(select(Member).where(Member.id == member.id))).scalar_one()
        assert str(m.org_unit_id) == str(old_church.id)


async def test_cannot_approve_destination_before_source(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await seed_levels(s, tenant_a, "blank")
        old_church = await create_org_unit(s, tenant_id=tenant_a, level_key="church", name="Old")
        new_church = await create_org_unit(s, tenant_id=tenant_a, level_key="church", name="New")
        member = await _member_with_login(s, tenant_a, old_church)
        req = await create_request(
            s, tenant_id=tenant_a, member_id=str(member.id), to_unit_id=str(new_church.id),
        )
        with pytest.raises(TransferError):
            await approve_destination(s, str(req.id), by=None)
