"""Member verification workflow: request -> leader approves -> member verified.
Routed to the church where the member was baptized (or their current church)."""
import datetime
import uuid

import sqlalchemy as sa
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.authz import MANAGE_MEMBERS, ROLE_CAPS
from app.models import Assignment, Member, OrgUnit, VerificationRequest


class VerificationError(ValueError):
    """Raised for missing members, duplicate open requests, or bad transitions."""


async def routing_path(session: AsyncSession, req: VerificationRequest) -> str:
    """The org-unit path this request is routed to (baptism church, else the member's
    current church, else tenant-wide '/')."""
    unit_id = req.baptized_at_unit_id
    if unit_id is None:
        member = await session.get(Member, req.member_id)
        unit_id = member.org_unit_id if member else None
    if unit_id is None:
        return "/"
    unit = await session.get(OrgUnit, unit_id)
    return unit.path if unit else "/"


async def leaders_for_path(session: AsyncSession, path: str) -> list[uuid.UUID]:
    """User ids of active leaders whose scope covers `path` and whose role can manage
    members (i.e. can verify)."""
    roles = [r for r, caps in ROLE_CAPS.items() if MANAGE_MEMBERS in caps]
    rows = (
        await session.execute(
            select(Assignment.user_id).where(
                Assignment.active.is_(True),
                Assignment.role_key.in_(roles),
                sa.literal(path).like(Assignment.scope_path.concat("%")),
            )
        )
    ).scalars().all()
    return list(dict.fromkeys(rows))


async def create_request(
    session: AsyncSession,
    *,
    tenant_id: str,
    member_id: str,
    baptized_at_unit_id: str | None = None,
    never_baptized: bool = False,
    note: str | None = None,
) -> VerificationRequest:
    member = await session.get(Member, uuid.UUID(str(member_id)))
    if member is None:
        raise VerificationError("Member not found")
    existing = (
        await session.execute(
            select(VerificationRequest).where(
                VerificationRequest.member_id == member.id,
                VerificationRequest.status == "pending",
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise VerificationError("A verification request is already pending")

    req = VerificationRequest(
        tenant_id=tenant_id,
        member_id=member.id,
        baptized_at_unit_id=uuid.UUID(baptized_at_unit_id) if baptized_at_unit_id else None,
        never_baptized=never_baptized,
        note=note,
        status="pending",
    )
    session.add(req)
    await session.flush()
    member.verification_status = "pending"
    return req


async def decide(session: AsyncSession, request_id: str, *, by: str, approve: bool) -> VerificationRequest:
    req = await session.get(VerificationRequest, uuid.UUID(str(request_id)))
    if req is None:
        raise VerificationError("Request not found")
    if req.status != "pending":
        raise VerificationError(f"Request already {req.status}")
    member = await session.get(Member, req.member_id)
    req.status = "approved" if approve else "rejected"
    req.decided_by = uuid.UUID(str(by)) if by else None
    req.decided_at = datetime.datetime.now(datetime.timezone.utc)
    if member:
        member.verification_status = "verified" if approve else "unverified"
    await session.flush()
    return req
