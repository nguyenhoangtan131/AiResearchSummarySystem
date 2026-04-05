from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from pydantic import BaseModel
from app.models.research import ResearchArticle
from sqlalchemy.orm import selectinload
from app.core.security import get_current_user

from app.services.export_service import ExportService
from app.services.advanced.article_formatter import AdvancedArticleFormatter
router = APIRouter()

@router.get("/article/{article_id}")
async def get_article(
    article_id: UUID,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    article_stmt = (
        select(ResearchArticle)
        .where(
            ResearchArticle.id == article_id,
            ResearchArticle.user_id == UUID(user_id),
        )
        .options(selectinload(ResearchArticle.chapters))
    )
    article = db.execute(article_stmt).scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài báo")

    ordered_chapters = [
        chapter
        for chapter in sorted(article.chapters, key=lambda item: item.chapter_number or 0)
        if (chapter.generated_content or "").strip()
    ]
    return {
        "title": article.title,
        "sections": [
            {
                "title": AdvancedArticleFormatter.normalize_section_title(
                    chapter.chapter_title or f"Phần {index}"
                ),
                "content": chapter.generated_content,
                "order": chapter.chapter_number,
            }
            for index, chapter in enumerate(ordered_chapters, start=1)
        ]
    }


class SourceItem(BaseModel):
    id: UUID
    publication: Optional[str] = None
    title: str
    link: Optional[str] = None
    year: Optional[int] = None
    citation_count: int

    class Config:
        from_attributes = True

class SourceResponse(BaseModel):
    article_id: UUID
    total_sources: int
    sources: List[SourceItem]

@router.get("/source/{article_id}", response_model=SourceResponse)
async def get_source(
    article_id: UUID, 
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)):

    article_stmt = select(
        ResearchArticle).where(
            ResearchArticle.id == article_id,ResearchArticle.user_id==UUID(user_id)).options(selectinload(ResearchArticle.chapters))
    article = db.execute(article_stmt).scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài báo")

    export_service = ExportService(db)
    final_source_list = export_service.make_up_citation(article)
    return {
        "article_id": article_id,
        "total_sources": len(final_source_list),
        "sources": final_source_list
    }

@router.get("/articles")
async def get_all_history(db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    stmt = (
        select(ResearchArticle)
        .where(ResearchArticle.user_id == UUID(user_id))
        .order_by(ResearchArticle.created_at.desc(), ResearchArticle.id.desc())
    )
    articles = db.execute(stmt).scalars().all()
    
    return [
        {
            "id": article.id,
            "title": article.title,
            "created_at": article.created_at,
            "updated_at": article.updated_at,
        } for article in articles
    ]

@router.get("/export/pdf/{article_id}")
async def export_article_pdf(
    article_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user)
):
    article = db.query(ResearchArticle).filter(
        ResearchArticle.id == article_id, 
        ResearchArticle.user_id == user_id
    ).options(selectinload(ResearchArticle.chapters)).first()

    if not article:
        raise HTTPException(status_code=404, detail="Bài viết không tồn tại!")

    export_service = ExportService(db)
    export_service.make_up_citation(article)
    
    pdf_buffer = export_service.generate_article_pdf(article.title)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Research_{article_id}.pdf"}
    )
