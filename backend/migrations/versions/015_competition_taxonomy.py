"""015 competition taxonomy (multi-competition support)

Revision ID: 015
Revises: 014
Create Date: 2026-06-17

"""
import sqlalchemy as sa
from alembic import op

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade():
    # Tournament -> generic competition fields.
    op.add_column("tournaments", sa.Column("kind", sa.String(length=32), nullable=True))
    op.add_column("tournaments", sa.Column("format", sa.String(length=40), nullable=True))
    op.add_column("tournaments", sa.Column("country", sa.String(length=64), nullable=True))
    op.add_column("tournaments", sa.Column("confederation", sa.String(length=32), nullable=True))
    op.add_column("tournaments", sa.Column("tier", sa.Integer(), nullable=True))
    op.add_column("tournaments", sa.Column("season_label", sa.String(length=32), nullable=True))
    op.add_column("tournaments", sa.Column("logo_url", sa.String(length=512), nullable=True))
    op.add_column("tournaments", sa.Column("layout_config", sa.JSON(), nullable=True))
    op.add_column("tournaments", sa.Column("sort_order", sa.Integer(), nullable=True))

    # Backfill the existing World Cup row.
    op.execute(
        """
        UPDATE tournaments
        SET kind = 'international',
            format = 'groups_knockout',
            confederation = 'FIFA',
            sort_order = 0
        WHERE external_key = 'world-cup-2026'
        """
    )

    # TournamentTeam -> club fields + nullable nation.
    op.add_column("tournament_teams", sa.Column("display_name", sa.String(length=128), nullable=True))
    op.add_column("tournament_teams", sa.Column("short_code", sa.String(length=16), nullable=True))
    op.add_column("tournament_teams", sa.Column("crest_url", sa.String(length=512), nullable=True))
    op.alter_column("tournament_teams", "nation_id", existing_type=sa.Integer(), nullable=True)

    # Match -> stage/leg for bracket + standings partitioning.
    op.add_column("matches", sa.Column("stage", sa.String(length=32), nullable=True))
    op.add_column("matches", sa.Column("leg", sa.Integer(), nullable=True))


def downgrade():
    op.drop_column("matches", "leg")
    op.drop_column("matches", "stage")

    op.alter_column("tournament_teams", "nation_id", existing_type=sa.Integer(), nullable=False)
    op.drop_column("tournament_teams", "crest_url")
    op.drop_column("tournament_teams", "short_code")
    op.drop_column("tournament_teams", "display_name")

    op.drop_column("tournaments", "sort_order")
    op.drop_column("tournaments", "layout_config")
    op.drop_column("tournaments", "logo_url")
    op.drop_column("tournaments", "season_label")
    op.drop_column("tournaments", "tier")
    op.drop_column("tournaments", "confederation")
    op.drop_column("tournaments", "country")
    op.drop_column("tournaments", "format")
    op.drop_column("tournaments", "kind")
