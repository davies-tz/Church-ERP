import datetime
import decimal
import uuid

from sqlalchemy import Date, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Asset(Base, TimestampMixin):
    """A church fixed asset — land, building, vehicle, equipment. Tied to an org unit
    so a diocese can roll up the assets of every parish beneath it. This diocese-wide
    asset register is what elevates the platform from a ChMS to an ERP."""

    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), index=True
    )
    org_unit_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("org_units.id", ondelete="SET NULL"), nullable=True, index=True
    )
    type: Mapped[str] = mapped_column(String(20))  # land|building|vehicle|equipment|other
    name: Mapped[str] = mapped_column(String(200))
    code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    acquisition_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    value: Mapped[decimal.Decimal | None] = mapped_column(Numeric(16, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="TZS")
    condition: Mapped[str | None] = mapped_column(String(20), nullable=True)  # good|fair|poor
    reg_no: Mapped[str | None] = mapped_column(String(100), nullable=True)  # title deed / plate
    custodian: Mapped[str | None] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class AssetMaintenance(Base, TimestampMixin):
    """A service / repair / inspection event on an asset."""

    __tablename__ = "asset_maintenance"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), index=True
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"), index=True
    )
    date: Mapped[datetime.date] = mapped_column(Date)
    action: Mapped[str] = mapped_column(String(200))
    cost: Mapped[decimal.Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class InventoryItem(Base, TimestampMixin):
    """A consumable / stock item held by a unit (chairs, PA gear, communion supplies).
    Low stock is quantity <= reorder_level."""

    __tablename__ = "inventory_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), index=True
    )
    org_unit_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("org_units.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(200))
    quantity: Mapped[decimal.Decimal] = mapped_column(Numeric(12, 2), default=0)
    unit: Mapped[str | None] = mapped_column(String(30), nullable=True)  # pcs, boxes...
    reorder_level: Mapped[decimal.Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )
