import json
import os
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
from app.schemas.advanced import (
    AdvancedStructureCacheRead,
    AdvancedArticleRead,
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
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is missing.")

        self.client = genai.Client(api_key=api_key)
        self.store = AdvancedRedisStore()
        self.model_name = "gemini-3-flash-preview"

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
        raw_response = self.client.models.generate_content(
            model=self.model_name,
            contents=STRUCTURE_RECOMMENDATION_PROMPT.format(
                article_title=payload.article_title.strip(),
                report_type=payload.report_type.strip(),
            ),
        )
        parsed = self._extract_json(raw_response.text)
        options = self._normalize_options(
            parsed.get("options", []),
            payload.report_type.strip(),
        )

        recommended_option_id = parsed.get("recommended_option_id") or options[0].option_id
        if recommended_option_id not in {option.option_id for option in options}:
            recommended_option_id = options[0].option_id

        response = AdvancedStructureResponse(
            article_title=payload.article_title.strip(),
            normalized_article_title_en=(
                parsed.get("normalized_article_title_en")
                or payload.article_title.strip()
            ).strip(),
            display_article_title_vi=payload.article_title.strip(),
            report_type=payload.report_type.strip(),
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
        normalized_title_en = (
            cached.data.normalized_article_title_en
            if cached.found and cached.data
            else article.title
        )
        report_type = (
            article.report_type
            or (cached.data.report_type if cached.found and cached.data else None)
            or ""
        )

        return ConfirmFirstChapterResponse(
            article_id=article.id,
            normalized_article_title_en=normalized_title_en,
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

        chapter.chapter_title = (payload.chapter_title or "").strip() or chapter.chapter_title
        chapter.chapter_title_description = (
            (payload.chapter_title_description or "").strip() or chapter.chapter_title_description
        )
        chapter.chapter_brief = (payload.chapter_brief or "").strip() or chapter.chapter_brief

        manual_guide = (payload.manual_guide or "").strip() or None

        db.query(ChapterGuide).filter(ChapterGuide.chapter_id == chapter.id).delete()
        guide_rows = []
        for index, guide in enumerate(payload.selected_guides, start=1):
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

        db.commit()
        db.refresh(chapter)
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

    def _normalize_options(
        self, raw_options: list[dict[str, Any]], report_type: str
    ) -> list[StructureOption]:
        if not raw_options:
            raw_options = self._fallback_options(report_type)

        limited = raw_options[:5]
        if len(limited) > 1:
            limited = limited[: max(2, min(5, len(limited)))]

        normalized: list[StructureOption] = []
        for index, raw_option in enumerate(limited, start=1):
            chapter_count = int(raw_option.get("chapter_count") or 0)
            raw_blueprint = raw_option.get("blueprint") or []
            fallback_blueprint = self._fallback_blueprint(chapter_count or len(raw_blueprint) or 3, report_type)

            normalized_blueprint: list[ChapterBlueprintItem] = []
            for chapter_index, raw_item in enumerate(raw_blueprint, start=1):
                fallback_item = fallback_blueprint[min(chapter_index - 1, len(fallback_blueprint) - 1)]
                working_title = (raw_item.get("working_title") or "").strip()
                if not working_title or self._is_generic_working_title(working_title):
                    working_title = fallback_item.working_title

                purpose = (raw_item.get("purpose") or "").strip()
                if not purpose or self._is_generic_purpose(purpose):
                    purpose = fallback_item.purpose

                start_focus = (raw_item.get("start_focus") or "").strip() or fallback_item.start_focus
                end_focus = (raw_item.get("end_focus") or "").strip() or fallback_item.end_focus
                normalized_blueprint.append(
                    ChapterBlueprintItem(
                        chapter_number=chapter_index,
                        working_title=working_title,
                        purpose=purpose,
                        start_focus=start_focus,
                        end_focus=end_focus,
                    )
                )

            if chapter_count <= 0:
                chapter_count = len(normalized_blueprint) or 3

            if not normalized_blueprint:
                normalized_blueprint = self._fallback_blueprint(chapter_count, report_type)
            elif len(normalized_blueprint) < chapter_count:
                normalized_blueprint.extend(
                    self._fallback_blueprint(chapter_count, report_type)[len(normalized_blueprint) :]
                )
            elif len(normalized_blueprint) > chapter_count:
                normalized_blueprint = normalized_blueprint[:chapter_count]

            normalized.append(
                StructureOption(
                    option_id=(raw_option.get("option_id") or f"option-{index}").strip(),
                    chapter_count=chapter_count,
                    rationale=(raw_option.get("rationale") or "Balanced structure for the selected report type.").strip(),
                    blueprint=normalized_blueprint,
                )
            )

        if not normalized:
            fallback = self._fallback_options(report_type)[0]
            normalized = self._normalize_options([fallback], report_type)

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

    def _fallback_options(self, report_type: str) -> list[dict[str, Any]]:
        lower_report_type = report_type.lower()

        if "systematic" in lower_report_type or "hệ thống" in lower_report_type:
            counts = [4, 5]
        elif "policy" in lower_report_type or "technical" in lower_report_type or "chính sách" in lower_report_type or "kỹ thuật" in lower_report_type:
            counts = [3, 4]
        elif "essay" in lower_report_type or "tiểu luận" in lower_report_type:
            counts = [3]
        else:
            counts = [3, 4, 5]

        fallback_options: list[dict[str, Any]] = []
        for index, count in enumerate(counts[:5], start=1):
            fallback_options.append(
                {
                    "option_id": f"option-{index}",
                    "chapter_count": count,
                    "rationale": self._fallback_rationale(report_type, count),
                    "blueprint": [
                        item.model_dump()
                        for item in self._fallback_blueprint(count, report_type)
                    ],
                }
            )
        return fallback_options or [
            {
                "option_id": "option-1",
                "chapter_count": 3,
                "rationale": "Compact default structure when only one sensible option is available.",
                "blueprint": [
                    item.model_dump()
                    for item in self._fallback_blueprint(3, report_type)
                ],
            }
        ]

    def _fallback_rationale(self, report_type: str, count: int) -> str:
        if count == 3:
            return f"Bố cục {report_type.lower()} gọn, đi từ định khung vấn đề đến phân tích và kết luận mà không bị chia nhỏ quá mức."
        if count == 4:
            return f"Bố cục {report_type.lower()} cân bằng, tách rõ phần định khung, xử lý bằng chứng, tổng hợp phân tích và hàm ý cuối."
        return f"Bố cục {report_type.lower()} đầy đủ hơn, có không gian riêng cho mở bài, tổ chức bằng chứng, phân tích, giới hạn và kết luận."

    def _fallback_blueprint(
        self, chapter_count: int, report_type: str
    ) -> list[ChapterBlueprintItem]:
        templates = {
            3: [
                ("Bối cảnh và phạm vi", "Xác định ranh giới chủ đề và lý do bài viết này quan trọng.", "Mở đầu bằng bối cảnh vấn đề và phạm vi bàn luận.", "Kết lại bằng hướng phân tích sẽ được triển khai ở chương sau."),
                ("Bằng chứng và phân tích trọng tâm", "Trình bày phần bằng chứng chính và đối chiếu phân tích cốt lõi.", "Mở đầu bằng tiêu chí hoặc góc nhìn phân tích quan trọng nhất.", "Kết lại bằng những phát hiện nổi bật nhất từ bằng chứng."),
                ("Hàm ý và kết luận", "Chuyển phần phân tích thành ý nghĩa, khoảng trống và bước đi tiếp theo.", "Mở đầu bằng hàm ý chính của các phát hiện.", "Kết lại bằng một phần tổng hợp ngắn gọn nhưng dứt điểm."),
            ],
            4: [
                ("Bối cảnh và phạm vi", "Định khung bài viết, chủ đề và ranh giới báo cáo.", "Mở đầu bằng bối cảnh chủ đề và ý nghĩa của vấn đề.", "Kết lại bằng cách giới thiệu hướng xử lý bằng chứng."),
                ("Nền bằng chứng và logic phương pháp", "Giải thích cách bằng chứng hoặc lập luận được tổ chức cho toàn bài.", "Mở đầu bằng cách chọn nguồn, tiêu chí hoặc hướng lập luận.", "Kết lại bằng những mẫu hình quan trọng cần được tổng hợp sâu hơn."),
                ("Tổng hợp so sánh", "Kết nối bằng chứng, đối chiếu các mẫu hình và triển khai mạch phân tích chính.", "Mở đầu bằng câu hỏi phân tích trung tâm.", "Kết lại bằng diễn giải then chốt dẫn sang phần hàm ý."),
                ("Hàm ý và kết luận", "Tóm lược ý nghĩa, giới hạn và các bước thực tiễn hoặc nghiên cứu tiếp theo.", "Mở đầu bằng ý nghĩa tổng thể của phần phân tích.", "Kết lại bằng một kết luận mạnh và rõ."),
            ],
            5: [
                ("Bối cảnh và phạm vi", "Giới thiệu vấn đề, bối cảnh nghiên cứu và ranh giới bài viết.", "Mở đầu bằng bối cảnh và động lực của chủ đề.", "Kết lại bằng mục tiêu tổng quan hoặc phân tích."),
                ("Nền bằng chứng và định khung", "Mô tả nền bằng chứng, nguồn liệu hoặc khung khái niệm được dùng.", "Mở đầu bằng toàn cảnh bằng chứng.", "Kết lại bằng cơ sở cho việc so sánh và phân tích."),
                ("Phân tích trọng tâm", "Triển khai phần phân tích so sánh hoặc diễn giải cốt lõi.", "Mở đầu bằng lăng kính phân tích quan trọng nhất.", "Kết lại bằng phát hiện có trọng lượng nhất của phần phân tích."),
                ("Khoảng trống và giới hạn", "Làm rõ những gì còn yếu, chưa chắc chắn hoặc còn tranh luận.", "Mở đầu bằng các điểm còn bỏ ngỏ trong nền bằng chứng.", "Kết lại bằng ý nghĩa của các giới hạn đối với chương cuối."),
                ("Hàm ý và kết luận", "Chuyển hóa phát hiện thành kết luận và hướng hành động tiếp theo.", "Mở đầu bằng ý nghĩa tổng thể của toàn bộ phần tổng hợp.", "Kết lại bằng một kết luận súc tích và dứt khoát."),
            ],
        }

        selected = templates.get(chapter_count, templates[3])
        return [
            ChapterBlueprintItem(
                chapter_number=index,
                working_title=title,
                purpose=f"{purpose} Bố cục này được điều chỉnh cho loại bài {report_type.lower()}.",
                start_focus=start_focus,
                end_focus=end_focus,
            )
            for index, (title, purpose, start_focus, end_focus) in enumerate(selected, start=1)
        ]
