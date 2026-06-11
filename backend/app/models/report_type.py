import uuid

from sqlalchemy import Boolean, Column, DateTime, Integer, String, UUID, func

from app.core.database import Base


class ReportType(Base):
    __tablename__ = "report_types"

    id = Column(UUID(as_uuid=True), default=uuid.uuid4, primary_key=True, index=True)
    name = Column(String(120), nullable=False, unique=True, index=True)
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
