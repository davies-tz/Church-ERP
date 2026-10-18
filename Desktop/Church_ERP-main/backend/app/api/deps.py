from collections.abc import AsyncIterator

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import SessionLocal, set_tenant
from app.core.security import decode_access_token
from app.core.tenancy import resolve_tenant_slug
from app.models import Tenant, User


async def get_tenant(
    request: Request,
    x_tenant_slug: str | None = Header(default=None),
) -> Tenant:
    """Resolve the church for this request from subdomain / header. Runs before any
    tenant GUC is set — the tenants table is intentionally not behind RLS."""
    slug = resolve_tenant_slug(request.headers.get("host"), x_tenant_slug)
    if not slug:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Could not resolve tenant")
    async with SessionLocal() as session:
        tenant = (
            await session.execute(select(Tenant).where(Tenant.slug == slug))
        ).scalar_one_or_none()
    if not tenant or tenant.status != "active":
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown tenant '{slug}'")
    return tenant


def _bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    return authorization.split(" ", 1)[1]


async def get_scoped_session(
    tenant: Tenant = Depends(get_tenant),
    authorization: str | None = Header(default=None),
) -> AsyncIterator[tuple[AsyncSession, User]]:
    """Authenticated + tenant-scoped DB session. Sets the RLS GUC to the caller's
    tenant and verifies the JWT belongs to the tenant of this request."""
    token = _bearer_token(authorization)
    try:
        payload = decode_access_token(token)
    except Exception:  # noqa: BLE001 - any decode error is an auth failure
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")

    if payload.get("tenant_id") != str(tenant.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Token/tenant mismatch")

    async with SessionLocal() as session:
        async with session.begin():
            await set_tenant(session, str(tenant.id))
            user = (
                await session.execute(
                    select(User).where(User.id == payload["sub"])
                )
            ).scalar_one_or_none()
            if not user or user.status != "active":
                raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Unknown user")
            yield session, user
