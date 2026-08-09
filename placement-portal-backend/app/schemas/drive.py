"""Schemas for the `drives` table, including the structured (never free-text)
eligibility_criteria block.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.drive import DriveStatus, DriveTestStatus
from app.schemas.company import CompanyResponse


class EligibilityCriteria(BaseModel):
    min_cgpa: float = Field(ge=0, le=10)
    max_backlogs: int = Field(ge=0)
    department_list: list[str] = Field(min_length=1)
    min_tenth: float = Field(ge=0, le=100)
    min_twelfth: float = Field(ge=0, le=100)
    min_percentile: Optional[float] = Field(default=None, ge=0, le=100)


class DriveCreate(BaseModel):
    company_id: int
    role: str = Field(min_length=1, max_length=255)
    jd_text: str = Field(min_length=1)
    placement_type: Optional[str] = Field(default="Internship + Placement")
    student_instructions: Optional[str] = None
    min_ctc: Optional[float] = Field(default=None, ge=0)
    max_ctc: Optional[float] = Field(default=None, ge=0)
    eligibility_criteria: EligibilityCriteria
    bond_details: Optional[str] = None
    deadline: datetime

    @field_validator("deadline")
    @classmethod
    def deadline_must_be_future(cls, value: datetime) -> datetime:
        now = datetime.now(value.tzinfo) if value.tzinfo else datetime.now()
        if value <= now:
            raise ValueError("deadline must be a future date")
        return value


class DriveUpdate(BaseModel):
    role: Optional[str] = Field(default=None, min_length=1, max_length=255)
    jd_text: Optional[str] = None
    placement_type: Optional[str] = None
    student_instructions: Optional[str] = None
    min_ctc: Optional[float] = Field(default=None, ge=0)
    max_ctc: Optional[float] = Field(default=None, ge=0)
    eligibility_criteria: Optional[EligibilityCriteria] = None
    bond_details: Optional[str] = None
    deadline: Optional[datetime] = None
    status: Optional[DriveStatus] = None
    test_status: Optional[DriveTestStatus] = None


class DriveResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    role: str
    jd_text: str
    placement_type: Optional[str] = "Internship + Placement"
    student_instructions: Optional[str] = None
    min_ctc: Optional[float] = None
    max_ctc: Optional[float] = None
    eligibility_criteria: EligibilityCriteria
    bond_details: Optional[str] = None
    deadline: datetime
    status: DriveStatus
    test_status: DriveTestStatus
    created_by: int
    created_at: datetime
    company: Optional[CompanyResponse] = None
