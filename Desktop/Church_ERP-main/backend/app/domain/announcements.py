"""Announcements: admins publish scoped, urgency-ranked notices. Visibility reuses the
same path-prefix scoping as authz — an announcement published at a unit is visible to
that unit and everything below it (tenant-wide when published with no unit)."""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Announcement, Assignment, Member, OrgUnit, User

URGENCY_RANK = {"low": 0, "normal": 1, "high": 2, "urgent": 3}
URGENCIES = tuple(URGENCY_RANK)


class AnnouncementError(ValueError):
    """Raised for an unknown urgency or a missing org unit."""


async def create_announcement(
    session: AsyncSession,
    *,
    tenant_id: str,
    published_by: str,
    title: str,
    body: str,
    urgency: str = "normal",
    org_unit_id: str | None = None,
) -> Announcement:
    if urgency not in URGENCY_RANK:
        raise AnnouncementError(f"Unknown urgency '{urgency}'")
    unit = None
    if org_unit_id:
        unit = await session.get(OrgUnit, uuid.UUID(str(org_unit_id)))
        if unit is None:
            raise AnnouncementError("Org unit not found")
    ann = Announcement(
        tenant_id=tenant_id,
        org_unit_id=unit.id if unit else None,
        title=title,
        body=body,
        urgency=urgency,
        published_by=uuid.UUID(str(published_by)) if published_by else None,
    )
    session.add(ann)
    await session.flush()
    return ann


async def _viewer_path(session: AsyncSession, user: User) -> str:
    """The org-unit path used to decide which announcements a user sees: their own
    member record's church if they have one, else the broadest (shortest) scope among
    their assignments, else tenant-wide."""
    member = (
        await session.execute(select(Member).where(Member.user_id == user.id))
    ).scalar_one_or_none()
    if member and member.org_unit_id:
        unit = await session.get(OrgUnit, member.org_unit_id)
        if unit:
            return unit.path
    rows = (
        await session.execute(
            select(Assignment.scope_path).where(
                Assignment.user_id == user.id, Assignment.active.is_(True)
            )
        )
    ).scalars().all()
    if rows:
        return min(rows, key=len)
    return "/"


async def visible_to(session: AsyncSession, user: User) -> list[Announcement]:
    """Announcements relevant to this user: ones that cascade down to their own church
    (announcement scope is a prefix of their path), plus ones published anywhere within
    their own administrative oversight (their path is a prefix of the announcement's
    scope) — so a diocese admin still sees a notice they scoped to one parish. Most
    urgent + newest first."""
    path = await _viewer_path(session, user)
    rows = (
        await session.execute(
            select(Announcement, OrgUnit.path)
            .select_from(Announcement)
            .join(OrgUnit, Announcement.org_unit_id == OrgUnit.id, isouter=True)
        )
    ).all()
    out = [
        ann for ann, ann_path in rows
        if path.startswith(ann_path or "/") or (ann_path or "/").startswith(path)
    ]
    out.sort(key=lambda a: (URGENCY_RANK.get(a.urgency, 0), a.created_at), reverse=True)
    return out


async def recipients_for(session: AsyncSession, org_unit_id: str | None) -> list[uuid.UUID]:
    """User ids of members whose church is covered by this announcement's scope, for
    notification fan-out."""
    ann_path = "/"
    if org_unit_id:
        unit = await session.get(OrgUnit, uuid.UUID(str(org_unit_id)))
        ann_path = unit.path if unit else "/"
    rows = (
        await session.execute(
            select(Member.user_id, OrgUnit.path)
            .select_from(Member)
            .join(OrgUnit, Member.org_unit_id == OrgUnit.id, isouter=True)
            .where(Member.user_id.is_not(None))
        )
    ).all()
    return list({uid for uid, path in rows if (path or "/").startswith(ann_path)})
