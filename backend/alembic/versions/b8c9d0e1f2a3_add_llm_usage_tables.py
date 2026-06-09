"""Add llm usage tables

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-05-19 15:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b8c9d0e1f2a3"
down_revision: Union[str, Sequence[str], None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "llm_usages",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("article_id", sa.UUID(), nullable=False),
        sa.Column("session_id", sa.String(length=120), nullable=True),
        sa.Column("article_title", sa.Text(), nullable=True),
        sa.Column("report_type", sa.String(length=120), nullable=True),
        sa.Column("blueprint_label", sa.Text(), nullable=True),
        sa.Column("blueprint_input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("blueprint_output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("blueprint_total_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("blueprint_cost_usd", sa.Numeric(12, 6), nullable=False, server_default="0"),
        sa.Column("blueprint_latency_ms", sa.Integer(), nullable=True),
        sa.Column("total_input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_cost_usd", sa.Numeric(12, 6), nullable=False, server_default="0"),
        sa.Column("total_latency_ms", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="in_progress"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["article_id"], ["research_articles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_llm_usages_id"), "llm_usages", ["id"], unique=False)
    op.create_index(op.f("ix_llm_usages_user_id"), "llm_usages", ["user_id"], unique=False)
    op.create_index(op.f("ix_llm_usages_article_id"), "llm_usages", ["article_id"], unique=False)
    op.create_index(op.f("ix_llm_usages_session_id"), "llm_usages", ["session_id"], unique=False)

    op.create_table(
        "llm_usage_details",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("usage_id", sa.UUID(), nullable=False),
        sa.Column("article_id", sa.UUID(), nullable=False),
        sa.Column("chapter_id", sa.UUID(), nullable=True),
        sa.Column("chapter_number", sa.Integer(), nullable=False),
        sa.Column("chapter_title", sa.Text(), nullable=True),
        sa.Column("title_label", sa.Text(), nullable=True),
        sa.Column("title_input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("title_output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("title_total_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("title_cost_usd", sa.Numeric(12, 6), nullable=False, server_default="0"),
        sa.Column("title_latency_ms", sa.Integer(), nullable=True),
        sa.Column("brief_label", sa.Text(), nullable=True),
        sa.Column("brief_input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("brief_output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("brief_total_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("brief_cost_usd", sa.Numeric(12, 6), nullable=False, server_default="0"),
        sa.Column("brief_latency_ms", sa.Integer(), nullable=True),
        sa.Column("guide_label", sa.Text(), nullable=True),
        sa.Column("guide_input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("guide_output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("guide_total_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("guide_cost_usd", sa.Numeric(12, 6), nullable=False, server_default="0"),
        sa.Column("guide_latency_ms", sa.Integer(), nullable=True),
        sa.Column("citation_label", sa.Text(), nullable=True),
        sa.Column("citation_input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("citation_output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("citation_total_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("citation_cost_usd", sa.Numeric(12, 6), nullable=False, server_default="0"),
        sa.Column("citation_latency_ms", sa.Integer(), nullable=True),
        sa.Column("writing_label", sa.Text(), nullable=True),
        sa.Column("writing_input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("writing_output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("writing_total_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("writing_cost_usd", sa.Numeric(12, 6), nullable=False, server_default="0"),
        sa.Column("writing_latency_ms", sa.Integer(), nullable=True),
        sa.Column("total_input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_cost_usd", sa.Numeric(12, 6), nullable=False, server_default="0"),
        sa.Column("total_latency_ms", sa.Integer(), nullable=True),
        sa.Column("source_query", sa.Text(), nullable=True),
        sa.Column("source_result_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("model_title", sa.String(length=120), nullable=True),
        sa.Column("model_brief", sa.String(length=120), nullable=True),
        sa.Column("model_guide", sa.String(length=120), nullable=True),
        sa.Column("model_citation", sa.String(length=120), nullable=True),
        sa.Column("model_writing", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["article_id"], ["research_articles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["chapter_id"], ["article_chapters.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["usage_id"], ["llm_usages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("usage_id", "chapter_id", name="uq_llm_usage_details_usage_chapter"),
    )
    op.create_index(op.f("ix_llm_usage_details_id"), "llm_usage_details", ["id"], unique=False)
    op.create_index(op.f("ix_llm_usage_details_usage_id"), "llm_usage_details", ["usage_id"], unique=False)
    op.create_index(op.f("ix_llm_usage_details_article_id"), "llm_usage_details", ["article_id"], unique=False)
    op.create_index(op.f("ix_llm_usage_details_chapter_id"), "llm_usage_details", ["chapter_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_llm_usage_details_chapter_id"), table_name="llm_usage_details")
    op.drop_index(op.f("ix_llm_usage_details_article_id"), table_name="llm_usage_details")
    op.drop_index(op.f("ix_llm_usage_details_usage_id"), table_name="llm_usage_details")
    op.drop_index(op.f("ix_llm_usage_details_id"), table_name="llm_usage_details")
    op.drop_table("llm_usage_details")

    op.drop_index(op.f("ix_llm_usages_session_id"), table_name="llm_usages")
    op.drop_index(op.f("ix_llm_usages_article_id"), table_name="llm_usages")
    op.drop_index(op.f("ix_llm_usages_user_id"), table_name="llm_usages")
    op.drop_index(op.f("ix_llm_usages_id"), table_name="llm_usages")
    op.drop_table("llm_usages")
