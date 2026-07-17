"""Schemas for the `profiles` table (student-only academic/skill profile)."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ProfileCreate(BaseModel):
    """POST /student/profile — onboarding. `student_id` is deliberately
    excluded: it's auto-derived from the verified email prefix, never
    client-supplied.
    """

    full_name: str = Field(min_length=1, max_length=255)
    branch: str = Field(min_length=1, max_length=100)
    cgpa: float = Field(ge=0, le=10)
    active_backlogs: int = Field(ge=0, default=0)
    tenth_percentage: float = Field(ge=0, le=100)
    twelfth_percentage: float = Field(ge=0, le=100)
    competitive_exam_name: Optional[str] = None
    competitive_exam_percentile: Optional[float] = Field(default=None, ge=0, le=100)
    skills: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def check_percentile_requires_exam_name(self) -> "ProfileCreate":
        if self.competitive_exam_percentile is not None and not self.competitive_exam_name:
            raise ValueError("competitive_exam_name is required when competitive_exam_percentile is provided")
        return self


class ProfileUpdate(BaseModel):
    """Student-facing partial update of their own editable profile fields."""

    full_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    branch: Optional[str] = Field(default=None, min_length=1, max_length=100)
    cgpa: Optional[float] = Field(default=None, ge=0, le=10)
    active_backlogs: Optional[int] = Field(default=None, ge=0)
    tenth_percentage: Optional[float] = Field(default=None, ge=0, le=100)
    twelfth_percentage: Optional[float] = Field(default=None, ge=0, le=100)
    competitive_exam_name: Optional[str] = None
    competitive_exam_percentile: Optional[float] = Field(default=None, ge=0, le=100)
    skills: Optional[list[str]] = None


class ProfilePlacementOverrideUpdate(BaseModel):
    """TPO/Admin-only action — "Allow dream company applications"."""

    placement_lock_override: bool


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    student_id: str
    full_name: str
    branch: str
    cgpa: float
    active_backlogs: int
    tenth_percentage: float
    twelfth_percentage: float
    competitive_exam_name: Optional[str] = None
    competitive_exam_percentile: Optional[float] = None
    skills: list[str] = Field(default_factory=list)
    is_placed: bool
    placement_lock_override: bool
    created_at: datetime
    updated_at: datetime
