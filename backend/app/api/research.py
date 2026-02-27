from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.research_service import PromptService, ResearchService
from pydantic import BaseModel, Field
from app.services.writing_service import WritingService
from app.models.research import ResearchArticle, ResearchSource
from sqlalchemy.orm import selectinload
from app.core.security import get_current_user
import re
router = APIRouter()

class ResearchInput(BaseModel):
    raw_input: str

@router.post("/prompt")
async def prompt_research(
    request: ResearchInput,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = PromptService(db, user_id)
    return await service.architect_research_plan(request.raw_input)

@router.post("/search/{search_id}")
async def execute_research_search(
    search_id: UUID,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = ResearchService(db)
    try:
        sources_found = await service.fetch_and_save_sources(search_id)
        return {
            "status": "success",
            "search_id": search_id,
            "sources_count": sources_found,
            "message": f"Đã thu thập thành công {sources_found} nguồn dữ liệu thô."
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
    

class WritingResponse(BaseModel):
    article_id: UUID
    message: str = Field(default="Bài nghiên cứu đã được tạo và trích dẫn thành công!")

@router.post("/generate-article/{search_id}", response_model= WritingResponse)
async def generate_research_article(
    search_id: UUID, 
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = WritingService(db, search_id,user_id)
    try:
        article_id = await service.write_full_research_article_pipline()
        return WritingResponse(article_id=article_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get("/article/{article_id}")
async def get_article(
    article_id: UUID,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    article_stmt = select(ResearchArticle).where(ResearchArticle.id == article_id).options(selectinload(ResearchArticle.sections))
    article = db.execute(article_stmt).scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài báo")

    return {
        "title": article.title,
        "sections": [
            {
                "title": section.section_title,
                "content": section.section_content,
                "order": section.order
            } for section in article.sections
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
    """
    Docstring for get_source
    
    why this logic:
    - Using found_uid_list for fetch out sources in order 1,2,3,...
    instead of using found_uuids and loop  query db for N(source) times which causes high latency and 
    avoid N+1 Query Problem
    """
    article_stmt = select(
        ResearchArticle).where(
            ResearchArticle.id == article_id,ResearchArticle.user_id==UUID(user_id)).options(selectinload(ResearchArticle.sections))
    article = db.execute(article_stmt).scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài báo")
    
    full_content = " ".join([section.section_content for section in article.sections])
    found_uuids = re.findall(r"\[Source ID: ([a-f0-9-]{36})\]", full_content)

    found_uid_list = []
    for uid in found_uuids:
        if uid not in found_uid_list:
            found_uid_list.append(uid)

    source_stmt = select(ResearchSource).where(ResearchSource.search_id == article.search_id, ResearchSource.is_cited == True)
    all_cited_sources = db.execute(source_stmt).scalars().all()

    cited_source_map = {str(cited_source.id): cited_source for cited_source in all_cited_sources}

    final_source_list = []
    for uid in found_uid_list:
        if uid in cited_source_map:
            final_source_list.append(cited_source_map[uid])

    return {
        "article_id": article_id,
        "total_sources": len(final_source_list),
        "sources": final_source_list
    }

@router.get("/articles")
async def get_all_history(db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    stmt = select(ResearchArticle).where(ResearchArticle.user_id == UUID(user_id)).order_by(ResearchArticle.id.desc())
    articles = db.execute(stmt).scalars().all()
    
    return [
        {
            "id": article.id,
            "title": article.title,
        } for article in articles
    ]