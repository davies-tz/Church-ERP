"""Provisioning: slug rules, and that a new tenant comes up fully usable (branding,
seeded hierarchy levels, a first admin with tenant-wide authority)."""
import uuid

import pytest
from sqlalchemy import delete, func, select

from app.core.db import SessionLocal, tenant_session
from app.domain import authz
from app.domain.provisioning import (
    ProvisioningError,
    provision_tenant,
    validate_slug,
)
from app.domain.templates import TEMPLATES
from app.models import Assignment, HierarchyLevelType, Tenant, User


def test_validate_slug():
    validate_slug("grace")
    validate_slug("st-marks-2")
    for bad in ["a", "UPPER", "has space", "-lead", "trail-", "api", "www"]:
        with pytest.raises(ProvisioningError):
            validate_slug(bad)


async def _cleanup(slug: str):
    async with SessionLocal() as s:
        async with s.begin():
            await s.execute(delete(Tenant).where(Tenant.slug == slug))


async def test_provision_creates_usable_tenant():
    slug = f"prov-{uuid.uuid4().hex[:8]}"
    try:
        result = await provision_tenant(
            slug=slug, name="New Church", template="catholic",
            admin_name="First Admin", admin_email="admin@newchurch.local",
            admin_password="supersecret", default_locale="en",
        )
        assert result["slug"] == slug
        tenant_id = result["id"]

        async with tenant_session(tenant_id) as s:
            # branding + admin exist
            admin = (
                await s.execute(select(User).where(User.email == "admin@newchurch.local"))
            ).scalar_one()
            # hierarchy levels seeded to match the template
            level_count = (
                await s.execute(select(func.count(HierarchyLevelType.id)))
            ).scalar_one()
            assert level_count == len(TEMPLATES["catholic"])
            # admin has a tenant-wide assignment granting appoint
            grants = await authz.load_grants(s, admin.id)
            assert any(g.scope_path == "/" for g in grants)
            assert authz.can(grants, authz.APPOINT)
            assert authz.can(grants, authz.MANAGE_STRUCTURE, "/anything/")
    finally:
        await _cleanup(slug)


async def test_duplicate_slug_rejected():
    slug = f"dup-{uuid.uuid4().hex[:8]}"
    try:
        await provision_tenant(
            slug=slug, name="A", template="blank",
            admin_name="A", admin_email="a@a.local", admin_password="password1",
        )
        with pytest.raises(ProvisioningError):
            await provision_tenant(
                slug=slug, name="B", template="blank",
                admin_name="B", admin_email="b@b.local", admin_password="password1",
            )
    finally:
        await _cleanup(slug)


async def test_provisioned_tenant_is_isolated():
    slug_a = f"iso-a-{uuid.uuid4().hex[:6]}"
    slug_b = f"iso-b-{uuid.uuid4().hex[:6]}"
    try:
        a = await provision_tenant(
            slug=slug_a, name="A", template="blank",
            admin_name="A", admin_email="a@a.local", admin_password="password1",
        )
        await provision_tenant(
            slug=slug_b, name="B", template="blank",
            admin_name="B", admin_email="b@b.local", admin_password="password1",
        )
        # from B's context, A's assignments/users are invisible
        async with tenant_session(a["id"]) as s:
            a_assignments = (
                await s.execute(select(func.count(Assignment.id)))
            ).scalar_one()
        async with SessionLocal() as s:
            async with s.begin():
                from app.core.db import set_tenant
                # deliberately set context to B and count — should not see A's row
                b_tenant = (
                    await s.execute(select(Tenant).where(Tenant.slug == slug_b))
                ).scalar_one()
                await set_tenant(s, str(b_tenant.id))
                cross = (
                    await s.execute(
                        select(func.count(Assignment.id)).where(
                            Assignment.tenant_id == uuid.UUID(a["id"])
                        )
                    )
                ).scalar_one()
        assert a_assignments == 1
        assert cross == 0
    finally:
        await _cleanup(slug_a)
        await _cleanup(slug_b)
