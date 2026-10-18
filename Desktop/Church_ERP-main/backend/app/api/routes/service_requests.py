import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.api.deps import get_scoped_session
from app.domain import authz
from app.domain.service_requests import (
    SERVICE_TYPES,
    ServiceError,
    approve_request,
    cancel_request,
    complete_request,
    create_service_request,
    reject_request,
    sacrament_type_for,
)
from app.models import Member, OrgUnit, ServiceRequest, User
from app.schemas.service_request import (
    CompleteRequest,
    ServiceRequestCreate,
    ServiceRequestResponse,
    ServiceTypeInfo,
)

router = APIRouter(tags=["service-requests"])


def _parse_uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid request id")


async def _to_response(session, req: ServiceRequest) -> ServiceRequestResponse:
    member = await session.get(Member, req.member_id)
    place = None
    if req.org_unit_id:
        unit = await session.get(OrgUnit, req.org_unit_id)
        place = unit.name if unit else None
    req_by = await session.get(User, req.requested_by) if req.requested_by else None
    dec_by = await session.get(User, req.decided_by) if req.decided_by else None
    en, sw, sacr = SERVICE_TYPES.get(req.type, (req.type, req.type, None))
    return ServiceRequestResponse(
        id=str(req.id),
        member_id=str(req.member_id),
        member_name=member.full_name if member else "—",
        type=req.type,
        type_label_en=en,
        type_label_sw=sw,
        sacrament_type=sacr,
        status=req.status,
        place=place,
        scheduled_date=req.scheduled_date,
        notes=req.notes,
        requested_by_name=req_by.name if req_by else None,
        decided_by_name=dec_by.name if dec_by else None,
        produced_record_id=str(req.produced_record_id) if req.produced_record_id else None,
        produced_fee_id=str(req.produced_fee_id) if req.produced_fee_id else None,
    )


@router.get("/service-types", response_model=list[ServiceTypeInfo])
async def service_types(_ctx: tuple = Depends(get_scoped_session)):
    return [
        ServiceTypeInfo(key=k, label_en=en, label_sw=sw, sacrament_type=sacr)
        for k, (en, sw, sacr) in SERVICE_TYPES.items()
    ]


@router.get("/service-requests", response_model=list[ServiceRequestResponse])
async def list_requests(ctx: tuple = Depends(get_scoped_session)):
    session, _ = ctx
    rows = (
        await session.execute(
            select(ServiceRequest).order_by(ServiceRequest.created_at.desc())
        )
    ).scalars().all()
    return [await _to_response(session, r) for r in rows]


@router.post("/service-requests", response_model=ServiceRequestResponse, status_code=201)
async def create_request(body: ServiceRequestCreate, ctx: tuple = Depends(get_scoped_session)):
    # Self-service front door: any authenticated tenant user may submit a request.
    session, user = ctx

    # Gate: an unverified member cannot self-request a sacramental service (e.g. a
    # wedding). Staff (no linked member) and non-sacramental services are unaffected.
    if sacrament_type_for(body.type):
        my_member = (
            await session.execute(select(Member).where(Member.user_id == user.id))
        ).scalar_one_or_none()
        if my_member and my_member.verification_status != "verified":
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "Your membership must be verified before requesting this service",
            )
    try:
        req = await create_service_request(
            session,
            tenant_id=str(user.tenant_id),
            member_id=body.member_id,
            type=body.type,
            requested_by=str(user.id),
            org_unit_id=body.org_unit_id,
            scheduled_date=body.scheduled_date,
            notes=body.notes,
        )
    except ServiceError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return await _to_response(session, req)


async def _require(session, user, capability: str):
    grants = await authz.load_grants(session, user.id)
    if not authz.can(grants, capability):
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Missing capability: {capability}")


@router.post("/service-requests/{request_id}/approve", response_model=ServiceRequestResponse)
async def approve(request_id: str, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    await _require(session, user, authz.APPROVE)
    try:
        req = await approve_request(session, request_id, by=str(user.id))
    except ServiceError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return await _to_response(session, req)


@router.post("/service-requests/{request_id}/reject", response_model=ServiceRequestResponse)
async def reject(request_id: str, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    await _require(session, user, authz.APPROVE)
    try:
        req = await reject_request(session, request_id, by=str(user.id))
    except ServiceError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return await _to_response(session, req)


@router.post("/service-requests/{request_id}/cancel", response_model=ServiceRequestResponse)
async def cancel(request_id: str, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    # requester may cancel their own; otherwise needs approve authority
    req = await session.get(ServiceRequest, _parse_uuid(request_id))
    if req is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    if req.requested_by != user.id:
        await _require(session, user, authz.APPROVE)
    try:
        req = await cancel_request(session, request_id, by=str(user.id))
    except ServiceError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return await _to_response(session, req)


@router.post("/service-requests/{request_id}/complete", response_model=ServiceRequestResponse)
async def complete(request_id: str, body: CompleteRequest, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    # completing a sacramental service records a sacrament -> needs manage_sacraments;
    # otherwise the general approve authority suffices.
    req = await session.get(ServiceRequest, _parse_uuid(request_id))
    if req is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    needed = authz.MANAGE_SACRAMENTS if sacrament_type_for(req.type) else authz.APPROVE
    await _require(session, user, needed)
    try:
        req = await complete_request(
            session, request_id, tenant_id=str(user.tenant_id), by=str(user.id),
            minister_name=body.minister_name, register_book=body.register_book,
            register_page=body.register_page, date=body.date, fee=body.fee,
        )
    except ServiceError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return await _to_response(session, req)
