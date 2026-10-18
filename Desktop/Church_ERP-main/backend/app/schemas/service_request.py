import datetime

from pydantic import BaseModel


class ServiceTypeInfo(BaseModel):
    key: str
    label_en: str
    label_sw: str
    sacrament_type: str | None  # non-null => completing it records a sacrament


class ServiceRequestCreate(BaseModel):
    member_id: str
    type: str
    org_unit_id: str | None = None
    scheduled_date: datetime.date | None = None
    notes: str | None = None


class CompleteRequest(BaseModel):
    minister_name: str | None = None
    register_book: str | None = None
    register_page: str | None = None
    date: datetime.date | None = None
    fee: float | None = None


class ServiceRequestResponse(BaseModel):
    id: str
    member_id: str
    member_name: str
    type: str
    type_label_en: str
    type_label_sw: str
    sacrament_type: str | None
    status: str
    place: str | None
    scheduled_date: datetime.date | None
    notes: str | None
    requested_by_name: str | None
    decided_by_name: str | None
    produced_record_id: str | None
    produced_fee_id: str | None
