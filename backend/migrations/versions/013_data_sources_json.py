"""data_sources JSON and API-Football fixture id

Revision ID: 013
Revises: 012
Create Date: 2026-06-17

"""
from alembic import op
import sqlalchemy as sa

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("nations", sa.Column("data_sources", sa.JSON(), nullable=True))
    op.add_column("matches", sa.Column("data_sources", sa.JSON(), nullable=True))


def downgrade():
    op.drop_column("matches", "data_sources")
    op.drop_column("nations", "data_sources")
