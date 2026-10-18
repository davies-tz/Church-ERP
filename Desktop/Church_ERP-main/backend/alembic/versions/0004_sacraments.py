"""sacramental records + baptism annotations (with RLS)

Revision ID: 0004_sacraments
Revises: 0003_assignments
Create Date: 2026-07-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

revision = "0004_sacraments"
down_revision = "0003_assignments"
branch_labels = None
depends_on = None

TENANT_TABLES = ("sacramental_records", "baptism_annotations")


def _policy(table: str) -> str:
    return f"""
    CREATE POLICY tenant_isolation ON {table}
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
        WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    """


def upgrade() -> None:
    op.create_table(
        "sacramental_records",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("member_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(40), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("org_unit_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("org_units.id", ondelete="SET NULL")),
        sa.Column("minister_name", sa.String(200)),
        sa.Column("register_book", sa.String(50)),
        sa.Column("register_page", sa.String(50)),
        sa.Column("witnesses", pg.ARRAY(sa.String()), nullable=False,
                  server_default=sa.text("'{}'::varchar[]")),
        sa.Column("spouse_member_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("members.id", ondelete="SET NULL")),
        sa.Column("notes", sa.Text()),
        sa.Column("recorded_by", pg.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_sacr_tenant_id", "sacramental_records", ["tenant_id"])
    op.create_index("ix_sacr_member_id", "sacramental_records", ["member_id"])

    op.create_table(
        "baptism_annotations",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("baptism_record_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("sacramental_records.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sacrament_record_id", pg.UUID(as_uuid=True),
                  sa.ForeignKey("sacramental_records.id", ondelete="CASCADE"), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("source_unit_name", sa.String(200)),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_bapt_ann_tenant_id", "baptism_annotations", ["tenant_id"])
    op.create_index("ix_bapt_ann_baptism", "baptism_annotations", ["baptism_record_id"])

    for table in TENANT_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(_policy(table))


def downgrade() -> None:
    for table in TENANT_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")
    op.drop_table("baptism_annotations")
    op.drop_table("sacramental_records")
