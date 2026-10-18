"""Service-request workflow: the state machine, the completion->sacrament chain
(including baptism annotation), and tenant isolation."""
import datetime

import pytest
from sqlalchemy import func, select

from app.core.db import tenant_session
from app.domain.sacraments import get_annotations, record_sacrament
from app.domain.service_requests import (
    ServiceError,
    approve_request,
    complete_request,
    create_service_request,
    reject_request,
    sacrament_type_for,
)
from app.models import FinanceEntry, Member, SacramentalRecord, ServiceRequest

D = datetime.date


def test_service_type_sacrament_mapping():
    assert sacrament_type_for("marriage") == "marriage"
    assert sacrament_type_for("funeral") == "death"
    assert sacrament_type_for("transfer_letter") is None
    assert sacrament_type_for("nope") is None


async def _member(session, tenant_id, name="Req Person") -> Member:
    m = Member(tenant_id=tenant_id, member_no="MEM-R1", full_name=name)
    session.add(m)
    await session.flush()
    return m


async def test_completion_chains_to_sacrament_and_annotates_baptism(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        member = await _member(s, tenant_a)
        # member already baptised, so a completed confirmation should annotate it
        baptism = await record_sacrament(
            s, tenant_id=tenant_a, member_id=str(member.id),
            type="baptism", date=D(2010, 1, 1),
        )
        req = await create_service_request(
            s, tenant_id=tenant_a, member_id=str(member.id),
            type="confirmation", scheduled_date=D(2024, 5, 1),
        )
        await approve_request(s, str(req.id), by=None)
        completed = await complete_request(
            s, str(req.id), tenant_id=tenant_a, by=None, minister_name="Bishop X",
        )

    async with tenant_session(tenant_a) as s:
        assert completed.status == "completed"
        assert completed.produced_record_id is not None
        # a confirmation sacrament now exists
        sacr = (
            await s.execute(
                select(SacramentalRecord).where(
                    SacramentalRecord.member_id == member.id,
                    SacramentalRecord.type == "confirmation",
                )
            )
        ).scalar_one()
        assert str(sacr.id) == str(completed.produced_record_id)
        # and it was written back onto the baptism master record
        anns = await get_annotations(s, [baptism.id])
        assert len(anns[baptism.id]) == 1
        assert "Confirmation" in anns[baptism.id][0].text


async def test_fee_chain_records_pending_finance_entry(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        member = await _member(s, tenant_a)
        req = await create_service_request(
            s, tenant_id=tenant_a, member_id=str(member.id), type="marriage",
            scheduled_date=D(2025, 8, 1),
        )
        await approve_request(s, str(req.id), by=None)
        done = await complete_request(
            s, str(req.id), tenant_id=tenant_a, by=None, fee=50000,
        )
        assert done.produced_fee_id is not None

    async with tenant_session(tenant_a) as s:
        entry = (
            await s.execute(
                select(FinanceEntry).where(FinanceEntry.category == "service_fee")
            )
        ).scalar_one()
        assert float(entry.amount) == 50000.0
        assert str(entry.id) == str(done.produced_fee_id)
        assert entry.member_id == member.id
        # maker-checker still applies: the fee is pending until approved
        assert entry.approval_status == "pending"


async def test_workflow_transitions_enforced(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        member = await _member(s, tenant_a)
        req = await create_service_request(
            s, tenant_id=tenant_a, member_id=str(member.id), type="counseling",
        )
        # cannot complete before approval
        with pytest.raises(ServiceError):
            await complete_request(s, str(req.id), tenant_id=tenant_a, by=None)
        await reject_request(s, str(req.id), by=None)
        # cannot approve a rejected request
        with pytest.raises(ServiceError):
            await approve_request(s, str(req.id), by=None)


async def test_non_sacramental_completion_creates_no_record(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        member = await _member(s, tenant_a)
        req = await create_service_request(
            s, tenant_id=tenant_a, member_id=str(member.id), type="transfer_letter",
        )
        await approve_request(s, str(req.id), by=None)
        done = await complete_request(s, str(req.id), tenant_id=tenant_a, by=None)
        assert done.produced_record_id is None
        count = (
            await s.execute(select(func.count(SacramentalRecord.id)))
        ).scalar_one()
        assert count == 0


async def test_requests_are_tenant_isolated(two_tenants):
    tenant_a, tenant_b = two_tenants
    async with tenant_session(tenant_a) as s:
        member = await _member(s, tenant_a)
        await create_service_request(
            s, tenant_id=tenant_a, member_id=str(member.id), type="baptism",
        )
    async with tenant_session(tenant_b) as s:
        count = (
            await s.execute(select(func.count(ServiceRequest.id)))
        ).scalar_one()
        assert count == 0
