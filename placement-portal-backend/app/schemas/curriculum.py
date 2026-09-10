"""Schemas for the curriculum-driven, AI-curated study resource system."""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.curated_subject_resource import CurationApprovalStatus, SubjectResourceType
from app.models.curriculum_upload import CurriculumExtractionStatus


class CurriculumSemesterDraft(BaseModel):
    number: int = Field(ge=1, le=12)
    subjects: list[str] = Field(default_factory=list)


class CurriculumBranchDraft(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    semesters: list[CurriculumSemesterDraft] = Field(default_factory=list)


class CurriculumConfirmRequest(BaseModel):
    branches: list[CurriculumBranchDraft] = Field(min_length=1)


class CurriculumUploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    college_id: int
    uploaded_by: int
    original_filename: str
    extraction_status: CurriculumExtractionStatus
    raw_extracted_data: Optional[dict] = None
    uploaded_at: datetime
    confirmed_at: Optional[datetime] = None


class CuratedSubjectResourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subject_id: int
    college_id: int
    resource_type: SubjectResourceType
    title: str
    link: str
    ai_summary: str
    approval_status: CurationApprovalStatus
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    generated_at: datetime


class CurriculumSubjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    college_id: int
    source_upload_id: Optional[int] = None
    branch_name: str
    semester_number: int
    subject_name: str
    is_prioritized: bool
    created_at: datetime
    resources_count: int = 0
    approved_count: int = 0
    pending_count: int = 0


class CuratedResourceReviewRequest(BaseModel):
    approval_status: Literal["approved", "rejected"]
    title: Optional[str] = None
    ai_summary: Optional[str] = None


class CurriculumBranchesResponse(BaseModel):
    branches: list[str]
