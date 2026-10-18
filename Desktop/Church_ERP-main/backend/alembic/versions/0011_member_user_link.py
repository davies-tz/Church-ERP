"""member.user_id (link a member to a login account)

Revision ID: 0011_member_user_link
Revises: 0010_orgunit_location
Create Date: 2026-07-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

revision = "0011_member_user_link"
down_revision = "0010_orgunit_location"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "members", sa.Column("user_id", pg.UUID(as_uuid=True), nullable=True)
    )
    op.create_foreign_key(
        "fk_members_user", "members", "users",
        ["user_id"], ["id"], ondelete="SET NULL",
    )
    op.create_unique_constraint("uq_members_user", "members", ["user_id"])


def downgrade() -> None:
    op.drop_constraint("uq_members_user", "members", type_="unique")
    op.drop_constraint("fk_members_user", "members", type_="foreignkey")
    op.drop_column("members", "user_id")
