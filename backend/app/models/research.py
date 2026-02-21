import uuid
from sqlalchemy import UUID, Boolean, Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class SearchRequest(Base):
    __tablename__ = "search_requests"
    id = Column(UUID(as_uuid=True), default=uuid.uuid4, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    prompt = Column(Text) 
    optimized_query = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sources = relationship("ResearchSource", back_populates="search_req")
    article = relationship("ResearchArticle", back_populates="search_origin", uselist=False)
    owner = relationship("User", back_populates="searches")

class ResearchOutline(Base):
    __tablename__ = "research_outlines"

    id = Column(Integer, primary_key=True, index=True)
    search_id = Column(UUID(as_uuid=True), ForeignKey("search_requests.id")) 
    stage = Column(Integer) 
    title = Column(String(500)) 
    writing_guideline = Column(Text) 
    user_intent_matched = Column(Boolean, default=False)

class ResearchSource(Base):
    __tablename__ = "research_sources"
    id = Column(UUID(as_uuid=True), default=uuid.uuid4, primary_key=True, index=True)
    search_id = Column(UUID(as_uuid=True), ForeignKey("search_requests.id"))
    title = Column(String(500))
    link = Column(Text)
    snippet = Column(Text)
    publication = Column(String(500))
    year = Column(Integer)
    citation_count = Column(Integer, default=0)
    is_cited = Column(Boolean, default=False)
    search_req = relationship("SearchRequest", back_populates="sources")

class ResearchArticle(Base):
    __tablename__ = "research_articles"
    id = Column(UUID(as_uuid=True), default=uuid.uuid4, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    search_id = Column(UUID(as_uuid=True), ForeignKey("search_requests.id"))
    title = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    search_origin = relationship("SearchRequest", back_populates="article")
    sections = relationship("PaperSection", back_populates="article_parent", cascade="all, delete-orphan", order_by="PaperSection.order")
    owner = relationship("User", back_populates="articles")

class PaperSection(Base):
    __tablename__ = "paper_sections"
    id = Column(UUID(as_uuid=True), default=uuid.uuid4, primary_key=True, index=True)
    article_id = Column(UUID(as_uuid=True), ForeignKey("research_articles.id"))
    section_title = Column(String(255))
    section_content = Column(Text)
    order = Column(Integer)

    article_parent = relationship("ResearchArticle", back_populates="sections")
