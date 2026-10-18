"""finance entries (income/expense/contributions, maker-checker, with RLS)

Revision ID: 0007_finance
Revises: 0006_member_fields
Create Date: 2026-07-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

revision = "0007_finance"
down_revision = "0006_member_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "finance_entries",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("org_unit_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("org_units.id", ondelete="SET NULL")),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("category", sa.String(40), nullable=False),
        sa.Column("direction", sa.String(10), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="TZS"),
        sa.Column("method", sa.String(20)),
        sa.Column("member_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("members.id", ondelete="SET NULL")),
        sa.Column("note", sa.Text()),
        sa.Column("recorded_by", pg.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("approval_status", sa.String(20), nullable=False,
                  server_default="pending"),
        sa.Column("approved_by", pg.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("approved_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_finance_tenant_id", "finance_entries", ["tenant_id"])
    op.create_index("ix_finance_member_id", "finance_entries", ["member_id"])

    op.execute("ALTER TABLE finance_entries ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE finance_entries FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation ON finance_entries
            USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
            WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation ON finance_entries")
    op.drop_table("finance_entries")
