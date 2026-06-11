from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.core.logging import logger
from app.core.security import get_current_user
from app.services.report_type_service import get_active_report_type_names
from app.schemas.advanced import (
    AdvancedStructureCacheRead,
    AdvancedChapterStepCacheRead,
    AdvancedArticleRead,
    AdvancedGeneratedArticleRead,
    AdvancedGeneratedSourceResponse,
    AdvancedStructureRequest,
    AdvancedStructureResponse,
    ChapterOverrideSyncRequest,
    ChapterOverrideSyncResponse,
    ManualOverridesCacheResponse,
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

from app.core.cache import RedisCache
from app.models.user import User

router = APIRouter()

ACTION_LABELS = {
    "structure": "Tạo gợi ý bố cục",
    "titles": "Gợi ý tiêu đề chương",
    "briefs": "Gợi ý tóm tắt chương",
    "guides": "Gợi ý định hướng viết chương",
    "sources": "Tìm kiếm nguồn tài liệu học thuật",
    "generate_chapter": "Sinh nội dung chi tiết chương",
    "generate_article": "Sinh bài viết hoàn chỉnh",
}

ACTION_COOLDOWNS = {
    "structure": 180,
    "titles": 60,
    "briefs": 60,
    "guides": 60,
    "sources": 60,
    "generate_chapter": 120,
    "generate_article": 180,
}

def check_cooldown(
    user_id: str,
    db: Session,
    action: str,
    chapter_number: int | None = None,
    session_id: str | None = None,
):
    user = db.query(User).filter(User.id == UUID(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if user.tier == "free":
        try:
            cache = RedisCache()
            redis_client = cache.client
            if not redis_client:
                return
            
            # 1. Kiểm tra khóa toàn cục (Global Cooldown - 5 giây)
            global_key = f"rate_limit:{user_id}:global"
            global_ttl = redis_client.ttl(global_key)
            if global_ttl > 0:
                raise HTTPException(
                    status_code=429,
                    detail=f"Vui lòng đợi {global_ttl} giây giữa các thao tác tạo sinh."
                )
            
            # 2. Kiểm tra khóa chi tiết (Granular Cooldown)
            key_parts = ["rate_limit", user_id]
            if session_id:
                key_parts.append(session_id)
            if chapter_number is not None:
                key_parts.append(str(chapter_number))
            key_parts.append(action)
            
            key = ":".join(key_parts)
            
            current_val = redis_client.get(key)
            if current_val is not None:
                try:
                    count = int(current_val)
                except ValueError:
                    count = 1
                
                if count >= 3:
                    ttl = redis_client.ttl(key)
                    action_label = ACTION_LABELS.get(action, action)
                    cooldown_seconds = ACTION_COOLDOWNS.get(action, 60)
                    raise HTTPException(
                        status_code=429,
                        detail=f"Tài khoản Free đã đạt giới hạn 3 lần thực hiện '{action_label}' trong vòng {cooldown_seconds} giây. Hãy sử dụng kết quả đã tạo ở panel bên phải hoặc đợi thêm {ttl} giây."
                    )
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("Lỗi kiểm tra rate limit bằng Redis: %s", exc)


def set_cooldown(
    user_id: str,
    db: Session,
    action: str,
    cooldown_seconds: int,
    chapter_number: int | None = None,
    session_id: str | None = None,
):
    user = db.query(User).filter(User.id == UUID(user_id)).first()
    if not user or user.tier != "free":
        return

    try:
        cache = RedisCache()
        redis_client = cache.client
        if not redis_client:
            return
        
        global_key = f"rate_limit:{user_id}:global"
        
        key_parts = ["rate_limit", user_id]
        if session_id:
            key_parts.append(session_id)
        if chapter_number is not None:
            key_parts.append(str(chapter_number))
        key_parts.append(action)
        
        key = ":".join(key_parts)
        
        # Thiết lập Global Cooldown (5 giây)
        redis_client.setex(global_key, 5, "1")
        
        # Thiết lập hoặc tăng Granular Cooldown
        current_val = redis_client.get(key)
        if current_val is None:
            redis_client.setex(key, cooldown_seconds, "1")
        else:
            redis_client.incr(key)
    except Exception as exc:
        logger.warning("Lỗi thiết lập rate limit bằng Redis: %s", exc)



@router.get("/report-types", status_code=status.HTTP_200_OK)
async def get_report_types(db: Session = Depends(get_db)) -> dict[str, list[str]]:
    return {"reportTypes": get_active_report_type_names(db)}


@router.post(
    "/structure/recommend",
    response_model=AdvancedStructureResponse,
    status_code=status.HTTP_200_OK,
)
async def recommend_structure(
    payload: AdvancedStructureRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AdvancedStructureResponse:
    check_cooldown(
        user_id=user_id,
        db=db,
        action="structure",
        session_id=payload.session_id or "new_session",
    )
    try:
        service = AdvancedStructureService()
        res = service.recommend_structure(payload)
        set_cooldown(
            user_id=user_id,
            db=db,
            action="structure",
            cooldown_seconds=180,
            session_id=payload.session_id or "new_session",
        )
        return res
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
    check_cooldown(
        user_id=user_id,
        db=db,
        action="generate_chapter",
        chapter_number=chapter_number,
        session_id=str(article_id),
    )
    try:
        service = AdvancedGenerationService(db=db, user_id=user_id)
        payload = service.generate_chapter(article_id=article_id, chapter_number=chapter_number)
        res = GenerateChapterResponse(**payload)
        set_cooldown(
            user_id=user_id,
            db=db,
            action="generate_chapter",
            cooldown_seconds=120,
            chapter_number=chapter_number,
            session_id=str(article_id),
        )
        return res
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
    check_cooldown(
        user_id=user_id,
        db=db,
        action="generate_article",
        session_id=str(article_id),
    )
    try:
        service = AdvancedGenerationService(db=db, user_id=user_id)
        payload = service.generate_article(article_id)
        res = GenerateArticleResponse(**payload)
        set_cooldown(
            user_id=user_id,
            db=db,
            action="generate_article",
            cooldown_seconds=180,
            session_id=str(article_id),
        )
        return res
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
    "/chapter/override/sync",
    response_model=ChapterOverrideSyncResponse,
    status_code=status.HTTP_200_OK,
)
async def sync_chapter_override(
    payload: ChapterOverrideSyncRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChapterOverrideSyncResponse:
    try:
        service = AdvancedStructureService()
        return service.sync_chapter_override(db=db, user_id=user_id, payload=payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to sync chapter override: {exc}",
        ) from exc


@router.get(
    "/chapter/override/cache/{session_id}",
    response_model=ManualOverridesCacheResponse,
    status_code=status.HTTP_200_OK,
)
async def get_manual_override_cache(
    session_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ManualOverridesCacheResponse:
    del user_id
    del db
    service = AdvancedStructureService()
    return service.get_manual_overrides(session_id)


@router.post(
    "/chapter/titles/recommend",
    response_model=ChapterTitleRecommendationResponse,
    status_code=status.HTTP_200_OK,
)
async def recommend_chapter_titles(
    payload: ChapterTitleRecommendationRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChapterTitleRecommendationResponse:
    check_cooldown(
        user_id=user_id,
        db=db,
        action="titles",
        chapter_number=payload.chapter_number,
        session_id=payload.session_id,
    )
    try:
        service = AdvancedChapterRecommendationService()
        res = service.recommend_titles(payload)
        set_cooldown(
            user_id=user_id,
            db=db,
            action="titles",
            cooldown_seconds=60,
            chapter_number=payload.chapter_number,
            session_id=payload.session_id,
        )
        return res
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
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChapterBriefRecommendationResponse:
    check_cooldown(
        user_id=user_id,
        db=db,
        action="briefs",
        chapter_number=payload.chapter_number,
        session_id=payload.session_id,
    )
    try:
        service = AdvancedChapterRecommendationService()
        res = service.recommend_briefs(payload)
        set_cooldown(
            user_id=user_id,
            db=db,
            action="briefs",
            cooldown_seconds=60,
            chapter_number=payload.chapter_number,
            session_id=payload.session_id,
        )
        return res
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
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChapterGuideRecommendationResponse:
    check_cooldown(
        user_id=user_id,
        db=db,
        action="guides",
        chapter_number=payload.chapter_number,
        session_id=payload.session_id,
    )
    try:
        service = AdvancedChapterRecommendationService()
        res = service.recommend_guides(payload)
        set_cooldown(
            user_id=user_id,
            db=db,
            action="guides",
            cooldown_seconds=60,
            chapter_number=payload.chapter_number,
            session_id=payload.session_id,
        )
        return res
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
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChapterSourceRecommendationResponse:
    check_cooldown(
        user_id=user_id,
        db=db,
        action="sources",
        chapter_number=payload.chapter_number,
        session_id=payload.session_id,
    )
    try:
        service = AdvancedChapterRecommendationService()
        res = await service.recommend_sources(payload)
        set_cooldown(
            user_id=user_id,
            db=db,
            action="sources",
            cooldown_seconds=60,
            chapter_number=payload.chapter_number,
            session_id=payload.session_id,
        )
        return res
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to recommend chapter sources: {exc}",
        ) from exc
