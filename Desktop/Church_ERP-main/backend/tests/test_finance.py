"""Finance: category direction, maker-checker approval, roll-up summary, isolation."""
import pytest
from sqlalchemy import func, select

from app.core.db import tenant_session
from app.domain import authz
from app.domain.finance import (
    FinanceError,
    approve_entry,
    category_direction,
    create_entry,
    summary,
)
from app.models import FinanceEntry, User


async def _user(session, tenant_id, email) -> User:
    u = User(tenant_id=tenant_id, email=email, password_hash="x", name="U", role="treasurer")
    session.add(u)
    await session.flush()
    return u


def test_category_direction_and_role_caps():
    assert category_direction("offering") == "income"
    assert category_direction("salaries") == "expense"
    with pytest.raises(FinanceError):
        category_direction("nope")
    # treasurer records but cannot approve; admin approves
    assert authz.RECORD_FINANCE in authz.role_capabilities("treasurer")
    assert authz.APPROVE not in authz.role_capabilities("treasurer")
    assert authz.APPROVE in authz.role_capabilities("admin")


async def test_maker_checker_blocks_self_approval(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        recorder = await _user(s, tenant_a, "rec@x.local")
        approver = await _user(s, tenant_a, "appr@x.local")
        entry = await create_entry(
            s, tenant_id=tenant_a, category="offering", amount=1000,
            recorded_by=str(recorder.id),
        )
        # same person cannot approve their own entry
        with pytest.raises(FinanceError):
            await approve_entry(s, str(entry.id), approver_id=str(recorder.id))
        # a different approver can
        approved = await approve_entry(s, str(entry.id), approver_id=str(approver.id))
        assert approved.approval_status == "approved"


async def test_summary_counts_only_approved(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        rec = str((await _user(s, tenant_a, "rec2@x.local")).id)
        appr = str((await _user(s, tenant_a, "appr2@x.local")).id)
        e1 = await create_entry(s, tenant_id=tenant_a, category="offering", amount=1000, recorded_by=rec)
        e2 = await create_entry(s, tenant_id=tenant_a, category="utilities", amount=400, recorded_by=rec)
        await create_entry(s, tenant_id=tenant_a, category="tithe", amount=999, recorded_by=rec)  # left pending
        await approve_entry(s, str(e1.id), approver_id=appr)
        await approve_entry(s, str(e2.id), approver_id=appr)
        result = await summary(s)
        assert result["income"] == 1000.0
        assert result["expense"] == 400.0
        assert result["net"] == 600.0
        assert result["pending"] == 1  # the unapproved tithe


async def test_negative_amount_rejected(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        with pytest.raises(FinanceError):
            await create_entry(s, tenant_id=tenant_a, category="offering", amount=-5)


async def test_finance_is_tenant_isolated(two_tenants):
    tenant_a, tenant_b = two_tenants
    async with tenant_session(tenant_a) as s:
        await create_entry(s, tenant_id=tenant_a, category="offering", amount=1000)
    async with tenant_session(tenant_b) as s:
        count = (await s.execute(select(func.count(FinanceEntry.id)))).scalar_one()
        assert count == 0
