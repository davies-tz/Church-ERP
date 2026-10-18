import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import select

from app.api.deps import get_scoped_session
from app.domain import authz
from app.domain.certificates import render_certificate
from app.domain.sacraments import (
    SACRAMENT_TYPES,
    SacramentError,
    get_annotations,
    record_sacrament,
)
from app.models import Member, OrgUnit, SacramentalRecord, TenantBranding
from app.schemas.sacrament import (
    AnnotationOut,
    SacramentCreate,
    SacramentResponse,
    SacramentTypeInfo,
    TimelineResponse,
)

router = APIRouter(tags=["sacraments"])


@router.get("/sacrament-types", response_model=list[SacramentTypeInfo])
async def sacrament_types(_ctx: tuple = Depends(get_scoped_session)):
    return [
        SacramentTypeInfo(key=k, label_en=en, label_sw=sw)
        for k, (en, sw) in SACRAMENT_TYPES.items()
    ]


async def _build_timeline(session, member: Member) -> TimelineResponse:
    records = (
        await session.execute(
            select(SacramentalRecord)
            .where(SacramentalRecord.member_id == member.id)
            .order_by(SacramentalRecord.date)
        )
    ).scalars().all()

    # resolve place names + spouse names + baptism annotations
    unit_ids = {r.org_unit_id for r in records if r.org_unit_id}
    units = {}
    if unit_ids:
        for u in (
            await session.execute(select(OrgUnit).where(OrgUnit.id.in_(unit_ids)))
        ).scalars():
            units[u.id] = u.name
    spouse_ids = {r.spouse_member_id for r in records if r.spouse_member_id}
    spouses = {}
    if spouse_ids:
        for m in (
            await session.execute(select(Member).where(Member.id.in_(spouse_ids)))
        ).scalars():
            spouses[m.id] = m.full_name

    baptism_ids = [r.id for r in records if r.type == "baptism"]
    annotations = await get_annotations(session, baptism_ids)

    out: list[SacramentResponse] = []
    for r in records:
        en, sw = SACRAMENT_TYPES.get(r.type, (r.type, r.type))
        anns = annotations.get(r.id, []) if r.type == "baptism" else []
        out.append(
            SacramentResponse(
                id=str(r.id),
                type=r.type,
                type_label_en=en,
                type_label_sw=sw,
                date=r.date,
                place=units.get(r.org_unit_id) if r.org_unit_id else None,
                minister_name=r.minister_name,
                register_book=r.register_book,
                register_page=r.register_page,
                witnesses=list(r.witnesses or []),
                spouse_name=spouses.get(r.spouse_member_id) if r.spouse_member_id else None,
                notes=r.notes,
                is_master=(r.type == "baptism"),
                annotations=[
                    AnnotationOut(text=a.text, source_unit_name=a.source_unit_name)
                    for a in anns
                ],
            )
        )
    return TimelineResponse(
        member_id=str(member.id),
        member_name=member.full_name,
        member_no=member.member_no,
        records=out,
    )


async def _get_member(session, member_id: str) -> Member:
    try:
        member = await session.get(Member, uuid.UUID(member_id))
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid member id")
    if member is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    return member


@router.get("/members/{member_id}/sacraments", response_model=TimelineResponse)
async def member_timeline(member_id: str, ctx: tuple = Depends(get_scoped_session)):
    session, _ = ctx
    member = await _get_member(session, member_id)
    return await _build_timeline(session, member)


@router.get("/sacraments/{record_id}/certificate.pdf")
async def certificate(record_id: str, ctx: tuple = Depends(get_scoped_session)):
    """Generate a branded PDF certificate for a sacramental record."""
    session, user = ctx
    grants = await authz.load_grants(session, user.id)
    if not authz.can(grants, authz.MANAGE_SACRAMENTS):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Missing capability: manage_sacraments"
        )
    try:
        rec = await session.get(SacramentalRecord, uuid.UUID(record_id))
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid record id")
    if rec is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Record not found")

    member = await session.get(Member, rec.member_id)
    place = await session.get(OrgUnit, rec.org_unit_id) if rec.org_unit_id else None
    spouse = (
        await session.get(Member, rec.spouse_member_id) if rec.spouse_member_id else None
    )
    branding = await session.get(TenantBranding, user.tenant_id)

    pdf = render_certificate(
        sacrament_type=rec.type,
        date=rec.date,
        church_name=branding.display_name if branding else "Church",
        member_name=member.full_name if member else "—",
        place_name=place.name if place else None,
        minister_name=rec.minister_name,
        register_book=rec.register_book,
        register_page=rec.register_page,
        spouse_name=spouse.full_name if spouse else None,
        color_hex=branding.color_primary if branding else "#6d28d9",
    )
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{rec.type}-certificate.pdf"'
        },
    )


@router.post("/members/{member_id}/sacraments", response_model=TimelineResponse,
             status_code=201)
async def add_sacrament(
    member_id: str, body: SacramentCreate, ctx: tuple = Depends(get_scoped_session)
):
    session, user = ctx
    grants = await authz.load_grants(session, user.id)
    if not authz.can(grants, authz.MANAGE_SACRAMENTS):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Missing capability: manage_sacraments"
        )
    member = await _get_member(session, member_id)
    try:
        await record_sacrament(
            session,
            tenant_id=str(user.tenant_id),
            member_id=str(member.id),
            type=body.type,
            date=body.date,
            org_unit_id=body.org_unit_id,
            minister_name=body.minister_name,
            register_book=body.register_book,
            register_page=body.register_page,
            witnesses=body.witnesses,
            spouse_member_id=body.spouse_member_id,
            notes=body.notes,
            recorded_by=str(user.id),
        )
    except SacramentError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return await _build_timeline(session, member)
