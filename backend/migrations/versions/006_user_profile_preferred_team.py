"""user profile preferred team

Revision ID: 006
Revises: 005
Create Date: 2026-06-12

"""
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "user_profiles",
        sa.Column("preferred_team_fifa_code", sa.String(length=8), nullable=True),
    )


def downgrade():
    op.drop_column("user_profiles", "preferred_team_fifa_code")
