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
    PaperSection,
    ResearchArticle,
)
from app.prompts.advanced.generation_prompt import (
    ADVANCED_GENERATION_SYSTEM_PROMPT,
    ADVANCED_GENERATION_USER_PROMPT,
)


class AdvancedGenerationService:
    def __init__(self, db: Session, user_id: str) -> None:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is missing.")

        self.db = db
        self.user_id = UUID(user_id)
        self.client = genai.Client(api_key=api_key)
        self.model_name = "gemini-3-flash-preview"

    def generate_article(self, article_id: UUID) -> dict:
        article = (
            self.db.query(ResearchArticle)
            .options(
                selectinload(ResearchArticle.blueprints),
                selectinload(ResearchArticle.chapters).selectinload(ArticleChapter.guides),
                selectinload(ResearchArticle.chapters).selectinload(ArticleChapter.sources),
                selectinload(ResearchArticle.sections),
            )
            .filter(
                ResearchArticle.id == article_id,
                ResearchArticle.user_id == self.user_id,
            )
            .first()
        )
        if article is None:
            raise ValueError("Article not found.")

        ordered_blueprints = sorted(article.blueprints, key=lambda item: item.chapter_number)
        ordered_chapters = sorted(article.chapters, key=lambda item: item.chapter_number)

        if not ordered_chapters:
            raise ValueError("No chapters found for this article.")

        missing = [
            chapter.chapter_number
            for chapter in ordered_chapters
            if not chapter.chapter_title or not chapter.chapter_brief or not chapter.sources
        ]
        if missing:
            raise ValueError(f"Chapters not ready for generation: {missing}")

        blueprint_map = {item.chapter_number: item for item in ordered_blueprints}

        self.db.query(PaperSection).filter(PaperSection.article_id == article.id).delete()
        self.db.flush()

        previous_context = "Chưa có chương trước. Hãy mở bài tự nhiên theo đúng blueprint."
        generated_sections = []

        for chapter in ordered_chapters:
            blueprint = blueprint_map.get(chapter.chapter_number)
            section_payload = self._generate_single_chapter(
                article=article,
                chapter=chapter,
                blueprint=blueprint,
                previous_context=previous_context,
            )

            chapter.generated_content = section_payload["section_content"]
            paper_section = PaperSection(
                article_id=article.id,
                section_title=section_payload["section_title"],
                section_content=section_payload["section_content"],
                order=chapter.chapter_number,
            )
            self.db.add(paper_section)
            generated_sections.append(paper_section)
            previous_context = self._summarize_previous_context(
                section_payload["section_title"],
                section_payload["section_content"],
            )

        self.db.commit()
        for section in generated_sections:
            self.db.refresh(section)

        logger.info(
            "[Advanced] Generated article_id=%s section_count=%s",
            article.id,
            len(generated_sections),
        )
        return {
            "article_id": article.id,
            "section_count": len(generated_sections),
            "generated_at": article.updated_at or article.created_at,
        }

    def get_generated_article(self, article_id: UUID) -> dict:
        article = (
            self.db.query(ResearchArticle)
            .options(selectinload(ResearchArticle.sections))
            .filter(
                ResearchArticle.id == article_id,
                ResearchArticle.user_id == self.user_id,
            )
            .first()
        )
        if article is None:
            raise ValueError("Article not found.")

        ordered_sections = sorted(article.sections, key=lambda item: item.order)
        return {
            "title": article.title,
            "sections": [
                {
                    "title": section.section_title,
                    "content": section.section_content,
                    "order": section.order,
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
        previous_context: str,
    ) -> dict[str, str]:
        guide_block = "\n".join(
            f"- {guide.content}" for guide in sorted(chapter.guides, key=lambda item: item.sort_order)
        ) or "- Không có hướng dẫn bổ sung."

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
            blueprint_purpose=blueprint.purpose if blueprint and blueprint.purpose else chapter.chapter_brief or "",
            blueprint_start_focus=blueprint.start_focus if blueprint and blueprint.start_focus else "Mở chương theo đúng trọng tâm.",
            blueprint_end_focus=blueprint.end_focus if blueprint and blueprint.end_focus else "Kết chương mạch lạc để nối sang chương sau.",
            chapter_title=chapter.chapter_title or "",
            chapter_title_description=chapter.chapter_title_description or "",
            chapter_brief=chapter.chapter_brief or "",
            guide_block=guide_block,
            source_block=source_block,
            previous_context=previous_context,
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
        return {
            "section_title": payload.get("section_title") or chapter.chapter_title or f"Chương {chapter.chapter_number}",
            "section_content": payload.get("section_content") or "",
        }

    def _summarize_previous_context(self, title: str, content: str) -> str:
        compact = " ".join(content.split())
        return f"Chương trước: {title}. Đoạn cuối mạch văn: {compact[-1200:]}"

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
