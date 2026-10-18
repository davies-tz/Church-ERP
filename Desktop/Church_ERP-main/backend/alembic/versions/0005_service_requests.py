"""service requests workflow (with RLS)

Revision ID: 0005_service_requests
Revises: 0004_sacraments
Create Date: 2026-07-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

revision = "0005_service_requests"
down_revision = "0004_sacraments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "service_requests",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("member_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(40), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("org_unit_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("org_units.id", ondelete="SET NULL")),
        sa.Column("scheduled_date", sa.Date()),
        sa.Column("notes", sa.Text()),
        sa.Column("requested_by", pg.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("decided_by", pg.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("decided_at", sa.DateTime(timezone=True)),
        sa.Column("produced_record_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("sacramental_records.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_svcreq_tenant_id", "service_requests", ["tenant_id"])
    op.create_index("ix_svcreq_member_id", "service_requests", ["member_id"])

    op.execute("ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE service_requests FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation ON service_requests
            USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
            WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation ON service_requests")
    op.drop_table("service_requests")
