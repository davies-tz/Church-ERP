"""member.photo_key (object storage)

Revision ID: 0012_member_photo
Revises: 0011_member_user_link
Create Date: 2026-07-18
"""
from alembic import op
import sqlalchemy as sa

revision = "0012_member_photo"
down_revision = "0011_member_user_link"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("members", sa.Column("photo_key", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("members", "photo_key")
