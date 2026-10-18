"""announcements (with RLS)

Revision ID: 0017_announcements
Revises: 0016_transfers
Create Date: 2026-07-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

revision = "0017_announcements"
down_revision = "0016_transfers"
branch_labels = None
depends_on = None

TABLE = "announcements"


def upgrade() -> None:
    op.create_table(
        TABLE,
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("org_unit_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("org_units.id", ondelete="CASCADE")),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("urgency", sa.String(20), nullable=False, server_default="normal"),
        sa.Column("published_by", pg.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_announcement_tenant_id", TABLE, ["tenant_id"])
    op.create_index("ix_announcement_org_unit_id", TABLE, ["org_unit_id"])

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
