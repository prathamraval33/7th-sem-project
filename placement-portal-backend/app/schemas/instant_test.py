"""Schemas for the `instant_tests` table (TPO-authored AI-generated tests)."""
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.instant_test import InstantTestStatus


class InstantTestCreate(BaseModel):
    """POST /tpo/drives/{id}/instant-test. `min_passing_marks` can only be
    schema-validated for non-negativity here — checking it against the
    *actual* max possible score requires the generated question set, which
    doesn't exist until test_generator.py (Phase 3) runs; that check belongs
    at the service layer, not this request schema.
    """

    prompt_config: dict
    min_passing_marks: int = Field(ge=0)
    use_top_n: bool = False
    top_n_count: Optional[int] = Field(default=None, gt=0)

    @model_validator(mode="after")
    def top_n_count_requires_use_top_n(self) -> "InstantTestCreate":
        if self.use_top_n and not self.top_n_count:
            raise ValueError("top_n_count is required and must be positive when use_top_n is true")
        if not self.use_top_n and self.top_n_count is not None:
            raise ValueError("top_n_count must be omitted when use_top_n is false")
        return self


class InstantTestUpdate(BaseModel):
    min_passing_marks: Optional[int] = Field(default=None, ge=0)
    use_top_n: Optional[bool] = None
    top_n_count: Optional[int] = Field(default=None, gt=0)
    status: Optional[InstantTestStatus] = None


class InstantTestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    drive_id: Optional[int] = None
    created_by: int
    prompt_config: dict
    questions: list
    min_passing_marks: int
    use_top_n: bool
    top_n_count: Optional[int] = None
    status: InstantTestStatus
