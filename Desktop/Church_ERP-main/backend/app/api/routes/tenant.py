from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_tenant
from app.core.db import SessionLocal, set_tenant
from app.models import OrgUnit, Tenant, TenantBranding
from app.schemas.tenant import BrandingResponse, ChurchOption

router = APIRouter(prefix="/tenant", tags=["tenant"])


@router.get("/churches", response_model=list[ChurchOption])
async def churches(tenant: Tenant = Depends(get_tenant)):
    """Public: the tenant's churches (org units), for the self-registration dropdown."""
    async with SessionLocal() as session:
        async with session.begin():
            await set_tenant(session, str(tenant.id))
            rows = (
                await session.execute(select(OrgUnit).order_by(OrgUnit.path))
            ).scalars().all()
    return [
        ChurchOption(id=str(u.id), name=u.name, level_key=u.level_key) for u in rows
    ]


@router.get("/branding", response_model=BrandingResponse)
async def branding(tenant: Tenant = Depends(get_tenant)):
    """Public: lets the frontend theme the login screen before anyone signs in."""
    async with SessionLocal() as session:
        row = (
            await session.execute(
                select(Tenant)
                .options(selectinload(Tenant.branding))
                .where(Tenant.id == tenant.id)
            )
        ).scalar_one()
    b: TenantBranding = row.branding
    if not b:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No branding configured")
    return BrandingResponse(
        slug=row.slug,
        name=row.name,
        display_name=b.display_name,
        tagline=b.tagline,
        logo_light_url=b.logo_light_url,
        logo_dark_url=b.logo_dark_url,
        login_bg_url=b.login_bg_url,
        color_primary=b.color_primary,
        color_secondary=b.color_secondary,
        color_accent=b.color_accent,
        font_key=b.font_key,
        default_locale=b.default_locale,
        enabled_locales=b.enabled_locales,
    )
