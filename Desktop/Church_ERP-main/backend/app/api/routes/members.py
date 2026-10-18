import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import Response
from sqlalchemy import select

from app.api.deps import get_scoped_session
from app.core import storage
from app.core.config import settings
from app.domain import authz
from app.domain.members import create_member as create_member_domain
from app.models import Member, OrgUnit
from app.schemas.member import MemberCreate, MemberResponse, MemberUpdate

router = APIRouter(prefix="/members", tags=["members"])


def _to_response(m: Member, unit_name: str | None) -> MemberResponse:
    return MemberResponse(
        id=str(m.id),
        member_no=m.member_no,
        full_name=m.full_name,
        status=m.status,
        org_unit_id=str(m.org_unit_id) if m.org_unit_id else None,
        org_unit_name=unit_name,
        member_type=m.member_type,
        gender=m.gender,
        dob=m.dob,
        marital_status=m.marital_status,
        occupation=m.occupation,
        education=m.education,
        phone=m.phone,
        alt_phone=m.alt_phone,
        email=m.email,
        region=m.region,
        district=m.district,
        ward=m.ward,
        street=m.street,
        spouse_name=m.spouse_name,
        emergency_contact=m.emergency_contact,
        has_photo=bool(m.photo_key),
    )


async def _get_member(session, member_id: str) -> Member:
    try:
        member = await session.get(Member, uuid.UUID(member_id))
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid member id")
    if member is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    return member


async def _may_manage(session, user, member: Member) -> bool:
    """A member may manage their own record; otherwise manage_members scoped to the
    member's church is required."""
    if member.user_id == user.id:
        return True
    grants = await authz.load_grants(session, user.id)
    path = None
    if member.org_unit_id:
        unit = await session.get(OrgUnit, member.org_unit_id)
        path = unit.path if unit else None
    return authz.can(grants, authz.MANAGE_MEMBERS, path)


@router.patch("/{member_id}", response_model=MemberResponse)
async def update_member(member_id: str, body: MemberUpdate, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    member = await _get_member(session, member_id)
    if not await _may_manage(session, user, member):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot edit this member")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(member, k, v)
    await session.flush()
    unit_name = None
    if member.org_unit_id:
        u = await session.get(OrgUnit, member.org_unit_id)
        unit_name = u.name if u else None
    return _to_response(member, unit_name)


@router.post("/{member_id}/photo", status_code=204)
async def upload_photo(
    member_id: str, file: UploadFile = File(...), ctx: tuple = Depends(get_scoped_session)
):
    session, user = ctx
    member = await _get_member(session, member_id)
    if not await _may_manage(session, user, member):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot edit this member")
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File must be an image")
    data = await file.read()
    if len(data) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Image too large (max 5 MB)")
    key = storage.make_key(str(user.tenant_id), "member-photos", file.filename or "photo")
    await storage.put(key, data, file.content_type)
    member.photo_key = key
    await session.flush()


@router.get("/{member_id}/photo")
async def get_photo(member_id: str, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    member = await _get_member(session, member_id)
    if not member.photo_key or not storage.key_belongs_to(member.photo_key, str(user.tenant_id)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No photo")
    data, content_type = await storage.get(member.photo_key)
    return Response(content=data, media_type=content_type)


@router.get("", response_model=list[MemberResponse])
async def list_members(ctx: tuple = Depends(get_scoped_session)):
    """Returns only THIS tenant's members — enforced by RLS, not a WHERE clause."""
    session, _ = ctx
    rows = (
        await session.execute(select(Member).order_by(Member.member_no))
    ).scalars().all()
    # resolve unit names in one pass
    unit_ids = {m.org_unit_id for m in rows if m.org_unit_id}
    names: dict = {}
    if unit_ids:
        for u in (
            await session.execute(select(OrgUnit).where(OrgUnit.id.in_(unit_ids)))
        ).scalars():
            names[u.id] = u.name
    return [_to_response(m, names.get(m.org_unit_id) if m.org_unit_id else None) for m in rows]


@router.post("", response_model=MemberResponse, status_code=201)
async def create_member(body: MemberCreate, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    grants = await authz.load_grants(session, user.id)

    # Scoped authorization: registering a member into a unit needs manage_members with
    # a scope covering that unit. Without a unit, any manage_members grant suffices.
    unit: OrgUnit | None = None
    if body.org_unit_id:
        try:
            unit = await session.get(OrgUnit, uuid.UUID(body.org_unit_id))
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid org_unit_id")
        if unit is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Org unit not found")
    target_path = unit.path if unit else None
    if not authz.can(grants, authz.MANAGE_MEMBERS, target_path):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "You cannot register members in this scope"
        )

    fields = body.model_dump(exclude={"org_unit_id"})
    member = await create_member_domain(
        session,
        tenant_id=str(user.tenant_id),
        org_unit_id=unit.id if unit else None,
        **fields,
    )
    return _to_response(member, unit.name if unit else None)
