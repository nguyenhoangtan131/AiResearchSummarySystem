import json
import os
import hashlib
import unicodedata
from typing import Any

import httpx
from google import genai

from app.core.logging import logger
from app.redis_store import AdvancedRedisStore
from app.schemas.advanced import (
    AdvancedStructureResponse,
    AdvancedChapterStepCacheRead,
    ChapterBlueprintItem,
    ChapterBriefOption,
    ChapterBriefRecommendationRequest,
    ChapterBriefRecommendationResponse,
    ChapterGuideOption,
    ChapterGuideRecommendationRequest,
    ChapterGuideRecommendationResponse,
    ChapterSourceOption,
    ChapterSourceRecommendationRequest,
    ChapterSourceRecommendationResponse,
    ChapterTitleOption,
    ChapterTitleRecommendationRequest,
    ChapterTitleRecommendationResponse,
)
from app.prompts.advanced.chapter_prompt import (
    BRIEF_RECOMMENDATION_PROMPT,
    GUIDE_RECOMMENDATION_PROMPT,
    SOURCE_QUERY_PLANNING_PROMPT,
    TITLE_RECOMMENDATION_PROMPT,
)


class AdvancedChapterRecommendationService:
    def __init__(self) -> None:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is missing.")

        self.client = genai.Client(api_key=api_key)
        self.store = AdvancedRedisStore()
        self.model_name = "gemini-3-flash-preview"
        self.serper_api_key = os.getenv("SERPER_API_KEY")

    def get_cached_step(
        self, session_id: str, chapter_number: int, step: str
    ) -> AdvancedChapterStepCacheRead:
        normalized_step = step.strip().lower()
        if normalized_step not in {"titles", "briefs", "guides", "sources"}:
            raise ValueError("Unsupported chapter recommendation step.")

        cache_key = self.store.chapter_step_key(session_id, chapter_number, normalized_step)
        cached = self.store.get_chapter_step(session_id, chapter_number, normalized_step)
        return AdvancedChapterStepCacheRead(
            cache_key=cache_key,
            found=bool(cached),
            step=normalized_step,
            data=cached if cached else None,
        )

    def recommend_titles(
        self, payload: ChapterTitleRecommendationRequest
    ) -> ChapterTitleRecommendationResponse:
        structure, blueprint = self._load_structure_context(
            payload.session_id,
            payload.selected_option_id,
            payload.chapter_number,
        )
        logger.info(
            "[Advanced] Recommend titles session_id=%s chapter=%s option_id=%s",
            payload.session_id,
            payload.chapter_number,
            payload.selected_option_id,
        )
        parsed = self._generate_json(
            TITLE_RECOMMENDATION_PROMPT.format(
                report_type=structure.report_type,
                normalized_article_title_en=structure.normalized_article_title_en,
                chapter_number=payload.chapter_number,
                working_title=blueprint.working_title,
                purpose=blueprint.purpose,
                start_focus=blueprint.start_focus,
                end_focus=blueprint.end_focus,
            )
        )
        logger.info(
            "[Advanced] Title context chapter=%s working_title=%s purpose=%s",
            payload.chapter_number,
            blueprint.working_title,
            blueprint.purpose,
        )
        logger.info("[Advanced] Raw title options payload=%s", parsed.get("options", []))
        options = self._normalize_title_options(parsed.get("options", []), blueprint)
        logger.info(
            "[Advanced] Normalized title options chapter=%s options=%s",
            payload.chapter_number,
            [{"title": item.title, "description": item.description} for item in options],
        )
        response = ChapterTitleRecommendationResponse(
            session_id=payload.session_id,
            selected_option_id=payload.selected_option_id,
            chapter_number=payload.chapter_number,
            cache_key=self.store.chapter_step_key(payload.session_id, payload.chapter_number, "titles"),
            cache_ttl_seconds=self.store.ttl_seconds,
            option_count=len(options),
            context_signature=self._build_context_signature(
                "titles",
                payload.session_id,
                payload.selected_option_id,
                payload.chapter_number,
            ),
            options=options,
        )
        for item in response.options:
            item.display_title_vi = item.title
            item.display_description_vi = item.description
        self.store.save_chapter_step(payload.session_id, payload.chapter_number, "titles", response.model_dump())
        return response

    def recommend_briefs(
        self, payload: ChapterBriefRecommendationRequest
    ) -> ChapterBriefRecommendationResponse:
        structure, blueprint = self._load_structure_context(
            payload.session_id,
            payload.selected_option_id,
            payload.chapter_number,
        )
        logger.info(
            "[Advanced] Recommend briefs session_id=%s chapter=%s option_id=%s",
            payload.session_id,
            payload.chapter_number,
            payload.selected_option_id,
        )
        parsed = self._generate_json(
            BRIEF_RECOMMENDATION_PROMPT.format(
                report_type=structure.report_type,
                normalized_article_title_en=structure.normalized_article_title_en,
                chapter_number=payload.chapter_number,
                chapter_title=payload.chapter_title,
                chapter_title_description=payload.chapter_title_description or blueprint.purpose,
                purpose=blueprint.purpose,
                start_focus=blueprint.start_focus,
                end_focus=blueprint.end_focus,
            )
        )
        options = self._normalize_brief_options(parsed.get("options", []), blueprint)
        response = ChapterBriefRecommendationResponse(
            session_id=payload.session_id,
            selected_option_id=payload.selected_option_id,
            chapter_number=payload.chapter_number,
            cache_key=self.store.chapter_step_key(payload.session_id, payload.chapter_number, "briefs"),
            cache_ttl_seconds=self.store.ttl_seconds,
            option_count=len(options),
            context_signature=self._build_context_signature(
                "briefs",
                payload.session_id,
                payload.selected_option_id,
                payload.chapter_number,
                payload.chapter_title,
                payload.chapter_title_description or blueprint.purpose,
            ),
            options=options,
        )
        for item in response.options:
            item.display_title_vi = item.title
            item.display_description_vi = item.description
        self.store.save_chapter_step(payload.session_id, payload.chapter_number, "briefs", response.model_dump())
        return response

    def recommend_guides(
        self, payload: ChapterGuideRecommendationRequest
    ) -> ChapterGuideRecommendationResponse:
        structure, blueprint = self._load_structure_context(
            payload.session_id,
            payload.selected_option_id,
            payload.chapter_number,
        )
        logger.info(
            "[Advanced] Recommend guides session_id=%s chapter=%s option_id=%s",
            payload.session_id,
            payload.chapter_number,
            payload.selected_option_id,
        )
        parsed = self._generate_json(
            GUIDE_RECOMMENDATION_PROMPT.format(
                report_type=structure.report_type,
                normalized_article_title_en=structure.normalized_article_title_en,
                chapter_number=payload.chapter_number,
                chapter_title=payload.chapter_title,
                chapter_brief=payload.chapter_brief,
                purpose=blueprint.purpose,
                start_focus=blueprint.start_focus,
                end_focus=blueprint.end_focus,
            )
        )
        options = self._normalize_guide_options(parsed.get("options", []))
        response = ChapterGuideRecommendationResponse(
            session_id=payload.session_id,
            selected_option_id=payload.selected_option_id,
            chapter_number=payload.chapter_number,
            cache_key=self.store.chapter_step_key(payload.session_id, payload.chapter_number, "guides"),
            cache_ttl_seconds=self.store.ttl_seconds,
            option_count=len(options),
            context_signature=self._build_context_signature(
                "guides",
                payload.session_id,
                payload.selected_option_id,
                payload.chapter_number,
                payload.chapter_title,
                payload.chapter_brief,
            ),
            options=options,
        )
        for item in response.options:
            item.display_title_vi = item.title
            item.display_body_vi = item.body
        self.store.save_chapter_step(payload.session_id, payload.chapter_number, "guides", response.model_dump())
        return response

    async def recommend_sources(
        self, payload: ChapterSourceRecommendationRequest
    ) -> ChapterSourceRecommendationResponse:
        structure, blueprint = self._load_structure_context(
            payload.session_id,
            payload.selected_option_id,
            payload.chapter_number,
        )
        if not self.serper_api_key:
            raise ValueError("SERPER_API_KEY is missing.")

        query_candidates = self._build_source_queries(structure, blueprint, payload)
        selected_query = query_candidates[0]
        raw_organic: list[dict[str, Any]] = []

        async with httpx.AsyncClient(timeout=30.0) as client:
            for query in query_candidates:
                logger.info(
                    "[Advanced] Recommend sources session_id=%s chapter=%s option_id=%s query=%s",
                    payload.session_id,
                    payload.chapter_number,
                    payload.selected_option_id,
                    query,
                )
                response = await client.post(
                    "https://google.serper.dev/scholar",
                    headers={
                        "X-API-KEY": self.serper_api_key,
                        "Content-Type": "application/json",
                    },
                    json={"q": query, "num": 8},
                )
                response.raise_for_status()
                search_data = response.json()
                raw_organic = search_data.get("organic", []) or []
                logger.info(
                    "[Advanced] Source search query_result_count=%s query=%s",
                    len(raw_organic),
                    query,
                )
                selected_query = query
                if raw_organic:
                    break

        options = self._normalize_source_options(raw_organic)

        source_response = ChapterSourceRecommendationResponse(
            session_id=payload.session_id,
            selected_option_id=payload.selected_option_id,
            chapter_number=payload.chapter_number,
            cache_key=self.store.chapter_step_key(payload.session_id, payload.chapter_number, "sources"),
            cache_ttl_seconds=self.store.ttl_seconds,
            option_count=len(options),
            context_signature=self._build_context_signature(
                "sources",
                payload.session_id,
                payload.selected_option_id,
                payload.chapter_number,
                payload.chapter_title,
                payload.chapter_brief,
                *payload.guide_notes,
            ),
            query=selected_query,
            query_candidates=query_candidates,
            options=options,
        )
        for item in source_response.options:
            item.display_title_vi = item.title
            item.display_snippet_vi = item.snippet
            item.display_publication_vi = item.publication
        self.store.save_chapter_step(payload.session_id, payload.chapter_number, "sources", source_response.model_dump())
        return source_response

    def _load_structure_context(
        self, session_id: str, selected_option_id: str, chapter_number: int
    ) -> tuple[AdvancedStructureResponse, ChapterBlueprintItem]:
        cached = self.store.get_structure(session_id)
        if not cached:
            raise ValueError("Structure cache was not found for this session.")

        structure = AdvancedStructureResponse.model_validate(cached)
        selected_option = next(
            (option for option in structure.options if option.option_id == selected_option_id),
            None,
        )
        if selected_option is None:
            raise ValueError("Selected structure option was not found in cache.")

        blueprint = next(
            (item for item in selected_option.blueprint if item.chapter_number == chapter_number),
            None,
        )
        if blueprint is None:
            raise ValueError("Selected chapter blueprint was not found in cache.")

        return structure, blueprint

    def _generate_json(self, prompt: str) -> dict[str, Any]:
        raw_response = self.client.models.generate_content(
            model=self.model_name,
            contents=prompt,
        )
        raw_text = (raw_response.text or "").replace("```json", "").replace("```", "").strip()
        try:
            return json.loads(raw_text)
        except json.JSONDecodeError:
            first = raw_text.find("{")
            last = raw_text.rfind("}")
            if first != -1 and last != -1 and last > first:
                extracted = raw_text[first:last + 1]
                try:
                    return json.loads(extracted)
                except json.JSONDecodeError:
                    logger.exception("[Advanced] Failed to parse Gemini JSON after extraction. raw=%s", raw_text[:1200])
                    return {}
            logger.exception("[Advanced] Failed to parse Gemini JSON. raw=%s", raw_text[:1200])
            return {}

    def _normalize_title_options(
        self, raw_options: list[dict[str, Any]], blueprint: ChapterBlueprintItem
    ) -> list[ChapterTitleOption]:
        role = self._detect_blueprint_role(blueprint)
        normalized_raw = [
            ChapterTitleOption(
                title=(item.get("title") or blueprint.working_title).strip(),
                description=(item.get("description") or blueprint.purpose).strip(),
            )
            for item in raw_options[:5]
        ]
        filtered = [
            item for item in normalized_raw
            if self._title_matches_role(item.title, item.description, role)
        ]
        if filtered:
            filtered = self._merge_title_options(
                [ChapterTitleOption(
                    title=(blueprint.display_working_title_vi or blueprint.working_title).strip(),
                    description=(blueprint.display_purpose_vi or blueprint.purpose).strip(),
                )],
                filtered,
            )
        return filtered[:3]

    def _normalize_brief_options(
        self, raw_options: list[dict[str, Any]], blueprint: ChapterBlueprintItem
    ) -> list[ChapterBriefOption]:
        options = raw_options[:5]

        return [
            ChapterBriefOption(
                title=(item.get("title") or blueprint.working_title).strip(),
                description=(item.get("description") or blueprint.purpose).strip(),
            )
            for item in options
            if (item.get("title") or "").strip() or (item.get("description") or "").strip()
        ]

    def _normalize_guide_options(
        self, raw_options: list[dict[str, Any]]
    ) -> list[ChapterGuideOption]:
        options = raw_options[:5]

        normalized: list[ChapterGuideOption] = []
        for index, item in enumerate(options, start=1):
            if not ((item.get("title") or "").strip() or (item.get("body") or "").strip()):
                continue
            normalized.append(
                ChapterGuideOption(
                    id=(item.get("id") or f"guide-{index}").strip(),
                    title=(item.get("title") or f"Guide option {index}").strip(),
                    body=(item.get("body") or "Write clearly, stay evidence-based, and maintain chapter-level coherence.").strip(),
                )
            )
        return normalized

    def _normalize_source_options(
        self, raw_options: list[dict[str, Any]]
    ) -> list[ChapterSourceOption]:
        options = raw_options[:5]
        normalized: list[ChapterSourceOption] = []
        for index, item in enumerate(options, start=1):
            publication_info = item.get("publicationInfo")
            publication_text = self._stringify_publication(publication_info)
            normalized.append(
                ChapterSourceOption(
                    id=f"source-{index}",
                    title=(item.get("title") or "Untitled source").strip(),
                    snippet=(item.get("snippet") or "").strip() or None,
                    provider="Google Scholar",
                    link=item.get("link"),
                    year=str(item.get("year")) if item.get("year") else None,
                    publication=publication_text,
                    citation_count=int(item.get("citedBy") or 0),
                )
            )

        return normalized

    def _build_source_queries(
        self,
        structure: AdvancedStructureResponse,
        blueprint: ChapterBlueprintItem,
        payload: ChapterSourceRecommendationRequest,
    ) -> list[str]:
        guide_notes = " | ".join(note.strip() for note in payload.guide_notes if note.strip())[:500]
        parsed = self._generate_json(
            SOURCE_QUERY_PLANNING_PROMPT.format(
                report_type=structure.report_type.strip(),
                article_title=(structure.display_article_title_vi or structure.article_title).strip(),
                normalized_article_title_en=structure.normalized_article_title_en.strip(),
                chapter_number=payload.chapter_number,
                working_title=(blueprint.display_working_title_vi or blueprint.working_title).strip(),
                purpose=(blueprint.display_purpose_vi or blueprint.purpose).strip(),
                start_focus=(blueprint.display_start_focus_vi or blueprint.start_focus).strip(),
                end_focus=(blueprint.display_end_focus_vi or blueprint.end_focus).strip(),
                chapter_title=payload.chapter_title.strip(),
                chapter_brief=payload.chapter_brief.strip(),
                guide_notes=guide_notes or "None",
            )
        )

        raw_queries = parsed.get("queries", [])
        cleaned_queries: list[str] = []
        for item in raw_queries:
            compact = " ".join(str(item or "").split()).strip()
            normalized = self._normalize_text(compact)
            if compact and normalized and normalized not in {self._normalize_text(query) for query in cleaned_queries}:
                cleaned_queries.append(compact[:280])

        if cleaned_queries:
            return cleaned_queries[:5]

        fallback_queries = self._build_source_query_fallbacks(structure, blueprint, payload)
        return fallback_queries[:5]

    def _build_source_query_fallbacks(
        self,
        structure: AdvancedStructureResponse,
        blueprint: ChapterBlueprintItem,
        payload: ChapterSourceRecommendationRequest,
    ) -> list[str]:
        article_title = structure.normalized_article_title_en.strip() or structure.article_title.strip()
        chapter_title = payload.chapter_title.strip()
        chapter_brief = payload.chapter_brief.strip()
        purpose = blueprint.purpose.strip()
        report_type = structure.report_type.strip()
        guide_fragment = " ".join(note.strip() for note in payload.guide_notes if note.strip())[:120]
        queries = [
            f'{article_title} "{chapter_title}" open access scholarly article',
            f'{article_title} {chapter_title} journal article review',
            f'{chapter_title} {chapter_brief[:140]} open access research',
            f'{article_title} {purpose[:140]} peer reviewed article',
            f'{chapter_title} {report_type} google scholar',
        ]
        if guide_fragment:
            queries.insert(2, f'{chapter_title} {guide_fragment} peer reviewed article')

        cleaned: list[str] = []
        seen: set[str] = set()
        for query in queries:
            compact = " ".join(query.split()).strip()
            normalized = self._normalize_text(compact)
            if compact and normalized and normalized not in seen:
                seen.add(normalized)
                cleaned.append(compact[:280])
        return cleaned

    def _build_context_signature(self, *parts: Any) -> str:
        normalized_parts = [" ".join(str(part or "").split()).strip() for part in parts]
        fingerprint = "||".join(normalized_parts)
        return hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()

    def _stringify_publication(self, publication_info: Any) -> str | None:
        if publication_info is None:
            return None
        if isinstance(publication_info, str):
            return publication_info
        if isinstance(publication_info, dict):
            values = [str(value).strip() for value in publication_info.values() if value]
            return " • ".join(values) or None
        return str(publication_info)

    def _normalize_text(self, value: str | None) -> str:
        return (
            unicodedata.normalize("NFD", value or "")
            .encode("ascii", "ignore")
            .decode("ascii")
            .lower()
            .replace("-", " ")
            .replace("_", " ")
        )

    def _detect_blueprint_role(self, blueprint: ChapterBlueprintItem) -> str:
        text = self._normalize_text(
            f"{blueprint.display_working_title_vi or blueprint.working_title} "
            f"{blueprint.display_purpose_vi or blueprint.purpose}"
        )
        if any(token in text for token in ["boi canh", "pham vi", "dinh khung", "mo bai"]):
            return "context"
        if any(token in text for token in ["bang chung", "phuong phap", "tong hop"]):
            return "evidence"
        if any(token in text for token in ["phan tich", "so sanh", "dien giai"]):
            return "analysis"
        if any(token in text for token in ["ham y", "ket luan", "khuyen nghi"]):
            return "closing"
        return "general"

    def _title_matches_role(self, title: str, description: str, role: str) -> bool:
        text = self._normalize_text(f"{title} {description}")
        if role == "context":
            return any(token in text for token in ["boi canh", "pham vi", "dinh khung", "mo bai"])
        if role == "evidence":
            return any(token in text for token in ["bang chung", "phuong phap", "tong hop"])
        if role == "analysis":
            return any(token in text for token in ["phan tich", "so sanh", "dien giai", "lap luan"])
        if role == "closing":
            return any(token in text for token in ["ham y", "ket luan", "khuyen nghi", "tong ket"])
        return True

    def _merge_title_options(
        self, *groups: list[ChapterTitleOption]
    ) -> list[ChapterTitleOption]:
        seen: set[str] = set()
        merged: list[ChapterTitleOption] = []
        for group in groups:
            for item in group:
                key = self._normalize_text(item.title)
                if not key or key in seen:
                    continue
                seen.add(key)
                merged.append(item)
        return merged
