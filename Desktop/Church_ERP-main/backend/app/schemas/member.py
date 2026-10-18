import datetime

from pydantic import BaseModel


class MemberCreate(BaseModel):
    full_name: str
    org_unit_id: str | None = None
    member_type: str | None = None
    gender: str | None = None
    dob: datetime.date | None = None
    marital_status: str | None = None
    occupation: str | None = None
    education: str | None = None
    phone: str | None = None
    alt_phone: str | None = None
    email: str | None = None
    region: str | None = None
    district: str | None = None
    ward: str | None = None
    street: str | None = None
    spouse_name: str | None = None
    emergency_contact: str | None = None


class MemberUpdate(BaseModel):
    full_name: str | None = None
    member_type: str | None = None
    gender: str | None = None
    dob: datetime.date | None = None
    marital_status: str | None = None
    occupation: str | None = None
    education: str | None = None
    phone: str | None = None
    alt_phone: str | None = None
    email: str | None = None
    region: str | None = None
    district: str | None = None
    ward: str | None = None
    street: str | None = None
    spouse_name: str | None = None
    emergency_contact: str | None = None


class MemberResponse(BaseModel):
    id: str
    member_no: str
    full_name: str
    status: str
    org_unit_id: str | None
    org_unit_name: str | None
    member_type: str | None
    gender: str | None
    dob: datetime.date | None
    marital_status: str | None
    occupation: str | None
    education: str | None
    phone: str | None
    alt_phone: str | None
    email: str | None
    region: str | None
    district: str | None
    ward: str | None
    street: str | None
    spouse_name: str | None
    emergency_contact: str | None
    has_photo: bool
