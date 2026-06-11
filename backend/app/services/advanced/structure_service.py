import json
import os
import re
import uuid
from typing import Any
from uuid import UUID

from google import genai
from pydantic import ValidationError
from sqlalchemy.orm import Session, selectinload

from app.core.logging import logger
from app.models.research import (
    ArticleBlueprint,
    ArticleChapter,
    ChapterGuide,
    ChapterSource,
    ResearchArticle,
)
from app.prompts.advanced.structure_prompt import STRUCTURE_RECOMMENDATION_PROMPT
from app.redis_store import AdvancedRedisStore
from app.services.api_key_vault import get_active_api_key
from app.services.report_type_service import get_active_report_type_names_from_db
from app.services.llm_usage_service import (
    LlmUsageService,
    build_gemini_step_metric,
    start_step_timer,
    step_metric_from_dict,
    step_metric_to_dict,
)
from app.schemas.advanced import (
    AdvancedStructureCacheRead,
    AdvancedArticleRead,
    ManualOverridesCacheResponse,
    ChapterOverrideSyncRequest,
    ChapterOverrideSyncResponse,
    ConfirmChapterRequest,
    ConfirmChapterResponse,
    ConfirmFirstChapterRequest,
    ConfirmFirstChapterResponse,
    AdvancedStructureRequest,
    AdvancedStructureResponse,
    ChapterBlueprintItem,
    SelectStructureRequest,
    SelectStructureResponse,
    SelectedBlueprintRead,
    StructureOption,
)
from app.schemas.research import ArticleBlueprintRead, ArticleChapterRead


class AdvancedStructureService:
    def __init__(self) -> None:
        api_key = get_active_api_key("gemini")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is missing.")

        self.client = genai.Client(api_key=api_key)
        self.store = AdvancedRedisStore()
        self.model_name = os.getenv("GEMINI_MODEL_NAME", "gemini-3-flash-preview")

    def recommend_structure(
        self, payload: AdvancedStructureRequest
    ) -> AdvancedStructureResponse:
        session_id = (payload.session_id or str(uuid.uuid4())).strip()
        logger.info(
            "[Advanced] Recommend structure start session_id=%s report_type=%s title=%s",
            session_id,
            payload.report_type.strip(),
            payload.article_title.strip(),
        )
        started_at = start_step_timer()
        supported_report_types = get_active_report_type_names_from_db()
        raw_response = self.client.models.generate_content(
            model=self.model_name,
            contents=STRUCTURE_RECOMMENDATION_PROMPT.format(
                article_title=payload.article_title.strip(),
                report_type=payload.report_type.strip(),
                supported_report_types=", ".join(supported_report_types),
            ),
        )
        parsed = self._extract_json(raw_response.text)
        effective_report_type = self._normalize_report_type(
            payload.report_type.strip(),
            str(parsed.get("normalized_report_type") or "").strip(),
            supported_report_types,
        )
        options = self._normalize_options(
            parsed.get("options", []),
            effective_report_type,
        )

        recommended_option_id = parsed.get("recommended_option_id") or options[0].option_id
        if recommended_option_id not in {option.option_id for option in options}:
            recommended_option_id = options[0].option_id

        response = AdvancedStructureResponse(
            article_title=payload.article_title.strip(),
            normalized_article_title=(
                parsed.get("normalized_article_title")
                or parsed.get("normalized_article_title_en")
                or payload.article_title.strip()
            ).strip(),
            normalized_article_title_en=(
                parsed.get("normalized_article_title")
                or parsed.get("normalized_article_title_en")
                or payload.article_title.strip()
            ).strip(),
            display_article_title_vi=payload.article_title.strip(),
            report_type=effective_report_type,
            session_id=session_id,
            cache_key=self.store.structure_key(session_id),
            cache_ttl_seconds=self.store.ttl_seconds,
            option_count=len(options),
            recommended_option_id=recommended_option_id,
            options=options,
        )
        response.display_article_title_vi = payload.article_title.strip()
        for option in response.options:
            option.display_rationale_vi = option.rationale
            for item in option.blueprint:
                item.display_working_title_vi = item.working_title
                item.display_purpose_vi = item.purpose
                item.display_start_focus_vi = item.start_focus
                item.display_end_focus_vi = item.end_focus
        self.store.save_structure(session_id, response.model_dump())
        metric = build_gemini_step_metric(
            label="Tạo bố cục tổng thể",
            model_name=self.model_name,
            response=raw_response,
            started_at=started_at,
        )
        self.store.save_usage_metric(session_id, "blueprint", step_metric_to_dict(metric))
        logger.info(
            "[Advanced] Recommend structure cached session_id=%s option_count=%s recommended_option_id=%s",
            session_id,
            response.option_count,
            response.recommended_option_id,
        )
        return response

    def get_cached_structure(self, session_id: str) -> AdvancedStructureCacheRead:
        cache_key = self.store.structure_key(session_id)
        cached = self.store.get_structure(session_id)
        if not cached:
            return AdvancedStructureCacheRead(cache_key=cache_key, found=False, data=None)

        try:
            cached_response = AdvancedStructureResponse.model_validate(cached)
        except ValidationError:
            return AdvancedStructureCacheRead(cache_key=cache_key, found=False, data=None)

        return AdvancedStructureCacheRead(
            cache_key=cache_key,
            found=True,
            data=cached_response,
        )

    def select_structure(
        self,
        db: Session,
        user_id: str,
        payload: SelectStructureRequest,
    ) -> SelectStructureResponse:
        cached = self.get_cached_structure(payload.session_id)
        if not cached.found or not cached.data:
            raise ValueError("No cached structure recommendation was found for this session.")

        selected_option = next(
            (option for option in cached.data.options if option.option_id == payload.selected_option_id),
            None,
        )
        if selected_option is None:
            raise ValueError("Selected structure option was not found in cache.")

        article = None
        if payload.article_id:
            article = (
                db.query(ResearchArticle)
                .filter(
                    ResearchArticle.id == payload.article_id,
                    ResearchArticle.user_id == UUID(user_id),
                )
                .first()
            )

        title_vi = cached.data.display_article_title_vi or cached.data.article_title
        if article is None:
            article = ResearchArticle(
                user_id=UUID(user_id),
                title=title_vi,
                report_type=cached.data.report_type,
                chapter_count=selected_option.chapter_count,
            )
            db.add(article)
            db.flush()
        else:
            article.title = title_vi
            article.report_type = cached.data.report_type
            article.chapter_count = selected_option.chapter_count

        usage_service = LlmUsageService(db)
        usage = usage_service.get_or_create_usage(
            user_id=UUID(user_id),
            article=article,
            session_id=payload.session_id,
        )
        usage.details.clear()
        usage.blueprint_label = None
        usage.blueprint_input_tokens = 0
        usage.blueprint_output_tokens = 0
        usage.blueprint_total_tokens = 0
        usage.blueprint_cost_usd = 0
        usage.blueprint_latency_ms = None
        usage.total_input_tokens = 0
        usage.total_output_tokens = 0
        usage.total_tokens = 0
        usage.total_cost_usd = 0
        usage.total_latency_ms = None
        usage.status = "in_progress"
        blueprint_metric = step_metric_from_dict(
            self.store.get_usage_metric(payload.session_id, "blueprint")
        )
        if blueprint_metric:
            usage_service.record_blueprint_metrics(usage=usage, metric=blueprint_metric)

        db.query(ChapterGuide).filter(
            ChapterGuide.chapter_id.in_(
                db.query(ArticleChapter.id).filter(ArticleChapter.article_id == article.id)
            )
        ).delete(synchronize_session=False)
        db.query(ChapterSource).filter(
            ChapterSource.chapter_id.in_(
                db.query(ArticleChapter.id).filter(ArticleChapter.article_id == article.id)
            )
        ).delete(synchronize_session=False)
        db.query(ArticleBlueprint).filter(ArticleBlueprint.article_id == article.id).delete(
            synchronize_session=False
        )
        db.query(ArticleChapter).filter(ArticleChapter.article_id == article.id).delete(
            synchronize_session=False
        )
        db.flush()

        chapter_rows: list[ArticleChapter] = []
        blueprint_rows: list[ArticleBlueprint] = []
        for item in selected_option.blueprint:
            blueprint = ArticleBlueprint(
                article_id=article.id,
                chapter_number=item.chapter_number,
                title=item.display_working_title_vi or item.working_title,
                purpose=item.display_purpose_vi or item.purpose,
                start_focus=item.display_start_focus_vi or item.start_focus,
                end_focus=item.display_end_focus_vi or item.end_focus,
                sort_order=item.chapter_number,
            )
            db.add(blueprint)
            blueprint_rows.append(blueprint)
            chapter = ArticleChapter(
                article_id=article.id,
                chapter_number=item.chapter_number,
            )
            db.add(chapter)
            chapter_rows.append(chapter)

        db.commit()
        db.refresh(article)
        for blueprint in blueprint_rows:
            db.refresh(blueprint)
        for chapter in chapter_rows:
            db.refresh(chapter)

        return SelectStructureResponse(
            article_id=article.id,
            title=article.title,
            report_type=article.report_type or cached.data.report_type,
            chapter_count=article.chapter_count,
            cached_session_id=payload.session_id,
            blueprints=[
                SelectedBlueprintRead(
                    chapter_number=blueprint.chapter_number,
                    title=blueprint.title or "",
                    purpose=blueprint.purpose or "",
                    start_focus=blueprint.start_focus or "",
                    end_focus=blueprint.end_focus or "",
                )
                for blueprint in sorted(blueprint_rows, key=lambda item: item.chapter_number)
            ],
            persisted_at=article.updated_at or article.created_at,
        )

    def sync_chapter_override(
        self,
        db: Session,
        user_id: str,
        payload: ChapterOverrideSyncRequest,
    ) -> ChapterOverrideSyncResponse:
        if payload.block == "blueprint":
            cached = self.store.get_structure(payload.session_id)
            if not cached:
                raise ValueError("Structure cache was not found for this session.")

            data = dict(payload.data or {})
            options = cached.get("options") or []
            for option in options:
                for item in option.get("blueprint") or []:
                    if int(item.get("chapter_number") or 0) != payload.chapter_number:
                        continue
                    item["working_title"] = str(data.get("working_title") or item.get("working_title") or "").strip()
                    item["purpose"] = str(data.get("purpose") or item.get("purpose") or "").strip()
                    item["start_focus"] = str(data.get("start_focus") or item.get("start_focus") or "").strip()
                    item["end_focus"] = str(data.get("end_focus") or item.get("end_focus") or "").strip()
                    item["display_working_title_vi"] = item["working_title"]
                    item["display_purpose_vi"] = item["purpose"]
                    item["display_start_focus_vi"] = item["start_focus"]
                    item["display_end_focus_vi"] = item["end_focus"]
            self.store.save_structure(payload.session_id, cached)

            if payload.article_id:
                article = (
                    db.query(ResearchArticle)
                    .filter(
                        ResearchArticle.id == payload.article_id,
                        ResearchArticle.user_id == UUID(user_id),
                    )
                    .first()
                )
                if article:
                    blueprint = (
                        db.query(ArticleBlueprint)
                        .filter(
                            ArticleBlueprint.article_id == article.id,
                            ArticleBlueprint.chapter_number == payload.chapter_number,
                        )
                        .first()
                    )
                    if blueprint:
                        blueprint.title = str(data.get("working_title") or blueprint.title or "").strip()
                        blueprint.purpose = str(data.get("purpose") or blueprint.purpose or "").strip()
                        blueprint.start_focus = str(data.get("start_focus") or blueprint.start_focus or "").strip()
                        blueprint.end_focus = str(data.get("end_focus") or blueprint.end_focus or "").strip()
                    db.flush()
                    db.commit()
            self.store.save_manual_override(payload.session_id, payload.chapter_number, payload.block, dict(payload.data or {}))
            return ChapterOverrideSyncResponse(
                session_id=payload.session_id,
                chapter_number=payload.chapter_number,
                block=payload.block,
                saved=True,
            )

        override_payload = {
            "mode": payload.mode,
            **dict(payload.data or {}),
        }
        self.store.save_manual_override(
            payload.session_id,
            payload.chapter_number,
            payload.block,
            override_payload,
        )
        return ChapterOverrideSyncResponse(
            session_id=payload.session_id,
            chapter_number=payload.chapter_number,
            block=payload.block,
            saved=True,
        )

    def get_manual_overrides(self, session_id: str) -> ManualOverridesCacheResponse:
        data = self.store.get_manual_overrides(session_id) or {}
        return ManualOverridesCacheResponse(
            found=bool(data),
            session_id=session_id,
            data=data,
        )

    def confirm_first_chapter(
        self,
        db: Session,
        user_id: str,
        payload: ConfirmFirstChapterRequest,
    ) -> ConfirmFirstChapterResponse:
        article_id = payload.article_id
        if article_id is None:
            selected = self.select_structure(
                db=db,
                user_id=user_id,
                payload=SelectStructureRequest(
                    session_id=payload.session_id,
                    selected_option_id=payload.selected_option_id,
                ),
            )
            article_id = selected.article_id

        confirm_response = self.confirm_chapter(
            db=db,
            user_id=user_id,
            payload=ConfirmChapterRequest(
                article_id=article_id,
                session_id=payload.session_id,
                chapter_number=1,
                selected_option_id=payload.selected_option_id,
                chapter_title=payload.manual_title or payload.ai_title,
                chapter_title_description=payload.ai_title_description,
                chapter_brief=payload.manual_brief or payload.ai_brief,
                manual_guide=payload.manual_guide,
                selected_guides=payload.selected_guides,
                selected_sources=payload.selected_sources,
            ),
        )
        article = (
            db.query(ResearchArticle)
            .filter(
                ResearchArticle.id == confirm_response.article_id,
                ResearchArticle.user_id == UUID(user_id),
            )
            .first()
        )
        if article is None:
            raise ValueError("The selected article could not be loaded after chapter confirmation.")
        first_chapter = (
            db.query(ArticleChapter)
            .filter(
                ArticleChapter.article_id == article.id,
                ArticleChapter.chapter_number == 1,
            )
            .first()
        )
        if first_chapter is None:
            raise ValueError("Chapter 1 could not be loaded after confirmation.")
        logger.info(
            "[Advanced] Confirm chapter 1 persisted article_id=%s chapter_count=%s normalized_title=%s",
            article.id,
            article.chapter_count,
            article.title,
        )
        cached = self.get_cached_structure(payload.session_id)
        normalized_title = article.title
        if cached.found and cached.data:
            normalized_title = (
                cached.data.normalized_article_title
                or cached.data.normalized_article_title_en
                or article.title
            )
        report_type = (
            article.report_type
            or (cached.data.report_type if cached.found and cached.data else None)
            or ""
        )

        return ConfirmFirstChapterResponse(
            article_id=article.id,
            normalized_article_title=normalized_title,
            normalized_article_title_en=normalized_title,
            report_type=report_type,
            chapter_count=article.chapter_count,
            cached_session_id=payload.session_id,
            first_chapter=ArticleChapterRead.model_validate(first_chapter),
            persisted_at=confirm_response.persisted_at,
        )

    def confirm_chapter(
        self,
        db: Session,
        user_id: str,
        payload: ConfirmChapterRequest,
    ) -> ConfirmChapterResponse:
        logger.info(
            "[Advanced] Confirm chapter start article_id=%s session_id=%s chapter=%s selected_option_id=%s",
            payload.article_id,
            payload.session_id,
            payload.chapter_number,
            payload.selected_option_id,
        )
        article = (
            db.query(ResearchArticle)
            .filter(
                ResearchArticle.id == payload.article_id,
                ResearchArticle.user_id == UUID(user_id),
            )
            .first()
        )
        if article is None:
            raise ValueError("The selected article was not found.")

        chapter = (
            db.query(ArticleChapter)
            .filter(
                ArticleChapter.article_id == article.id,
                ArticleChapter.chapter_number == payload.chapter_number,
            )
            .first()
        )
        if chapter is None:
            raise ValueError("The selected chapter was not found for this article.")

        title_override = self.store.get_manual_override(
            payload.session_id,
            payload.chapter_number,
            "title",
        ) or {}
        brief_override = self.store.get_manual_override(
            payload.session_id,
            payload.chapter_number,
            "brief",
        ) or {}
        guide_override = self.store.get_manual_override(
            payload.session_id,
            payload.chapter_number,
            "guide",
        ) or {}

        final_chapter_title = str(
            title_override.get("final_title")
            or payload.chapter_title
            or ""
        ).strip() or chapter.chapter_title
        final_title_description = str(
            title_override.get("final_description")
            or payload.chapter_title_description
            or ""
        ).strip() or chapter.chapter_title_description
        final_chapter_brief = str(
            brief_override.get("final_description")
            or payload.chapter_brief
            or ""
        ).strip() or chapter.chapter_brief

        chapter.chapter_title = final_chapter_title
        if chapter.chapter_title:
            chapter.chapter_title = self._normalize_chapter_title(chapter.chapter_title)
        chapter.chapter_title_description = final_title_description
        chapter.chapter_brief = final_chapter_brief

        manual_guide = (payload.manual_guide or "").strip() or None

        db.query(ChapterGuide).filter(ChapterGuide.chapter_id == chapter.id).delete()
        guide_rows = []
        selected_guide_payload = payload.selected_guides
        manual_guides_from_override = []
        if guide_override:
            selected_guide_payload = [
                type("GuidePayload", (), {"content": item.get("body", ""), "sort_order": index + 1})()
                for index, item in enumerate(guide_override.get("selected_ai_guides") or [])
                if str(item.get("body") or "").strip()
            ]
            manual_guides_from_override = [
                str(item.get("body") or "").strip()
                for item in (guide_override.get("manual_guides") or [])
                if str(item.get("body") or "").strip()
            ]
        for index, guide in enumerate(selected_guide_payload, start=1):
            guide_rows.append(
                ChapterGuide(
                    chapter_id=chapter.id,
                    content=guide.content,
                    sort_order=index,
                )
            )
        if manual_guide:
            guide_rows.append(
                ChapterGuide(
                    chapter_id=chapter.id,
                    content=manual_guide,
                    sort_order=len(guide_rows) + 1,
                )
            )
        for body in manual_guides_from_override:
            guide_rows.append(
                ChapterGuide(
                    chapter_id=chapter.id,
                    content=body,
                    sort_order=len(guide_rows) + 1,
                )
            )
        for row in guide_rows:
            db.add(row)

        db.query(ChapterSource).filter(ChapterSource.chapter_id == chapter.id).delete()
        for index, source in enumerate(payload.selected_sources, start=1):
            db.add(
                ChapterSource(
                    chapter_id=chapter.id,
                    title=source.title,
                    snippet=source.snippet,
                    provider=source.provider,
                    url=source.url,
                    year=source.year,
                    citation_count=source.citation_count,
                    publication=source.publication,
                    sort_order=index,
                )
            )

        usage_service = LlmUsageService(db)
        usage = usage_service.get_or_create_usage(
            user_id=UUID(user_id),
            article=article,
            session_id=payload.session_id,
        )
        citation_payload = self.store.get_usage_metric(
            payload.session_id,
            "citation",
            payload.chapter_number,
        ) or {}
        usage_service.upsert_chapter_detail(
            usage=usage,
            chapter=chapter,
            title_metric=step_metric_from_dict(
                self.store.get_usage_metric(payload.session_id, "title", payload.chapter_number)
            ),
            brief_metric=step_metric_from_dict(
                self.store.get_usage_metric(payload.session_id, "brief", payload.chapter_number)
            ),
            guide_metric=step_metric_from_dict(
                self.store.get_usage_metric(payload.session_id, "guide", payload.chapter_number)
            ),
            citation_metric=step_metric_from_dict(citation_payload),
            source_query=citation_payload.get("source_query"),
            source_result_count=int(citation_payload.get("source_result_count") or 0),
        )

        db.commit()
        db.refresh(chapter)
        self.store.save_chapter_context(
            str(article.id),
            payload.chapter_number,
            {
                "article_id": str(article.id),
                "session_id": payload.session_id,
                "chapter_number": payload.chapter_number,
                "chapter_title": chapter.chapter_title or "",
                "chapter_title_final": chapter.chapter_title or "",
                "chapter_title_description": chapter.chapter_title_description or "",
                "chapter_brief": chapter.chapter_brief or "",
                "chapter_brief_final": chapter.chapter_brief or "",
                "manual_title_reason": str(title_override.get("reason") or "").strip(),
                "manual_brief_reason": str(brief_override.get("reason") or "").strip(),
                "selection_mode_title": str(title_override.get("mode") or ("manual" if payload.chapter_title else "ai")),
                "selection_mode_brief": str(brief_override.get("mode") or ("manual" if payload.chapter_brief else "ai")),
                "guide_notes": [guide.content for guide in guide_rows],
                "guide_notes_final": [guide.content for guide in guide_rows],
                "sources": [
                    {
                        "title": source.title,
                        "snippet": source.snippet,
                        "provider": source.provider,
                        "url": source.url,
                        "year": source.year,
                        "citation_count": source.citation_count,
                        "publication": source.publication,
                        "sort_order": index,
                    }
                    for index, source in enumerate(payload.selected_sources, start=1)
                ],
            },
        )
        self.store.clear_chapter_recommendations(payload.session_id, payload.chapter_number)

        return ConfirmChapterResponse(
            article_id=article.id,
            chapter_number=payload.chapter_number,
            cached_session_id=payload.session_id,
            chapter=ArticleChapterRead.model_validate(chapter),
            persisted_at=chapter.updated_at or chapter.created_at,
        )

    def get_article(self, db: Session, user_id: str, article_id: UUID) -> AdvancedArticleRead:
        article = (
            db.query(ResearchArticle)
            .options(
                selectinload(ResearchArticle.blueprints),
                selectinload(ResearchArticle.chapters).selectinload(ArticleChapter.guides),
                selectinload(ResearchArticle.chapters).selectinload(ArticleChapter.sources),
            )
            .filter(
                ResearchArticle.id == article_id,
                ResearchArticle.user_id == UUID(user_id),
            )
            .first()
        )
        if article is None:
            raise ValueError("The selected article was not found.")

        ordered_chapters = sorted(article.chapters, key=lambda item: item.chapter_number)
        ordered_blueprints = sorted(article.blueprints, key=lambda item: item.chapter_number)
        if not ordered_blueprints:
            ordered_blueprints = [
                ArticleBlueprint(
                    article_id=article.id,
                    chapter_number=chapter.chapter_number,
                    title=chapter.chapter_title or f"Chapter {chapter.chapter_number}",
                    purpose=chapter.chapter_brief or "No saved blueprint purpose yet.",
                    start_focus=None,
                    end_focus=None,
                    sort_order=chapter.chapter_number,
                )
                for chapter in ordered_chapters
            ]
        return AdvancedArticleRead(
            article_id=article.id,
            title=article.title,
            report_type=article.report_type or "",
            chapter_count=article.chapter_count,
            blueprints=[ArticleBlueprintRead.model_validate(blueprint) for blueprint in ordered_blueprints],
            chapters=[ArticleChapterRead.model_validate(chapter) for chapter in ordered_chapters],
            restored_at=article.updated_at or article.created_at,
        )

    def _extract_json(self, response_text: str) -> dict[str, Any]:
        cleaned = response_text.replace("```json", "").replace("```", "").strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            first = cleaned.find("{")
            last = cleaned.rfind("}")
            if first != -1 and last != -1 and last > first:
                extracted = cleaned[first:last + 1]
                try:
                    return json.loads(extracted)
                except json.JSONDecodeError:
                    logger.exception(
                        "[Advanced] Failed to parse structure JSON after extraction. raw=%s",
                        cleaned[:2000],
                    )
                    raise
            logger.exception(
                "[Advanced] Failed to parse structure JSON. raw=%s",
                cleaned[:2000],
            )
            raise

    def _normalize_report_type(self, user_value: str, model_value: str, supported_report_types: list[str]) -> str:
        candidates = [model_value, user_value]
        by_lower = {item.lower(): item for item in supported_report_types}

        for candidate in candidates:
            cleaned = candidate.strip()
            if cleaned in supported_report_types:
                return cleaned
            lowered = cleaned.lower()
            if lowered in by_lower:
                return by_lower[lowered]

        user_lower = user_value.lower()
        for report_type in supported_report_types:
            lowered = report_type.lower()
            if lowered in user_lower or user_lower in lowered:
                return report_type

        return "Báo cáo nghiên cứu" if "Báo cáo nghiên cứu" in supported_report_types else supported_report_types[0]

    def _normalize_options(
        self, raw_options: list[dict[str, Any]], report_type: str
    ) -> list[StructureOption]:
        if not raw_options:
            raise ValueError("He thong tao sinh dang co van de. Vui long thu lai.")

        limited = raw_options[:5]
        if len(limited) > 1:
            limited = limited[: max(2, min(5, len(limited)))]

        normalized: list[StructureOption] = []
        for index, raw_option in enumerate(limited, start=1):
            chapter_count = int(raw_option.get("chapter_count") or 0)
            raw_blueprint = raw_option.get("blueprint") or []
            if chapter_count <= 0 or not raw_blueprint:
                continue

            normalized_blueprint: list[ChapterBlueprintItem] = []
            for chapter_index, raw_item in enumerate(raw_blueprint, start=1):
                working_title = (raw_item.get("working_title") or "").strip()
                purpose = (raw_item.get("purpose") or "").strip()
                start_focus = (raw_item.get("start_focus") or "").strip()
                end_focus = (raw_item.get("end_focus") or "").strip()
                if (
                    not working_title
                    or not purpose
                    or not start_focus
                    or not end_focus
                    or self._is_generic_working_title(working_title)
                    or self._is_generic_purpose(purpose)
                ):
                    continue
                normalized_blueprint.append(
                    ChapterBlueprintItem(
                        chapter_number=chapter_index,
                        working_title=working_title,
                        purpose=purpose,
                        start_focus=start_focus,
                        end_focus=end_focus,
                    )
                )

            if not normalized_blueprint:
                continue
            if len(normalized_blueprint) > chapter_count:
                normalized_blueprint = normalized_blueprint[:chapter_count]
            chapter_count = len(normalized_blueprint)

            normalized.append(
                StructureOption(
                    option_id=(raw_option.get("option_id") or f"option-{index}").strip(),
                    chapter_count=chapter_count,
                    rationale=(raw_option.get("rationale") or "").strip() or "AI de xuat bo cuc cho bai viet nay.",
                    blueprint=normalized_blueprint,
                )
            )

        if not normalized:
            raise ValueError("He thong tao sinh dang co van de. Vui long thu lai.")

        return normalized

    def _is_generic_working_title(self, value: str) -> bool:
        lowered = value.strip().lower()
        generic_markers = [
            "working direction",
            "chapter direction",
            "chapter development",
            "main section",
            "core section",
            "core chapter",
            "chapter flow",
            "định hướng triển khai",
            "phần chính",
            "chương trung tâm",
            "mạch triển khai",
        ]
        if any(marker in lowered for marker in generic_markers):
            return True
        if lowered.startswith("chapter ") and any(token.isdigit() for token in lowered.split()):
            return True
        return False

    def _normalize_chapter_title(self, value: str) -> str:
        cleaned = " ".join((value or "").split()).strip()
        cleaned = re.sub(r"^\d+\.\s*", "", cleaned)
        cleaned = re.sub(r"^(chương|chapter)\s+\d+\s*[:.-]?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"^#+\s*", "", cleaned)
        return cleaned.strip()

    def _is_generic_purpose(self, value: str) -> bool:
        lowered = value.strip().lower()
        generic_markers = [
            "develop the central analytical flow",
            "clarify the role of this chapter",
            "continue the analysis",
            "develop the article",
            "triển khai mạch phân tích",
            "làm rõ vai trò chương",
            "tiếp tục phân tích",
            "phát triển nội dung bài",
        ]
        return any(marker in lowered for marker in generic_markers)
