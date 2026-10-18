from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True, future=True)

SessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
)

# GUC that RLS policies read to scope every query to one tenant.
TENANT_GUC = "app.current_tenant_id"


async def set_tenant(session: AsyncSession, tenant_id: str | None) -> None:
    """Bind the current tenant for this transaction. Uses set_config(..., is_local=true)
    so the setting is scoped to the surrounding transaction only."""
    await session.execute(
        text("SELECT set_config(:key, :val, true)"),
        {"key": TENANT_GUC, "val": str(tenant_id) if tenant_id else ""},
    )


@asynccontextmanager
async def tenant_session(tenant_id: str | None) -> AsyncIterator[AsyncSession]:
    """Open a session inside a transaction with the tenant GUC applied.
    Every tenant-owned query inside is filtered by Postgres RLS."""
    async with SessionLocal() as session:
        async with session.begin():
            await set_tenant(session, tenant_id)
            yield session
