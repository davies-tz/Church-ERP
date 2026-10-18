"""The foundation test: prove that Postgres Row-Level Security isolates tenants.

With tenant B's context set, no query can read tenant A's rows — and this is
enforced by the database, not by any WHERE clause in application code.
"""
import uuid

import pytest
from sqlalchemy import func, select, text

from app.core.db import SessionLocal, tenant_session
from app.models import Member

pytestmark = pytest.mark.asyncio


async def test_context_scopes_reads(two_tenants):
    tenant_a, tenant_b = two_tenants

    async with tenant_session(tenant_a) as s:
        rows = (await s.execute(select(Member))).scalars().all()
        assert len(rows) == 1
        assert all(str(m.tenant_id) == tenant_a for m in rows)

    async with tenant_session(tenant_b) as s:
        rows = (await s.execute(select(Member))).scalars().all()
        assert len(rows) == 1
        assert all(str(m.tenant_id) == tenant_b for m in rows)


async def test_tenant_b_cannot_see_tenant_a(two_tenants):
    tenant_a, tenant_b = two_tenants
    async with tenant_session(tenant_b) as s:
        # Even asking explicitly for A's rows returns nothing.
        count = (
            await s.execute(
                select(func.count(Member.id)).where(
                    Member.tenant_id == uuid.UUID(tenant_a)
                )
            )
        ).scalar_one()
        assert count == 0


async def test_no_context_means_no_rows(two_tenants):
    # With no tenant GUC set, RLS denies everything (default deny).
    async with SessionLocal() as s:
        async with s.begin():
            count = (
                await s.execute(select(func.count(Member.id)))
            ).scalar_one()
            assert count == 0


async def test_cannot_insert_into_another_tenant(two_tenants):
    tenant_a, tenant_b = two_tenants
    # Context is B, but we try to write a row tagged as A -> WITH CHECK blocks it.
    with pytest.raises(Exception):
        async with tenant_session(tenant_b) as s:
            s.add(
                Member(
                    tenant_id=uuid.UUID(tenant_a),
                    member_no="MEM-9999",
                    full_name="Injected",
                )
            )
            await s.flush()


async def test_rls_is_actually_enabled():
    # Guard rail: if someone connects as a superuser/BYPASSRLS role, isolation is a
    # lie. Assert the app's DB role is subject to RLS.
    async with SessionLocal() as s:
        is_super = (
            await s.execute(text("SELECT rolsuper OR rolbypassrls FROM pg_roles "
                                 "WHERE rolname = current_user"))
        ).scalar_one()
        assert is_super is False, "App role must not be superuser/BYPASSRLS"
