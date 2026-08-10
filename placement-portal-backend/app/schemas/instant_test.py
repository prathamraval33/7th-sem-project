"""Schemas for the `instant_tests` table (TPO-authored AI-generated tests)."""
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.instant_test import InstantTestStatus


class InstantTestCreate(BaseModel):
    title: str = Field(default="Placement Qualifying Test", min_length=2)
    duration_minutes: int = Field(default=30, ge=1)
    is_practice: bool = False
    prompt_config: Optional[dict] = Field(default_factory=dict)
    questions: list
    min_passing_marks: int = Field(ge=0)
    use_top_n: bool = False
    top_n_count: Optional[int] = Field(default=None, gt=0)


class InstantTestUpdate(BaseModel):
    title: Optional[str] = None
    duration_minutes: Optional[int] = Field(default=None, ge=1)
    min_passing_marks: Optional[int] = Field(default=None, ge=0)
    use_top_n: Optional[bool] = None
    top_n_count: Optional[int] = Field(default=None, gt=0)
    status: Optional[InstantTestStatus] = None


class InstantTestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    duration_minutes: int
    is_practice: bool
    drive_id: Optional[int] = None
    created_by: int
    prompt_config: dict
    questions: list
    min_passing_marks: int
    use_top_n: bool
    top_n_count: Optional[int] = None
    status: InstantTestStatus


class TestAttemptStartResponse(BaseModel):
    attempt_id: int
    test_id: int
    title: str
    duration_minutes: int
    started_at: str
    ends_at: str
    questions: list


class TestViolationCreate(BaseModel):
    violation_type: str
    meta: Optional[dict] = None


class TestViolationResponse(BaseModel):
    strike_number: int
    category_total: int
    global_total: int
    auto_ended: bool
    ended_reason: Optional[str] = None
    category_counts: Optional[dict] = Field(default_factory=dict)


class TestAnswerSubmit(BaseModel):
    question_id: int
    selected_option_index: int

