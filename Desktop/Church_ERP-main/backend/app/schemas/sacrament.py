import datetime

from pydantic import BaseModel


class SacramentTypeInfo(BaseModel):
    key: str
    label_en: str
    label_sw: str


class SacramentCreate(BaseModel):
    type: str
    date: datetime.date
    org_unit_id: str | None = None
    minister_name: str | None = None
    register_book: str | None = None
    register_page: str | None = None
    witnesses: list[str] = []
    spouse_member_id: str | None = None
    notes: str | None = None


class AnnotationOut(BaseModel):
    text: str
    source_unit_name: str | None


class SacramentResponse(BaseModel):
    id: str
    type: str
    type_label_en: str
    type_label_sw: str
    date: datetime.date
    place: str | None
    minister_name: str | None
    register_book: str | None
    register_page: str | None
    witnesses: list[str]
    spouse_name: str | None
    notes: str | None
    is_master: bool
    annotations: list[AnnotationOut]


class TimelineResponse(BaseModel):
    member_id: str
    member_name: str
    member_no: str
    records: list[SacramentResponse]
