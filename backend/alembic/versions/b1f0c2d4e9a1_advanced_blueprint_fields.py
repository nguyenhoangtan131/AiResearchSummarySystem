"""advanced blueprint fields

Revision ID: b1f0c2d4e9a1
Revises: 9f4a8b2c1d77
Create Date: 2026-03-31

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "b1f0c2d4e9a1"
down_revision: Union[str, Sequence[str], None] = "9f4a8b2c1d77"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    chapter_columns = {col["name"] for col in inspector.get_columns("article_chapters")}

    additions = [
        ("blueprint_title", sa.Text()),
        ("blueprint_purpose", sa.Text()),
        ("blueprint_start_focus", sa.Text()),
        ("blueprint_end_focus", sa.Text()),
        ("chapter_title", sa.Text()),
        ("chapter_title_description", sa.Text()),
        ("chapter_brief", sa.Text()),
        ("chapter_brief_description", sa.Text()),
    ]

    for column_name, column_type in additions:
        if column_name not in chapter_columns:
            op.add_column("article_chapters", sa.Column(column_name, column_type, nullable=True))


def downgrade() -> None:
    op.drop_column("article_chapters", "chapter_brief_description")
    op.drop_column("article_chapters", "chapter_brief")
    op.drop_column("article_chapters", "chapter_title_description")
    op.drop_column("article_chapters", "chapter_title")
    op.drop_column("article_chapters", "blueprint_end_focus")
    op.drop_column("article_chapters", "blueprint_start_focus")
    op.drop_column("article_chapters", "blueprint_purpose")
    op.drop_column("article_chapters", "blueprint_title")
