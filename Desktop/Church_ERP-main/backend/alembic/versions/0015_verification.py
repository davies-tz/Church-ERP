"""verification requests + documents (with RLS)

Revision ID: 0015_verification
Revises: 0014_member_verification
Create Date: 2026-07-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

revision = "0015_verification"
down_revision = "0014_member_verification"
branch_labels = None
depends_on = None

TABLES = ("verification_requests", "verification_documents")


def _policy(table: str) -> str:
    return f"""
    CREATE POLICY tenant_isolation ON {table}
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
        WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    """


def upgrade() -> None:
    op.create_table(
        "verification_requests",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("member_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("baptized_at_unit_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("org_units.id", ondelete="SET NULL")),
        sa.Column("never_baptized", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("note", sa.Text()),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("decided_by", pg.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("decided_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_verreq_tenant_id", "verification_requests", ["tenant_id"])
    op.create_index("ix_verreq_member_id", "verification_requests", ["member_id"])

    op.create_table(
        "verification_documents",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("request_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("verification_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_key", sa.String(), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_verdoc_tenant_id", "verification_documents", ["tenant_id"])
    op.create_index("ix_verdoc_request_id", "verification_documents", ["request_id"])

    for table in TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(_policy(table))


def downgrade() -> None:
    for table in TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")
    op.drop_table("verification_documents")
    op.drop_table("verification_requests")
