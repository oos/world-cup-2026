"""016 tournament and club data_sources for API-Football backfill

Revision ID: 016
Revises: 015
Create Date: 2026-06-17

"""
import sqlalchemy as sa
from alembic import op

revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("tournaments", sa.Column("data_sources", sa.JSON(), nullable=True))
    op.add_column("tournament_teams", sa.Column("data_sources", sa.JSON(), nullable=True))


def downgrade():
    op.drop_column("tournament_teams", "data_sources")
    op.drop_column("tournaments", "data_sources")
