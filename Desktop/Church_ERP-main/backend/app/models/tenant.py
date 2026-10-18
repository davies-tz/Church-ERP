import uuid

from sqlalchemy import ARRAY, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Tenant(Base, TimestampMixin):
    """A church / denomination instance. NOT protected by RLS itself — it is the
    lookup table used to resolve a request's tenant before the GUC is set."""

    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(63), unique=True, index=True)  # subdomain
    name: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="active")

    branding: Mapped["TenantBranding"] = relationship(
        back_populates="tenant", uselist=False, cascade="all, delete-orphan"
    )


class TenantBranding(Base):
    """Per-tenant white-label look. Fetched by explicit tenant_id (e.g. to theme the
    login page before auth), so it is not behind RLS."""

    __tablename__ = "tenant_branding"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), primary_key=True
    )
    display_name: Mapped[str] = mapped_column(String(200))
    tagline: Mapped[str | None] = mapped_column(String(300), nullable=True)
    logo_light_url: Mapped[str | None] = mapped_column(String, nullable=True)
    logo_dark_url: Mapped[str | None] = mapped_column(String, nullable=True)
    favicon_url: Mapped[str | None] = mapped_column(String, nullable=True)
    login_bg_url: Mapped[str | None] = mapped_column(String, nullable=True)
    color_primary: Mapped[str] = mapped_column(String(9), default="#6d28d9")
    color_secondary: Mapped[str] = mapped_column(String(9), default="#4c1d95")
    color_accent: Mapped[str] = mapped_column(String(9), default="#f59e0b")
    font_key: Mapped[str] = mapped_column(String(50), default="Inter")
    default_locale: Mapped[str] = mapped_column(String(5), default="en")
    enabled_locales: Mapped[list[str]] = mapped_column(
        ARRAY(String(5)), default=lambda: ["en", "sw"]
    )

    tenant: Mapped["Tenant"] = relationship(back_populates="branding")
