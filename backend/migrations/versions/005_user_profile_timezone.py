"""user profile timezone

Revision ID: 005
Revises: 004
Create Date: 2026-06-12

"""
from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "user_profiles",
        sa.Column("timezone", sa.String(length=64), nullable=True),
    )


def downgrade():
    op.drop_column("user_profiles", "timezone")
