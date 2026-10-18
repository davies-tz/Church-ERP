"""In-app notification core: an emit helper other modules call, plus queries."""
import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification


async def notify(
    session: AsyncSession,
    *,
    tenant_id: str,
    user_id: str,
    title: str,
    body: str | None = None,
    category: str = "info",
    link: str | None = None,
) -> Notification:
    n = Notification(
        tenant_id=tenant_id, user_id=uuid.UUID(str(user_id)), title=title,
        body=body, category=category, link=link, read=False,
    )
    session.add(n)
    await session.flush()
    return n


async def list_for_user(session: AsyncSession, user_id, limit: int = 50):
    return (
        await session.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()


async def unread_count(session: AsyncSession, user_id) -> int:
    return (
        await session.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id, Notification.read.is_(False)
            )
        )
    ).scalar_one()


async def mark_read(session: AsyncSession, user_id, notification_id: str) -> bool:
    result = await session.execute(
        update(Notification)
        .where(
            Notification.id == uuid.UUID(notification_id),
            Notification.user_id == user_id,
        )
        .values(read=True)
    )
    return result.rowcount > 0


async def mark_all_read(session: AsyncSession, user_id) -> int:
    result = await session.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.read.is_(False))
        .values(read=True)
    )
    return result.rowcount
