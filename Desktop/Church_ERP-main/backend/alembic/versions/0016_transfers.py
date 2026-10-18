"""transfer requests (with RLS)

Revision ID: 0016_transfers
Revises: 0015_verification
Create Date: 2026-07-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

revision = "0016_transfers"
down_revision = "0015_verification"
branch_labels = None
depends_on = None

TABLE = "transfer_requests"


def upgrade() -> None:
    op.create_table(
        TABLE,
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("member_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_unit_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("org_units.id", ondelete="SET NULL")),
        sa.Column("to_unit_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("org_units.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reason", sa.Text()),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending_source"),
        sa.Column("letter_key", sa.String()),
        sa.Column("source_decided_by", pg.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("source_decided_at", sa.DateTime(timezone=True)),
        sa.Column("destination_decided_by", pg.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("destination_decided_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_transreq_tenant_id", TABLE, ["tenant_id"])
    op.create_index("ix_transreq_member_id", TABLE, ["member_id"])

    op.execute(f"ALTER TABLE {TABLE} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {TABLE} FORCE ROW LEVEL SECURITY")
    op.execute(f"""
    CREATE POLICY tenant_isolation ON {TABLE}
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
        WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    """)


def downgrade() -> None:
    op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {TABLE}")
    op.drop_table(TABLE)
