"""014 unique match_key per tournament

Revision ID: 014
Revises: 013
Create Date: 2026-06-16

"""
import sqlalchemy as sa
from alembic import op

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade():
    op.create_index(
        "uq_matches_tournament_match_key",
        "matches",
        ["tournament_id", "match_key"],
        unique=True,
        postgresql_where=sa.text("match_key IS NOT NULL"),
    )


def downgrade():
    op.drop_index("uq_matches_tournament_match_key", table_name="matches")
