"""assignments: role-at-unit RBAC (with RLS)

Revision ID: 0003_assignments
Revises: 0002_hierarchy
Create Date: 2026-07-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

revision = "0003_assignments"
down_revision = "0002_hierarchy"
branch_labels = None
depends_on = None

_POLICY = """
CREATE POLICY tenant_isolation ON assignments
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
    WITH CHECK (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
"""


def upgrade() -> None:
    op.create_table(
        "assignments",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role_key", sa.String(50), nullable=False),
        sa.Column("org_unit_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("org_units.id", ondelete="CASCADE")),
        sa.Column("scope_path", sa.String(), nullable=False, server_default="/"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_assignments_tenant_id", "assignments", ["tenant_id"])
    op.create_index("ix_assignments_user_id", "assignments", ["user_id"])

    op.execute("ALTER TABLE assignments ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE assignments FORCE ROW LEVEL SECURITY")
    op.execute(_POLICY)


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation ON assignments")
    op.drop_table("assignments")
