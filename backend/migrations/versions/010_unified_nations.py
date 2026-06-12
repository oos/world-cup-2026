"""Unified nations and tournament teams

Revision ID: 010
Revises: 009
Create Date: 2026-06-12

"""
from alembic import op
import sqlalchemy as sa

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "nations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("fifa_code", sa.String(length=8), nullable=False),
        sa.Column("flag_iso", sa.String(length=16), nullable=True),
        sa.Column("continent", sa.String(length=64), nullable=True),
        sa.Column("aliases", sa.JSON(), nullable=True),
        sa.Column("wikidata_id", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("fifa_code"),
    )
    op.create_index("ix_nations_fifa_code", "nations", ["fifa_code"], unique=True)

    from app.data.nation_registry import NATION_SEED

    nations_table = sa.table(
        "nations",
        sa.column("name", sa.String),
        sa.column("fifa_code", sa.String),
        sa.column("flag_iso", sa.String),
        sa.column("continent", sa.String),
        sa.column("aliases", sa.JSON),
    )
    op.bulk_insert(
        nations_table,
        [
            {
                "name": name,
                "fifa_code": fifa_code,
                "flag_iso": flag_iso,
                "continent": continent,
                "aliases": aliases,
            }
            for name, fifa_code, flag_iso, continent, aliases in NATION_SEED
        ],
    )

    connection = op.get_bind()
    existing_teams = connection.execute(
        sa.text("SELECT DISTINCT fifa_code, name, continent, wikidata_id FROM teams")
    ).fetchall()
    for row in existing_teams:
        connection.execute(
            sa.text(
                """
                INSERT INTO nations (name, fifa_code, flag_iso, continent, aliases, wikidata_id)
                SELECT :name, :fifa_code, NULL, :continent, '[]'::json, :wikidata_id
                WHERE NOT EXISTS (SELECT 1 FROM nations WHERE fifa_code = :fifa_code)
                """
            ),
            {
                "name": row.name,
                "fifa_code": row.fifa_code,
                "continent": row.continent,
                "wikidata_id": row.wikidata_id,
            },
        )

    op.rename_table("teams", "tournament_teams")
    op.add_column("tournament_teams", sa.Column("nation_id", sa.Integer(), nullable=True))
    connection.execute(
        sa.text(
            """
            UPDATE tournament_teams tt
            SET nation_id = n.id
            FROM nations n
            WHERE n.fifa_code = tt.fifa_code
            """
        )
    )
    op.alter_column("tournament_teams", "nation_id", nullable=False)
    op.create_foreign_key(
        "fk_tournament_teams_nation_id",
        "tournament_teams",
        "nations",
        ["nation_id"],
        ["id"],
    )
    op.create_index("ix_tournament_teams_nation_id", "tournament_teams", ["nation_id"])

    op.drop_index("ix_teams_fifa_code", table_name="tournament_teams")
    op.drop_constraint("teams_fifa_code_key", "tournament_teams", type_="unique")
    op.drop_column("tournament_teams", "fifa_code")
    op.drop_column("tournament_teams", "name")
    op.drop_column("tournament_teams", "name_normalised")
    op.drop_column("tournament_teams", "continent")
    op.drop_column("tournament_teams", "wikidata_id")
    op.create_unique_constraint(
        "uq_tournament_nation",
        "tournament_teams",
        ["tournament_id", "nation_id"],
    )

    op.add_column("tournaments", sa.Column("synced_at", sa.DateTime(), nullable=True))
    op.create_index("ix_tournaments_year", "tournaments", ["year"], unique=False)

    op.add_column("matches", sa.Column("stadium_name", sa.String(length=256), nullable=True))
    op.add_column("matches", sa.Column("goals1", sa.JSON(), nullable=True))
    op.add_column("matches", sa.Column("goals2", sa.JSON(), nullable=True))
    op.add_column("matches", sa.Column("match_key", sa.String(length=256), nullable=True))
    op.create_index("ix_matches_match_key", "matches", ["match_key"], unique=False)
    op.create_index("ix_matches_match_date", "matches", ["match_date"], unique=False)
    op.create_index("ix_matches_tournament_id", "matches", ["tournament_id"], unique=False)

    op.add_column("espn_matches", sa.Column("history_match_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_espn_matches_history_match_id",
        "espn_matches",
        "matches",
        ["history_match_id"],
        ["id"],
    )
    op.create_index(
        "ix_espn_matches_history_match_id",
        "espn_matches",
        ["history_match_id"],
        unique=False,
    )

    connection.execute(
        sa.text(
            """
            UPDATE espn_matches em
            SET history_match_id = m.id
            FROM matches m
            WHERE em.history_match_key IS NOT NULL
              AND em.history_match_key = m.match_key
            """
        )
    )


def downgrade():
    op.drop_index("ix_espn_matches_history_match_id", table_name="espn_matches")
    op.drop_constraint("fk_espn_matches_history_match_id", "espn_matches", type_="foreignkey")
    op.drop_column("espn_matches", "history_match_id")

    op.drop_index("ix_matches_tournament_id", table_name="matches")
    op.drop_index("ix_matches_match_date", table_name="matches")
    op.drop_index("ix_matches_match_key", table_name="matches")
    op.drop_column("matches", "match_key")
    op.drop_column("matches", "goals2")
    op.drop_column("matches", "goals1")
    op.drop_column("matches", "stadium_name")

    op.drop_index("ix_tournaments_year", table_name="tournaments")
    op.drop_column("tournaments", "synced_at")

    op.drop_constraint("uq_tournament_nation", "tournament_teams", type_="unique")
    op.add_column("tournament_teams", sa.Column("wikidata_id", sa.String(length=32), nullable=True))
    op.add_column("tournament_teams", sa.Column("continent", sa.String(length=64), nullable=True))
    op.add_column("tournament_teams", sa.Column("name_normalised", sa.String(length=128), nullable=True))
    op.add_column("tournament_teams", sa.Column("name", sa.String(length=128), nullable=True))
    op.add_column("tournament_teams", sa.Column("fifa_code", sa.String(length=8), nullable=True))

    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE tournament_teams tt
            SET
                name = n.name,
                continent = n.continent,
                wikidata_id = n.wikidata_id,
                fifa_code = n.fifa_code
            FROM nations n
            WHERE tt.nation_id = n.id
            """
        )
    )
    op.alter_column("tournament_teams", "name", nullable=False)
    op.alter_column("tournament_teams", "fifa_code", nullable=False)

    op.drop_index("ix_tournament_teams_nation_id", table_name="tournament_teams")
    op.drop_constraint("fk_tournament_teams_nation_id", "tournament_teams", type_="foreignkey")
    op.drop_column("tournament_teams", "nation_id")

    op.create_unique_constraint("teams_fifa_code_key", "tournament_teams", ["fifa_code"])
    op.create_index("ix_teams_fifa_code", "tournament_teams", ["fifa_code"], unique=True)
    op.rename_table("tournament_teams", "teams")

    op.drop_index("ix_nations_fifa_code", table_name="nations")
    op.drop_table("nations")
