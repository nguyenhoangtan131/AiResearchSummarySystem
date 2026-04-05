from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.core.logging import logger
from app.core.security import get_current_user
from app.schemas.advanced import (
    AdvancedStructureCacheRead,
    AdvancedChapterStepCacheRead,
    AdvancedArticleRead,
    AdvancedGeneratedArticleRead,
    AdvancedGeneratedSourceResponse,
    AdvancedStructureRequest,
    AdvancedStructureResponse,
    ChapterBriefRecommendationRequest,
    ChapterBriefRecommendationResponse,
    ChapterGuideRecommendationRequest,
    ChapterGuideRecommendationResponse,
    ChapterSourceRecommendationRequest,
    ChapterSourceRecommendationResponse,
    ChapterTitleRecommendationRequest,
    ChapterTitleRecommendationResponse,
    ConfirmChapterRequest,
    ConfirmChapterResponse,
    ConfirmFirstChapterRequest,
    ConfirmFirstChapterResponse,
    GenerateArticleResponse,
    GenerateChapterResponse,
    SelectStructureRequest,
    SelectStructureResponse,
)
from app.services.advanced.chapter_service import AdvancedChapterRecommendationService
from app.services.advanced.generation_service import AdvancedGenerationService
from app.services.advanced.structure_service import AdvancedStructureService

router = APIRouter()


@router.post(
    "/structure/recommend",
    response_model=AdvancedStructureResponse,
    status_code=status.HTTP_200_OK,
)
async def recommend_structure(
    payload: AdvancedStructureRequest,
) -> AdvancedStructureResponse:
    try:
        service = AdvancedStructureService()
        return service.recommend_structure(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to generate chapter structure recommendations: {exc}",
        ) from exc


@router.get(
    "/structure/cache/{session_id}",
    response_model=AdvancedStructureCacheRead,
    status_code=status.HTTP_200_OK,
)
async def get_cached_structure(session_id: str) -> AdvancedStructureCacheRead:
    try:
        service = AdvancedStructureService()
        return service.get_cached_structure(session_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to read cached structure recommendations: {exc}",
        ) from exc


@router.get(
    "/chapter/cache/{session_id}/{chapter_number}/{step}",
    response_model=AdvancedChapterStepCacheRead,
    status_code=status.HTTP_200_OK,
)
async def get_cached_chapter_step(
    session_id: str,
    chapter_number: int,
    step: str,
) -> AdvancedChapterStepCacheRead:
    try:
        service = AdvancedChapterRecommendationService()
        return service.get_cached_step(session_id=session_id, chapter_number=chapter_number, step=step)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to read cached chapter recommendations: {exc}",
        ) from exc


@router.get(
    "/article/{article_id}",
    response_model=AdvancedArticleRead,
    status_code=status.HTTP_200_OK,
)
async def get_advanced_article(
    article_id: UUID,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AdvancedArticleRead:
    try:
        service = AdvancedStructureService()
        return service.get_article(db=db, user_id=user_id, article_id=article_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to load advanced article: {exc}",
        ) from exc


@router.get(
    "/article/{article_id}/result",
    response_model=AdvancedGeneratedArticleRead,
    status_code=status.HTTP_200_OK,
)
async def get_generated_article(
    article_id: UUID,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AdvancedGeneratedArticleRead:
    try:
        service = AdvancedGenerationService(db=db, user_id=user_id)
        return service.get_generated_article(article_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to load generated article: {exc}",
        ) from exc


@router.get(
    "/article/{article_id}/sources",
    response_model=AdvancedGeneratedSourceResponse,
    status_code=status.HTTP_200_OK,
)
async def get_generated_article_sources(
    article_id: UUID,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AdvancedGeneratedSourceResponse:
    try:
        service = AdvancedGenerationService(db=db, user_id=user_id)
        return service.get_generated_sources(article_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to load generated sources: {exc}",
        ) from exc


@router.post(
    "/article/{article_id}/chapter/{chapter_number}/generate",
    response_model=GenerateChapterResponse,
    status_code=status.HTTP_200_OK,
)
async def generate_chapter(
    article_id: UUID,
    chapter_number: int,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GenerateChapterResponse:
    try:
        service = AdvancedGenerationService(db=db, user_id=user_id)
        payload = service.generate_chapter(article_id=article_id, chapter_number=chapter_number)
        return GenerateChapterResponse(**payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception(
            "[Advanced] Generate chapter failed for article_id=%s chapter=%s",
            article_id,
            chapter_number,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to generate chapter: {exc}",
        ) from exc


@router.post(
    "/article/{article_id}/generate",
    response_model=GenerateArticleResponse,
    status_code=status.HTTP_200_OK,
)
async def generate_article(
    article_id: UUID,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GenerateArticleResponse:
    try:
        service = AdvancedGenerationService(db=db, user_id=user_id)
        payload = service.generate_article(article_id)
        return GenerateArticleResponse(**payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("[Advanced] Generate article failed for article_id=%s", article_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to generate article: {exc}",
        ) from exc


@router.post(
    "/structure/select",
    response_model=SelectStructureResponse,
    status_code=status.HTTP_200_OK,
)
async def select_structure(
    payload: SelectStructureRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SelectStructureResponse:
    try:
        service = AdvancedStructureService()
        return service.select_structure(db=db, user_id=user_id, payload=payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to persist selected structure: {exc}",
        ) from exc


@router.post(
    "/chapter-1/confirm",
    response_model=ConfirmFirstChapterResponse,
    status_code=status.HTTP_200_OK,
)
async def confirm_first_chapter(
    payload: ConfirmFirstChapterRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConfirmFirstChapterResponse:
    try:
        service = AdvancedStructureService()
        return service.confirm_first_chapter(db=db, user_id=user_id, payload=payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to confirm chapter 1: {exc}",
        ) from exc


@router.post(
    "/chapter/confirm",
    response_model=ConfirmChapterResponse,
    status_code=status.HTTP_200_OK,
)
async def confirm_chapter(
    payload: ConfirmChapterRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConfirmChapterResponse:
    try:
        service = AdvancedStructureService()
        return service.confirm_chapter(db=db, user_id=user_id, payload=payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to confirm chapter: {exc}",
        ) from exc


@router.post(
    "/chapter/titles/recommend",
    response_model=ChapterTitleRecommendationResponse,
    status_code=status.HTTP_200_OK,
)
async def recommend_chapter_titles(
    payload: ChapterTitleRecommendationRequest,
) -> ChapterTitleRecommendationResponse:
    try:
        service = AdvancedChapterRecommendationService()
        return service.recommend_titles(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to recommend chapter titles: {exc}",
        ) from exc


@router.post(
    "/chapter/briefs/recommend",
    response_model=ChapterBriefRecommendationResponse,
    status_code=status.HTTP_200_OK,
)
async def recommend_chapter_briefs(
    payload: ChapterBriefRecommendationRequest,
) -> ChapterBriefRecommendationResponse:
    try:
        service = AdvancedChapterRecommendationService()
        return service.recommend_briefs(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to recommend chapter briefs: {exc}",
        ) from exc


@router.post(
    "/chapter/guides/recommend",
    response_model=ChapterGuideRecommendationResponse,
    status_code=status.HTTP_200_OK,
)
async def recommend_chapter_guides(
    payload: ChapterGuideRecommendationRequest,
) -> ChapterGuideRecommendationResponse:
    try:
        service = AdvancedChapterRecommendationService()
        return service.recommend_guides(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to recommend chapter guides: {exc}",
        ) from exc


@router.post(
    "/chapter/sources/recommend",
    response_model=ChapterSourceRecommendationResponse,
    status_code=status.HTTP_200_OK,
)
async def recommend_chapter_sources(
    payload: ChapterSourceRecommendationRequest,
) -> ChapterSourceRecommendationResponse:
    try:
        service = AdvancedChapterRecommendationService()
        return await service.recommend_sources(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to recommend chapter sources: {exc}",
        ) from exc
