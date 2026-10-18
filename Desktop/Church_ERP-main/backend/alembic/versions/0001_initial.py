"""initial schema + row-level security

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-17
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

# Tables that hold tenant-owned data and must be isolated by RLS.
TENANT_TABLES = ("users", "members")


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("slug", sa.String(63), nullable=False, unique=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_tenants_slug", "tenants", ["slug"])

    op.create_table(
        "tenant_branding",
        sa.Column("tenant_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("display_name", sa.String(200), nullable=False),
        sa.Column("tagline", sa.String(300)),
        sa.Column("logo_light_url", sa.String()),
        sa.Column("logo_dark_url", sa.String()),
        sa.Column("favicon_url", sa.String()),
        sa.Column("login_bg_url", sa.String()),
        sa.Column("color_primary", sa.String(9), nullable=False, server_default="#6d28d9"),
        sa.Column("color_secondary", sa.String(9), nullable=False, server_default="#4c1d95"),
        sa.Column("color_accent", sa.String(9), nullable=False, server_default="#f59e0b"),
        sa.Column("font_key", sa.String(50), nullable=False, server_default="Inter"),
        sa.Column("default_locale", sa.String(5), nullable=False, server_default="en"),
        sa.Column("enabled_locales", pg.ARRAY(sa.String(5)), nullable=False,
                  server_default=sa.text("ARRAY['en','sw']::varchar[]")),
    )

    op.create_table(
        "users",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("role", sa.String(50), nullable=False, server_default="member"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("tenant_id", "email", name="uq_user_tenant_email"),
    )
    op.create_index("ix_users_tenant_id", "users", ["tenant_id"])

    op.create_table(
        "members",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("member_no", sa.String(30), nullable=False),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("gender", sa.String(10)),
        sa.Column("phone", sa.String(30)),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_members_tenant_id", "members", ["tenant_id"])

    # --- Row-Level Security -------------------------------------------------
    # Each policy compares the row's tenant_id to the app.current_tenant_id GUC.
    #   - current_setting(..., true) returns NULL if the GUC was never set.
    #   - NULLIF(..., '') turns an EMPTY string into NULL too. This matters because
    #     once a custom GUC has been SET LOCAL on a pooled connection, Postgres
    #     resets it to '' (not NULL) after the transaction; casting '' to uuid would
    #     error instead of denying. NULLIF makes "no/empty context" => NULL => 0 rows.
    # FORCE makes the policy apply even to the table owner (the app role).
    for table in TENANT_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(
            f"""
            CREATE POLICY tenant_isolation ON {table}
                USING (
                    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                )
                WITH CHECK (
                    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                )
            """
        )


def downgrade() -> None:
    for table in TENANT_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")
    op.drop_table("members")
    op.drop_table("users")
    op.drop_table("tenant_branding")
    op.drop_table("tenants")
