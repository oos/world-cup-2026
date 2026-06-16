"""match lineups

Revision ID: 012
Revises: 011
Create Date: 2026-06-17

"""
from alembic import op
import sqlalchemy as sa

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "matches",
        sa.Column("api_football_fixture_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        op.f("ix_matches_api_football_fixture_id"),
        "matches",
        ["api_football_fixture_id"],
        unique=False,
    )

    op.add_column(
        "espn_matches",
        sa.Column("lineup_synced_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "match_lineups",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("match_id", sa.Integer(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("formation", sa.String(length=16), nullable=True),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("synced_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["match_id"], ["matches.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["tournament_teams.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("match_id", "team_id", name="uq_match_lineup_team"),
    )
    op.create_index(op.f("ix_match_lineups_match_id"), "match_lineups", ["match_id"], unique=False)
    op.create_index(op.f("ix_match_lineups_team_id"), "match_lineups", ["team_id"], unique=False)

    op.create_table(
        "match_lineup_players",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("match_lineup_id", sa.Integer(), nullable=False),
        sa.Column("player_id", sa.Integer(), nullable=True),
        sa.Column("jersey_number", sa.Integer(), nullable=True),
        sa.Column("position", sa.String(length=32), nullable=True),
        sa.Column("lineup_role", sa.String(length=16), nullable=False),
        sa.Column("grid", sa.String(length=16), nullable=True),
        sa.Column("display_name", sa.String(length=256), nullable=True),
        sa.ForeignKeyConstraint(["match_lineup_id"], ["match_lineups.id"]),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "match_lineup_id",
            "jersey_number",
            name="uq_match_lineup_player_jersey",
        ),
    )
    op.create_index(
        op.f("ix_match_lineup_players_match_lineup_id"),
        "match_lineup_players",
        ["match_lineup_id"],
        unique=False,
    )


def downgrade():
    op.drop_index(op.f("ix_match_lineup_players_match_lineup_id"), table_name="match_lineup_players")
    op.drop_table("match_lineup_players")
    op.drop_index(op.f("ix_match_lineups_team_id"), table_name="match_lineups")
    op.drop_index(op.f("ix_match_lineups_match_id"), table_name="match_lineups")
    op.drop_table("match_lineups")
    op.drop_column("espn_matches", "lineup_synced_at")
    op.drop_index(op.f("ix_matches_api_football_fixture_id"), table_name="matches")
    op.drop_column("matches", "api_football_fixture_id")
