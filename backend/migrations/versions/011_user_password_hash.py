"""user password hash

Revision ID: 011
Revises: 010
Create Date: 2026-06-16

"""
from alembic import op
import sqlalchemy as sa

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("password_hash", sa.String(length=255), nullable=True))


def downgrade():
    op.drop_column("users", "password_hash")
