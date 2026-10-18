"""Reports: dashboard aggregation, CSV export, capability + isolation."""
import datetime

from app.core.db import tenant_session
from app.domain import authz, reports
from app.domain.finance import approve_entry, create_entry
from app.domain.members import create_member
from app.domain.sacraments import record_sacrament


def test_view_reports_capability():
    assert authz.VIEW_REPORTS in authz.role_capabilities("tenant_admin")
    assert authz.VIEW_REPORTS not in authz.role_capabilities("secretary")


async def test_dashboard_aggregates_across_modules(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        m = await create_member(s, tenant_id=tenant_a, full_name="Dash Person")
        await record_sacrament(
            s, tenant_id=tenant_a, member_id=str(m.id), type="baptism",
            date=datetime.date(2020, 1, 1),
        )
        e = await create_entry(s, tenant_id=tenant_a, category="offering", amount=5000)
        await approve_entry(s, str(e.id), approver_id=None)  # approver None allowed here

    async with tenant_session(tenant_a) as s:
        d = await reports.dashboard(s)
        # the fixture seeds one member too, plus ours
        assert d["members_total"] >= 2
        assert d["finance"]["income"] == 5000.0
        types = {t["key"]: t["count"] for t in d["sacraments_by_type"]}
        assert types.get("baptism") == 1
        assert any(c["category"] == "offering" for c in d["finance_by_category"])


async def test_members_csv_has_header_and_rows(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await create_member(s, tenant_id=tenant_a, full_name="CSV Person", phone="0700")
    async with tenant_session(tenant_a) as s:
        csv_text = await reports.members_csv(s)
        lines = csv_text.strip().splitlines()
        assert lines[0].startswith("member_no,full_name")
        assert any("CSV Person" in ln for ln in lines[1:])


async def test_dashboard_is_tenant_scoped(two_tenants):
    tenant_a, tenant_b = two_tenants
    async with tenant_session(tenant_a) as s:
        await create_entry(s, tenant_id=tenant_a, category="tithe", amount=1234)
        e = await create_entry(s, tenant_id=tenant_a, category="tithe", amount=1234)
        await approve_entry(s, str(e.id), approver_id=None)
    async with tenant_session(tenant_b) as s:
        d = await reports.dashboard(s)
        # tenant B sees none of A's approved income
        assert d["finance"]["income"] == 0.0
