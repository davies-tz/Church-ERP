import uuid

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class HierarchyLevelType(Base):
    """A configurable level in a tenant's org structure (config-as-data). This is what
    lets one platform serve Catholic, Anglican, Lutheran, ... — each tenant defines its
    own ladder of levels instead of the structure being hard-coded per denomination."""

    __tablename__ = "hierarchy_level_types"
    __table_args__ = (
        UniqueConstraint("tenant_id", "key", name="uq_level_tenant_key"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), index=True
    )
    key: Mapped[str] = mapped_column(String(50))  # e.g. "diocese", "parish"
    label_en: Mapped[str] = mapped_column(String(100))
    label_sw: Mapped[str] = mapped_column(String(100))
    depth: Mapped[int] = mapped_column(Integer)  # 0 = top level
    parent_key: Mapped[str | None] = mapped_column(String(50), nullable=True)


class OrgUnit(Base, TimestampMixin):
    """An actual node in a tenant's tree (a specific diocese, parish, congregation...).
    `path` is a materialized path of ancestor ids ('/<root>/<child>/<self>/') so subtree
    queries ("everything under my scope") are a single indexed LIKE."""

    __tablename__ = "org_units"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), index=True
    )
    level_key: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(200))
    code: Mapped[str | None] = mapped_column(String(50), nullable=True)  # church ID
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("org_units.id", ondelete="CASCADE"), nullable=True
    )
    path: Mapped[str] = mapped_column(String, index=True)
