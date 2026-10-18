import datetime

from pydantic import BaseModel


class AnnouncementCreate(BaseModel):
    title: str
    body: str
    urgency: str = "normal"
    org_unit_id: str | None = None


class AnnouncementResponse(BaseModel):
    id: str
    title: str
    body: str
    urgency: str
    org_unit_id: str | None
    org_unit_name: str | None
    published_by_name: str | None
    created_at: datetime.datetime


class LatestAnnouncement(BaseModel):
    announcement: AnnouncementResponse | None
