"""match reminder minutes

Revision ID: 008
Revises: 007
Create Date: 2026-06-12

"""
from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "push_subscriptions",
        sa.Column("reminder_minutes", sa.Text(), nullable=True),
    )
    op.add_column(
        "user_profiles",
        sa.Column("match_reminder_minutes", sa.Text(), nullable=True),
    )


def downgrade():
    op.drop_column("user_profiles", "match_reminder_minutes")
    op.drop_column("push_subscriptions", "reminder_minutes")
