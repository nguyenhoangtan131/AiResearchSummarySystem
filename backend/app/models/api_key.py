import uuid

from sqlalchemy import Boolean, Column, DateTime, String, Text, UniqueConstraint, UUID, func

from app.core.database import Base


class ManagedApiKey(Base):
    __tablename__ = "managed_api_keys"
    __table_args__ = (
        UniqueConstraint("provider", "fingerprint", name="uq_managed_api_keys_provider_fingerprint"),
    )

    id = Column(UUID(as_uuid=True), default=uuid.uuid4, primary_key=True, index=True)
    provider = Column(String(30), nullable=False, index=True)
    encrypted_value = Column(Text, nullable=False)
    masked_value = Column(String(120), nullable=False)
    fingerprint = Column(String(64), nullable=False)
    is_active = Column(Boolean, nullable=False, default=False, server_default="false")
    status = Column(String(30), nullable=False, default="valid", server_default="valid")
    last_tested_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
