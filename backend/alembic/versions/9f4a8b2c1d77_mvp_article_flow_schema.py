"""mvp article flow schema

Revision ID: 9f4a8b2c1d77
Revises: 63bc59c65546
Create Date: 2026-03-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '9f4a8b2c1d77'
down_revision: Union[str, Sequence[str], None] = '63bc59c65546'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    article_columns = {col["name"] for col in inspector.get_columns("research_articles")}
    if "report_type" not in article_columns:
        op.add_column('research_articles', sa.Column('report_type', sa.String(length=120), nullable=True))
    if "chapter_count" not in article_columns:
        op.add_column('research_articles', sa.Column('chapter_count', sa.Integer(), nullable=True))
    if "status" not in article_columns:
        op.add_column('research_articles', sa.Column('status', sa.String(length=50), nullable=True))
    if "current_step" not in article_columns:
        op.add_column('research_articles', sa.Column('current_step', sa.String(length=50), nullable=True))
    if "updated_at" not in article_columns:
        op.add_column('research_articles', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True))

    op.execute("UPDATE research_articles SET chapter_count = 0 WHERE chapter_count IS NULL")
    op.execute("UPDATE research_articles SET status = 'configuring' WHERE status IS NULL")
    op.execute("UPDATE research_articles SET current_step = 'setup' WHERE current_step IS NULL")

    tables = set(inspector.get_table_names())

    if "article_chapters" not in tables:
        op.create_table(
            'article_chapters',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('article_id', sa.UUID(), nullable=False),
            sa.Column('chapter_number', sa.Integer(), nullable=False),
            sa.Column('ai_title', sa.String(length=500), nullable=True),
            sa.Column('ai_title_description', sa.Text(), nullable=True),
            sa.Column('manual_title', sa.String(length=500), nullable=True),
            sa.Column('ai_brief', sa.Text(), nullable=True),
            sa.Column('ai_brief_description', sa.Text(), nullable=True),
            sa.Column('manual_brief', sa.Text(), nullable=True),
            sa.Column('manual_guide', sa.Text(), nullable=True),
            sa.Column('generated_content', sa.Text(), nullable=True),
            sa.Column('status', sa.String(length=50), nullable=False, server_default='configuring'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['article_id'], ['research_articles.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_article_chapters_id'), 'article_chapters', ['id'], unique=False)

    if "chapter_guides" not in tables:
        op.create_table(
            'chapter_guides',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('chapter_id', sa.UUID(), nullable=False),
            sa.Column('source_type', sa.String(length=20), nullable=False),
            sa.Column('title', sa.String(length=500), nullable=True),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('is_selected', sa.Boolean(), nullable=True, server_default=sa.true()),
            sa.Column('sort_order', sa.Integer(), nullable=True, server_default='0'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['chapter_id'], ['article_chapters.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_chapter_guides_id'), 'chapter_guides', ['id'], unique=False)

    if "chapter_sources" not in tables:
        op.create_table(
            'chapter_sources',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('chapter_id', sa.UUID(), nullable=False),
            sa.Column('source_type', sa.String(length=20), nullable=False),
            sa.Column('title', sa.String(length=500), nullable=False),
            sa.Column('snippet', sa.Text(), nullable=True),
            sa.Column('provider', sa.String(length=255), nullable=True),
            sa.Column('url', sa.Text(), nullable=True),
            sa.Column('year', sa.Integer(), nullable=True),
            sa.Column('citation_count', sa.Integer(), nullable=True, server_default='0'),
            sa.Column('publication', sa.String(length=500), nullable=True),
            sa.Column('is_selected', sa.Boolean(), nullable=True, server_default=sa.true()),
            sa.Column('sort_order', sa.Integer(), nullable=True, server_default='0'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['chapter_id'], ['article_chapters.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_chapter_sources_id'), 'chapter_sources', ['id'], unique=False)

    # User explicitly requested clearing legacy research data for MVP reset.
    op.execute("TRUNCATE TABLE paper_sections, research_articles, research_sources, research_outlines, search_requests RESTART IDENTITY CASCADE")


def downgrade() -> None:
    op.drop_index(op.f('ix_chapter_sources_id'), table_name='chapter_sources')
    op.drop_table('chapter_sources')
    op.drop_index(op.f('ix_chapter_guides_id'), table_name='chapter_guides')
    op.drop_table('chapter_guides')
    op.drop_index(op.f('ix_article_chapters_id'), table_name='article_chapters')
    op.drop_table('article_chapters')

    op.drop_column('research_articles', 'updated_at')
    op.drop_column('research_articles', 'current_step')
    op.drop_column('research_articles', 'status')
    op.drop_column('research_articles', 'chapter_count')
    op.drop_column('research_articles', 'report_type')
