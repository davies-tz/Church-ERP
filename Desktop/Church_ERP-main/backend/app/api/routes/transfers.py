import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import select

from app.api.deps import get_scoped_session
from app.core import storage
from app.domain import authz, notifications
from app.domain.certificates import render_transfer_letter
from app.domain.transfers import (
    OPEN_STATUSES,
    TransferError,
    approve_destination,
    approve_source,
    create_request,
    leaders_for_path,
    reject_destination,
    reject_source,
    unit_path,
)
from app.models import Member, OrgUnit, TenantBranding, TransferRequest
from app.schemas.transfer import MyTransfer, TransferCreate, TransferResponse

router = APIRouter(prefix="/transfers", tags=["transfers"])


async def _my_member(session, user) -> Member:
    member = (
        await session.execute(select(Member).where(Member.user_id == user.id))
    ).scalar_one_or_none()
    if member is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You are not a member")
    return member


async def _get_request(session, request_id: str) -> TransferRequest:
    try:
        req = await session.get(TransferRequest, uuid.UUID(request_id))
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid request id")
    if req is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    return req


async def _to_response(session, req: TransferRequest) -> TransferResponse:
    member = await session.get(Member, req.member_id)
    from_unit = await session.get(OrgUnit, req.from_unit_id) if req.from_unit_id else None
    to_unit = await session.get(OrgUnit, req.to_unit_id)
    return TransferResponse(
        id=str(req.id),
        member_id=str(req.member_id),
        member_name=member.full_name if member else "—",
        from_unit_id=str(req.from_unit_id) if req.from_unit_id else None,
        from_unit_name=from_unit.name if from_unit else None,
        to_unit_id=str(req.to_unit_id),
        to_unit_name=to_unit.name if to_unit else "—",
        reason=req.reason,
        status=req.status,
        has_letter=bool(req.letter_key),
        created_at=req.created_at,
    )


async def _can_act(session, user, req: TransferRequest) -> bool:
    grants = await authz.load_grants(session, user.id)
    if req.status == "pending_source":
        path = await unit_path(session, req.from_unit_id)
    elif req.status == "pending_destination":
        path = await unit_path(session, req.to_unit_id)
    else:
        return False
    return authz.can(grants, authz.MANAGE_MEMBERS, path)


@router.get("/mine", response_model=MyTransfer)
async def my_transfer(ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    member = await _my_member(session, user)
    req = (
        await session.execute(
            select(TransferRequest)
            .where(TransferRequest.member_id == member.id)
            .order_by(TransferRequest.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    return MyTransfer(request=await _to_response(session, req) if req else None)


@router.post("", response_model=TransferResponse, status_code=201)
async def request_transfer(body: TransferCreate, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    member = await _my_member(session, user)
    try:
        req = await create_request(
            session,
            tenant_id=str(user.tenant_id),
            member_id=str(member.id),
            to_unit_id=body.to_unit_id,
            reason=body.reason,
        )
    except TransferError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    path = await unit_path(session, req.from_unit_id)
    for uid in await leaders_for_path(session, path):
        await notifications.notify(
            session, tenant_id=str(user.tenant_id), user_id=str(uid),
            title="Member transfer request",
            body=f"{member.full_name} requested to transfer out.",
            category="transfer", link="transfers",
        )
    return await _to_response(session, req)


@router.get("", response_model=list[TransferResponse])
async def leader_queue(ctx: tuple = Depends(get_scoped_session)):
    """Requests this leader may act on: pending_source scoped to the source church, or
    pending_destination scoped to the destination church."""
    session, user = ctx
    grants = await authz.load_grants(session, user.id)
    rows = (
        await session.execute(
            select(TransferRequest)
            .where(TransferRequest.status.in_(OPEN_STATUSES))
            .order_by(TransferRequest.created_at.desc())
        )
    ).scalars().all()
    out = []
    for req in rows:
        target_unit = req.from_unit_id if req.status == "pending_source" else req.to_unit_id
        path = await unit_path(session, target_unit)
        if authz.can(grants, authz.MANAGE_MEMBERS, path):
            out.append(await _to_response(session, req))
    return out


@router.post("/{request_id}/approve-source", response_model=TransferResponse)
async def approve_source_route(request_id: str, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    req = await _get_request(session, request_id)
    if not await _can_act(session, user, req):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot act on this request")

    member = await session.get(Member, req.member_id)
    from_unit = await session.get(OrgUnit, req.from_unit_id) if req.from_unit_id else None
    to_unit = await session.get(OrgUnit, req.to_unit_id)
    branding = await session.get(TenantBranding, user.tenant_id)

    pdf = render_transfer_letter(
        member_name=member.full_name if member else "—",
        member_no=member.member_no if member else "—",
        from_church=from_unit.name if from_unit else (branding.display_name if branding else "Church"),
        to_church=to_unit.name if to_unit else "—",
        date=datetime.date.today(),
        issued_by=user.name,
        reason=req.reason,
        color_hex=branding.color_primary if branding else "#6d28d9",
    )
    key = storage.make_key(str(user.tenant_id), "transfer-letters", f"{req.id}.pdf")
    await storage.put(key, pdf, "application/pdf")

    try:
        req = await approve_source(session, request_id, by=str(user.id), letter_key=key)
    except TransferError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    path = await unit_path(session, req.to_unit_id)
    for uid in await leaders_for_path(session, path):
        await notifications.notify(
            session, tenant_id=str(user.tenant_id), user_id=str(uid),
            title="Incoming member transfer",
            body=f"{member.full_name if member else 'A member'} requests to transfer to your church.",
            category="transfer", link="transfers",
        )
    if member and member.user_id:
        await notifications.notify(
            session, tenant_id=str(user.tenant_id), user_id=str(member.user_id),
            title="Transfer letter issued",
            body="Your transfer-out letter was issued and sent to your new church.",
            category="transfer", link="dashboard",
        )
    return await _to_response(session, req)


@router.post("/{request_id}/reject-source", response_model=TransferResponse)
async def reject_source_route(request_id: str, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    req = await _get_request(session, request_id)
    if not await _can_act(session, user, req):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot act on this request")
    member = await session.get(Member, req.member_id)
    try:
        req = await reject_source(session, request_id, by=str(user.id))
    except TransferError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    if member and member.user_id:
        await notifications.notify(
            session, tenant_id=str(user.tenant_id), user_id=str(member.user_id),
            title="Transfer request rejected",
            body="Your transfer request was not approved by your current church.",
            category="transfer", link="dashboard",
        )
    return await _to_response(session, req)


@router.post("/{request_id}/approve-destination", response_model=TransferResponse)
async def approve_destination_route(request_id: str, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    req = await _get_request(session, request_id)
    if not await _can_act(session, user, req):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot act on this request")
    member = await session.get(Member, req.member_id)
    try:
        req = await approve_destination(session, request_id, by=str(user.id))
    except TransferError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    if member and member.user_id:
        await notifications.notify(
            session, tenant_id=str(user.tenant_id), user_id=str(member.user_id),
            title="Transfer approved",
            body="Your transfer is complete — welcome to your new church!",
            category="transfer", link="dashboard",
        )
    return await _to_response(session, req)


@router.post("/{request_id}/reject-destination", response_model=TransferResponse)
async def reject_destination_route(request_id: str, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    req = await _get_request(session, request_id)
    if not await _can_act(session, user, req):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot act on this request")
    member = await session.get(Member, req.member_id)
    try:
        req = await reject_destination(session, request_id, by=str(user.id))
    except TransferError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    if member and member.user_id:
        await notifications.notify(
            session, tenant_id=str(user.tenant_id), user_id=str(member.user_id),
            title="Transfer not approved",
            body="The destination church did not approve your transfer.",
            category="transfer", link="dashboard",
        )
    return await _to_response(session, req)


@router.get("/{request_id}/letter.pdf")
async def download_letter(request_id: str, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    req = await _get_request(session, request_id)
    if not req.letter_key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Letter not found")
    member = await session.get(Member, req.member_id)
    is_owner = bool(member and member.user_id == user.id)
    grants = await authz.load_grants(session, user.id)
    from_path = await unit_path(session, req.from_unit_id)
    to_path = await unit_path(session, req.to_unit_id)
    allowed = (
        is_owner
        or authz.can(grants, authz.MANAGE_MEMBERS, from_path)
        or authz.can(grants, authz.MANAGE_MEMBERS, to_path)
    )
    if not allowed:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed")
    data, content_type = await storage.get(req.letter_key)
    return Response(
        content=data,
        media_type=content_type,
        headers={"Content-Disposition": 'attachment; filename="transfer-letter.pdf"'},
    )
