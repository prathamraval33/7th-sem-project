"""Schemas for the `test_attempts` table."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class TestAttemptCreate(BaseModel):
    """A student's instant-test submission."""

    answers: dict


class TestAttemptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    test_id: int
    user_id: int
    answers: dict
    score: float
    weak_areas: Optional[list[str]] = None
    submitted_at: datetime
