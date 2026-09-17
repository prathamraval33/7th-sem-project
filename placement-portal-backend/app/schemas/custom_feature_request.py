"""Schemas for custom feature proposals submitted by College Admins to SuperAdmin."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class CustomFeatureRequestCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255, description="Feature name / title")
    description: str = Field(..., min_length=10, description="Detailed feature description and rationale")
    target_user: str = Field(default="all", description="Target persona: student, tpo, admin, all")
    category: str = Field(default="General", max_length=100, description="Feature category")
    priority: str = Field(default="medium", description="Priority level: low, medium, high, critical")


class CustomFeatureRequestUpdate(BaseModel):
    status: str | None = Field(default=None, description="Updated status")
    superadmin_feedback: str | None = Field(default=None, description="SuperAdmin reply / feedback message")


class CustomFeatureRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    college_id: int
    admin_id: int
    title: str
    description: str
    target_user: str
    category: str
    priority: str
    status: str
    superadmin_feedback: str | None = None
    created_at: datetime
    updated_at: datetime
    college_name: str | None = None
    admin_email: str | None = None
