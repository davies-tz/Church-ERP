"""Announcements: scoped by org unit, visible to units at/below that scope, ranked by
urgency then recency."""
import pytest
from sqlalchemy import select

from app.core.db import tenant_session
from app.domain.announcements import (
    AnnouncementError,
    create_announcement,
    recipients_for,
    visible_to,
)
from app.domain.members import create_member
from app.domain.structure import create_org_unit
from app.domain.templates import seed_levels
from app.models import User


async def _user(session, tenant_id, email="a@x.local"):
    user = User(tenant_id=tenant_id, email=email, password_hash="x",
                name="A", role="member")
    session.add(user)
    await session.flush()
    return user


async def test_tenant_wide_announcement_visible_to_everyone(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await seed_levels(s, tenant_a, "blank")
        church = await create_org_unit(s, tenant_id=tenant_a, level_key="church", name="C")
        user = await _user(s, tenant_a)
        member = await create_member(
            s, tenant_id=tenant_a, full_name="M", org_unit_id=church.id, user_id=user.id,
        )
        await create_announcement(
            s, tenant_id=tenant_a, published_by=str(user.id), title="Hi", body="Body",
        )
        visible = await visible_to(s, user)
        assert len(visible) == 1
        assert visible[0].title == "Hi"


async def test_scoped_announcement_only_visible_below_its_unit(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await seed_levels(s, tenant_a, "blank")
        church = await create_org_unit(s, tenant_id=tenant_a, level_key="church", name="Church")
        group_in = await create_org_unit(
            s, tenant_id=tenant_a, level_key="group", name="In", parent_id=str(church.id)
        )
        church_out = await create_org_unit(s, tenant_id=tenant_a, level_key="church", name="Out")
        publisher = await _user(s, tenant_a, "pub@x.local")
        in_user = await _user(s, tenant_a, "in@x.local")
        out_user = await _user(s, tenant_a, "out@x.local")
        await create_member(s, tenant_id=tenant_a, full_name="In", org_unit_id=group_in.id, user_id=in_user.id)
        await create_member(s, tenant_id=tenant_a, full_name="Out", org_unit_id=church_out.id, user_id=out_user.id)

        await create_announcement(
            s, tenant_id=tenant_a, published_by=str(publisher.id), title="Church notice",
            body="Body", org_unit_id=str(church.id),
        )
        assert len(await visible_to(s, in_user)) == 1
        assert len(await visible_to(s, out_user)) == 0

        recipients = await recipients_for(s, str(church.id))
        assert in_user.id in recipients
        assert out_user.id not in recipients


async def test_ordered_by_urgency_then_recency(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await seed_levels(s, tenant_a, "blank")
        church = await create_org_unit(s, tenant_id=tenant_a, level_key="church", name="C")
        user = await _user(s, tenant_a)
        await create_member(s, tenant_id=tenant_a, full_name="M", org_unit_id=church.id, user_id=user.id)
        await create_announcement(s, tenant_id=tenant_a, published_by=str(user.id), title="Low", body="B", urgency="low")
        await create_announcement(s, tenant_id=tenant_a, published_by=str(user.id), title="Urgent", body="B", urgency="urgent")
        await create_announcement(s, tenant_id=tenant_a, published_by=str(user.id), title="Normal", body="B", urgency="normal")
        visible = await visible_to(s, user)
        assert [a.title for a in visible] == ["Urgent", "Normal", "Low"]


async def test_unknown_urgency_rejected(two_tenants):
    tenant_a, _ = two_tenants
    async with tenant_session(tenant_a) as s:
        await seed_levels(s, tenant_a, "blank")
        user = await _user(s, tenant_a)
        with pytest.raises(AnnouncementError):
            await create_announcement(
                s, tenant_id=tenant_a, published_by=str(user.id), title="X", body="B",
                urgency="not-a-level",
            )
