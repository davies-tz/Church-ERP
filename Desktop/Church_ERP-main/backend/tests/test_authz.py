"""RBAC: role capabilities, scope-aware permission checks, and assignment isolation.

asyncio_mode=auto (pytest.ini) runs the async tests without an explicit marker, so the
sync unit tests below stay plain functions."""
from sqlalchemy import func, select

from app.core.db import tenant_session
from app.domain import authz
from app.domain.structure import create_org_unit
from app.domain.templates import seed_levels
from app.models import Assignment, User


def _grant(role: str, scope: str) -> authz.Grant:
    return authz.Grant(role, scope, authz.role_capabilities(role))


def test_role_capabilities():
    assert authz.APPOINT in authz.role_capabilities("tenant_admin")
    assert authz.role_capabilities("secretary") == frozenset({authz.MANAGE_MEMBERS})
    assert authz.role_capabilities("treasurer") == frozenset(
        {authz.RECORD_FINANCE, authz.VIEW_FINANCE}
    )
    assert authz.role_capabilities("member") == frozenset()


def test_scope_covers_at_and_below_only():
    grants = [_grant("secretary", "/A/B/")]
    assert authz.can(grants, authz.MANAGE_MEMBERS, "/A/B/") is True       # at scope
    assert authz.can(grants, authz.MANAGE_MEMBERS, "/A/B/C/") is True     # below scope
    assert authz.can(grants, authz.MANAGE_MEMBERS, "/A/") is False        # above scope
    assert authz.can(grants, authz.MANAGE_STRUCTURE, "/A/B/") is False    # wrong cap


def test_tenant_wide_scope_covers_everything():
    grants = [_grant("tenant_admin", "/")]
    assert authz.can(grants, authz.MANAGE_STRUCTURE, "/deep/nested/") is True
    assert authz.can(grants, authz.APPOINT) is True  # target None = any scope


async def _make_user(session, tenant_id, email="u@x.local", role="secretary") -> User:
    u = User(tenant_id=tenant_id, email=email, password_hash="x", name="U", role=role)
    session.add(u)
    await session.flush()
    return u


async def test_assignment_scope_and_grants(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await seed_levels(s, tenant_a, "catholic")
        arch = await create_org_unit(
            s, tenant_id=tenant_a, level_key="archdiocese", name="Arch"
        )
        user = await _make_user(s, tenant_a)
        await authz.create_assignment(
            s, tenant_id=tenant_a, user_id=str(user.id),
            role_key="secretary", org_unit=arch,
        )

    async with tenant_session(tenant_a) as s:
        grants = await authz.load_grants(s, user.id)
        assert len(grants) == 1
        assert grants[0].scope_path == arch.path
        assert authz.can(grants, authz.MANAGE_MEMBERS, arch.path) is True
        assert authz.can(grants, authz.MANAGE_STRUCTURE, arch.path) is False


async def test_assignments_are_tenant_isolated(two_tenants):
    tenant_a, tenant_b = two_tenants
    async with tenant_session(tenant_a) as s:
        user = await _make_user(s, tenant_a, email="admin@x.local", role="tenant_admin")
        await authz.create_assignment(
            s, tenant_id=tenant_a, user_id=str(user.id),
            role_key="tenant_admin", org_unit=None,
        )
    async with tenant_session(tenant_b) as s:
        count = (await s.execute(select(func.count(Assignment.id)))).scalar_one()
        assert count == 0
