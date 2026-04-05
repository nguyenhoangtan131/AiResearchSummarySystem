import json
import os
from uuid import UUID

from google import genai
from google.genai import types
from sqlalchemy.orm import Session, selectinload

from app.core.logging import logger
from app.models.research import (
    ArticleBlueprint,
    ArticleChapter,
    ChapterSource,
    ResearchArticle,
)
from app.prompts.advanced.generation_prompt import (
    ADVANCED_GENERATION_SYSTEM_PROMPT,
    ADVANCED_GENERATION_USER_PROMPT,
)
from app.redis_store import AdvancedRedisStore
from app.services.advanced.article_formatter import AdvancedArticleFormatter


class AdvancedGenerationService:
    def __init__(self, db: Session, user_id: str) -> None:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is missing.")

        self.db = db
        self.user_id = UUID(user_id)
        self.client = genai.Client(api_key=api_key)
        self.model_name = "gemini-3-flash-preview"
        self.store = AdvancedRedisStore()

    def generate_article(self, article_id: UUID) -> dict:
        article = self._load_article(article_id)
        ordered_chapters = sorted(article.chapters, key=lambda item: item.chapter_number)
        if not ordered_chapters:
            raise ValueError("No chapters found for this article.")

        missing_generated = [
            chapter.chapter_number
            for chapter in ordered_chapters
            if not (chapter.generated_content or "").strip()
        ]
        if missing_generated:
            raise ValueError(f"Chapters have not been generated yet: {missing_generated}")

        generated_sections = self._build_generated_section_payloads(article)
        self.store.clear_generated_buffers(str(article.id), article.chapter_count)
        logger.info(
            "[Advanced] Finalized generated article article_id=%s section_count=%s",
            article.id,
            len(generated_sections),
        )
        return {
            "article_id": article.id,
            "section_count": len(generated_sections),
            "generated_at": article.updated_at or article.created_at,
        }

    def generate_chapter(self, article_id: UUID, chapter_number: int) -> dict:
        article = self._load_article(article_id)
        ordered_blueprints = sorted(article.blueprints, key=lambda item: item.chapter_number)
        ordered_chapters = sorted(article.chapters, key=lambda item: item.chapter_number)
        blueprint_map = {item.chapter_number: item for item in ordered_blueprints}

        chapter = next((item for item in ordered_chapters if item.chapter_number == chapter_number), None)
        if chapter is None:
            raise ValueError("Chapter not found for this article.")
        if not chapter.chapter_title or not chapter.sources:
            raise ValueError("Chapter is not ready for generation.")

        blueprint = blueprint_map.get(chapter.chapter_number)
        section_payload = self._generate_single_chapter(
            article=article,
            chapter=chapter,
            blueprint=blueprint,
        )

        chapter.generated_content = section_payload["section_content"]
        chapter_cache_key = self.store.save_generated_chapter(
            str(article.id),
            chapter.chapter_number,
            {
                "article_id": str(article.id),
                "chapter_number": chapter.chapter_number,
                "section_title": section_payload["section_title"],
                "section_content": section_payload["section_content"],
            },
        )

        self.db.commit()
        self.db.refresh(chapter)

        logger.info(
            "[Advanced] Generated chapter article_id=%s chapter=%s cache_key=%s",
            article.id,
            chapter.chapter_number,
            chapter_cache_key,
        )
        return {
            "article_id": article.id,
            "chapter_number": chapter.chapter_number,
            "section_title": section_payload["section_title"] or chapter.chapter_title or f"Chương {chapter.chapter_number}",
            "generated_at": chapter.updated_at or chapter.created_at,
        }

    def _load_article(self, article_id: UUID) -> ResearchArticle:
        article = (
            self.db.query(ResearchArticle)
            .options(
                selectinload(ResearchArticle.blueprints),
                selectinload(ResearchArticle.chapters).selectinload(ArticleChapter.guides),
                selectinload(ResearchArticle.chapters).selectinload(ArticleChapter.sources),
            )
            .filter(
                ResearchArticle.id == article_id,
                ResearchArticle.user_id == self.user_id,
            )
            .first()
        )
        if article is None:
            raise ValueError("Article not found.")
        return article

    def _build_generated_section_payloads(self, article: ResearchArticle) -> list[dict[str, str | int]]:
        return AdvancedArticleFormatter.build_section_payloads(
            chapters=article.chapters,
            blueprints=article.blueprints,
            generated_cache_lookup=lambda chapter_number: self.store.get_generated_chapter(
                str(article.id), chapter_number
            ),
        )

    def get_generated_article(self, article_id: UUID) -> dict:
        article = (
            self.db.query(ResearchArticle)
            .options(
                selectinload(ResearchArticle.blueprints),
                selectinload(ResearchArticle.chapters),
            )
            .filter(
                ResearchArticle.id == article_id,
                ResearchArticle.user_id == self.user_id,
            )
            .first()
        )
        if article is None:
            raise ValueError("Article not found.")

        ordered_sections = self._build_generated_section_payloads(article)
        return {
            "title": article.title,
            "sections": [
                {
                    "title": str(section["section_title"]),
                    "content": str(section["section_content"]),
                    "order": int(section["order"]),
                }
                for section in ordered_sections
            ],
        }

    def get_generated_sources(self, article_id: UUID) -> dict:
        article = (
            self.db.query(ResearchArticle)
            .options(selectinload(ResearchArticle.chapters).selectinload(ArticleChapter.sources))
            .filter(
                ResearchArticle.id == article_id,
                ResearchArticle.user_id == self.user_id,
            )
            .first()
        )
        if article is None:
            raise ValueError("Article not found.")

        ordered_sources: list[ChapterSource] = []
        seen_ids: set[UUID] = set()
        for chapter in sorted(article.chapters, key=lambda item: item.chapter_number):
            for source in sorted(chapter.sources, key=lambda item: item.sort_order):
                if source.id not in seen_ids:
                    ordered_sources.append(source)
                    seen_ids.add(source.id)

        return {
            "article_id": article.id,
            "total_sources": len(ordered_sources),
            "sources": [
                {
                    "id": source.id,
                    "publication": source.publication,
                    "title": source.title,
                    "link": source.url,
                    "year": source.year,
                    "citation_count": source.citation_count,
                }
                for source in ordered_sources
            ],
        }

    def _generate_single_chapter(
        self,
        article: ResearchArticle,
        chapter: ArticleChapter,
        blueprint: ArticleBlueprint | None,
    ) -> dict[str, str]:
        chapter_context = self.store.get_chapter_context(str(article.id), chapter.chapter_number) or {}
        context_brief = str(chapter_context.get("chapter_brief") or "").strip() or (chapter.chapter_brief or "").strip()

        guide_notes = chapter_context.get("guide_notes")
        if isinstance(guide_notes, list) and guide_notes:
            guide_block = "\n".join(
                f"- {str(guide).strip()}" for guide in guide_notes if str(guide).strip()
            ) or "- Không có hướng dẫn bổ sung."
        else:
            guide_block = "\n".join(
                f"- {guide.content}" for guide in sorted(chapter.guides, key=lambda item: item.sort_order)
            ) or "- Không có hướng dẫn bổ sung."

        cached_sources = chapter_context.get("sources")
        if isinstance(cached_sources, list) and cached_sources:
            ordered_sources = sorted(chapter.sources, key=lambda s: s.sort_order)
            source_block = "\n".join(
                (
                    f"[Source ID: {source.id}]\n"
                    f"Tiêu đề: {cached_item.get('title') or source.title}\n"
                    f"Tóm lược: {cached_item.get('snippet') or source.snippet or 'Không có snippet.'}\n"
                    f"Ấn phẩm: {cached_item.get('publication') or cached_item.get('provider') or source.publication or source.provider or 'Không rõ'}\n"
                    f"Năm: {cached_item.get('year') or source.year or 'Không rõ'}\n"
                    f"Đường dẫn: {cached_item.get('url') or source.url or 'Không có'}\n"
                )
                for idx, source in enumerate(ordered_sources)
                for cached_item in [cached_sources[idx] if idx < len(cached_sources) and isinstance(cached_sources[idx], dict) else {}]
            )
        else:
            source_block = "\n".join(
                (
                    f"[Source ID: {source.id}]\n"
                    f"Tiêu đề: {source.title}\n"
                    f"Tóm lược: {source.snippet or 'Không có snippet.'}\n"
                    f"Ấn phẩm: {source.publication or source.provider or 'Không rõ'}\n"
                    f"Năm: {source.year or 'Không rõ'}\n"
                    f"Đường dẫn: {source.url or 'Không có'}\n"
                )
                for source in sorted(chapter.sources, key=lambda item: item.sort_order)
            )

        prompt = ADVANCED_GENERATION_USER_PROMPT.format(
            article_title=article.title,
            report_type=article.report_type or "Báo cáo học thuật",
            chapter_number=chapter.chapter_number,
            blueprint_title=blueprint.title if blueprint and blueprint.title else chapter.chapter_title or "",
            blueprint_purpose=blueprint.purpose if blueprint and blueprint.purpose else "",
            blueprint_start_focus=blueprint.start_focus if blueprint and blueprint.start_focus else "Mở chương theo đúng trọng tâm.",
            blueprint_end_focus=blueprint.end_focus if blueprint and blueprint.end_focus else "Kết chương mạch lạc để nối sang chương sau.",
            chapter_title=chapter.chapter_title or "",
            chapter_title_description=chapter.chapter_title_description or "",
            chapter_brief=context_brief or (blueprint.purpose if blueprint and blueprint.purpose else ""),
            guide_block=guide_block,
            source_block=source_block,
        )

        raw_response = self.client.models.generate_content(
            model=self.model_name,
            config=types.GenerateContentConfig(
                system_instruction=ADVANCED_GENERATION_SYSTEM_PROMPT,
                temperature=0.5,
            ),
            contents=prompt,
        )
        cleaned = self._extract_json_text(raw_response.text or "")
        payload = json.loads(cleaned)
        section_title = AdvancedArticleFormatter.normalize_section_title(
            payload.get("section_title") or chapter.chapter_title or f"Chương {chapter.chapter_number}"
        )
        section_content = AdvancedArticleFormatter.normalize_section_content(payload.get("section_content") or "")
        return {
            "section_title": section_title,
            "section_content": section_content,
        }

    def _extract_json_text(self, raw_text: str) -> str:
        cleaned = raw_text.replace("```json", "").replace("```", "").strip()
        if cleaned.startswith("{") and cleaned.endswith("}"):
            return cleaned

        first = cleaned.find("{")
        last = cleaned.rfind("}")
        if first != -1 and last != -1 and last > first:
            return cleaned[first:last + 1]

        logger.error("[Advanced] Failed to locate JSON in generation response: %s", cleaned[:1000])
        raise ValueError("Model did not return valid JSON for chapter generation.")
