from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.api.deps import get_scoped_session
from app.domain import authz, notifications
from app.domain.announcements import (
    AnnouncementError,
    create_announcement,
    recipients_for,
    visible_to,
)
from app.models import Announcement, OrgUnit, User
from app.schemas.announcement import (
    AnnouncementCreate,
    AnnouncementResponse,
    LatestAnnouncement,
)

router = APIRouter(prefix="/announcements", tags=["announcements"])


async def _to_response(session, ann: Announcement) -> AnnouncementResponse:
    unit = await session.get(OrgUnit, ann.org_unit_id) if ann.org_unit_id else None
    publisher = await session.get(User, ann.published_by) if ann.published_by else None
    return AnnouncementResponse(
        id=str(ann.id),
        title=ann.title,
        body=ann.body,
        urgency=ann.urgency,
        org_unit_id=str(ann.org_unit_id) if ann.org_unit_id else None,
        org_unit_name=unit.name if unit else None,
        published_by_name=publisher.name if publisher else None,
        created_at=ann.created_at,
    )


@router.get("", response_model=list[AnnouncementResponse])
async def list_announcements(ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    anns = await visible_to(session, user)
    return [await _to_response(session, a) for a in anns]


@router.get("/latest", response_model=LatestAnnouncement)
async def latest_announcement(ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    anns = await visible_to(session, user)
    return LatestAnnouncement(
        announcement=await _to_response(session, anns[0]) if anns else None
    )


@router.post("", response_model=AnnouncementResponse, status_code=201)
async def publish(body: AnnouncementCreate, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    grants = await authz.load_grants(session, user.id)
    target_path = "/"
    if body.org_unit_id:
        unit = (
            await session.execute(select(OrgUnit).where(OrgUnit.id == body.org_unit_id))
        ).scalar_one_or_none()
        if unit is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Org unit not found")
        target_path = unit.path
    if not authz.can(grants, authz.MANAGE_STRUCTURE, target_path):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "You cannot publish at that level"
        )
    try:
        ann = await create_announcement(
            session,
            tenant_id=str(user.tenant_id),
            published_by=str(user.id),
            title=body.title,
            body=body.body,
            urgency=body.urgency,
            org_unit_id=body.org_unit_id,
        )
    except AnnouncementError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    for uid in await recipients_for(session, body.org_unit_id):
        if str(uid) == str(user.id):
            continue
        await notifications.notify(
            session,
            tenant_id=str(user.tenant_id),
            user_id=str(uid),
            title=ann.title,
            body=ann.body,
            category="announcement",
            link="announcements",
        )
    return await _to_response(session, ann)
