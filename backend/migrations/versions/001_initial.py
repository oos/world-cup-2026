"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-06-05

"""
from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "tournaments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("external_key", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("external_key"),
    )
    op.create_table(
        "stadiums",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("city", sa.String(length=128), nullable=True),
        sa.Column("country", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "teams",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tournament_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("name_normalised", sa.String(length=128), nullable=True),
        sa.Column("fifa_code", sa.String(length=8), nullable=False),
        sa.Column("group_name", sa.String(length=16), nullable=True),
        sa.Column("confederation", sa.String(length=32), nullable=True),
        sa.Column("flag_icon", sa.String(length=32), nullable=True),
        sa.Column("continent", sa.String(length=64), nullable=True),
        sa.Column("wikidata_id", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["tournament_id"], ["tournaments.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("fifa_code"),
    )
    op.create_index("ix_teams_fifa_code", "teams", ["fifa_code"])
    op.create_table(
        "players",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("wikidata_id", sa.String(length=32), nullable=True),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("position", sa.String(length=32), nullable=True),
        sa.Column("dob", sa.Date(), nullable=True),
        sa.Column("height_cm", sa.Float(), nullable=True),
        sa.Column("club", sa.String(length=256), nullable=True),
        sa.Column("image_url", sa.String(length=512), nullable=True),
        sa.Column("nationality", sa.String(length=128), nullable=True),
        sa.Column("data_sources", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_players_name", "players", ["name"])
    op.create_index("ix_players_wikidata_id", "players", ["wikidata_id"], unique=True)
    op.create_table(
        "ingestion_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("records_upserted", sa.Integer(), nullable=True),
        sa.Column("gaps_filled", sa.Integer(), nullable=True),
        sa.Column("errors", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "matches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tournament_id", sa.Integer(), nullable=False),
        sa.Column("round", sa.String(length=64), nullable=True),
        sa.Column("match_number", sa.Integer(), nullable=True),
        sa.Column("match_date", sa.Date(), nullable=True),
        sa.Column("match_time", sa.String(length=32), nullable=True),
        sa.Column("team1_id", sa.Integer(), nullable=True),
        sa.Column("team2_id", sa.Integer(), nullable=True),
        sa.Column("group_name", sa.String(length=16), nullable=True),
        sa.Column("stadium_id", sa.Integer(), nullable=True),
        sa.Column("score", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["stadium_id"], ["stadiums.id"]),
        sa.ForeignKeyConstraint(["team1_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["team2_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["tournament_id"], ["tournaments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "squad_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("player_id", sa.Integer(), nullable=False),
        sa.Column("jersey_number", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("team_id", "player_id", name="uq_team_player"),
    )
    op.create_index("ix_squad_members_player_id", "squad_members", ["player_id"])
    op.create_index("ix_squad_members_team_id", "squad_members", ["team_id"])


def downgrade():
    op.drop_table("squad_members")
    op.drop_table("matches")
    op.drop_table("ingestion_runs")
    op.drop_table("players")
    op.drop_table("teams")
    op.drop_table("stadiums")
    op.drop_table("tournaments")
