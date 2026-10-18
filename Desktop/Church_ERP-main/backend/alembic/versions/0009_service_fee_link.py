"""service_requests.produced_fee_id (finance chain)

Revision ID: 0009_service_fee_link
Revises: 0008_assets
Create Date: 2026-07-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

revision = "0009_service_fee_link"
down_revision = "0008_assets"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "service_requests",
        sa.Column("produced_fee_id", pg.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_svcreq_fee", "service_requests", "finance_entries",
        ["produced_fee_id"], ["id"], ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_svcreq_fee", "service_requests", type_="foreignkey")
    op.drop_column("service_requests", "produced_fee_id")
