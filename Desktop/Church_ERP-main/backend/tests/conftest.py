import uuid

import pytest_asyncio
from sqlalchemy import delete

from app.core.db import SessionLocal, engine, tenant_session
from app.models import Member, Tenant, TenantBranding


@pytest_asyncio.fixture(autouse=True)
async def _dispose_engine_between_tests():
    """pytest-asyncio runs each test in its own event loop. asyncpg connections are
    bound to the loop that created them, so we dispose the pooled connections after
    each test to avoid cross-loop reuse errors."""
    yield
    await engine.dispose()


@pytest_asyncio.fixture()
async def two_tenants():
    """Create two throwaway tenants (A and B), each with one member, then clean up.
    Returns (tenant_a_id, tenant_b_id)."""
    suffix = uuid.uuid4().hex[:8]
    ids: dict[str, str] = {}
    async with SessionLocal() as session:
        async with session.begin():
            for key in ("a", "b"):
                t = Tenant(slug=f"test-{key}-{suffix}", name=f"Test {key.upper()}")
                t.branding = TenantBranding(display_name=f"Test {key.upper()}")
                session.add(t)
                await session.flush()
                ids[key] = str(t.id)

    for key in ("a", "b"):
        async with tenant_session(ids[key]) as ts:
            ts.add(
                Member(
                    tenant_id=ids[key],
                    member_no="MEM-0001",
                    full_name=f"Member of {key.upper()}",
                )
            )

    yield ids["a"], ids["b"]

    # teardown: deleting the tenant cascades to branding + members (a referential
    # cascade runs as a system action, so it is not blocked by RLS). The tenants
    # table itself has no RLS.
    async with SessionLocal() as session:
        async with session.begin():
            for key in ("a", "b"):
                await session.execute(delete(Tenant).where(Tenant.id == ids[key]))
