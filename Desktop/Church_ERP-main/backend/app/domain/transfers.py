"""Member transfer workflow: request -> source church approves (issuing a
transfer-out letter) -> destination church approves -> the member's org unit moves.
Sacramental history stays tied to the member record, untouched, throughout."""
import datetime
import uuid

import sqlalchemy as sa
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.authz import MANAGE_MEMBERS, ROLE_CAPS
from app.models import Assignment, Member, OrgUnit, TransferRequest

OPEN_STATUSES = ("pending_source", "pending_destination")


class TransferError(ValueError):
    """Raised for missing records, duplicate open requests, or bad transitions."""


def _leader_roles() -> list[str]:
    return [r for r, caps in ROLE_CAPS.items() if MANAGE_MEMBERS in caps]


async def leaders_for_path(session: AsyncSession, path: str) -> list[uuid.UUID]:
    """User ids of active leaders whose scope covers `path` and can manage members."""
    rows = (
        await session.execute(
            select(Assignment.user_id).where(
                Assignment.active.is_(True),
                Assignment.role_key.in_(_leader_roles()),
                sa.literal(path).like(Assignment.scope_path.concat("%")),
            )
        )
    ).scalars().all()
    return list(dict.fromkeys(rows))


async def unit_path(session: AsyncSession, unit_id) -> str:
    if unit_id is None:
        return "/"
    unit = await session.get(OrgUnit, unit_id)
    return unit.path if unit else "/"


async def create_request(
    session: AsyncSession,
    *,
    tenant_id: str,
    member_id: str,
    to_unit_id: str,
    reason: str | None = None,
) -> TransferRequest:
    member = await session.get(Member, uuid.UUID(str(member_id)))
    if member is None:
        raise TransferError("Member not found")
    to_unit = await session.get(OrgUnit, uuid.UUID(str(to_unit_id)))
    if to_unit is None:
        raise TransferError("Destination church not found")
    if member.org_unit_id and str(member.org_unit_id) == str(to_unit.id):
        raise TransferError("Member is already at that church")
    existing = (
        await session.execute(
            select(TransferRequest).where(
                TransferRequest.member_id == member.id,
                TransferRequest.status.in_(OPEN_STATUSES),
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise TransferError("A transfer request is already in progress")

    req = TransferRequest(
        tenant_id=tenant_id,
        member_id=member.id,
        from_unit_id=member.org_unit_id,
        to_unit_id=to_unit.id,
        reason=reason,
        status="pending_source",
    )
    session.add(req)
    await session.flush()
    return req


async def approve_source(
    session: AsyncSession, request_id: str, *, by: str, letter_key: str
) -> TransferRequest:
    req = await session.get(TransferRequest, uuid.UUID(str(request_id)))
    if req is None:
        raise TransferError("Request not found")
    if req.status != "pending_source":
        raise TransferError(f"Request is not awaiting source approval (status: {req.status})")
    req.status = "pending_destination"
    req.source_decided_by = uuid.UUID(str(by)) if by else None
    req.source_decided_at = datetime.datetime.now(datetime.timezone.utc)
    req.letter_key = letter_key
    await session.flush()
    return req


async def reject_source(session: AsyncSession, request_id: str, *, by: str) -> TransferRequest:
    req = await session.get(TransferRequest, uuid.UUID(str(request_id)))
    if req is None:
        raise TransferError("Request not found")
    if req.status != "pending_source":
        raise TransferError(f"Request is not awaiting source approval (status: {req.status})")
    req.status = "rejected"
    req.source_decided_by = uuid.UUID(str(by)) if by else None
    req.source_decided_at = datetime.datetime.now(datetime.timezone.utc)
    await session.flush()
    return req


async def approve_destination(session: AsyncSession, request_id: str, *, by: str) -> TransferRequest:
    req = await session.get(TransferRequest, uuid.UUID(str(request_id)))
    if req is None:
        raise TransferError("Request not found")
    if req.status != "pending_destination":
        raise TransferError(f"Request is not awaiting destination approval (status: {req.status})")
    member = await session.get(Member, req.member_id)
    if member:
        member.org_unit_id = req.to_unit_id
    req.status = "approved"
    req.destination_decided_by = uuid.UUID(str(by)) if by else None
    req.destination_decided_at = datetime.datetime.now(datetime.timezone.utc)
    await session.flush()
    return req


async def reject_destination(session: AsyncSession, request_id: str, *, by: str) -> TransferRequest:
    req = await session.get(TransferRequest, uuid.UUID(str(request_id)))
    if req is None:
        raise TransferError("Request not found")
    if req.status != "pending_destination":
        raise TransferError(f"Request is not awaiting destination approval (status: {req.status})")
    req.status = "rejected"
    req.destination_decided_by = uuid.UUID(str(by)) if by else None
    req.destination_decided_at = datetime.datetime.now(datetime.timezone.utc)
    await session.flush()
    return req
