"""Sacramental records: the baptism master-record annotation flow, canonical rules,
and tenant isolation."""
import datetime

import pytest
from sqlalchemy import func, select

from app.core.db import tenant_session
from app.domain import authz
from app.domain.sacraments import (
    SacramentError,
    get_annotations,
    record_sacrament,
)
from app.models import BaptismAnnotation, Member, SacramentalRecord

D = datetime.date


def test_sacraments_capability_by_role():
    assert authz.MANAGE_SACRAMENTS in authz.role_capabilities("pastor")
    assert authz.MANAGE_SACRAMENTS in authz.role_capabilities("tenant_admin")
    assert authz.MANAGE_SACRAMENTS not in authz.role_capabilities("secretary")


async def _new_member(session, tenant_id, name="Test Person") -> Member:
    m = Member(tenant_id=tenant_id, member_no="MEM-T001", full_name=name)
    session.add(m)
    await session.flush()
    return m


async def test_later_sacraments_annotate_baptism(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        member = await _new_member(s, tenant_a)
        baptism = await record_sacrament(
            s, tenant_id=tenant_a, member_id=str(member.id),
            type="baptism", date=D(2015, 3, 15),
        )
        await record_sacrament(
            s, tenant_id=tenant_a, member_id=str(member.id),
            type="confirmation", date=D(2022, 6, 12),
        )

    async with tenant_session(tenant_a) as s:
        # two records on the timeline
        records = (
            await s.execute(
                select(SacramentalRecord).where(SacramentalRecord.member_id == member.id)
            )
        ).scalars().all()
        assert {r.type for r in records} == {"baptism", "confirmation"}
        # the confirmation was written back onto the baptism master record
        anns = await get_annotations(s, [baptism.id])
        assert len(anns[baptism.id]) == 1
        assert "Confirmation" in anns[baptism.id][0].text


async def test_single_baptism_enforced(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        member = await _new_member(s, tenant_a)
        await record_sacrament(
            s, tenant_id=tenant_a, member_id=str(member.id),
            type="baptism", date=D(2015, 3, 15),
        )
        with pytest.raises(SacramentError):
            await record_sacrament(
                s, tenant_id=tenant_a, member_id=str(member.id),
                type="baptism", date=D(2016, 1, 1),
            )


async def test_unknown_type_rejected(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        member = await _new_member(s, tenant_a)
        with pytest.raises(SacramentError):
            await record_sacrament(
                s, tenant_id=tenant_a, member_id=str(member.id),
                type="not_a_sacrament", date=D(2020, 1, 1),
            )


async def test_sacraments_are_tenant_isolated(two_tenants):
    tenant_a, tenant_b = two_tenants
    async with tenant_session(tenant_a) as s:
        member = await _new_member(s, tenant_a)
        await record_sacrament(
            s, tenant_id=tenant_a, member_id=str(member.id),
            type="baptism", date=D(2015, 3, 15),
        )
    async with tenant_session(tenant_b) as s:
        count = (
            await s.execute(select(func.count(SacramentalRecord.id)))
        ).scalar_one()
        assert count == 0
        ann_count = (
            await s.execute(select(func.count(BaptismAnnotation.id)))
        ).scalar_one()
        assert ann_count == 0
