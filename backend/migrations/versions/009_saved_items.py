"""saved items

Revision ID: 009
Revises: 008
Create Date: 2026-06-12

"""
from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "saved_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("item_type", sa.String(length=16), nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "item_type", "item_id", name="uq_saved_items_user_item"),
    )
    op.create_index(op.f("ix_saved_items_user_id"), "saved_items", ["user_id"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_saved_items_user_id"), table_name="saved_items")
    op.drop_table("saved_items")
