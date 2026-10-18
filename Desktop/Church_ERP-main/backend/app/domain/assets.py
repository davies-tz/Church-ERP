"""Assets & resources domain: the asset-type catalog, asset/maintenance/inventory
creation, and the diocese-wide roll-up (counts by type, total value, low stock)."""
import datetime
import decimal
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Asset, AssetMaintenance, InventoryItem

# key -> (label_en, label_sw)
ASSET_TYPES: dict[str, tuple[str, str]] = {
    "land": ("Land", "Ardhi"),
    "building": ("Building", "Jengo"),
    "vehicle": ("Vehicle", "Gari"),
    "equipment": ("Equipment", "Vifaa"),
    "other": ("Other", "Nyingine"),
}


class AssetError(ValueError):
    """Raised for unknown asset types or bad values."""


def _dec(v) -> decimal.Decimal | None:
    if v is None or v == "":
        return None
    return decimal.Decimal(str(v))


async def create_asset(
    session: AsyncSession,
    *,
    tenant_id: str,
    type: str,
    name: str,
    org_unit_id: str | None = None,
    code: str | None = None,
    acquisition_date: datetime.date | None = None,
    value=None,
    condition: str | None = None,
    reg_no: str | None = None,
    custodian: str | None = None,
    notes: str | None = None,
) -> Asset:
    if type not in ASSET_TYPES:
        raise AssetError(f"Unknown asset type '{type}'")
    val = _dec(value)
    if val is not None and val < 0:
        raise AssetError("Value cannot be negative")
    asset = Asset(
        tenant_id=tenant_id,
        org_unit_id=uuid.UUID(org_unit_id) if org_unit_id else None,
        type=type,
        name=name,
        code=code,
        acquisition_date=acquisition_date,
        value=val,
        condition=condition,
        reg_no=reg_no,
        custodian=custodian,
        notes=notes,
        status="active",
    )
    session.add(asset)
    await session.flush()
    return asset


async def add_maintenance(
    session: AsyncSession,
    *,
    tenant_id: str,
    asset_id: str,
    date: datetime.date,
    action: str,
    cost=None,
    note: str | None = None,
    recorded_by: str | None = None,
) -> AssetMaintenance:
    try:
        asset = await session.get(Asset, uuid.UUID(str(asset_id)))
    except ValueError:
        raise AssetError("Invalid asset id")
    if asset is None:
        raise AssetError("Asset not found")
    m = AssetMaintenance(
        tenant_id=tenant_id,
        asset_id=asset.id,
        date=date,
        action=action,
        cost=_dec(cost),
        note=note,
        recorded_by=uuid.UUID(recorded_by) if recorded_by else None,
    )
    session.add(m)
    await session.flush()
    return m


async def create_inventory_item(
    session: AsyncSession,
    *,
    tenant_id: str,
    name: str,
    quantity=0,
    unit: str | None = None,
    reorder_level=None,
    org_unit_id: str | None = None,
) -> InventoryItem:
    item = InventoryItem(
        tenant_id=tenant_id,
        name=name,
        quantity=_dec(quantity) or decimal.Decimal(0),
        unit=unit,
        reorder_level=_dec(reorder_level),
        org_unit_id=uuid.UUID(org_unit_id) if org_unit_id else None,
    )
    session.add(item)
    await session.flush()
    return item


async def summary(session: AsyncSession) -> dict:
    """Roll-up across the tenant (RLS-scoped): asset count + total value by type, and
    how many inventory items are at/below their reorder level."""
    rows = (
        await session.execute(
            select(
                Asset.type,
                func.count(Asset.id),
                func.coalesce(func.sum(Asset.value), 0),
            )
            .where(Asset.status == "active")
            .group_by(Asset.type)
        )
    ).all()
    by_type = {
        t: {"count": int(c), "value": float(decimal.Decimal(v))} for t, c, v in rows
    }
    total_value = float(sum(decimal.Decimal(str(d["value"])) for d in by_type.values())) if by_type else 0.0
    total_count = sum(d["count"] for d in by_type.values())

    low_stock = (
        await session.execute(
            select(func.count(InventoryItem.id)).where(
                InventoryItem.reorder_level.isnot(None),
                InventoryItem.quantity <= InventoryItem.reorder_level,
            )
        )
    ).scalar_one()

    return {
        "total_value": total_value,
        "total_count": int(total_count),
        "by_type": by_type,
        "low_stock": int(low_stock),
        "currency": "TZS",
    }
