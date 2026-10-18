"""org_units region + district (church registration data)

Revision ID: 0010_orgunit_location
Revises: 0009_service_fee_link
Create Date: 2026-07-18
"""
from alembic import op
import sqlalchemy as sa

revision = "0010_orgunit_location"
down_revision = "0009_service_fee_link"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("org_units", sa.Column("region", sa.String(100), nullable=True))
    op.add_column("org_units", sa.Column("district", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("org_units", "district")
    op.drop_column("org_units", "region")
