"""Schemas for the `applications` table."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.application import ApplicationStatus


class ApplicationCreate(BaseModel):
    """POST /applications — `user_id` comes from the authenticated caller,
    never the request body.
    """

    drive_id: int


class ApplicationUpdate(BaseModel):
    """TPO-facing status transitions (shortlist/select/reject/etc.)."""

    status: Optional[ApplicationStatus] = None
    current_stage: Optional[str] = None
    package_offered: Optional[float] = Field(default=None, ge=0)

    @model_validator(mode="after")
    def package_only_when_selected(self) -> "ApplicationUpdate":
        if self.package_offered is not None and self.status != ApplicationStatus.SELECTED:
            raise ValueError("package_offered may only be set when status is 'selected'")
        return self


class ApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    drive_id: int
    status: ApplicationStatus
    current_stage: Optional[str] = None
    package_offered: Optional[float] = None
    applied_on: datetime
