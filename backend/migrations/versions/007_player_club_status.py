"""Add player club_status for blank club reasons

Revision ID: 007
Revises: 006
Create Date: 2026-06-11
"""

from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("players", sa.Column("club_status", sa.String(length=32), nullable=True))


def downgrade():
    op.drop_column("players", "club_status")
