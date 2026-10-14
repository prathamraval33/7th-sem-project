"""Pydantic schemas for fee gate configuration and administrative statistics."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class FeeGateConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    college_id: int
    browse_drives: bool
    apply_to_drives: bool
    official_tests: bool
    practice_tests: bool
    mock_interview_gen: bool
    mock_interview_drive: bool
    resume_analyzer: bool
    resume_enhancer: bool
    career_insights: bool
    verification_deadline: Optional[datetime] = None
    updated_at: datetime
    updated_by: Optional[int] = None
    updated_by_name: Optional[str] = None


class FeeGateConfigUpdate(BaseModel):
    browse_drives: Optional[bool] = None
    apply_to_drives: Optional[bool] = None
    official_tests: Optional[bool] = None
    practice_tests: Optional[bool] = None
    mock_interview_gen: Optional[bool] = None
    mock_interview_drive: Optional[bool] = None
    resume_analyzer: Optional[bool] = None
    resume_enhancer: Optional[bool] = None
    career_insights: Optional[bool] = None
    verification_deadline: Optional[datetime] = None
    clear_deadline: Optional[bool] = False


class FeeGateStatsResponse(BaseModel):
    total_students: int
    verified_count: int
    pending_review_count: int
    rejected_count: int
    unsubmitted_count: int
