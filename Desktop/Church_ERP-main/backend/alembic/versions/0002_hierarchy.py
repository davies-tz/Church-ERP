"""hierarchy engine: level types + org units (with RLS)

Revision ID: 0002_hierarchy
Revises: 0001_initial
Create Date: 2026-07-17
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

revision = "0002_hierarchy"
down_revision = "0001_initial"
branch_labels = None
depends_on = None

TENANT_TABLES = ("hierarchy_level_types", "org_units")

_POLICY = """
CREATE POLICY tenant_isolation ON {table}
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
    WITH CHECK (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
"""


def upgrade() -> None:
    op.create_table(
        "hierarchy_level_types",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("key", sa.String(50), nullable=False),
        sa.Column("label_en", sa.String(100), nullable=False),
        sa.Column("label_sw", sa.String(100), nullable=False),
        sa.Column("depth", sa.Integer(), nullable=False),
        sa.Column("parent_key", sa.String(50)),
        sa.UniqueConstraint("tenant_id", "key", name="uq_level_tenant_key"),
    )
    op.create_index("ix_level_tenant_id", "hierarchy_level_types", ["tenant_id"])

    op.create_table(
        "org_units",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("level_key", sa.String(50), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("code", sa.String(50)),
        sa.Column("parent_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("org_units.id", ondelete="CASCADE")),
        sa.Column("path", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_org_units_tenant_id", "org_units", ["tenant_id"])
    op.create_index("ix_org_units_path", "org_units", ["path"])

    for table in TENANT_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(_POLICY.format(table=table))


def downgrade() -> None:
    for table in TENANT_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")
    op.drop_table("org_units")
    op.drop_table("hierarchy_level_types")
