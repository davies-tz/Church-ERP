"""In-app notifications: emit, list, unread count, mark read, isolation."""
from sqlalchemy import func, select

from app.core.db import tenant_session
from app.domain import notifications
from app.models import Notification, User


async def _user(session, tenant_id, email="n@x.local") -> User:
    u = User(tenant_id=tenant_id, email=email, password_hash="x", name="N", role="member")
    session.add(u)
    await session.flush()
    return u


async def test_notify_and_unread_count(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        user = await _user(s, tenant_a)
        await notifications.notify(
            s, tenant_id=tenant_a, user_id=str(user.id), title="Hi", category="info"
        )
        await notifications.notify(
            s, tenant_id=tenant_a, user_id=str(user.id), title="Approved",
            category="approval", link="requests",
        )
    async with tenant_session(tenant_a) as s:
        assert await notifications.unread_count(s, user.id) == 2
        rows = await notifications.list_for_user(s, user.id)
        # both seeded in one transaction share created_at, so don't assert order
        assert {n.title for n in rows} == {"Hi", "Approved"}
        await notifications.mark_read(s, user.id, str(rows[0].id))
    async with tenant_session(tenant_a) as s:
        assert await notifications.unread_count(s, user.id) == 1
        await notifications.mark_all_read(s, user.id)
    async with tenant_session(tenant_a) as s:
        assert await notifications.unread_count(s, user.id) == 0


async def test_notifications_are_tenant_isolated(two_tenants):
    tenant_a, tenant_b = two_tenants
    async with tenant_session(tenant_a) as s:
        user = await _user(s, tenant_a)
        await notifications.notify(
            s, tenant_id=tenant_a, user_id=str(user.id), title="Secret"
        )
    async with tenant_session(tenant_b) as s:
        count = (await s.execute(select(func.count(Notification.id)))).scalar_one()
        assert count == 0
