import datetime

from pydantic import BaseModel


class TransferCreate(BaseModel):
    to_unit_id: str
    reason: str | None = None


class TransferResponse(BaseModel):
    id: str
    member_id: str
    member_name: str
    from_unit_id: str | None
    from_unit_name: str | None
    to_unit_id: str
    to_unit_name: str
    reason: str | None
    status: str
    has_letter: bool
    created_at: datetime.datetime


class MyTransfer(BaseModel):
    request: TransferResponse | None
