import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    title: str
    body: str | None
    category: str
    link: str | None
    read: bool
    created_at: datetime.datetime


class UnreadCount(BaseModel):
    count: int
