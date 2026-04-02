from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class ChapterGuideBase(BaseModel):
    content: str
    sort_order: int = 0


class ChapterGuideRead(ChapterGuideBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ChapterSourceBase(BaseModel):
    title: str
    snippet: Optional[str] = None
    provider: Optional[str] = None
    url: Optional[str] = None
    year: Optional[int] = None
    citation_count: int = 0
    publication: Optional[str] = None
    sort_order: int = 0


class ChapterSourceRead(ChapterSourceBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ArticleBlueprintBase(BaseModel):
    chapter_number: int
    title: Optional[str] = None
    purpose: Optional[str] = None
    start_focus: Optional[str] = None
    end_focus: Optional[str] = None
    sort_order: int = 0


class ArticleBlueprintRead(ArticleBlueprintBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ArticleChapterBase(BaseModel):
    chapter_number: int
    chapter_title: Optional[str] = None
    chapter_title_description: Optional[str] = None
    chapter_brief: Optional[str] = None
    generated_content: Optional[str] = None


class ArticleChapterRead(ArticleChapterBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    guides: List[ChapterGuideRead] = []
    sources: List[ChapterSourceRead] = []

    class Config:
        from_attributes = True


class ResearchArticleBase(BaseModel):
    title: str
    report_type: Optional[str] = None
    chapter_count: int = 0


class ResearchArticleRead(ResearchArticleBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    blueprints: List[ArticleBlueprintRead] = []
    chapters: List[ArticleChapterRead] = []

    class Config:
        from_attributes = True
