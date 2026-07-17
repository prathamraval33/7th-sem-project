"""Schemas for the `resumes` table."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.resume import ResumeSource


class ResumeCreate(BaseModel):
    """Internal, service-facing — the upload endpoint takes a multipart
    file; the service builds this after saving it and extracting text.
    """

    user_id: int
    file_path: str
    source: ResumeSource


class ResumeUpdate(BaseModel):
    """"Make active" toggle — only one resume may be active at a time,
    enforced by the service layer, not this schema.
    """

    is_active: bool


class ResumeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    file_path: str
    parsed_text: Optional[str] = None
    ai_score: Optional[float] = None
    ai_feedback: Optional[str] = None
    source: ResumeSource
    is_active: bool
    created_at: datetime
