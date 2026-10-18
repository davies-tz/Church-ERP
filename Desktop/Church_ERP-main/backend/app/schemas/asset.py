import datetime

from pydantic import BaseModel


class AssetTypeInfo(BaseModel):
    key: str
    label_en: str
    label_sw: str


class AssetCreate(BaseModel):
    type: str
    name: str
    org_unit_id: str | None = None
    code: str | None = None
    acquisition_date: datetime.date | None = None
    value: float | None = None
    condition: str | None = None
    reg_no: str | None = None
    custodian: str | None = None
    notes: str | None = None


class AssetResponse(BaseModel):
    id: str
    type: str
    name: str
    org_unit_id: str | None
    org_unit_name: str | None
    code: str | None
    acquisition_date: datetime.date | None
    value: float | None
    currency: str
    condition: str | None
    reg_no: str | None
    custodian: str | None
    status: str
    notes: str | None


class MaintenanceCreate(BaseModel):
    date: datetime.date
    action: str
    cost: float | None = None
    note: str | None = None


class MaintenanceResponse(BaseModel):
    id: str
    date: datetime.date
    action: str
    cost: float | None
    note: str | None
    recorded_by_name: str | None


class InventoryCreate(BaseModel):
    name: str
    quantity: float = 0
    unit: str | None = None
    reorder_level: float | None = None
    org_unit_id: str | None = None


class InventoryResponse(BaseModel):
    id: str
    name: str
    quantity: float
    unit: str | None
    reorder_level: float | None
    low_stock: bool
    org_unit_name: str | None


class AssetSummary(BaseModel):
    total_value: float
    total_count: int
    by_type: dict
    low_stock: int
    currency: str
