import datetime
import uuid

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Member(Base, TimestampMixin):
    """A person in the flock. Tied to an org unit (community/congregation) so member
    management can be scoped by the hierarchy. Baptism/confirmation status is NOT stored
    here — it lives in the sacramental register (SacramentalRecord), the source of truth."""

    __tablename__ = "members"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), index=True
    )
    member_no: Mapped[str] = mapped_column(String(30))
    full_name: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="active")
    # unverified -> (verification request) -> pending -> verified. Gates privileged
    # services (e.g. requesting a wedding).
    verification_status: Mapped[str] = mapped_column(String(20), default="unverified")
    # a member may have a login account (self-registered members, and leaders — a
    # leader is a member who has been given a user account + a role assignment)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, unique=True
    )

    # the community/congregation this member belongs to
    org_unit_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("org_units.id", ondelete="SET NULL"), nullable=True, index=True
    )
    member_type: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # personal
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    dob: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    marital_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    occupation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    education: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # contact
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    alt_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # residential address
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ward: Mapped[str | None] = mapped_column(String(100), nullable=True)
    street: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # family
    spouse_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    emergency_contact: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # object-storage key for the member's photo (see app.core.storage)
    photo_key: Mapped[str | None] = mapped_column(String, nullable=True)
