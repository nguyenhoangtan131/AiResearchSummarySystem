import uuid
from sqlalchemy import Boolean, Column, UUID, String
from sqlalchemy.orm import relationship
from app.core.database import Base
class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), default=uuid.uuid4, primary_key=True, index=True)
    google_id = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    is_admin = Column(Boolean, default=False)
    articles = relationship("ResearchArticle", back_populates="owner")
    searches = relationship("SearchRequest", back_populates="owner")