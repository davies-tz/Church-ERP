"""Sacramental records domain: the type catalog, recording (with the baptism
master-record annotation flow), and the member timeline."""
import datetime
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import BaptismAnnotation, Member, OrgUnit, SacramentalRecord

# key -> (label_en, label_sw). Ordered roughly by life stage.
SACRAMENT_TYPES: dict[str, tuple[str, str]] = {
    "baptism": ("Baptism", "Ubatizo"),
    "first_communion": ("First Communion", "Komunyo ya Kwanza"),
    "confirmation": ("Confirmation", "Kipaimara"),
    "marriage": ("Marriage", "Ndoa"),
    "holy_orders": ("Holy Orders", "Daraja Takatifu"),
    "religious_profession": ("Religious Profession", "Nadhiri za Kitawa"),
    "reception": ("Reception into the Church", "Kupokelewa Kanisani"),
    "death": ("Death / Funeral", "Kifo / Mazishi"),
}


class SacramentError(ValueError):
    """Raised for unknown types, missing members, or canonical rule violations."""


async def _member_or_error(session: AsyncSession, member_id: str) -> Member:
    try:
        member = await session.get(Member, uuid.UUID(str(member_id)))
    except ValueError:
        raise SacramentError("Invalid member id")
    if member is None:  # RLS also hides members of other tenants
        raise SacramentError("Member not found")
    return member


async def _find_baptism(
    session: AsyncSession, member_id
) -> SacramentalRecord | None:
    return (
        await session.execute(
            select(SacramentalRecord).where(
                SacramentalRecord.member_id == member_id,
                SacramentalRecord.type == "baptism",
            )
        )
    ).scalar_one_or_none()


async def record_sacrament(
    session: AsyncSession,
    *,
    tenant_id: str,
    member_id: str,
    type: str,
    date: datetime.date,
    org_unit_id: str | None = None,
    minister_name: str | None = None,
    register_book: str | None = None,
    register_page: str | None = None,
    witnesses: list[str] | None = None,
    spouse_member_id: str | None = None,
    notes: str | None = None,
    recorded_by: str | None = None,
) -> SacramentalRecord:
    if type not in SACRAMENT_TYPES:
        raise SacramentError(f"Unknown sacrament type '{type}'")
    await _member_or_error(session, member_id)

    # A person is baptized once; a second baptism record is a data error.
    if type == "baptism" and await _find_baptism(session, member_id):
        raise SacramentError("Member already has a baptism record")

    record = SacramentalRecord(
        tenant_id=tenant_id,
        member_id=member_id,
        type=type,
        date=date,
        org_unit_id=uuid.UUID(org_unit_id) if org_unit_id else None,
        minister_name=minister_name,
        register_book=register_book,
        register_page=register_page,
        witnesses=witnesses or [],
        spouse_member_id=uuid.UUID(spouse_member_id) if spouse_member_id else None,
        notes=notes,
        recorded_by=uuid.UUID(recorded_by) if recorded_by else None,
    )
    session.add(record)
    await session.flush()

    # Master-record flow: annotate the baptism with every later sacrament.
    if type != "baptism":
        baptism = await _find_baptism(session, member_id)
        if baptism is not None:
            place = None
            if record.org_unit_id is not None:
                unit = await session.get(OrgUnit, record.org_unit_id)
                place = unit.name if unit else None
            label = SACRAMENT_TYPES[type][0]
            text = f"{label} on {date.isoformat()}" + (f" at {place}" if place else "")
            session.add(
                BaptismAnnotation(
                    tenant_id=tenant_id,
                    baptism_record_id=baptism.id,
                    sacrament_record_id=record.id,
                    text=text,
                    source_unit_name=place,
                )
            )
            await session.flush()

    return record


async def get_annotations(
    session: AsyncSession, baptism_ids: list[uuid.UUID]
) -> dict[uuid.UUID, list[BaptismAnnotation]]:
    if not baptism_ids:
        return {}
    rows = (
        await session.execute(
            select(BaptismAnnotation)
            .where(BaptismAnnotation.baptism_record_id.in_(baptism_ids))
            .order_by(BaptismAnnotation.created_at)
        )
    ).scalars().all()
    grouped: dict[uuid.UUID, list[BaptismAnnotation]] = {}
    for a in rows:
        grouped.setdefault(a.baptism_record_id, []).append(a)
    return grouped
