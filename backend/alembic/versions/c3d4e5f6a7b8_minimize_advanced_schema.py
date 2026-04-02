"""minimize advanced schema

Revision ID: c3d4e5f6a7b8
Revises: b1f0c2d4e9a1
Create Date: 2026-04-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text


# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b1f0c2d4e9a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    op.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))

    table_names = set(inspector.get_table_names())

    if "article_chapters" in table_names:
        chapter_columns = {col["name"] for col in inspector.get_columns("article_chapters")}
        if {"chapter_title", "ai_title"}.issubset(chapter_columns):
            op.execute(
                text(
                    """
                    UPDATE article_chapters
                    SET chapter_title = COALESCE(NULLIF(chapter_title, ''), NULLIF(manual_title, ''), ai_title)
                    """
                )
            )
        if {"chapter_title_description", "ai_title_description"}.issubset(chapter_columns):
            op.execute(
                text(
                    """
                    UPDATE article_chapters
                    SET chapter_title_description = COALESCE(NULLIF(chapter_title_description, ''), ai_title_description)
                    """
                )
            )
        if {"chapter_brief", "ai_brief", "manual_brief"}.issubset(chapter_columns):
            op.execute(
                text(
                    """
                    UPDATE article_chapters
                    SET chapter_brief = COALESCE(NULLIF(chapter_brief, ''), NULLIF(manual_brief, ''), ai_brief)
                    """
                )
            )
        if {"chapter_brief_description", "ai_brief_description"}.issubset(chapter_columns):
            op.execute(
                text(
                    """
                    UPDATE article_chapters
                    SET chapter_brief_description = COALESCE(NULLIF(chapter_brief_description, ''), ai_brief_description)
                    """
                )
            )

        if "manual_guide" in chapter_columns:
            op.execute(
                text(
                    """
                    INSERT INTO chapter_guides (id, chapter_id, title, content, sort_order, created_at)
                    SELECT gen_random_uuid(), id, 'Manual guide', manual_guide, 999, NOW()
                    FROM article_chapters
                    WHERE manual_guide IS NOT NULL AND BTRIM(manual_guide) <> ''
                    """
                )
            )

    if "research_articles" in table_names:
        article_columns = {col["name"] for col in inspector.get_columns("research_articles")}
        if "search_id" in article_columns:
            op.drop_column("research_articles", "search_id")
        if "status" in article_columns:
            op.drop_column("research_articles", "status")
        if "current_step" in article_columns:
            op.drop_column("research_articles", "current_step")

    if "article_chapters" in table_names:
        chapter_columns = {col["name"] for col in inspector.get_columns("article_chapters")}
        for column_name in [
            "ai_title",
            "ai_title_description",
            "manual_title",
            "ai_brief",
            "ai_brief_description",
            "manual_brief",
            "manual_guide",
            "status",
        ]:
            if column_name in chapter_columns:
                op.drop_column("article_chapters", column_name)

    if "chapter_guides" in table_names:
        guide_columns = {col["name"] for col in inspector.get_columns("chapter_guides")}
        for column_name in ["source_type", "is_selected"]:
            if column_name in guide_columns:
                op.drop_column("chapter_guides", column_name)

    if "chapter_sources" in table_names:
        source_columns = {col["name"] for col in inspector.get_columns("chapter_sources")}
        for column_name in ["source_type", "is_selected"]:
            if column_name in source_columns:
                op.drop_column("chapter_sources", column_name)

    for table_name in ["research_outlines", "research_sources", "search_requests"]:
        if table_name in table_names:
            op.drop_table(table_name)


def downgrade() -> None:
    raise NotImplementedError("Downgrade is not supported for the minimized advanced schema.")
