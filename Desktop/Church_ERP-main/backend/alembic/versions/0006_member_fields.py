"""expand member profile + tie to org unit

Revision ID: 0006_member_fields
Revises: 0005_service_requests
Create Date: 2026-07-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

revision = "0006_member_fields"
down_revision = "0005_service_requests"
branch_labels = None
depends_on = None

_COLUMNS = [
    ("org_unit_id", pg.UUID(as_uuid=True)),
    ("member_type", sa.String(50)),
    ("dob", sa.Date()),
    ("marital_status", sa.String(30)),
    ("occupation", sa.String(100)),
    ("education", sa.String(100)),
    ("alt_phone", sa.String(30)),
    ("email", sa.String(255)),
    ("region", sa.String(100)),
    ("district", sa.String(100)),
    ("ward", sa.String(100)),
    ("street", sa.String(100)),
    ("spouse_name", sa.String(200)),
    ("emergency_contact", sa.String(200)),
]


def upgrade() -> None:
    for name, coltype in _COLUMNS:
        op.add_column("members", sa.Column(name, coltype, nullable=True))
    op.create_foreign_key(
        "fk_members_org_unit", "members", "org_units",
        ["org_unit_id"], ["id"], ondelete="SET NULL",
    )
    op.create_index("ix_members_org_unit_id", "members", ["org_unit_id"])


def downgrade() -> None:
    op.drop_index("ix_members_org_unit_id", table_name="members")
    op.drop_constraint("fk_members_org_unit", "members", type_="foreignkey")
    for name, _ in _COLUMNS:
        op.drop_column("members", name)
