from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Iterable
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.llm_usage import LlmUsage, LlmUsageDetail
from app.models.research import ResearchArticle
from app.models.user import User
from app.schemas.admin import (
    AdminArticleDetailResponse,
    AdminArticleStepBreakdownItem,
    AdminDashboardOverview,
    AdminDashboardResponse,
    AdminDashboardUserItem,
    AdminUserArticleItem,
    AdminUserDetailResponse,
)

router = APIRouter()

PAGE_SIZE = 20
STEP_KEYS = ("blueprint", "title", "brief", "guide", "citation", "writing")


def _as_iso(value: datetime | None) -> str:
    return (value or datetime.utcnow()).isoformat()


def _as_float(value: Decimal | float | int | None) -> float:
    return float(value or 0)


def _int_attr(obj: object, field: str) -> int:
    return int(getattr(obj, field, 0) or 0)


def _dec_attr(obj: object, field: str) -> float:
    return _as_float(getattr(obj, field, 0) or 0)


def _call_count_from_detail(detail: LlmUsageDetail) -> int:
    return sum(1 for step in STEP_KEYS[1:] if _int_attr(detail, f"{step}_total_tokens") > 0)


def _call_count_from_usage(usage: LlmUsage) -> int:
    blueprint_calls = 1 if _int_attr(usage, "blueprint_total_tokens") > 0 else 0
    detail_calls = sum(_call_count_from_detail(detail) for detail in usage.details or [])
    return blueprint_calls + detail_calls


def _build_date_window(selected_date: date) -> tuple[datetime, datetime]:
    start = datetime.combine(selected_date, time.min)
    end = start + timedelta(days=1)
    return start, end


@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(
    selected_date: date = Query(alias="date"),
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminDashboardResponse:
    del admin_user

    day_start, day_end = _build_date_window(selected_date)
    usages = (
        db.query(LlmUsage)
        .options(selectinload(LlmUsage.details), selectinload(LlmUsage.owner))
        .filter(LlmUsage.created_at >= day_start, LlmUsage.created_at < day_end)
        .order_by(LlmUsage.created_at.desc())
        .all()
    )

    overview = AdminDashboardOverview(
        totalCalls=sum(_call_count_from_usage(usage) for usage in usages),
        totalInputTokens=sum(_int_attr(usage, "total_input_tokens") for usage in usages),
        totalOutputTokens=sum(_int_attr(usage, "total_output_tokens") for usage in usages),
        totalEstimatedCostUsd=sum(_dec_attr(usage, "total_cost_usd") for usage in usages),
    )

    grouped: dict[str, dict[str, object]] = {}
    for usage in usages:
        owner = usage.owner
        if owner is None:
            continue
        bucket = grouped.setdefault(
            str(owner.id),
            {
                "userId": str(owner.id),
                "fullName": owner.full_name or owner.email or str(owner.id),
                "email": owner.email or "",
                "articleIds": set(),
                "llmCalls": 0,
                "totalTokens": 0,
                "estimatedCostUsd": 0.0,
            },
        )
        article_ids = bucket["articleIds"]
        if isinstance(article_ids, set):
            article_ids.add(str(usage.article_id))
        bucket["llmCalls"] = int(bucket["llmCalls"]) + _call_count_from_usage(usage)
        bucket["totalTokens"] = int(bucket["totalTokens"]) + _int_attr(usage, "total_tokens")
        bucket["estimatedCostUsd"] = float(bucket["estimatedCostUsd"]) + _dec_attr(usage, "total_cost_usd")

    users = sorted(
        [
            AdminDashboardUserItem(
                userId=str(item["userId"]),
                fullName=str(item["fullName"]),
                email=str(item["email"]),
                articleCount=len(item["articleIds"]) if isinstance(item["articleIds"], set) else 0,
                llmCalls=int(item["llmCalls"]),
                totalTokens=int(item["totalTokens"]),
                estimatedCostUsd=float(item["estimatedCostUsd"]),
            )
            for item in grouped.values()
        ],
        key=lambda item: (item.totalTokens, item.llmCalls),
        reverse=True,
    )

    return AdminDashboardResponse(
        selectedDate=selected_date.isoformat(),
        overview=overview,
        users=users[:PAGE_SIZE],
        totalRecords=len(users),
        page=1,
        pageSize=PAGE_SIZE,
    )


@router.get("/users/{user_id}", response_model=AdminUserDetailResponse)
def get_admin_user_detail(
    user_id: UUID,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminUserDetailResponse:
    del admin_user

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Khong tim thay user")

    usages = (
        db.query(LlmUsage)
        .options(selectinload(LlmUsage.details), selectinload(LlmUsage.article_parent))
        .filter(LlmUsage.user_id == user_id)
        .order_by(LlmUsage.created_at.desc())
        .all()
    )

    articles: list[AdminUserArticleItem] = []
    for usage in usages:
        article = usage.article_parent
        if article is None:
            continue
        articles.append(
            AdminUserArticleItem(
                articleId=str(article.id),
                title=article.title or f"Article {article.id}",
                createdAt=_as_iso(article.created_at),
                llmCalls=_call_count_from_usage(usage),
                totalTokens=_int_attr(usage, "total_tokens"),
                estimatedCostUsd=_dec_attr(usage, "total_cost_usd"),
            )
        )

    articles.sort(key=lambda item: item.createdAt, reverse=True)

    return AdminUserDetailResponse(
        userId=str(user.id),
        fullName=user.full_name or user.email or str(user.id),
        email=user.email or "",
        tier=(user.tier or "free"),
        totalArticles=len(articles),
        totalTokens=sum(item.totalTokens for item in articles),
        totalEstimatedCostUsd=sum(item.estimatedCostUsd for item in articles),
        totalLlmCalls=sum(item.llmCalls for item in articles),
        articles=articles,
    )


@router.get("/articles/{article_id}", response_model=AdminArticleDetailResponse)
def get_admin_article_detail(
    article_id: UUID,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminArticleDetailResponse:
    del admin_user

    usage = (
        db.query(LlmUsage)
        .options(selectinload(LlmUsage.details), selectinload(LlmUsage.article_parent))
        .filter(LlmUsage.article_id == article_id)
        .order_by(LlmUsage.created_at.desc())
        .first()
    )
    if usage is None or usage.article_parent is None:
        raise HTTPException(status_code=404, detail="Khong tim thay article usage")

    article = usage.article_parent
    steps: list[AdminArticleStepBreakdownItem] = []

    blueprint_latency = (_int_attr(usage, "blueprint_latency_ms") / 1000) if usage.blueprint_latency_ms else 0.0
    if _int_attr(usage, "blueprint_total_tokens") > 0:
        steps.append(
            AdminArticleStepBreakdownItem(
                stepKey="blueprint",
                label=usage.blueprint_label or "Tao bo cuc tong the",
                callCount=1,
                inputTokens=_int_attr(usage, "blueprint_input_tokens"),
                outputTokens=_int_attr(usage, "blueprint_output_tokens"),
                totalTokens=_int_attr(usage, "blueprint_total_tokens"),
                estimatedCostUsd=_dec_attr(usage, "blueprint_cost_usd"),
                averageLatencySeconds=blueprint_latency,
                modelName="gemini-3-flash-preview",
            )
        )

    for step_key in STEP_KEYS[1:]:
        relevant = [detail for detail in usage.details or [] if _int_attr(detail, f"{step_key}_total_tokens") > 0]
        if not relevant:
            continue
        latency_values = [
            _int_attr(detail, f"{step_key}_latency_ms") / 1000
            for detail in relevant
            if getattr(detail, f"{step_key}_latency_ms") is not None
        ]
        model_name = next(
            (
                str(getattr(detail, f"model_{step_key}") or "")
                for detail in relevant
                if str(getattr(detail, f"model_{step_key}") or "").strip()
            ),
            "gemini",
        )
        label = next(
            (
                str(getattr(detail, f"{step_key}_label") or "")
                for detail in relevant
                if str(getattr(detail, f"{step_key}_label") or "").strip()
            ),
            step_key,
        )
        steps.append(
            AdminArticleStepBreakdownItem(
                stepKey=step_key,
                label=label,
                callCount=len(relevant),
                inputTokens=sum(_int_attr(detail, f"{step_key}_input_tokens") for detail in relevant),
                outputTokens=sum(_int_attr(detail, f"{step_key}_output_tokens") for detail in relevant),
                totalTokens=sum(_int_attr(detail, f"{step_key}_total_tokens") for detail in relevant),
                estimatedCostUsd=sum(_dec_attr(detail, f"{step_key}_cost_usd") for detail in relevant),
                averageLatencySeconds=(sum(latency_values) / len(latency_values)) if latency_values else 0.0,
                modelName=model_name,
            )
        )

    model_labels = sorted(
        {
            step.modelName
            for step in steps
            if step.modelName.strip()
        }
    )

    return AdminArticleDetailResponse(
        articleId=str(article.id),
        articleTitle=article.title or f"Article {article.id}",
        status="Completed" if (usage.status or "").lower() == "completed" else "In Progress",
        totalTokens=_int_attr(usage, "total_tokens"),
        totalEstimatedCostUsd=_dec_attr(usage, "total_cost_usd"),
        totalLlmCalls=_call_count_from_usage(usage),
        modelLabels=model_labels,
        steps=steps,
    )
