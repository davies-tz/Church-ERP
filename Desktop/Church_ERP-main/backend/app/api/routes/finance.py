from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.api.deps import get_scoped_session
from app.domain import authz
from app.domain.finance import (
    CATEGORIES,
    METHODS,
    FinanceError,
    approve_entry,
    create_entry,
    reject_entry,
    summary,
)
from app.models import FinanceEntry, Member, User
from app.schemas.finance import (
    CategoryInfo,
    FinanceCreate,
    FinanceResponse,
    FinanceSummary,
    MethodInfo,
)

router = APIRouter(prefix="/finance", tags=["finance"])


async def _require(session, user, capability: str):
    grants = await authz.load_grants(session, user.id)
    if not authz.can(grants, capability):
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Missing capability: {capability}")


async def _to_response(session, e: FinanceEntry) -> FinanceResponse:
    member = await session.get(Member, e.member_id) if e.member_id else None
    rec = await session.get(User, e.recorded_by) if e.recorded_by else None
    app_by = await session.get(User, e.approved_by) if e.approved_by else None
    return FinanceResponse(
        id=str(e.id),
        date=e.date,
        category=e.category,
        direction=e.direction,
        amount=float(e.amount),
        currency=e.currency,
        method=e.method,
        member_id=str(e.member_id) if e.member_id else None,
        member_name=member.full_name if member else None,
        note=e.note,
        approval_status=e.approval_status,
        recorded_by_name=rec.name if rec else None,
        approved_by_name=app_by.name if app_by else None,
    )


@router.get("/categories", response_model=list[CategoryInfo])
async def categories(_ctx: tuple = Depends(get_scoped_session)):
    return [
        CategoryInfo(key=k, label_en=en, label_sw=sw, direction=d)
        for k, (en, sw, d) in CATEGORIES.items()
    ]


@router.get("/methods", response_model=list[MethodInfo])
async def methods(_ctx: tuple = Depends(get_scoped_session)):
    return [MethodInfo(key=k, label_en=en, label_sw=sw) for k, (en, sw) in METHODS.items()]


@router.get("/summary", response_model=FinanceSummary)
async def finance_summary(ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    await _require(session, user, authz.VIEW_FINANCE)
    return FinanceSummary(**await summary(session))


@router.get("", response_model=list[FinanceResponse])
async def list_entries(ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    await _require(session, user, authz.VIEW_FINANCE)
    rows = (
        await session.execute(
            select(FinanceEntry).order_by(FinanceEntry.date.desc(), FinanceEntry.created_at.desc())
        )
    ).scalars().all()
    return [await _to_response(session, e) for e in rows]


@router.post("", response_model=FinanceResponse, status_code=201)
async def record_entry(body: FinanceCreate, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    await _require(session, user, authz.RECORD_FINANCE)
    try:
        entry = await create_entry(
            session,
            tenant_id=str(user.tenant_id),
            category=body.category,
            amount=body.amount,
            method=body.method,
            recorded_by=str(user.id),
            org_unit_id=body.org_unit_id,
            member_id=body.member_id,
            date=body.date,
            note=body.note,
        )
    except FinanceError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return await _to_response(session, entry)


@router.post("/{entry_id}/approve", response_model=FinanceResponse)
async def approve(entry_id: str, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    await _require(session, user, authz.APPROVE)
    try:
        entry = await approve_entry(session, entry_id, approver_id=str(user.id))
    except FinanceError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return await _to_response(session, entry)


@router.post("/{entry_id}/reject", response_model=FinanceResponse)
async def reject(entry_id: str, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    await _require(session, user, authz.APPROVE)
    try:
        entry = await reject_entry(session, entry_id, approver_id=str(user.id))
    except FinanceError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return await _to_response(session, entry)
