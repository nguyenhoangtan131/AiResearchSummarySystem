"""simplify chapter summary and guides

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-02

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    chapter_columns = {col["name"] for col in inspector.get_columns("article_chapters")}
    if "chapter_brief_description" in chapter_columns:
        op.drop_column("article_chapters", "chapter_brief_description")

    guide_columns = {col["name"] for col in inspector.get_columns("chapter_guides")}
    if "title" in guide_columns:
        op.drop_column("chapter_guides", "title")


def downgrade() -> None:
    raise NotImplementedError("Downgrade is not supported for the simplified chapter summary schema.")
