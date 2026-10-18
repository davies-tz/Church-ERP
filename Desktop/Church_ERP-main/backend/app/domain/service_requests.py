"""Member service-request workflow. The important bit is complete_request(): when a
sacramental service is completed it calls into the sacraments domain to create the
permanent record — which itself annotates the baptism master record. Chaining."""
import datetime
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.finance import create_entry
from app.domain.sacraments import SacramentError, record_sacrament
from app.models import Member, ServiceRequest

# key -> (label_en, label_sw, sacrament_type | None)
# A sacrament_type means completing this request produces that sacramental record.
SERVICE_TYPES: dict[str, tuple[str, str, str | None]] = {
    "baptism": ("Baptism", "Ubatizo", "baptism"),
    "first_communion": ("First Communion", "Komunyo ya Kwanza", "first_communion"),
    "confirmation": ("Confirmation", "Kipaimara", "confirmation"),
    "marriage": ("Marriage", "Ndoa", "marriage"),
    "funeral": ("Funeral", "Mazishi", "death"),
    "transfer_letter": ("Transfer letter", "Barua ya uhamisho", None),
    "house_blessing": ("House blessing", "Baraka ya nyumba", None),
    "counseling": ("Counseling", "Ushauri", None),
}

STATUS_PENDING = "pending"
STATUS_APPROVED = "approved"
STATUS_REJECTED = "rejected"
STATUS_COMPLETED = "completed"
STATUS_CANCELLED = "cancelled"


class ServiceError(ValueError):
    """Raised for unknown types, missing entities, or illegal workflow transitions."""


def sacrament_type_for(service_type: str) -> str | None:
    entry = SERVICE_TYPES.get(service_type)
    return entry[2] if entry else None


async def _load(session: AsyncSession, request_id: str) -> ServiceRequest:
    try:
        req = await session.get(ServiceRequest, uuid.UUID(str(request_id)))
    except ValueError:
        raise ServiceError("Invalid request id")
    if req is None:  # RLS hides other tenants' requests
        raise ServiceError("Request not found")
    return req


async def create_service_request(
    session: AsyncSession,
    *,
    tenant_id: str,
    member_id: str,
    type: str,
    requested_by: str | None = None,
    org_unit_id: str | None = None,
    scheduled_date: datetime.date | None = None,
    notes: str | None = None,
) -> ServiceRequest:
    if type not in SERVICE_TYPES:
        raise ServiceError(f"Unknown service type '{type}'")
    try:
        member = await session.get(Member, uuid.UUID(str(member_id)))
    except ValueError:
        raise ServiceError("Invalid member id")
    if member is None:
        raise ServiceError("Member not found")

    req = ServiceRequest(
        tenant_id=tenant_id,
        member_id=member_id,
        type=type,
        status=STATUS_PENDING,
        org_unit_id=uuid.UUID(org_unit_id) if org_unit_id else None,
        scheduled_date=scheduled_date,
        notes=notes,
        requested_by=uuid.UUID(requested_by) if requested_by else None,
    )
    session.add(req)
    await session.flush()
    return req


async def _decide(session, request_id, *, expect, to_status, by) -> ServiceRequest:
    req = await _load(session, request_id)
    if req.status != expect:
        raise ServiceError(f"Cannot move a '{req.status}' request to '{to_status}'")
    req.status = to_status
    req.decided_by = uuid.UUID(by) if by else None
    req.decided_at = datetime.datetime.now(datetime.timezone.utc)
    await session.flush()
    return req


async def approve_request(session, request_id, *, by) -> ServiceRequest:
    return await _decide(session, request_id, expect=STATUS_PENDING,
                         to_status=STATUS_APPROVED, by=by)


async def reject_request(session, request_id, *, by) -> ServiceRequest:
    return await _decide(session, request_id, expect=STATUS_PENDING,
                         to_status=STATUS_REJECTED, by=by)


async def cancel_request(session, request_id, *, by) -> ServiceRequest:
    req = await _load(session, request_id)
    if req.status not in (STATUS_PENDING, STATUS_APPROVED):
        raise ServiceError(f"Cannot cancel a '{req.status}' request")
    req.status = STATUS_CANCELLED
    req.decided_by = uuid.UUID(by) if by else None
    req.decided_at = datetime.datetime.now(datetime.timezone.utc)
    await session.flush()
    return req


async def complete_request(
    session: AsyncSession,
    request_id: str,
    *,
    tenant_id: str,
    by: str,
    minister_name: str | None = None,
    register_book: str | None = None,
    register_page: str | None = None,
    date: datetime.date | None = None,
    fee=None,
) -> ServiceRequest:
    req = await _load(session, request_id)
    if req.status != STATUS_APPROVED:
        raise ServiceError("Only an approved request can be completed")

    sacrament_type = sacrament_type_for(req.type)
    if sacrament_type:
        # THE CHAIN: completing a sacramental service records the permanent sacrament,
        # which in turn annotates the member's baptism master record.
        try:
            record = await record_sacrament(
                session,
                tenant_id=tenant_id,
                member_id=str(req.member_id),
                type=sacrament_type,
                date=date or req.scheduled_date or datetime.date.today(),
                org_unit_id=str(req.org_unit_id) if req.org_unit_id else None,
                minister_name=minister_name,
                register_book=register_book,
                register_page=register_page,
                recorded_by=by,
            )
        except SacramentError as e:
            raise ServiceError(str(e))
        req.produced_record_id = record.id

    # THE OTHER CHAIN: if a fee was collected, record it as a (pending) income entry
    # attributed to the member — one action, no double entry. Maker-checker still
    # applies: the fee is pending until a separate approver signs off.
    if fee not in (None, "", 0):
        entry = await create_entry(
            session,
            tenant_id=tenant_id,
            category="service_fee",
            amount=fee,
            member_id=str(req.member_id),
            org_unit_id=str(req.org_unit_id) if req.org_unit_id else None,
            recorded_by=by,
            date=date or req.scheduled_date or datetime.date.today(),
            note=f"Fee for {SERVICE_TYPES.get(req.type, (req.type,))[0]}",
        )
        req.produced_fee_id = entry.id

    req.status = STATUS_COMPLETED
    req.decided_by = uuid.UUID(by) if by else None
    req.decided_at = datetime.datetime.now(datetime.timezone.utc)
    await session.flush()
    return req
