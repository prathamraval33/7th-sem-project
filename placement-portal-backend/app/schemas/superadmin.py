from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.college import CollegeStatus
from app.models.college_feature import FeatureRequestStatus
from app.models.feature import BillingType, FeatureStatus


class CollegeCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    domain: str = Field(min_length=3, max_length=255)
    admin_name: str = Field(min_length=2, max_length=255)
    admin_email: EmailStr
    admin_password: str = Field(default="Password@123", min_length=6)
    access_method: Literal["invite", "password"] = "invite"


class CollegeStatusUpdate(BaseModel):
    status: CollegeStatus


class CollegeSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    domain: str
    status: CollegeStatus
    created_at: datetime
    students: int = 0
    tpos: int = 0
    drives: int = 0
    applications: int = 0
    admin_name: Optional[str] = None
    admin_email: Optional[str] = None


class CollegeDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    domain: str
    status: CollegeStatus
    created_at: datetime
    updated_at: datetime
    admin_name: Optional[str] = None
    admin_email: Optional[str] = None
    students: int = 0
    tpos: int = 0
    drives: int = 0
    applications: int = 0
    enabled_features: list[str] = []
    pending_features: list[str] = []


class FeatureCreate(BaseModel):
    code: str = Field(min_length=2, max_length=100)
    name: str = Field(min_length=2, max_length=255)
    description: str = Field(min_length=5)
    category: str = Field(default="General", max_length=100)
    target_role: str = Field(default="Student", max_length=100)
    price: Optional[float] = None
    billing_type: Optional[BillingType] = BillingType.ONE_TIME
    status: FeatureStatus = FeatureStatus.ACTIVE


class FeatureUpdate(BaseModel):
    code: Optional[str] = Field(default=None, min_length=2, max_length=100)
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    description: Optional[str] = Field(default=None, min_length=5)
    category: Optional[str] = Field(default=None, max_length=100)
    target_role: Optional[str] = Field(default=None, max_length=100)
    price: Optional[float] = None
    billing_type: Optional[BillingType] = None
    status: Optional[FeatureStatus] = None


class FeatureResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    description: str
    category: str
    target_role: str
    price: Optional[float] = None
    billing_type: BillingType = BillingType.ONE_TIME
    status: FeatureStatus
    created_at: datetime


class FeatureCollegeStatus(BaseModel):
    college_id: int
    college_name: str
    request_id: Optional[int] = None
    status: Literal["not_requested", "pending_review", "rejected", "approved_awaiting_payment", "active", "payment_failed", "expired", "revoked"]
    date: Optional[datetime] = None


class FeatureRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    college_id: int
    college_name: str
    feature_id: int
    feature_name: str
    status: FeatureRequestStatus
    requested_at: datetime
    decided_at: Optional[datetime] = None
    decided_by: Optional[int] = None


class AnnouncementCreate(BaseModel):
    content: str = Field(min_length=1)


class AnnouncementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    created_by: int
    created_at: datetime
    creator_email: Optional[str] = None


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action: str
    details: Optional[str] = None
    performed_by: Optional[int] = None
    performed_by_email: Optional[str] = None
    timestamp: datetime


class DashboardSummary(BaseModel):
    total_colleges: int = 0
    active_colleges: int = 0
    suspended_colleges: int = 0
    total_students: int = 0
    total_tpos: int = 0
    total_drives: int = 0
    pending_feature_requests: int = 0


class StatusUpdateResponse(BaseModel):
    message: str
    status: str


class SuperadminAnalyticsPoint(BaseModel):
    month: str
    count: int


class RevenueBreakdownItem(BaseModel):
    name: str
    revenue: float


class SuperadminAnalyticsResponse(BaseModel):
    colleges_over_time: list[SuperadminAnalyticsPoint]
    feature_usage: list[dict]
    totals: DashboardSummary
    total_revenue: float = 0
    revenue_by_feature: list[RevenueBreakdownItem] = []
    revenue_by_college: list[RevenueBreakdownItem] = []
