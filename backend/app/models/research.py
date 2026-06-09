import uuid
from sqlalchemy import UUID, Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class ResearchArticle(Base):
    __tablename__ = "research_articles"
    id = Column(UUID(as_uuid=True), default=uuid.uuid4, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    title = Column(String(500))
    report_type = Column(String(120))
    chapter_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    blueprints = relationship("ArticleBlueprint", back_populates="article_parent", cascade="all, delete-orphan", order_by="ArticleBlueprint.chapter_number")
    chapters = relationship("ArticleChapter", back_populates="article_parent", cascade="all, delete-orphan", order_by="ArticleChapter.chapter_number")
    owner = relationship("User", back_populates="articles")
    llm_usages = relationship("LlmUsage", back_populates="article_parent", cascade="all, delete-orphan")
    llm_usage_details = relationship("LlmUsageDetail", back_populates="article_parent")

class ArticleBlueprint(Base):
    __tablename__ = "article_blueprints"
    id = Column(UUID(as_uuid=True), default=uuid.uuid4, primary_key=True, index=True)
    article_id = Column(UUID(as_uuid=True), ForeignKey("research_articles.id", ondelete="CASCADE"), nullable=False)
    chapter_number = Column(Integer, nullable=False)
    title = Column(Text)
    purpose = Column(Text)
    start_focus = Column(Text)
    end_focus = Column(Text)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    article_parent = relationship("ResearchArticle", back_populates="blueprints")

class ArticleChapter(Base):
    __tablename__ = "article_chapters"
    id = Column(UUID(as_uuid=True), default=uuid.uuid4, primary_key=True, index=True)
    article_id = Column(UUID(as_uuid=True), ForeignKey("research_articles.id", ondelete="CASCADE"), nullable=False)
    chapter_number = Column(Integer, nullable=False)
    chapter_title = Column(Text)
    chapter_title_description = Column(Text)
    chapter_brief = Column(Text)
    generated_content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    article_parent = relationship("ResearchArticle", back_populates="chapters")
    guides = relationship("ChapterGuide", back_populates="chapter_parent", cascade="all, delete-orphan", order_by="ChapterGuide.sort_order")
    sources = relationship("ChapterSource", back_populates="chapter_parent", cascade="all, delete-orphan", order_by="ChapterSource.sort_order")
    llm_usage_details = relationship("LlmUsageDetail", back_populates="chapter_parent")

class ChapterGuide(Base):
    __tablename__ = "chapter_guides"
    id = Column(UUID(as_uuid=True), default=uuid.uuid4, primary_key=True, index=True)
    chapter_id = Column(UUID(as_uuid=True), ForeignKey("article_chapters.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    chapter_parent = relationship("ArticleChapter", back_populates="guides")

class ChapterSource(Base):
    __tablename__ = "chapter_sources"
    id = Column(UUID(as_uuid=True), default=uuid.uuid4, primary_key=True, index=True)
    chapter_id = Column(UUID(as_uuid=True), ForeignKey("article_chapters.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    snippet = Column(Text)
    provider = Column(String(255))
    url = Column(Text)
    year = Column(Integer)
    citation_count = Column(Integer, default=0)
    publication = Column(String(500))
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    chapter_parent = relationship("ArticleChapter", back_populates="sources")
