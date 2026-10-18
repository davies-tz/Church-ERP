from pydantic import BaseModel

from app.schemas.asset import AssetSummary
from app.schemas.finance import FinanceSummary


class SacramentTypeCount(BaseModel):
    key: str
    label_en: str
    label_sw: str
    count: int


class UnitCount(BaseModel):
    name: str
    count: int


class CategoryTotal(BaseModel):
    category: str
    label_en: str
    label_sw: str
    direction: str
    total: float


class DashboardResponse(BaseModel):
    members_total: int
    units_total: int
    requests_pending: int
    finance: FinanceSummary
    assets: AssetSummary
    sacraments_by_type: list[SacramentTypeCount]
    members_by_unit: list[UnitCount]
    finance_by_category: list[CategoryTotal]
