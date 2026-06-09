from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from time import perf_counter
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.llm_usage import LlmUsage, LlmUsageDetail
from app.models.research import ArticleChapter, ResearchArticle

DEFAULT_STEP_LABELS = {
    "blueprint": "Tạo bố cục tổng thể",
    "title": "Gợi ý tiêu đề chương",
    "brief": "Sinh tóm tắt chương",
    "guide": "Sinh định hướng viết chương",
    "citation": "Lấy trích dẫn và nguồn học thuật",
    "writing": "Sinh nội dung chương",
}


@dataclass
class StepMetric:
    label: str | None = None
    model_name: str | None = None
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    cost_usd: Decimal = Decimal("0")
    latency_ms: int | None = None


def start_step_timer() -> float:
    return perf_counter()


def build_step_metric(
    *,
    label: str | None,
    model_name: str | None = None,
    input_tokens: int = 0,
    output_tokens: int = 0,
    total_tokens: int = 0,
    cost_usd: Decimal | int | float | str = Decimal("0"),
    latency_ms: int | None = None,
) -> StepMetric:
    return StepMetric(
        label=label,
        model_name=model_name,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=total_tokens,
        cost_usd=Decimal(str(cost_usd)),
        latency_ms=latency_ms,
    )


def build_gemini_step_metric(
    *,
    label: str | None,
    model_name: str | None,
    response: Any,
    started_at: float,
    cost_usd: Decimal | int | float | str = Decimal("0"),
) -> StepMetric:
    usage = getattr(response, "usage_metadata", None)
    input_tokens = int(
        getattr(usage, "prompt_token_count", None)
        or getattr(usage, "input_token_count", None)
        or getattr(usage, "cached_content_token_count", None)
        or 0
    )
    output_tokens = int(
        getattr(usage, "candidates_token_count", None)
        or getattr(usage, "output_token_count", None)
        or 0
    )
    total_tokens = int(
        getattr(usage, "total_token_count", None)
        or getattr(usage, "total_tokens", None)
        or (input_tokens + output_tokens)
    )
    latency_ms = int((perf_counter() - started_at) * 1000)
    return build_step_metric(
        label=label,
        model_name=model_name,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=total_tokens,
        cost_usd=cost_usd,
        latency_ms=latency_ms,
    )


def step_metric_to_dict(metric: StepMetric, **extra: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "label": metric.label,
        "model_name": metric.model_name,
        "input_tokens": metric.input_tokens,
        "output_tokens": metric.output_tokens,
        "total_tokens": metric.total_tokens,
        "cost_usd": str(metric.cost_usd),
        "latency_ms": metric.latency_ms,
    }
    payload.update(extra)
    return payload


def step_metric_from_dict(payload: dict[str, Any] | None) -> StepMetric | None:
    if not payload:
        return None
    return build_step_metric(
        label=payload.get("label"),
        model_name=payload.get("model_name"),
        input_tokens=int(payload.get("input_tokens") or 0),
        output_tokens=int(payload.get("output_tokens") or 0),
        total_tokens=int(payload.get("total_tokens") or 0),
        cost_usd=payload.get("cost_usd") or "0",
        latency_ms=int(payload["latency_ms"]) if payload.get("latency_ms") is not None else None,
    )


class LlmUsageService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_or_create_usage(
        self,
        *,
        user_id: UUID,
        article: ResearchArticle,
        session_id: str | None = None,
    ) -> LlmUsage:
        usage = (
            self.db.query(LlmUsage)
            .filter(LlmUsage.article_id == article.id)
            .order_by(LlmUsage.created_at.desc())
            .first()
        )
        if usage:
            if session_id and not usage.session_id:
                usage.session_id = session_id
            return usage

        usage = LlmUsage(
            user_id=user_id,
            article_id=article.id,
            session_id=session_id,
            article_title=article.title,
            report_type=article.report_type,
            status="in_progress",
        )
        self.db.add(usage)
        self.db.flush()
        return usage

    def record_blueprint_metrics(
        self,
        *,
        usage: LlmUsage,
        metric: StepMetric,
    ) -> LlmUsage:
        usage.blueprint_label = metric.label or DEFAULT_STEP_LABELS["blueprint"]
        usage.blueprint_input_tokens = metric.input_tokens
        usage.blueprint_output_tokens = metric.output_tokens
        usage.blueprint_total_tokens = metric.total_tokens
        usage.blueprint_cost_usd = metric.cost_usd
        usage.blueprint_latency_ms = metric.latency_ms
        self._recalculate_usage_totals(usage)
        self.db.flush()
        return usage

    def upsert_chapter_detail(
        self,
        *,
        usage: LlmUsage,
        chapter: ArticleChapter,
        title_metric: StepMetric | None = None,
        brief_metric: StepMetric | None = None,
        guide_metric: StepMetric | None = None,
        citation_metric: StepMetric | None = None,
        writing_metric: StepMetric | None = None,
        source_query: str | None = None,
        source_result_count: int | None = None,
    ) -> LlmUsageDetail:
        detail = (
            self.db.query(LlmUsageDetail)
            .filter(LlmUsageDetail.usage_id == usage.id, LlmUsageDetail.chapter_id == chapter.id)
            .first()
        )
        if detail is None:
            detail = LlmUsageDetail(
                usage_id=usage.id,
                article_id=usage.article_id,
                chapter_id=chapter.id,
                chapter_number=chapter.chapter_number,
                chapter_title=chapter.chapter_title,
            )
            self.db.add(detail)

        detail.chapter_number = chapter.chapter_number
        detail.chapter_title = chapter.chapter_title

        self._apply_metric(detail, "title", title_metric)
        self._apply_metric(detail, "brief", brief_metric)
        self._apply_metric(detail, "guide", guide_metric)
        self._apply_metric(detail, "citation", citation_metric)
        self._apply_metric(detail, "writing", writing_metric)

        if source_query is not None:
            detail.source_query = source_query
        if source_result_count is not None:
            detail.source_result_count = source_result_count

        self._recalculate_detail_totals(detail)
        self._recalculate_usage_totals(usage)
        self.db.flush()
        return detail

    def mark_usage_status(self, usage: LlmUsage, status: str) -> LlmUsage:
        usage.status = status
        self.db.flush()
        return usage

    def _apply_metric(self, detail: LlmUsageDetail, prefix: str, metric: StepMetric | None) -> None:
        if metric is None:
            return

        setattr(detail, f"{prefix}_label", metric.label or DEFAULT_STEP_LABELS[prefix])
        setattr(detail, f"{prefix}_input_tokens", metric.input_tokens)
        setattr(detail, f"{prefix}_output_tokens", metric.output_tokens)
        setattr(detail, f"{prefix}_total_tokens", metric.total_tokens)
        setattr(detail, f"{prefix}_cost_usd", metric.cost_usd)
        setattr(detail, f"{prefix}_latency_ms", metric.latency_ms)
        setattr(detail, f"model_{prefix}", metric.model_name)

    def _recalculate_detail_totals(self, detail: LlmUsageDetail) -> None:
        prefixes = ("title", "brief", "guide", "citation", "writing")
        detail.total_input_tokens = sum(int(getattr(detail, f"{prefix}_input_tokens") or 0) for prefix in prefixes)
        detail.total_output_tokens = sum(int(getattr(detail, f"{prefix}_output_tokens") or 0) for prefix in prefixes)
        detail.total_tokens = sum(int(getattr(detail, f"{prefix}_total_tokens") or 0) for prefix in prefixes)
        detail.total_cost_usd = sum(Decimal(getattr(detail, f"{prefix}_cost_usd") or 0) for prefix in prefixes)
        latencies = [int(getattr(detail, f"{prefix}_latency_ms")) for prefix in prefixes if getattr(detail, f"{prefix}_latency_ms") is not None]
        detail.total_latency_ms = sum(latencies) if latencies else None

    def _recalculate_usage_totals(self, usage: LlmUsage) -> None:
        details: list[LlmUsageDetail] = list(usage.details or [])
        usage.total_input_tokens = int(usage.blueprint_input_tokens or 0) + sum(detail.total_input_tokens or 0 for detail in details)
        usage.total_output_tokens = int(usage.blueprint_output_tokens or 0) + sum(detail.total_output_tokens or 0 for detail in details)
        usage.total_tokens = int(usage.blueprint_total_tokens or 0) + sum(detail.total_tokens or 0 for detail in details)
        usage.total_cost_usd = Decimal(usage.blueprint_cost_usd or 0) + sum(
            Decimal(detail.total_cost_usd or 0) for detail in details
        )
        detail_latencies = [detail.total_latency_ms for detail in details if detail.total_latency_ms is not None]
        base_latency = int(usage.blueprint_latency_ms) if usage.blueprint_latency_ms is not None else 0
        usage.total_latency_ms = base_latency + sum(detail_latencies) if (usage.blueprint_latency_ms is not None or detail_latencies) else None
