import datetime

from pydantic import BaseModel


class CategoryInfo(BaseModel):
    key: str
    label_en: str
    label_sw: str
    direction: str


class MethodInfo(BaseModel):
    key: str
    label_en: str
    label_sw: str


class FinanceCreate(BaseModel):
    category: str
    amount: float
    method: str | None = None
    member_id: str | None = None
    org_unit_id: str | None = None
    date: datetime.date | None = None
    note: str | None = None


class FinanceResponse(BaseModel):
    id: str
    date: datetime.date
    category: str
    direction: str
    amount: float
    currency: str
    method: str | None
    member_id: str | None
    member_name: str | None
    note: str | None
    approval_status: str
    recorded_by_name: str | None
    approved_by_name: str | None


class FinanceSummary(BaseModel):
    income: float
    expense: float
    net: float
    pending: int
    currency: str
