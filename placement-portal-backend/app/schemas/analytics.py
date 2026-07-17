"""Schemas for the `analytics` table. This entity is entirely system-
computed (scoring.py, Phase 3) — Create/Update exist for internal service
use only; no router accepts these as a public request body.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AnalyticsCreate(BaseModel):
    user_id: Optional[int] = None
    total_applications: int = 0
    interviews_taken: int = 0
    avg_score: Optional[float] = None
    readiness_score: Optional[float] = None


class AnalyticsUpdate(BaseModel):
    total_applications: Optional[int] = None
    interviews_taken: Optional[int] = None
    avg_score: Optional[float] = None
    readiness_score: Optional[float] = None


class AnalyticsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    total_applications: int
    interviews_taken: int
    avg_score: Optional[float] = None
    readiness_score: Optional[float] = None
    updated_at: datetime
