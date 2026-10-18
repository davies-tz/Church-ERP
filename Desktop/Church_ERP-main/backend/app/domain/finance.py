"""Finance domain: the category/method catalogs, maker-checker approval, and roll-ups.

Maker-checker: whoever records an entry cannot approve it — a different person with
`approve` authority must. This is the core financial control."""
import datetime
import decimal
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import FinanceEntry

# key -> (label_en, label_sw, direction)
CATEGORIES: dict[str, tuple[str, str, str]] = {
    "offering": ("Offering", "Sadaka", "income"),
    "tithe": ("Tithe", "Zaka", "income"),
    "pledge": ("Pledge", "Ahadi", "income"),
    "project": ("Project contribution", "Mchango wa mradi", "income"),
    "donation": ("Donation", "Msaada", "income"),
    "service_fee": ("Service fee", "Ada ya huduma", "income"),
    "utilities": ("Utilities", "Umeme / maji", "expense"),
    "salaries": ("Salaries", "Mishahara", "expense"),
    "maintenance": ("Maintenance", "Matengenezo", "expense"),
    "other_expense": ("Other expense", "Matumizi mengine", "expense"),
}

METHODS: dict[str, tuple[str, str]] = {
    "cash": ("Cash", "Fedha taslimu"),
    "mobile_money": ("Mobile money", "Pesa ya simu"),
    "bank": ("Bank", "Benki"),
    "card": ("Card", "Kadi"),
}


class FinanceError(ValueError):
    """Raised for unknown categories or maker-checker / workflow violations."""


def category_direction(category: str) -> str:
    entry = CATEGORIES.get(category)
    if entry is None:
        raise FinanceError(f"Unknown category '{category}'")
    return entry[2]


async def create_entry(
    session: AsyncSession,
    *,
    tenant_id: str,
    category: str,
    amount: decimal.Decimal | float | str,
    method: str | None = None,
    recorded_by: str | None = None,
    org_unit_id: str | None = None,
    member_id: str | None = None,
    date: datetime.date | None = None,
    note: str | None = None,
    currency: str = "TZS",
) -> FinanceEntry:
    direction = category_direction(category)
    amt = decimal.Decimal(str(amount))
    if amt <= 0:
        raise FinanceError("Amount must be positive")
    entry = FinanceEntry(
        tenant_id=tenant_id,
        category=category,
        direction=direction,
        amount=amt,
        currency=currency,
        method=method,
        org_unit_id=uuid.UUID(org_unit_id) if org_unit_id else None,
        member_id=uuid.UUID(member_id) if member_id else None,
        date=date or datetime.date.today(),
        note=note,
        recorded_by=uuid.UUID(recorded_by) if recorded_by else None,
        approval_status="pending",
    )
    session.add(entry)
    await session.flush()
    return entry


async def _load(session: AsyncSession, entry_id: str) -> FinanceEntry:
    try:
        entry = await session.get(FinanceEntry, uuid.UUID(str(entry_id)))
    except ValueError:
        raise FinanceError("Invalid entry id")
    if entry is None:
        raise FinanceError("Entry not found")
    return entry


async def approve_entry(session, entry_id, *, approver_id) -> FinanceEntry:
    entry = await _load(session, entry_id)
    if entry.approval_status != "pending":
        raise FinanceError(f"Entry is already {entry.approval_status}")
    # maker-checker: cannot approve your own entry
    if entry.recorded_by is not None and str(entry.recorded_by) == str(approver_id):
        raise FinanceError("You cannot approve an entry you recorded")
    entry.approval_status = "approved"
    entry.approved_by = uuid.UUID(str(approver_id)) if approver_id else None
    entry.approved_at = datetime.datetime.now(datetime.timezone.utc)
    await session.flush()
    return entry


async def reject_entry(session, entry_id, *, approver_id) -> FinanceEntry:
    entry = await _load(session, entry_id)
    if entry.approval_status != "pending":
        raise FinanceError(f"Entry is already {entry.approval_status}")
    entry.approval_status = "rejected"
    entry.approved_by = uuid.UUID(str(approver_id)) if approver_id else None
    entry.approved_at = datetime.datetime.now(datetime.timezone.utc)
    await session.flush()
    return entry


async def summary(session: AsyncSession) -> dict:
    """Roll-up of APPROVED entries for the current tenant (RLS-scoped), plus the count
    of entries still awaiting approval."""
    def _sum(direction: str):
        return select(func.coalesce(func.sum(FinanceEntry.amount), 0)).where(
            FinanceEntry.direction == direction,
            FinanceEntry.approval_status == "approved",
        )

    income = (await session.execute(_sum("income"))).scalar_one()
    expense = (await session.execute(_sum("expense"))).scalar_one()
    pending = (
        await session.execute(
            select(func.count(FinanceEntry.id)).where(
                FinanceEntry.approval_status == "pending"
            )
        )
    ).scalar_one()
    income = decimal.Decimal(income)
    expense = decimal.Decimal(expense)
    return {
        "income": float(income),
        "expense": float(expense),
        "net": float(income - expense),
        "pending": int(pending),
        "currency": "TZS",
    }
