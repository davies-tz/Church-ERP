import uuid

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Assignment(Base, TimestampMixin):
    """The real ACL: a user holds `role_key` at `org_unit_id` (or tenant-wide when
    null). `scope_path` is copied from the unit's materialized path ('/' for
    tenant-wide) so authorization is a cheap prefix check: an assignment governs any
    target whose path starts with scope_path. A user may hold several assignments."""

    __tablename__ = "assignments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    role_key: Mapped[str] = mapped_column(String(50))
    org_unit_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("org_units.id", ondelete="CASCADE"), nullable=True
    )
    scope_path: Mapped[str] = mapped_column(String, default="/")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
