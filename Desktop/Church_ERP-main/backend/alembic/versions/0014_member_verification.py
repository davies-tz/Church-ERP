"""member.verification_status

Revision ID: 0014_member_verification
Revises: 0013_notifications
Create Date: 2026-07-18
"""
from alembic import op
import sqlalchemy as sa

revision = "0014_member_verification"
down_revision = "0013_notifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "members",
        sa.Column("verification_status", sa.String(20), nullable=False,
                  server_default="unverified"),
    )


def downgrade() -> None:
    op.drop_column("members", "verification_status")
