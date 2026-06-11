from __future__ import annotations

import base64
import hashlib
import os

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.api_key import ManagedApiKey

LEGACY_ENV_BY_PROVIDER = {
    "gemini": "GOOGLE_API_KEY",
    "serper": "SERPER_API_KEY",
}


def mask_api_key(value: str | None) -> str:
    if not value:
        return ""
    cleaned = value.strip()
    if len(cleaned) <= 10:
        return "*" * len(cleaned)
    return f"{cleaned[:4]}...{cleaned[-4:]}"


def fingerprint_api_key(value: str) -> str:
    return hashlib.sha256(value.strip().encode("utf-8")).hexdigest()


def _fernet() -> Fernet:
    secret = (
        os.getenv("API_KEY_ENCRYPTION_SECRET")
        or os.getenv("SECRET_KEY")
        or "local-development-api-key-secret"
    )
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode("utf-8")).digest())
    return Fernet(key)


def encrypt_api_key(value: str) -> str:
    return _fernet().encrypt(value.strip().encode("utf-8")).decode("utf-8")


def decrypt_api_key(value: str) -> str:
    try:
        return _fernet().decrypt(value.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Không thể giải mã API key. Kiểm tra API_KEY_ENCRYPTION_SECRET.") from exc


def get_active_api_key(provider: str, db: Session | None = None) -> str:
    owns_session = db is None
    session = db or SessionLocal()
    try:
        try:
            record = (
                session.query(ManagedApiKey)
                .filter(ManagedApiKey.provider == provider, ManagedApiKey.is_active.is_(True))
                .order_by(ManagedApiKey.updated_at.desc(), ManagedApiKey.created_at.desc())
                .first()
            )
        except SQLAlchemyError:
            session.rollback()
            record = None
        if record is not None:
            return decrypt_api_key(str(record.encrypted_value))
        legacy_env = LEGACY_ENV_BY_PROVIDER.get(provider)
        return os.getenv(legacy_env, "") if legacy_env else ""
    finally:
        if owns_session:
            session.close()
