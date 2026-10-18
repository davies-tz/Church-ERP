from fastapi import APIRouter, Depends

from app.api.deps import get_scoped_session
from app.domain import notifications
from app.schemas.notification import NotificationResponse, UnreadCount

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def my_notifications(ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    rows = await notifications.list_for_user(session, user.id)
    return [
        NotificationResponse(
            id=str(n.id), title=n.title, body=n.body, category=n.category,
            link=n.link, read=n.read, created_at=n.created_at,
        )
        for n in rows
    ]


@router.get("/unread-count", response_model=UnreadCount)
async def unread(ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    return UnreadCount(count=await notifications.unread_count(session, user.id))


@router.post("/{notification_id}/read", status_code=204)
async def read_one(notification_id: str, ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    await notifications.mark_read(session, user.id, notification_id)


@router.post("/read-all", status_code=204)
async def read_all(ctx: tuple = Depends(get_scoped_session)):
    session, user = ctx
    await notifications.mark_all_read(session, user.id)
