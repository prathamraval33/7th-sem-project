from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserType


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    user_type: UserType
    full_name: Optional[str] = None
    branch: Optional[str] = None
    cgpa: Optional[float] = Field(default=None, ge=0, le=10)
    active_backlogs: Optional[int] = Field(default=0, ge=0)
    tenth_percentage: Optional[float] = Field(default=None, ge=0, le=100)
    twelfth_percentage: Optional[float] = Field(default=None, ge=0, le=100)
    skills: Optional[list[str]] = Field(default_factory=list)


class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    user_type: Optional[UserType] = None
    is_active: Optional[bool] = None
    full_name: Optional[str] = None
    branch: Optional[str] = None
    cgpa: Optional[float] = Field(default=None, ge=0, le=10)
    active_backlogs: Optional[int] = Field(default=None, ge=0)
    is_placed: Optional[bool] = None


class AdminFeatureResponse(BaseModel):
    id: int
    code: str
    name: str
    description: str
    category: str
    target_role: str
    price: Optional[float] = None
    billing_type: str
    status: str
    amount_charged: Optional[float] = None
    requested_at: Optional[datetime] = None
    decided_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_auto_granted: bool = False


class CollegeInfoResponse(BaseModel):
    id: int
    name: str
    domain: str
    status: str
    created_at: datetime
    students: int = 0
    tpos: int = 0
    drives: int = 0
    applications: int = 0
    subscription_status: str = "active"
    subscription_plan: Optional[str] = "campus_standard"
    subscription_amount: float = 10000.00
    subscription_started_at: Optional[datetime] = None
    subscription_expires_at: Optional[datetime] = None
    is_subscription_expired: bool = False
    days_remaining: int = 0
    can_renew: bool = False


class CollegeDomainUpdate(BaseModel):
    domain: str = Field(min_length=3, max_length=255)


class CollegeBillingTransactionResponse(BaseModel):
    id: int
    amount: float
    currency: str = "INR"
    status: str
    description: str
    razorpay_order_id: str
    razorpay_payment_id: Optional[str] = None
    created_at: datetime
    paid_at: Optional[datetime] = None


