from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import Base  
from app.core.database import engine
from app.models import research as model
from app.api import research
Base.metadata.create_all(bind=engine)

app=FastAPI(
    title="AIResearchSummarySystem",
    description="Hệ thống tạo tổng quan đề tài nghiên cứu khoa học",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(
    research.router,
    prefix="/api/research",
    tags=["Research"]
)