import datetime
import uuid

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class TransferRequest(Base, TimestampMixin):
    """A member's request to relocate to a different church. Two-step approval: the
    source church's leader approves and issues a transfer-out letter, then the
    destination church's leader approves and the member's org unit moves. Sacramental
    history is untouched throughout — it stays tied to the member, not the unit."""

    __tablename__ = "transfer_requests"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), index=True
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("members.id", ondelete="CASCADE"), index=True
    )
    # snapshot of the member's church at request time
    from_unit_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("org_units.id", ondelete="SET NULL"), nullable=True
    )
    to_unit_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("org_units.id", ondelete="CASCADE")
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    # pending_source -> pending_destination -> approved | rejected
    status: Mapped[str] = mapped_column(String(20), default="pending_source")
    # object-storage key of the generated transfer-out letter (set on source approval)
    letter_key: Mapped[str | None] = mapped_column(String, nullable=True)

    source_decided_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    source_decided_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    destination_decided_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    destination_decided_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
