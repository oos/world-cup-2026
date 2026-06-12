"""espn match commentary

Revision ID: 004
Revises: 003
Create Date: 2026-06-12

"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "espn_matches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("espn_game_id", sa.String(length=32), nullable=False),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("match_date", sa.Date(), nullable=True),
        sa.Column("home_team", sa.String(length=128), nullable=True),
        sa.Column("away_team", sa.String(length=128), nullable=True),
        sa.Column("match_id", sa.Integer(), nullable=True),
        sa.Column("history_match_key", sa.String(length=256), nullable=True),
        sa.Column("commentary_synced_at", sa.DateTime(), nullable=True),
        sa.Column("commentary_event_count", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["match_id"], ["matches.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("espn_game_id"),
    )
    op.create_index(op.f("ix_espn_matches_espn_game_id"), "espn_matches", ["espn_game_id"], unique=True)
    op.create_index(op.f("ix_espn_matches_year"), "espn_matches", ["year"], unique=False)
    op.create_index(op.f("ix_espn_matches_match_date"), "espn_matches", ["match_date"], unique=False)
    op.create_index(op.f("ix_espn_matches_match_id"), "espn_matches", ["match_id"], unique=False)
    op.create_index(
        op.f("ix_espn_matches_history_match_key"),
        "espn_matches",
        ["history_match_key"],
        unique=False,
    )

    op.create_table(
        "match_commentary_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("espn_match_id", sa.Integer(), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("period", sa.Integer(), nullable=True),
        sa.Column("clock_display", sa.String(length=32), nullable=True),
        sa.Column("clock_value", sa.Float(), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("is_key_event", sa.Boolean(), nullable=False),
        sa.Column("raw", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["espn_match_id"], ["espn_matches.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("espn_match_id", "sequence", name="uq_commentary_match_sequence"),
    )


def downgrade():
    op.drop_table("match_commentary_events")
    op.drop_index(op.f("ix_espn_matches_history_match_key"), table_name="espn_matches")
    op.drop_index(op.f("ix_espn_matches_match_id"), table_name="espn_matches")
    op.drop_index(op.f("ix_espn_matches_match_date"), table_name="espn_matches")
    op.drop_index(op.f("ix_espn_matches_year"), table_name="espn_matches")
    op.drop_index(op.f("ix_espn_matches_espn_game_id"), table_name="espn_matches")
    op.drop_table("espn_matches")
