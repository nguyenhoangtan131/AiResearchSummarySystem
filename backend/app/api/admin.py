from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, time, timedelta
from decimal import Decimal
import json
import os
from pathlib import Path
from typing import Iterable
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
import httpx
from google import genai
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.api_key import ManagedApiKey
from app.models.llm_usage import LlmUsage, LlmUsageDetail
from app.models.report_type import ReportType
from app.models.research import ResearchArticle
from app.models.user import User
from app.services.api_key_vault import (
    decrypt_api_key,
    encrypt_api_key,
    fingerprint_api_key,
    get_active_api_key,
    mask_api_key,
)
from app.schemas.admin import (
    AdminArticleDetailResponse,
    AdminArticleStepBreakdownItem,
    AdminApiKeyAddRequest,
    AdminApiKeyApplyRequest,
    AdminApiKeyGroup,
    AdminApiKeySettingsResponse,
    AdminApiKeyOperationResponse,
    AdminApiKeyTestRequest,
    AdminGeminiModelApplyRequest,
    AdminGeminiModelOperationResponse,
    AdminGeminiModelSettingsResponse,
    AdminGeminiModelStatus,
    AdminManagedApiKey,
    AdminReportTypeCreateRequest,
    AdminReportTypeItem,
    AdminReportTypeListResponse,
    AdminReportTypeOperationResponse,
    AdminReportTypeUpdateRequest,
    AdminDashboardOverview,
    AdminDashboardResponse,
    AdminDashboardUserItem,
    AdminUserArticleItem,
    AdminUserDetailResponse,
)
from app.services.report_type_service import seed_default_report_types

router = APIRouter()

PAGE_SIZE = 20
STEP_KEYS = ("blueprint", "title", "brief", "guide", "citation", "writing")
BACKEND_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE_PATH = BACKEND_ROOT / ".env"
DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview"
GEMINI_MODEL_ENV = "GEMINI_MODEL_NAME"
GEMINI_MODELS_ENV = "GEMINI_MODELS_JSON"
API_KEY_GROUPS = {
    "gemini": {
        "label": "Gemini API key",
        "description": "Dùng cho tạo bố cục, gợi ý chương, viết nội dung và sinh bài hoàn chỉnh.",
        "legacy_env": "GOOGLE_API_KEY",
        "project_envs": ("GEMINI_PROJECT_ID", "GOOGLE_CLOUD_PROJECT", "GOOGLE_PROJECT_NUMBER"),
    },
    "serper": {
        "label": "Serper API key",
        "description": "Dùng cho bước tìm nguồn, trích dẫn và tài liệu học thuật.",
        "legacy_env": "SERPER_API_KEY",
    },
}


def _read_env_values() -> dict[str, str]:
    values: dict[str, str] = {}
    if not ENV_FILE_PATH.exists():
        return values

    for raw_line in ENV_FILE_PATH.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def _write_env_values(updates: dict[str, str]) -> dict[str, str]:
    existing_lines = ENV_FILE_PATH.read_text(encoding="utf-8").splitlines() if ENV_FILE_PATH.exists() else []
    seen: set[str] = set()
    next_lines: list[str] = []

    for raw_line in existing_lines:
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            next_lines.append(raw_line)
            continue

        key, _ = stripped.split("=", 1)
        key = key.strip()
        if key in updates:
            next_lines.append(f"{key}={updates[key]}")
            seen.add(key)
        else:
            next_lines.append(raw_line)

    for key, value in updates.items():
        if key not in seen:
            next_lines.append(f"{key}={value}")

    ENV_FILE_PATH.write_text("\n".join(next_lines) + "\n", encoding="utf-8")
    for key, value in updates.items():
        os.environ[key] = value
    return _read_env_values()


def _parse_model_dict(raw_value: str | None) -> dict[str, dict[str, object]]:
    if not raw_value:
        return {}
    try:
        parsed = json.loads(raw_value)
    except json.JSONDecodeError:
        return {}
    if not isinstance(parsed, dict):
        return {}

    result: dict[str, dict[str, object]] = {}
    for key, value in parsed.items():
        if isinstance(value, dict):
            result[str(key)] = dict(value)
    return result


def _group_config(provider: str) -> dict[str, str]:
    if provider not in API_KEY_GROUPS:
        raise HTTPException(status_code=404, detail="Provider không được hỗ trợ.")
    return API_KEY_GROUPS[provider]


def _is_real_legacy_key(value: str) -> bool:
    cleaned = value.strip()
    if not cleaned or cleaned.startswith("your_"):
        return False
    return len(cleaned) >= 12


def _seed_legacy_provider_key(db: Session, provider: str) -> None:
    config = _group_config(provider)
    has_records = db.query(ManagedApiKey.id).filter(ManagedApiKey.provider == provider).first()
    if has_records:
        return

    env_values = _read_env_values()
    legacy_env = str(config.get("legacy_env") or "")
    legacy_value = env_values.get(legacy_env) or os.getenv(legacy_env, "")
    if not _is_real_legacy_key(legacy_value):
        return

    cleaned = legacy_value.strip()
    db.add(
        ManagedApiKey(
            provider=provider,
            encrypted_value=encrypt_api_key(cleaned),
            masked_value=mask_api_key(cleaned),
            fingerprint=fingerprint_api_key(cleaned),
            is_active=True,
            status="valid",
            last_tested_at=datetime.utcnow(),
        )
    )
    db.commit()


def _get_provider_key_record(db: Session, provider: str, key_id: str) -> ManagedApiKey:
    try:
        record_id = UUID(key_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Không tìm thấy key.") from exc

    record = (
        db.query(ManagedApiKey)
        .filter(ManagedApiKey.id == record_id, ManagedApiKey.provider == provider)
        .first()
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy key.")
    return record


def _build_api_key_groups(db: Session) -> list[AdminApiKeyGroup]:
    env_values = _read_env_values()
    groups: list[AdminApiKeyGroup] = []
    for provider, config in API_KEY_GROUPS.items():
        _seed_legacy_provider_key(db, provider)
        records = (
            db.query(ManagedApiKey)
            .filter(ManagedApiKey.provider == provider)
            .order_by(ManagedApiKey.created_at.asc(), ManagedApiKey.id.asc())
            .all()
        )
        active_id = next((str(record.id) for record in records if record.is_active), None)
        project_code = None
        for env_key in config.get("project_envs", ()):
            candidate = env_values.get(env_key) or os.getenv(env_key, "")
            if candidate.strip():
                project_code = candidate.strip()
                break
        groups.append(
            AdminApiKeyGroup(
                provider=provider,  # type: ignore[arg-type]
                label=config["label"],
                description=config["description"],
                activeKeyId=active_id,
                projectCode=project_code,
                keys=[
                    AdminManagedApiKey(
                        id=str(record.id),
                        maskedValue=record.masked_value,
                        active=bool(record.is_active),
                    )
                    for record in records
                ],
            )
        )
    return groups


def _test_gemini_key(api_key: str) -> None:
    model_name = os.getenv(GEMINI_MODEL_ENV, DEFAULT_GEMINI_MODEL)
    client = genai.Client(api_key=api_key)
    client.models.generate_content(
        model=model_name,
        contents="Return exactly: ok",
    )


def _test_serper_key(api_key: str) -> None:
    response = httpx.post(
        "https://google.serper.dev/search",
        headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
        json={"q": "test", "num": 1},
        timeout=10,
    )
    response.raise_for_status()


def _test_provider_key(provider: str, api_key: str) -> None:
    if not api_key.strip():
        raise ValueError("API key đang trống.")
    if provider == "gemini":
        _test_gemini_key(api_key.strip())
        return
    if provider == "serper":
        _test_serper_key(api_key.strip())
        return
    raise ValueError("Provider không được hỗ trợ.")


def _key_failure_message(exc: Exception) -> str:
    text = str(exc).lower()
    invalid_markers = (
        "api_key_invalid",
        "api key not valid",
        "invalid_argument",
        "401",
        "403",
        "unauthorized",
        "forbidden",
    )
    if any(marker in text for marker in invalid_markers):
        return "Key không hợp lệ."
    return "Không thể kiểm tra key lúc này."


def _normalize_model_name(value: str) -> str:
    cleaned = value.strip()
    return cleaned.removeprefix("models/")


def _model_failure_reason(exc: Exception) -> str:
    text = str(exc).lower()
    if "quota" in text or "429" in text or "resource_exhausted" in text:
        return "Hết hạn mức hoặc chưa có quota cho model này."
    if "not found" in text or "404" in text:
        return "Model không tồn tại hoặc chưa mở cho project này."
    if "permission" in text or "403" in text or "unauthorized" in text or "401" in text:
        return "Project hoặc key chưa có quyền dùng model này."
    return "Model chưa khả dụng với key hiện tại."


def _get_active_gemini_api_key() -> str:
    return get_active_api_key("gemini")


def _read_gemini_model_dict(values: dict[str, str] | None = None) -> dict[str, dict[str, object]]:
    env_values = values or _read_env_values()
    models = _parse_model_dict(env_values.get(GEMINI_MODELS_ENV) or os.getenv(GEMINI_MODELS_ENV))
    models.setdefault(
        DEFAULT_GEMINI_MODEL,
        {
            "displayName": DEFAULT_GEMINI_MODEL,
            "isAvailable": False,
            "reason": "Chưa kiểm tra model.",
            "lastCheckedAt": None,
        },
    )
    return models


def _build_gemini_model_settings(values: dict[str, str] | None = None) -> AdminGeminiModelSettingsResponse:
    env_values = values or _read_env_values()
    active_model = env_values.get(GEMINI_MODEL_ENV) or os.getenv(GEMINI_MODEL_ENV, DEFAULT_GEMINI_MODEL)
    models = _read_gemini_model_dict(env_values)
    items = [
        AdminGeminiModelStatus(
            name=name,
            displayName=str(meta.get("displayName") or name),
            isAvailable=bool(meta.get("isAvailable")),
            active=name == active_model,
            reason=str(meta.get("reason") or "") or None,
            lastCheckedAt=str(meta.get("lastCheckedAt") or "") or None,
        )
        for name, meta in models.items()
    ]
    items.sort(key=lambda item: (not item.isAvailable, item.name))
    return AdminGeminiModelSettingsResponse(
        activeModel=active_model,
        defaultModel=DEFAULT_GEMINI_MODEL,
        models=items,
    )


def _get_active_gemini_model_name(values: dict[str, str] | None = None) -> str:
    env_values = values or _read_env_values()
    return env_values.get(GEMINI_MODEL_ENV) or os.getenv(GEMINI_MODEL_ENV, DEFAULT_GEMINI_MODEL)


def _persist_gemini_models(models: dict[str, dict[str, object]], active_model: str | None = None) -> dict[str, str]:
    updates = {
        GEMINI_MODELS_ENV: json.dumps(models, ensure_ascii=False),
    }
    if active_model:
        updates[GEMINI_MODEL_ENV] = active_model
    return _write_env_values(updates)


def _refresh_gemini_models() -> dict[str, str]:
    api_key = _get_active_gemini_api_key()
    if not api_key.strip():
        raise ValueError("Chưa có Gemini API key đang áp dụng.")

    checked_at = datetime.utcnow().isoformat()
    client = genai.Client(api_key=api_key)
    current_models = _read_gemini_model_dict()

    discovered: dict[str, dict[str, object]] = {}
    for model in client.models.list():
        raw_name = str(getattr(model, "name", "") or "")
        name = _normalize_model_name(raw_name)
        if not name:
            continue
        display_name = str(getattr(model, "display_name", "") or getattr(model, "displayName", "") or name)
        discovered[name] = {
            "displayName": display_name,
            "isAvailable": False,
            "reason": "Đã tìm thấy model, đang chờ kiểm tra hạn mức.",
            "lastCheckedAt": checked_at,
        }

    if DEFAULT_GEMINI_MODEL not in discovered:
        discovered[DEFAULT_GEMINI_MODEL] = {
            "displayName": DEFAULT_GEMINI_MODEL,
            "isAvailable": False,
            "reason": "Model mặc định chưa xuất hiện trong danh sách Google trả về.",
            "lastCheckedAt": checked_at,
        }

    for name, meta in current_models.items():
        discovered.setdefault(
            name,
            {
                "displayName": str(meta.get("displayName") or name),
                "isAvailable": False,
                "reason": "Không còn xuất hiện trong danh sách model hiện tại.",
                "lastCheckedAt": checked_at,
            },
        )

    for name, meta in discovered.items():
        try:
            client.models.generate_content(model=name, contents="Return exactly: ok")
            meta["isAvailable"] = True
            meta["reason"] = "Model khả dụng với key và quota hiện tại."
        except Exception as exc:
            meta["isAvailable"] = False
            meta["reason"] = _model_failure_reason(exc)
        meta["lastCheckedAt"] = checked_at

    active_model = os.getenv(GEMINI_MODEL_ENV, DEFAULT_GEMINI_MODEL)
    if active_model not in discovered:
        active_model = DEFAULT_GEMINI_MODEL
    return _persist_gemini_models(discovered, active_model)


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


def _report_type_items(db: Session) -> list[AdminReportTypeItem]:
    seed_default_report_types(db)
    rows = (
        db.query(ReportType)
        .filter(ReportType.is_active.is_(True))
        .order_by(ReportType.sort_order.asc(), ReportType.name.asc())
        .all()
    )
    return [
        AdminReportTypeItem(
            id=str(row.id),
            name=str(row.name),
            sortOrder=int(row.sort_order or 0),
        )
        for row in rows
    ]


def _normalize_report_type_name(value: str) -> str:
    cleaned = " ".join(value.strip().split())
    if len(cleaned) < 3:
        raise HTTPException(status_code=400, detail="Tên thể loại phải có ít nhất 3 ký tự.")
    if len(cleaned) > 120:
        raise HTTPException(status_code=400, detail="Tên thể loại không được vượt quá 120 ký tự.")
    return cleaned


def _get_report_type_record(db: Session, report_type_id: UUID) -> ReportType:
    record = (
        db.query(ReportType)
        .filter(ReportType.id == report_type_id, ReportType.is_active.is_(True))
        .first()
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy thể loại.")
    return record


@router.get("/report-types", response_model=AdminReportTypeListResponse)
def get_admin_report_types(
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminReportTypeListResponse:
    del admin_user
    return AdminReportTypeListResponse(reportTypes=_report_type_items(db))


@router.post("/report-types", response_model=AdminReportTypeOperationResponse)
def create_admin_report_type(
    payload: AdminReportTypeCreateRequest,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminReportTypeOperationResponse:
    del admin_user
    name = _normalize_report_type_name(payload.name)
    existing = db.query(ReportType).filter(ReportType.name == name).first()
    if existing and existing.is_active:
        raise HTTPException(status_code=409, detail="Thể loại này đã tồn tại.")

    next_order = payload.sortOrder
    if next_order is None:
        current_max = db.query(ReportType).order_by(ReportType.sort_order.desc()).first()
        next_order = int(current_max.sort_order or 0) + 1 if current_max else 1

    if existing:
        existing.is_active = True
        existing.sort_order = next_order
    else:
        db.add(ReportType(name=name, sort_order=next_order, is_active=True))
    db.commit()
    return AdminReportTypeOperationResponse(
        message="Đã thêm thể loại.",
        ok=True,
        reportTypes=_report_type_items(db),
    )


@router.put("/report-types/{report_type_id}", response_model=AdminReportTypeOperationResponse)
def update_admin_report_type(
    report_type_id: UUID,
    payload: AdminReportTypeUpdateRequest,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminReportTypeOperationResponse:
    del admin_user
    record = _get_report_type_record(db, report_type_id)
    name = _normalize_report_type_name(payload.name)
    duplicate = (
        db.query(ReportType)
        .filter(ReportType.name == name, ReportType.id != report_type_id, ReportType.is_active.is_(True))
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Thể loại này đã tồn tại.")

    record.name = name
    if payload.sortOrder is not None:
        record.sort_order = payload.sortOrder
    db.commit()
    return AdminReportTypeOperationResponse(
        message="Đã cập nhật thể loại.",
        ok=True,
        reportTypes=_report_type_items(db),
    )


@router.delete("/report-types/{report_type_id}", response_model=AdminReportTypeOperationResponse)
def delete_admin_report_type(
    report_type_id: UUID,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminReportTypeOperationResponse:
    del admin_user
    record = _get_report_type_record(db, report_type_id)
    db.delete(record)
    db.commit()
    return AdminReportTypeOperationResponse(
        message="Đã xóa thể loại.",
        ok=True,
        reportTypes=_report_type_items(db),
    )


@router.get("/api-keys", response_model=AdminApiKeySettingsResponse)
def get_admin_api_keys(
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminApiKeySettingsResponse:
    del admin_user
    return AdminApiKeySettingsResponse(groups=_build_api_key_groups(db))


@router.post("/api-keys/{provider}/test", response_model=AdminApiKeyOperationResponse)
def test_admin_api_key(
    provider: str,
    payload: AdminApiKeyTestRequest,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminApiKeyOperationResponse:
    del admin_user
    api_key = (payload.apiKey or "").strip()
    if not api_key and payload.keyId:
        record = _get_provider_key_record(db, provider, payload.keyId)
        api_key = decrypt_api_key(str(record.encrypted_value))

    try:
        _test_provider_key(provider, api_key)
        if payload.keyId:
            record = _get_provider_key_record(db, provider, payload.keyId)
            record.status = "valid"
            record.last_tested_at = datetime.utcnow()
            db.commit()
    except Exception as exc:
        if payload.keyId:
            record = _get_provider_key_record(db, provider, payload.keyId)
            record.status = "invalid"
            record.last_tested_at = datetime.utcnow()
            db.commit()
        return AdminApiKeyOperationResponse(
            message=_key_failure_message(exc),
            ok=False,
            groups=_build_api_key_groups(db),
        )

    return AdminApiKeyOperationResponse(
        message="Key có thể dùng.",
        ok=True,
        groups=_build_api_key_groups(db),
    )


@router.post("/api-keys/{provider}/add", response_model=AdminApiKeyOperationResponse)
def add_admin_api_key(
    provider: str,
    payload: AdminApiKeyAddRequest,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminApiKeyOperationResponse:
    del admin_user
    _group_config(provider)
    api_key = payload.apiKey.strip()
    try:
        _test_provider_key(provider, api_key)
    except Exception as exc:
        return AdminApiKeyOperationResponse(
            message=_key_failure_message(exc),
            ok=False,
            groups=_build_api_key_groups(db),
        )

    key_fingerprint = fingerprint_api_key(api_key)
    existing = (
        db.query(ManagedApiKey)
        .filter(ManagedApiKey.provider == provider, ManagedApiKey.fingerprint == key_fingerprint)
        .first()
    )
    has_active = (
        db.query(ManagedApiKey.id)
        .filter(ManagedApiKey.provider == provider, ManagedApiKey.is_active.is_(True))
        .first()
        is not None
    )
    if existing is None:
        db.add(
            ManagedApiKey(
                provider=provider,
                encrypted_value=encrypt_api_key(api_key),
                masked_value=mask_api_key(api_key),
                fingerprint=key_fingerprint,
                is_active=not has_active,
                status="valid",
                last_tested_at=datetime.utcnow(),
            )
        )
    else:
        existing.status = "valid"
        existing.last_tested_at = datetime.utcnow()
        if not has_active:
            existing.is_active = True
    db.commit()
    return AdminApiKeyOperationResponse(
        message="Đã test và thêm key hợp lệ vào danh sách.",
        ok=True,
        groups=_build_api_key_groups(db),
    )


@router.post("/api-keys/{provider}/apply", response_model=AdminApiKeyOperationResponse)
def apply_admin_api_key(
    provider: str,
    payload: AdminApiKeyApplyRequest,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminApiKeyOperationResponse:
    del admin_user
    record = _get_provider_key_record(db, provider, payload.keyId)
    api_key = decrypt_api_key(str(record.encrypted_value))

    try:
        _test_provider_key(provider, api_key)
    except Exception as exc:
        record.status = "invalid"
        record.last_tested_at = datetime.utcnow()
        db.commit()
        return AdminApiKeyOperationResponse(
            message=_key_failure_message(exc),
            ok=False,
            groups=_build_api_key_groups(db),
        )

    (
        db.query(ManagedApiKey)
        .filter(ManagedApiKey.provider == provider)
        .update({"is_active": False}, synchronize_session=False)
    )
    record.is_active = True
    record.status = "valid"
    record.last_tested_at = datetime.utcnow()
    db.commit()
    return AdminApiKeyOperationResponse(
        message="Key có thể dùng và đã được áp dụng cho hệ thống.",
        ok=True,
        groups=_build_api_key_groups(db),
    )


@router.get("/gemini-models", response_model=AdminGeminiModelSettingsResponse)
def get_admin_gemini_models(
    admin_user: User = Depends(get_current_admin),
) -> AdminGeminiModelSettingsResponse:
    del admin_user
    return _build_gemini_model_settings()


@router.post("/gemini-models/refresh", response_model=AdminGeminiModelOperationResponse)
def refresh_admin_gemini_models(
    admin_user: User = Depends(get_current_admin),
) -> AdminGeminiModelOperationResponse:
    del admin_user
    try:
        values = _refresh_gemini_models()
    except Exception as exc:
        settings = _build_gemini_model_settings()
        return AdminGeminiModelOperationResponse(
            message=f"Không thể kiểm tra model: {exc}",
            ok=False,
            activeModel=settings.activeModel,
            defaultModel=settings.defaultModel,
            models=settings.models,
        )

    settings = _build_gemini_model_settings(values)
    return AdminGeminiModelOperationResponse(
        message="Đã kiểm tra và cập nhật danh sách model khả dụng.",
        ok=True,
        activeModel=settings.activeModel,
        defaultModel=settings.defaultModel,
        models=settings.models,
    )


@router.post("/gemini-models/apply", response_model=AdminGeminiModelOperationResponse)
def apply_admin_gemini_model(
    payload: AdminGeminiModelApplyRequest,
    admin_user: User = Depends(get_current_admin),
) -> AdminGeminiModelOperationResponse:
    del admin_user
    model_name = payload.modelName.strip()
    models = _read_gemini_model_dict()
    model = models.get(model_name)
    if not model or not bool(model.get("isAvailable")):
        settings = _build_gemini_model_settings()
        return AdminGeminiModelOperationResponse(
            message="Model này chưa khả dụng nên chưa thể áp dụng.",
            ok=False,
            activeModel=settings.activeModel,
            defaultModel=settings.defaultModel,
            models=settings.models,
        )

    values = _write_env_values({GEMINI_MODEL_ENV: model_name})
    settings = _build_gemini_model_settings(values)
    return AdminGeminiModelOperationResponse(
        message="Đã áp dụng model cho hệ thống.",
        ok=True,
        activeModel=settings.activeModel,
        defaultModel=settings.defaultModel,
        models=settings.models,
    )


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
    active_gemini_model = _get_active_gemini_model_name()

    blueprint_latency = (_int_attr(usage, "blueprint_latency_ms") / 1000) if usage.blueprint_latency_ms else 0.0
    if _int_attr(usage, "blueprint_total_tokens") > 0:
        steps.append(
            AdminArticleStepBreakdownItem(
                stepKey="blueprint",
                label=usage.blueprint_label or "Tạo bố cục tổng thể",
                callCount=1,
                inputTokens=_int_attr(usage, "blueprint_input_tokens"),
                outputTokens=_int_attr(usage, "blueprint_output_tokens"),
                totalTokens=_int_attr(usage, "blueprint_total_tokens"),
                estimatedCostUsd=_dec_attr(usage, "blueprint_cost_usd"),
                averageLatencySeconds=blueprint_latency,
                modelName=active_gemini_model,
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
