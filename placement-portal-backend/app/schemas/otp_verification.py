"""Schemas for the `otp_verifications` table + the generic OTP request/verify
request bodies shared by the signup, forgot-password, and change-password
flows (see user.py for the flow-completion DTOs that follow OTP verification).
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.otp_verification import OtpPurpose
from app.schemas.common import BvmEmail, OtpCode


class SignupRequestOtp(BaseModel):
    """Only the signup flow is domain-restricted to BVM students."""

    email: BvmEmail


class OtpEmailRequest(BaseModel):
    """Forgot-password / change-password OTP requests — any valid email,
    since TPO/Admin accounts aren't necessarily on the BVM domain.
    """

    email: EmailStr


class OtpVerifyRequest(BaseModel):
    email: EmailStr
    otp: OtpCode


class OtpActionResponse(BaseModel):
    message: str


class OtpVerifyResponse(BaseModel):
    """Short-lived token returned after a successful OTP check — named
    generically here; routers assign it the flow-specific meaning
    (signup_token / reset_token / change_token).
    """

    token: str
    expires_in_seconds: int


class OtpVerificationResponse(BaseModel):
    """Internal/admin visibility into an OTP record. Never includes the
    OTP itself (only its hash is ever stored, and even that isn't exposed).
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    purpose: OtpPurpose
    expires_at: datetime
    is_used: bool
    created_at: datetime
