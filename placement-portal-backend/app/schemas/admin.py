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
