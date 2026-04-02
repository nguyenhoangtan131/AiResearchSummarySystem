"""extract article blueprints

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-04-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text


# revision identifiers, used by Alembic.
revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    table_names = set(inspector.get_table_names())

    if "article_blueprints" not in table_names:
        op.create_table(
            "article_blueprints",
            sa.Column("id", sa.UUID(), nullable=False),
            sa.Column("article_id", sa.UUID(), nullable=False),
            sa.Column("chapter_number", sa.Integer(), nullable=False),
            sa.Column("title", sa.Text(), nullable=True),
            sa.Column("purpose", sa.Text(), nullable=True),
            sa.Column("start_focus", sa.Text(), nullable=True),
            sa.Column("end_focus", sa.Text(), nullable=True),
            sa.Column("sort_order", sa.Integer(), nullable=True, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["article_id"], ["research_articles.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_article_blueprints_id"), "article_blueprints", ["id"], unique=False)

    chapter_columns = {col["name"] for col in inspector.get_columns("article_chapters")}
    if {
        "blueprint_title",
        "blueprint_purpose",
        "blueprint_start_focus",
        "blueprint_end_focus",
    }.issubset(chapter_columns):
        op.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
        op.execute(
            text(
                """
                INSERT INTO article_blueprints (id, article_id, chapter_number, title, purpose, start_focus, end_focus, sort_order, created_at)
                SELECT gen_random_uuid(), article_id, chapter_number, blueprint_title, blueprint_purpose, blueprint_start_focus, blueprint_end_focus, chapter_number, NOW()
                FROM article_chapters
                WHERE blueprint_title IS NOT NULL
                   OR blueprint_purpose IS NOT NULL
                   OR blueprint_start_focus IS NOT NULL
                   OR blueprint_end_focus IS NOT NULL
                """
            )
        )
        op.drop_column("article_chapters", "blueprint_end_focus")
        op.drop_column("article_chapters", "blueprint_start_focus")
        op.drop_column("article_chapters", "blueprint_purpose")
        op.drop_column("article_chapters", "blueprint_title")


def downgrade() -> None:
    raise NotImplementedError("Downgrade is not supported for extracted article blueprints.")
