from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.db import SessionLocal
from app.domain.provisioning import ProvisioningError, provision_tenant
from app.domain.templates import TEMPLATES, iter_levels
from app.models import Tenant
from app.schemas.platform import (
    ProvisionRequest,
    ProvisionResponse,
    TemplateInfo,
    TemplateLevel,
    TenantSummary,
)

router = APIRouter(prefix="/platform", tags=["platform"])


async def require_platform_token(x_platform_token: str | None = Header(default=None)):
    """Guards the whole provisioning surface with the operator token. Not tenant-scoped."""
    if not x_platform_token or x_platform_token != settings.PLATFORM_ADMIN_TOKEN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid platform token")


_TEMPLATE_LABELS = {
    "anglican": "Anglican",
    "catholic": "Catholic",
    "lutheran": "Lutheran / KKKT",
    "blank": "Blank (custom)",
}


@router.get("/templates", response_model=list[TemplateInfo],
            dependencies=[Depends(require_platform_token)])
async def list_templates():
    out: list[TemplateInfo] = []
    for key in TEMPLATES:
        levels = [
            TemplateLevel(key=lk, label_en=en, label_sw=sw)
            for lk, en, sw, _depth, _parent in iter_levels(key)
        ]
        out.append(TemplateInfo(key=key, label=_TEMPLATE_LABELS.get(key, key), levels=levels))
    return out


@router.get("/tenants", response_model=list[TenantSummary],
            dependencies=[Depends(require_platform_token)])
async def list_tenants():
    async with SessionLocal() as session:
        rows = (
            await session.execute(
                select(Tenant).options(selectinload(Tenant.branding)).order_by(Tenant.slug)
            )
        ).scalars().all()
    return [
        TenantSummary(
            slug=t.slug,
            name=t.name,
            display_name=t.branding.display_name if t.branding else t.name,
        )
        for t in rows
    ]


@router.post("/tenants", response_model=ProvisionResponse, status_code=201,
             dependencies=[Depends(require_platform_token)])
async def create_tenant(body: ProvisionRequest):
    try:
        result = await provision_tenant(
            slug=body.slug,
            name=body.name,
            template=body.template,
            admin_name=body.admin_name,
            admin_email=body.admin_email,
            admin_password=body.admin_password,
            display_name=body.display_name,
            tagline=body.tagline,
            color_primary=body.color_primary,
            color_secondary=body.color_secondary,
            color_accent=body.color_accent,
            default_locale=body.default_locale,
        )
    except ProvisioningError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return ProvisionResponse(portal_path=f"/?tenant={result['slug']}", **result)
