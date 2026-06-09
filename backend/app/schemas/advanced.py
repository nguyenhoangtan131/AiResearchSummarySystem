from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.research import (
    ArticleBlueprintRead,
    ArticleChapterRead,
    ChapterGuideBase,
    ChapterSourceBase,
)


class AdvancedStructureRequest(BaseModel):
    article_title: str = Field(..., min_length=3, max_length=500)
    report_type: str = Field(..., min_length=3, max_length=120)
    session_id: Optional[str] = Field(default=None, min_length=1, max_length=120)


class ChapterBlueprintItem(BaseModel):
    chapter_number: int = Field(..., ge=1)
    working_title: str = Field(..., min_length=1, max_length=300)
    purpose: str = Field(..., min_length=1)
    start_focus: str = Field(..., min_length=1)
    end_focus: str = Field(..., min_length=1)
    display_working_title_vi: Optional[str] = None
    display_purpose_vi: Optional[str] = None
    display_start_focus_vi: Optional[str] = None
    display_end_focus_vi: Optional[str] = None


class StructureOption(BaseModel):
    option_id: str = Field(..., min_length=1, max_length=50)
    chapter_count: int = Field(..., ge=1, le=12)
    rationale: str = Field(..., min_length=1)
    blueprint: List[ChapterBlueprintItem]
    display_rationale_vi: Optional[str] = None


class AdvancedStructureResponse(BaseModel):
    article_title: str
    normalized_article_title: str
    normalized_article_title_en: str
    display_article_title_vi: Optional[str] = None
    report_type: str
    session_id: str
    cache_key: str
    cache_ttl_seconds: int = Field(..., ge=60)
    option_count: int = Field(..., ge=1, le=5)
    recommended_option_id: str
    options: List[StructureOption]


class AdvancedStructureCacheRead(BaseModel):
    cache_key: str
    found: bool
    data: Optional[AdvancedStructureResponse] = None


class AdvancedChapterStepCacheRead(BaseModel):
    cache_key: str
    found: bool
    step: str
    data: Optional[dict[str, Any]] = None


class SelectStructureRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=120)
    selected_option_id: str = Field(..., min_length=1, max_length=50)
    article_id: Optional[UUID] = None


class SelectedBlueprintRead(BaseModel):
    chapter_number: int
    title: str
    purpose: str
    start_focus: str
    end_focus: str


class SelectStructureResponse(BaseModel):
    article_id: UUID
    title: str
    report_type: str
    chapter_count: int
    cached_session_id: str
    blueprints: List[SelectedBlueprintRead]
    persisted_at: datetime


class ChapterStepContext(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=120)
    selected_option_id: str = Field(..., min_length=1, max_length=50)
    chapter_number: int = Field(..., ge=1, le=12)


class ChapterTitleRecommendationRequest(ChapterStepContext):
    pass


class ChapterTitleOption(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: str = Field(..., min_length=1)
    display_title_vi: Optional[str] = None
    display_description_vi: Optional[str] = None


class ChapterTitleRecommendationResponse(BaseModel):
    session_id: str
    selected_option_id: str
    chapter_number: int
    cache_key: str
    cache_ttl_seconds: int = Field(..., ge=60)
    option_count: int = Field(..., ge=1, le=5)
    context_signature: Optional[str] = None
    options: List[ChapterTitleOption]


class ChapterBriefRecommendationRequest(ChapterStepContext):
    chapter_title: str = Field(..., min_length=3, max_length=300)
    chapter_title_description: Optional[str] = None


class ChapterBriefOption(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: str = Field(..., min_length=1)
    display_title_vi: Optional[str] = None
    display_description_vi: Optional[str] = None


class ChapterBriefRecommendationResponse(BaseModel):
    session_id: str
    selected_option_id: str
    chapter_number: int
    cache_key: str
    cache_ttl_seconds: int = Field(..., ge=60)
    option_count: int = Field(..., ge=1, le=5)
    context_signature: Optional[str] = None
    options: List[ChapterBriefOption]


class ChapterGuideRecommendationRequest(ChapterStepContext):
    chapter_title: str = Field(..., min_length=3, max_length=300)
    chapter_brief: str = Field(..., min_length=3)


class ChapterGuideOption(BaseModel):
    id: str = Field(..., min_length=1, max_length=50)
    title: str = Field(..., min_length=1, max_length=300)
    body: str = Field(..., min_length=1)
    display_title_vi: Optional[str] = None
    display_body_vi: Optional[str] = None


class ChapterGuideRecommendationResponse(BaseModel):
    session_id: str
    selected_option_id: str
    chapter_number: int
    cache_key: str
    cache_ttl_seconds: int = Field(..., ge=60)
    option_count: int = Field(..., ge=1, le=5)
    context_signature: Optional[str] = None
    options: List[ChapterGuideOption]


class ChapterSourceRecommendationRequest(ChapterStepContext):
    chapter_title: str = Field(..., min_length=3, max_length=300)
    chapter_brief: str = Field(..., min_length=3)
    guide_notes: List[str] = Field(default_factory=list)


class ChapterSourceOption(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    title: str = Field(..., min_length=1)
    snippet: Optional[str] = None
    provider: Optional[str] = None
    link: Optional[str] = None
    year: Optional[str] = None
    publication: Optional[str] = None
    citation_count: int = 0
    display_title_vi: Optional[str] = None
    display_snippet_vi: Optional[str] = None
    display_publication_vi: Optional[str] = None


class ChapterSourceRecommendationResponse(BaseModel):
    session_id: str
    selected_option_id: str
    chapter_number: int
    cache_key: str
    cache_ttl_seconds: int = Field(..., ge=60)
    option_count: int = Field(..., ge=1, le=5)
    context_signature: Optional[str] = None
    query: str
    query_candidates: List[str] = Field(default_factory=list)
    options: List[ChapterSourceOption]


class ConfirmFirstChapterRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=120)
    selected_option_id: str = Field(..., min_length=1, max_length=50)
    article_id: Optional[UUID] = None
    manual_title: Optional[str] = None
    ai_title: Optional[str] = None
    ai_title_description: Optional[str] = None
    manual_brief: Optional[str] = None
    ai_brief: Optional[str] = None
    ai_brief_description: Optional[str] = None
    manual_guide: Optional[str] = None
    selected_guides: List[ChapterGuideBase] = Field(default_factory=list)
    selected_sources: List[ChapterSourceBase] = Field(default_factory=list)


class ConfirmFirstChapterResponse(BaseModel):
    article_id: UUID
    normalized_article_title: str
    normalized_article_title_en: str
    report_type: str
    chapter_count: int
    cached_session_id: str
    first_chapter: ArticleChapterRead
    persisted_at: datetime


class ConfirmChapterRequest(BaseModel):
    article_id: UUID
    session_id: str = Field(..., min_length=1, max_length=120)
    chapter_number: int = Field(..., ge=1, le=12)
    selected_option_id: str = Field(..., min_length=1, max_length=50)
    chapter_title: Optional[str] = None
    chapter_title_description: Optional[str] = None
    chapter_brief: Optional[str] = None
    manual_guide: Optional[str] = None
    selected_guides: List[ChapterGuideBase] = Field(default_factory=list)
    selected_sources: List[ChapterSourceBase] = Field(default_factory=list)


class ConfirmChapterResponse(BaseModel):
    article_id: UUID
    chapter_number: int
    cached_session_id: str
    chapter: ArticleChapterRead
    persisted_at: datetime


class BlueprintOverridePayload(BaseModel):
    working_title: str = Field(..., min_length=1, max_length=300)
    purpose: str = Field(..., min_length=1)
    start_focus: str = Field(..., min_length=1)
    end_focus: str = Field(..., min_length=1)


class TitleOverridePayload(BaseModel):
    final_title: str = Field(..., min_length=1, max_length=300)
    final_description: Optional[str] = None
    reason: Optional[str] = None
    edited_from_ai: bool = False


class BriefOverridePayload(BaseModel):
    final_title: str = Field(..., min_length=1, max_length=300)
    final_description: str = Field(..., min_length=1)
    reason: Optional[str] = None
    edited_from_ai: bool = False


class GuideOverrideItem(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    title: str = Field(..., min_length=1, max_length=300)
    body: str = Field(..., min_length=1)
    is_manual: bool = False


class GuideOverridePayload(BaseModel):
    selected_ai_guides: List[GuideOverrideItem] = Field(default_factory=list)
    manual_guides: List[GuideOverrideItem] = Field(default_factory=list)


class ChapterOverrideSyncRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=120)
    chapter_number: int = Field(..., ge=1, le=12)
    block: Literal["title", "brief", "guide", "blueprint"]
    mode: Optional[Literal["ai", "manual"]] = None
    article_id: Optional[UUID] = None
    data: Dict[str, Any] = Field(default_factory=dict)


class ChapterOverrideSyncResponse(BaseModel):
    session_id: str
    chapter_number: int
    block: str
    saved: bool


class ManualOverridesCacheResponse(BaseModel):
    found: bool
    session_id: str
    data: Dict[str, Any] = Field(default_factory=dict)


class AdvancedArticleRead(BaseModel):
    article_id: UUID
    title: str
    report_type: str
    chapter_count: int
    blueprints: List[ArticleBlueprintRead]
    chapters: List[ArticleChapterRead]
    restored_at: datetime


class AdvancedGeneratedSectionRead(BaseModel):
    title: str
    content: str
    order: int


class AdvancedGeneratedArticleRead(BaseModel):
    title: str
    sections: List[AdvancedGeneratedSectionRead]


class AdvancedGeneratedSourceItem(BaseModel):
    id: UUID
    publication: Optional[str] = None
    title: str
    link: Optional[str] = None
    year: Optional[int] = None
    citation_count: int = 0


class AdvancedGeneratedSourceResponse(BaseModel):
    article_id: UUID
    total_sources: int
    sources: List[AdvancedGeneratedSourceItem]


class GenerateArticleResponse(BaseModel):
    article_id: UUID
    section_count: int
    generated_at: datetime


class GenerateChapterResponse(BaseModel):
    article_id: UUID
    chapter_number: int
    section_title: str
    generated_at: datetime
