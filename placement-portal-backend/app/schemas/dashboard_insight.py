"""Schemas for the `dashboard_insights` table + the combined Live Career
Insights response (internal drives merged with the cached external/AI data
at request time — see web_insights_service.py, Phase 3).
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.drive import DriveResponse


class DashboardInsightCreate(BaseModel):
    """Internal, service-facing — written once per student per day by the
    external+Groq pipeline.
    """

    user_id: int
    external_opportunities: list[dict] = []
    resume_suggestions: list[dict] = []
    trending_skills: list[str] = []


class DashboardInsightUpdate(BaseModel):
    external_opportunities: Optional[list[dict]] = None
    resume_suggestions: Optional[list[dict]] = None
    trending_skills: Optional[list[str]] = None
    last_manual_refresh_at: Optional[datetime] = None


class DashboardInsightResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    external_opportunities: list[dict] = []
    resume_suggestions: list[dict] = []
    trending_skills: list[str] = []
    generated_at: datetime
    last_manual_refresh_at: Optional[datetime] = None


class InsightsDashboardResponse(BaseModel):
    """GET /insights/dashboard — internal drives (fetched fresh, no AI) and
    the cached external/AI sections, kept clearly separate per the master
    prompt (never blended as if both came from the same source).
    """

    internal_drives: list[DriveResponse] = []
    external_opportunities: list[dict] = []
    resume_suggestions: list[dict] = []
    trending_skills: list[str] = []
