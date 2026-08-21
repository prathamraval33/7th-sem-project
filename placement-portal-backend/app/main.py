"""FastAPI application entrypoint — wires all routers, CORS, and a global
exception handler for a consistent JSON error shape.
"""
import logging
import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
import app.models  # noqa: F401
from app.routers import (
    admin,
    analytics,
    applications,
    auth,
    branches,
    contact,
    drives,
    fee_verification,
    insights,
    instant_test,
    mock_interview,
    notifications,
    resources,
    resume,
    resume_analyzer,
    resume_enhancer,
    student_profile,
    tpo,
    tpo_reports,
)
from app.utils.exceptions import AppError

logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Placement Portal API", version="1.0.0")

uploads_dir = os.path.join(os.getcwd(), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

FRONTEND_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    logger.warning("AppError on %s %s: %s", request.method, request.url.path, exc.message)
    return JSONResponse(
        status_code=400, 
        content={"detail": exc.message, "code": exc.code},
        headers={"Access-Control-Allow-Origin": "*"}
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code, 
        content={"detail": exc.detail, "code": "http_error"},
        headers={"Access-Control-Allow-Origin": "*"}
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500, 
        content={"detail": "Internal server error. Check backend console logs.", "code": "internal_error"},
        headers={"Access-Control-Allow-Origin": "*"}
    )


@app.get("/health", tags=["health"])
def health_check() -> dict:
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(branches.router)
app.include_router(student_profile.router)
app.include_router(resume.router)
app.include_router(fee_verification.router)
app.include_router(drives.router)
app.include_router(applications.router)
app.include_router(mock_interview.router)
app.include_router(resume_analyzer.router)
app.include_router(resume_enhancer.router)
app.include_router(instant_test.router)
app.include_router(resources.router)
app.include_router(notifications.router)
app.include_router(insights.router)
app.include_router(contact.router)
app.include_router(tpo.router)
app.include_router(tpo_reports.router)
app.include_router(admin.router)
app.include_router(analytics.router)
