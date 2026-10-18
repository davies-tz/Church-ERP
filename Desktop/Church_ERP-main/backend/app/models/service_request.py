import datetime
import uuid

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ServiceRequest(Base, TimestampMixin):
    """A member-facing request for a church service (baptism, marriage, funeral,
    transfer letter...). It moves through a small workflow: pending -> approved ->
    completed (or rejected / cancelled). When a sacramental service is completed it
    produces a SacramentalRecord (produced_record_id) — the chaining that makes this
    an integrated ERP rather than separate CRUD screens."""

    __tablename__ = "service_requests"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), index=True
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("members.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    org_unit_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("org_units.id", ondelete="SET NULL"), nullable=True
    )
    scheduled_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    decided_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    decided_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    produced_record_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("sacramental_records.id", ondelete="SET NULL"), nullable=True
    )
    # the finance entry recorded for this service's fee (if any) — the finance chain
    produced_fee_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("finance_entries.id", ondelete="SET NULL"), nullable=True
    )
