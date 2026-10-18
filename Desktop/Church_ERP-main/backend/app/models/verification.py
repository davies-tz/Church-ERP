import datetime
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class VerificationRequest(Base, TimestampMixin):
    """A member's request to be verified as a full member. Routed to the leader of the
    church where they were baptized / first registered (or their current church if they
    have never been baptized). On approval the member becomes `verified`."""

    __tablename__ = "verification_requests"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), index=True
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("members.id", ondelete="CASCADE"), index=True
    )
    # the church the request is routed to for verification
    baptized_at_unit_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("org_units.id", ondelete="SET NULL"), nullable=True
    )
    never_baptized: Mapped[bool] = mapped_column(Boolean, default=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    decided_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    decided_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class VerificationDocument(Base, TimestampMixin):
    """A supporting document (baptism certificate, etc.) attached to a verification
    request. The file itself lives in object storage (file_key)."""

    __tablename__ = "verification_documents"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), index=True
    )
    request_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("verification_requests.id", ondelete="CASCADE"), index=True
    )
    file_key: Mapped[str] = mapped_column(String)
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100))
