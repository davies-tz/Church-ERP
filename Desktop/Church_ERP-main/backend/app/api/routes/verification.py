import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select

from app.api.deps import get_scoped_session
from app.core import storage
from app.core.config import settings
from app.domain import authz, notifications
from app.domain.verification import (
    VerificationError,
    create_request,
    decide,
    leaders_for_path,
    routing_path,
)
from app.models import (
    Member,
    OrgUnit,
    VerificationDocument,
    VerificationRequest,
)
from app.schemas.verification import (
    MyVerification,
    VerificationCreate,
    VerificationDocumentOut,
    VerificationResponse,
)

router = APIRouter(prefix="/verification", tags=["verification"])


async def _my_member(session, user) -> Member:
    member = (
        await session.execute(select(Member).where(Member.user_id == user.id))
    ).scalar_one_or_none()
    if member is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You are not a member")
    return member


async def _docs(session, request_id) -> list[VerificationDocumentOut]:
    rows = (
        await session.execute(
            select(VerificationDocument).where(
                VerificationDocument.request_id == request_id
            )
        )
    ).scalars().all()
    return [
        VerificationDocumentOut(id=str(d.id), filename=d.filename, content_type=d.content_type)
        for d in rows
    ]


async def _to_response(session, req: VerificationRequest) -> VerificationResponse:
    member = await session.get(Member, req.member_id)
    unit = await session.get(OrgUnit, req.baptized_at_unit_id) if req.baptized_at_unit_id else None
    return VerificationResponse(
        id=str(req.id), member_id=str(req.member_id),
        member_name=member.full_name if member else "—",
        baptized_at_unit_id=str(req.baptized_at_unit_id) if req.baptized_at_unit_id else None,
        baptized_at_unit_name=unit.name if unit else None,
        never_baptized=req.never_baptized, note=req.note, status=req.status,
        created_at=req.created_at, documents=await _docs(session, req.id),
    )


@router.get("/mine", response_model=MyVerification)
async def my_verification(ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    member = await _my_member(session, user)
    req = (
        await session.execute(
            select(VerificationRequest)
            .where(VerificationRequest.member_id == member.id)
            .order_by(VerificationRequest.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    return MyVerification(
        verification_status=member.verification_status,
        request=await _to_response(session, req) if req else None,
    )


@router.post("", response_model=VerificationResponse, status_code=201)
async def request_verification(body: VerificationCreate, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    member = await _my_member(session, user)
    try:
        req = await create_request(
            session, tenant_id=str(user.tenant_id), member_id=str(member.id),
            baptized_at_unit_id=body.baptized_at_unit_id,
            never_baptized=body.never_baptized, note=body.note,
        )
    except VerificationError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    # route to the leaders of the baptizing church
    path = await routing_path(session, req)
    for uid in await leaders_for_path(session, path):
        await notifications.notify(
            session, tenant_id=str(user.tenant_id), user_id=str(uid),
            title="Membership verification request",
            body=f"{member.full_name} requested verification.",
            category="verification", link="verify",
        )
    return await _to_response(session, req)


@router.post("/{request_id}/documents", response_model=VerificationDocumentOut, status_code=201)
async def upload_document(
    request_id: str, file: UploadFile = File(...), ctx: tuple = Depends(get_scoped_session)
):
    session, user = ctx
    member = await _my_member(session, user)
    try:
        req = await session.get(VerificationRequest, uuid.UUID(request_id))
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid request id")
    if req is None or req.member_id != member.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    data = await file.read()
    if len(data) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File too large (max 5 MB)")
    key = storage.make_key(str(user.tenant_id), "verification", file.filename or "doc")
    await storage.put(key, data, file.content_type or "application/octet-stream")
    doc = VerificationDocument(
        tenant_id=str(user.tenant_id), request_id=req.id, file_key=key,
        filename=file.filename or "doc", content_type=file.content_type or "application/octet-stream",
    )
    session.add(doc)
    await session.flush()
    return VerificationDocumentOut(id=str(doc.id), filename=doc.filename, content_type=doc.content_type)


@router.get("", response_model=list[VerificationResponse])
async def leader_queue(ctx: tuple = Depends(get_scoped_session)):
    """Pending verification requests this leader may act on (manage_members covering
    the request's routing church)."""
    session, user = ctx
    grants = await authz.load_grants(session, user.id)
    rows = (
        await session.execute(
            select(VerificationRequest)
            .where(VerificationRequest.status == "pending")
            .order_by(VerificationRequest.created_at.desc())
        )
    ).scalars().all()
    out = []
    for req in rows:
        path = await routing_path(session, req)
        if authz.can(grants, authz.MANAGE_MEMBERS, path):
            out.append(await _to_response(session, req))
    return out


async def _can_verify(session, user, req) -> bool:
    grants = await authz.load_grants(session, user.id)
    path = await routing_path(session, req)
    return authz.can(grants, authz.MANAGE_MEMBERS, path)


@router.get("/{request_id}/documents/{doc_id}")
async def download_document(request_id: str, doc_id: str, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    doc = await session.get(VerificationDocument, uuid.UUID(doc_id))
    if doc is None or str(doc.request_id) != request_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    req = await session.get(VerificationRequest, doc.request_id)
    member = await session.get(Member, req.member_id)
    is_owner = member and member.user_id == user.id
    if not (is_owner or await _can_verify(session, user, req)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed")
    data, content_type = await storage.get(doc.file_key)
    return Response(content=data, media_type=content_type)


async def _decide(request_id: str, approve: bool, ctx: tuple):
    session, user = ctx
    try:
        req = await session.get(VerificationRequest, uuid.UUID(request_id))
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid request id")
    if req is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    if not await _can_verify(session, user, req):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot verify this member")
    member = await session.get(Member, req.member_id)
    try:
        req = await decide(session, request_id, by=str(user.id), approve=approve)
    except VerificationError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    if member and member.user_id:
        await notifications.notify(
            session, tenant_id=str(user.tenant_id), user_id=str(member.user_id),
            title="Verification " + ("approved" if approve else "rejected"),
            body="You are now a verified member." if approve
            else "Your verification request was not approved.",
            category="verification", link="dashboard",
        )
    return await _to_response(session, req)


@router.post("/{request_id}/approve", response_model=VerificationResponse)
async def approve(request_id: str, ctx: tuple = Depends(get_scoped_session)):
    return await _decide(request_id, True, ctx)


@router.post("/{request_id}/reject", response_model=VerificationResponse)
async def reject(request_id: str, ctx: tuple = Depends(get_scoped_session)):
    return await _decide(request_id, False, ctx)
