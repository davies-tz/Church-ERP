"""Provision a brand-new church (tenant). This is a PLATFORM operation — it runs
before the tenant exists, so it is not tenant-scoped like the rest of the API. It
creates the tenant + branding, seeds the chosen hierarchy template, and creates the
first admin with a tenant-wide `tenant_admin` assignment.
"""
import re

from sqlalchemy import select

from app.core.db import SessionLocal, tenant_session
from app.core.security import hash_password
from app.domain.authz import create_assignment
from app.domain.templates import TEMPLATES, seed_levels
from app.models import Tenant, TenantBranding, User

SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")
RESERVED_SLUGS = {
    "www", "api", "app", "admin", "platform", "mail", "static",
    "assets", "cdn", "docs", "status", "help", "support",
}


class ProvisioningError(ValueError):
    """Raised for invalid slugs, unknown templates, or collisions."""


def validate_slug(slug: str) -> None:
    if not (2 <= len(slug) <= 40):
        raise ProvisioningError("Subdomain must be 2–40 characters")
    if not SLUG_RE.match(slug):
        raise ProvisioningError(
            "Subdomain may contain only lowercase letters, numbers and hyphens"
        )
    if slug in RESERVED_SLUGS:
        raise ProvisioningError(f"Subdomain '{slug}' is reserved")


async def provision_tenant(
    *,
    slug: str,
    name: str,
    template: str,
    admin_name: str,
    admin_email: str,
    admin_password: str,
    display_name: str | None = None,
    tagline: str | None = None,
    color_primary: str | None = None,
    color_secondary: str | None = None,
    color_accent: str | None = None,
    default_locale: str = "en",
) -> dict:
    slug = slug.strip().lower()
    validate_slug(slug)
    if template not in TEMPLATES:
        raise ProvisioningError(f"Unknown template '{template}'")

    # 1) tenant + branding (these tables have no RLS)
    async with SessionLocal() as session:
        async with session.begin():
            taken = (
                await session.execute(select(Tenant).where(Tenant.slug == slug))
            ).scalar_one_or_none()
            if taken:
                raise ProvisioningError(f"Subdomain '{slug}' is already taken")

            branding_kwargs = {"display_name": display_name or name, "tagline": tagline,
                               "default_locale": default_locale}
            if color_primary:
                branding_kwargs["color_primary"] = color_primary
            if color_secondary:
                branding_kwargs["color_secondary"] = color_secondary
            if color_accent:
                branding_kwargs["color_accent"] = color_accent

            tenant = Tenant(slug=slug, name=name)
            tenant.branding = TenantBranding(**branding_kwargs)
            session.add(tenant)
            await session.flush()
            tenant_id = str(tenant.id)

    # 2) admin + hierarchy levels + tenant-wide assignment (RLS-protected)
    async with tenant_session(tenant_id) as ts:
        admin = User(
            tenant_id=tenant_id,
            email=admin_email.strip().lower(),
            password_hash=hash_password(admin_password),
            name=admin_name,
            role="tenant_admin",
        )
        ts.add(admin)
        await ts.flush()
        await seed_levels(ts, tenant_id, template)
        await create_assignment(
            ts, tenant_id=tenant_id, user_id=str(admin.id),
            role_key="tenant_admin", org_unit=None,
        )

    return {
        "id": tenant_id,
        "slug": slug,
        "name": name,
        "admin_email": admin_email.strip().lower(),
    }
