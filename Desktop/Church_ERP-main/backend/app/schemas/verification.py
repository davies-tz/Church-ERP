import datetime

from pydantic import BaseModel


class VerificationCreate(BaseModel):
    baptized_at_unit_id: str | None = None
    never_baptized: bool = False
    note: str | None = None


class VerificationDocumentOut(BaseModel):
    id: str
    filename: str
    content_type: str


class VerificationResponse(BaseModel):
    id: str
    member_id: str
    member_name: str
    baptized_at_unit_id: str | None
    baptized_at_unit_name: str | None
    never_baptized: bool
    note: str | None
    status: str
    created_at: datetime.datetime
    documents: list[VerificationDocumentOut]


class MyVerification(BaseModel):
    verification_status: str | None
    request: VerificationResponse | None
