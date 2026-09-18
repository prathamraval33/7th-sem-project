"""Pydantic schemas for self-service college registration and onboarding checklist."""
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class CollegeRegistrationRequest(BaseModel):
    college_name: str = Field(min_length=2, max_length=255, description="Full institution name")
    admin_name: str = Field(min_length=2, max_length=255, description="Registering administrator's full name")
    email: EmailStr = Field(description="Official institution domain email address")
    mobile_number: Optional[str] = Field(default=None, max_length=50, description="Primary contact phone number (unverified)")
    mobile: Optional[str] = Field(default=None, max_length=50, description="Mobile number alias")

    @model_validator(mode="before")
    @classmethod
    def unify_mobile(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("mobile_number") and data.get("mobile"):
                data["mobile_number"] = data.get("mobile")
        return data


class CollegeRegistrationOtpVerify(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


class CollegeRegistrationComplete(BaseModel):
    email: EmailStr
    registration_token: Optional[str] = None
    verification_token: Optional[str] = None
    password: str = Field(min_length=8, description="Admin password (at least 8 characters)")

    @model_validator(mode="before")
    @classmethod
    def unify_token(cls, data: Any) -> Any:
        if isinstance(data, dict):
            token = data.get("registration_token") or data.get("verification_token")
            data["registration_token"] = token
            data["verification_token"] = token
        return data


class CollegeRegistrationResponse(BaseModel):
    message: str
    email: str
    college_name: Optional[str] = None


class CollegeRegistrationVerifyResponse(BaseModel):
    token: str
    verification_token: Optional[str] = None
    expires_in_seconds: int = 1800
    email: str
    college_name: str

    @model_validator(mode="after")
    def sync_tokens(self) -> "CollegeRegistrationVerifyResponse":
        if not self.verification_token and self.token:
            self.verification_token = self.token
        if not self.token and self.verification_token:
            self.token = self.verification_token
        return self


class ChecklistItem(BaseModel):
    id: str
    title: str
    description: str
    is_blocking: bool
    is_completed: bool
    deep_link: str
    explanation: Optional[str] = None
    completed: Optional[bool] = None
    action_url: Optional[str] = None
    missing_fields: Optional[list[str]] = None

    @model_validator(mode="after")
    def sync_item_fields(self) -> "ChecklistItem":
        if self.completed is None:
            self.completed = self.is_completed
        if self.action_url is None:
            self.action_url = self.deep_link
        return self


class SetupChecklistResponse(BaseModel):
    college_id: int
    college_name: str
    status: str
    total_percentage: int
    total_progress_pct: Optional[int] = None
    blocking_completed: int
    blocking_total: int
    optional_completed: int
    optional_total: int
    all_blocking_complete: bool
    blocking_complete: Optional[bool] = None
    recommended_complete: Optional[bool] = None
    items: list[ChecklistItem]
    blocking_items: Optional[list[ChecklistItem]] = None
    recommended_items: Optional[list[ChecklistItem]] = None

    @model_validator(mode="after")
    def sync_checklist_fields(self) -> "SetupChecklistResponse":
        if self.total_progress_pct is None:
            self.total_progress_pct = self.total_percentage
        if self.blocking_complete is None:
            self.blocking_complete = self.all_blocking_complete
        if self.recommended_complete is None:
            self.recommended_complete = (
                self.optional_completed == self.optional_total and self.optional_total > 0
            )
        if self.blocking_items is None:
            self.blocking_items = [i for i in self.items if i.is_blocking]
        if self.recommended_items is None:
            self.recommended_items = [i for i in self.items if not i.is_blocking]
        return self


class CollegeRejectionRequest(BaseModel):
    rejection_reason: str = Field(min_length=3, max_length=1000, description="Reason for registration decline")


class CollegeApprovalResponse(BaseModel):
    message: str
    college_id: int
    status: str
