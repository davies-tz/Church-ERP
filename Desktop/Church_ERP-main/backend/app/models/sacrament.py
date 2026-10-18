import datetime
import uuid

from sqlalchemy import ARRAY, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class SacramentalRecord(Base, TimestampMixin):
    """A permanent sacramental event for a member. Append-only: corrections are made
    as annotations, never edits/deletes. The baptism record is a person's "master
    record" — later sacraments are cross-referenced back onto it via BaptismAnnotation.
    """

    __tablename__ = "sacramental_records"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), index=True
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("members.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[str] = mapped_column(String(40))
    date: Mapped[datetime.date] = mapped_column(Date)
    # where it happened (a parish/church); optional for imported records
    org_unit_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("org_units.id", ondelete="SET NULL"), nullable=True
    )
    minister_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    register_book: Mapped[str | None] = mapped_column(String(50), nullable=True)
    register_page: Mapped[str | None] = mapped_column(String(50), nullable=True)
    witnesses: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    # for marriage: the spouse, if also a member
    spouse_member_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("members.id", ondelete="SET NULL"), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class BaptismAnnotation(Base, TimestampMixin):
    """A note written back onto a baptism (master) record when the same person later
    receives another sacrament — including sacraments celebrated in another parish."""

    __tablename__ = "baptism_annotations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), index=True
    )
    baptism_record_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sacramental_records.id", ondelete="CASCADE"), index=True
    )
    sacrament_record_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sacramental_records.id", ondelete="CASCADE")
    )
    text: Mapped[str] = mapped_column(Text)
    source_unit_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
