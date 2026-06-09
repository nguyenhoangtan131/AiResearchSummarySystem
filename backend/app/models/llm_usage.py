import uuid

from sqlalchemy import (
    UUID,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class LlmUsage(Base):
    __tablename__ = "llm_usages"

    id = Column(UUID(as_uuid=True), default=uuid.uuid4, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    article_id = Column(
        UUID(as_uuid=True),
        ForeignKey("research_articles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_id = Column(String(120), nullable=True, index=True)
    article_title = Column(Text, nullable=True)
    report_type = Column(String(120), nullable=True)

    blueprint_label = Column(Text, nullable=True)
    blueprint_input_tokens = Column(Integer, nullable=False, default=0)
    blueprint_output_tokens = Column(Integer, nullable=False, default=0)
    blueprint_total_tokens = Column(Integer, nullable=False, default=0)
    blueprint_cost_usd = Column(Numeric(12, 6), nullable=False, default=0)
    blueprint_latency_ms = Column(Integer, nullable=True)

    total_input_tokens = Column(Integer, nullable=False, default=0)
    total_output_tokens = Column(Integer, nullable=False, default=0)
    total_tokens = Column(Integer, nullable=False, default=0)
    total_cost_usd = Column(Numeric(12, 6), nullable=False, default=0)
    total_latency_ms = Column(Integer, nullable=True)

    status = Column(String(30), nullable=False, default="in_progress", server_default="in_progress")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="llm_usages")
    article_parent = relationship("ResearchArticle", back_populates="llm_usages")
    details = relationship(
        "LlmUsageDetail",
        back_populates="usage_parent",
        cascade="all, delete-orphan",
        order_by="LlmUsageDetail.chapter_number",
    )


class LlmUsageDetail(Base):
    __tablename__ = "llm_usage_details"
    __table_args__ = (
        UniqueConstraint("usage_id", "chapter_id", name="uq_llm_usage_details_usage_chapter"),
    )

    id = Column(UUID(as_uuid=True), default=uuid.uuid4, primary_key=True, index=True)
    usage_id = Column(UUID(as_uuid=True), ForeignKey("llm_usages.id", ondelete="CASCADE"), nullable=False, index=True)
    article_id = Column(
        UUID(as_uuid=True),
        ForeignKey("research_articles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chapter_id = Column(
        UUID(as_uuid=True),
        ForeignKey("article_chapters.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    chapter_number = Column(Integer, nullable=False)
    chapter_title = Column(Text, nullable=True)

    title_label = Column(Text, nullable=True)
    title_input_tokens = Column(Integer, nullable=False, default=0)
    title_output_tokens = Column(Integer, nullable=False, default=0)
    title_total_tokens = Column(Integer, nullable=False, default=0)
    title_cost_usd = Column(Numeric(12, 6), nullable=False, default=0)
    title_latency_ms = Column(Integer, nullable=True)

    brief_label = Column(Text, nullable=True)
    brief_input_tokens = Column(Integer, nullable=False, default=0)
    brief_output_tokens = Column(Integer, nullable=False, default=0)
    brief_total_tokens = Column(Integer, nullable=False, default=0)
    brief_cost_usd = Column(Numeric(12, 6), nullable=False, default=0)
    brief_latency_ms = Column(Integer, nullable=True)

    guide_label = Column(Text, nullable=True)
    guide_input_tokens = Column(Integer, nullable=False, default=0)
    guide_output_tokens = Column(Integer, nullable=False, default=0)
    guide_total_tokens = Column(Integer, nullable=False, default=0)
    guide_cost_usd = Column(Numeric(12, 6), nullable=False, default=0)
    guide_latency_ms = Column(Integer, nullable=True)

    citation_label = Column(Text, nullable=True)
    citation_input_tokens = Column(Integer, nullable=False, default=0)
    citation_output_tokens = Column(Integer, nullable=False, default=0)
    citation_total_tokens = Column(Integer, nullable=False, default=0)
    citation_cost_usd = Column(Numeric(12, 6), nullable=False, default=0)
    citation_latency_ms = Column(Integer, nullable=True)

    writing_label = Column(Text, nullable=True)
    writing_input_tokens = Column(Integer, nullable=False, default=0)
    writing_output_tokens = Column(Integer, nullable=False, default=0)
    writing_total_tokens = Column(Integer, nullable=False, default=0)
    writing_cost_usd = Column(Numeric(12, 6), nullable=False, default=0)
    writing_latency_ms = Column(Integer, nullable=True)

    total_input_tokens = Column(Integer, nullable=False, default=0)
    total_output_tokens = Column(Integer, nullable=False, default=0)
    total_tokens = Column(Integer, nullable=False, default=0)
    total_cost_usd = Column(Numeric(12, 6), nullable=False, default=0)
    total_latency_ms = Column(Integer, nullable=True)

    source_query = Column(Text, nullable=True)
    source_result_count = Column(Integer, nullable=False, default=0)
    model_title = Column(String(120), nullable=True)
    model_brief = Column(String(120), nullable=True)
    model_guide = Column(String(120), nullable=True)
    model_citation = Column(String(120), nullable=True)
    model_writing = Column(String(120), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    usage_parent = relationship("LlmUsage", back_populates="details")
    article_parent = relationship("ResearchArticle", back_populates="llm_usage_details")
    chapter_parent = relationship("ArticleChapter", back_populates="llm_usage_details")
