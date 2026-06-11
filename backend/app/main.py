from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from app.core.database import Base  
from app.core.database import engine
from app.api import auth
from app.api import admin
from app.api import research
from app.routes import advanced
Base.metadata.create_all(bind=engine)

default_allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
]
allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
] or default_allowed_origins

app=FastAPI(
    title="AIResearchSummarySystem",
    description="Hệ thống tạo tổng quan đề tài nghiên cứu khoa học",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(
    auth.router,
    prefix="/api/auth",
    tags=["Auth"]
)

app.include_router(
    research.router,
    prefix="/api/research",
    tags=["Research"]
)

app.include_router(
    advanced.router,
    prefix="/api/advanced",
    tags=["Advanced"]
)

app.include_router(
    admin.router,
    prefix="/api/admin",
    tags=["Admin"]
)
