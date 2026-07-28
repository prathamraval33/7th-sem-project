"""Schemas for the `users` table + the auth-flow request/response DTOs that
belong to the user/session domain (login, token refresh, signup completion,
password-change/reset completion). OTP request/verify DTOs themselves live
in otp_verification.py.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.user import UserType
from app.schemas.common import BvmEmail, StrongPassword


class UserCreate(BaseModel):
    """Internal, service-facing — used to construct the DB row once the
    signup OTP flow has already verified the email and issued a signup_token.
    """

    email: EmailStr
    hashed_password: str
    user_type: UserType


class UserUpdate(BaseModel):
    """Admin-facing account toggle. Fields such as `fee_verified`,
    `failed_login_attempts`, and `locked_until` are system-managed only and
    intentionally excluded here — they're set by services, never via a
    generic client-supplied update.
    """

    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    user_type: UserType
    is_active: bool
    is_email_verified: bool
    fee_verified: bool
    created_at: datetime


from app.schemas.profile import ProfileResponse

class MeResponse(UserResponse):
    """GET /auth/me — adds the frontend-facing flags used to decide whether
    to force onboarding, per the master prompt's Roles & Auth section.
    """

    profile_complete: bool
    profile: Optional[ProfileResponse] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class SignupCompleteRequest(BaseModel):
    email: BvmEmail
    signup_token: str
    password: StrongPassword


class ChangePasswordCompleteRequest(BaseModel):
    current_password: str
    new_password: StrongPassword
    change_token: str


class ForgotPasswordResetRequest(BaseModel):
    email: EmailStr
    reset_token: str
    new_password: StrongPassword
