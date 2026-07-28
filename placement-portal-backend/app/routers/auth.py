"""Signup OTP flow, login, refresh, logout, forgot-password OTP flow,
OTP-gated change-password, `GET /auth/me`, and `PATCH /auth/profile`.
"""
import hashlib
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.security import (
    create_access_token,
    create_purpose_token,
    create_refresh_token,
    decode_purpose_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.otp_verification import OtpPurpose
from app.models.profile import Profile
from app.models.refresh_token import RefreshToken
from app.models.user import User, UserType
from app.schemas.otp_verification import (
    OtpActionResponse,
    OtpEmailRequest,
    OtpVerifyRequest,
    OtpVerifyResponse,
    SignupRequestOtp,
)
from app.schemas.profile import ProfileUpdate
from app.schemas.user import (
    ChangePasswordCompleteRequest,
    ForgotPasswordResetRequest,
    LoginRequest,
    LogoutRequest,
    MeResponse,
    RefreshRequest,
    SignupCompleteRequest,
    TokenResponse,
)
from app.services import email_service, otp_service
from app.utils.exceptions import OtpError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

MAX_FAILED_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _issue_tokens(db: Session, user: User) -> TokenResponse:
    access_token = create_access_token(str(user.id), user.user_type.value)
    refresh_token = create_refresh_token(str(user.id), user.user_type.value)

    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=_hash_token(refresh_token),
            expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        )
    )
    db.commit()

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/signup/request-otp", response_model=OtpActionResponse)
async def signup_request_otp(payload: SignupRequestOtp, db: Session = Depends(get_db)) -> OtpActionResponse:
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="An account with this email already exists")

    try:
        otp = otp_service.create_otp(db, payload.email, OtpPurpose.SIGNUP)
    except OtpError as error:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail=error.message) from error

    await email_service.send_otp_email(payload.email, otp, OtpPurpose.SIGNUP)
    return OtpActionResponse(message="OTP sent to your email")


@router.post("/signup/verify-otp", response_model=OtpVerifyResponse)
def signup_verify_otp(payload: OtpVerifyRequest, db: Session = Depends(get_db)) -> OtpVerifyResponse:
    try:
        otp_service.verify_otp(db, payload.email, payload.otp, OtpPurpose.SIGNUP)
    except OtpError as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=error.message) from error

    token = create_purpose_token(payload.email, "signup")
    return OtpVerifyResponse(token=token, expires_in_seconds=15 * 60)


@router.post("/signup/complete", response_model=TokenResponse)
def signup_complete(payload: SignupCompleteRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        verified_email = decode_purpose_token(payload.signup_token, "signup")
    except JWTError as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid or expired signup token") from error

    if verified_email.lower() != payload.email.lower():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Signup token does not match this email")

    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="An account with this email already exists")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        user_type=UserType.STUDENT,
        is_email_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return _issue_tokens(db, user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    invalid_credentials = HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if user is None:
        raise invalid_credentials

    now = datetime.now(timezone.utc)
    if user.locked_until is not None:
        locked_until = user.locked_until if user.locked_until.tzinfo else user.locked_until.replace(tzinfo=timezone.utc)
        if locked_until > now:
            minutes_left = max(1, int((locked_until - now).total_seconds() // 60))
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail=f"Too many failed attempts. Try again in {minutes_left} minute(s).",
            )

    if not verify_password(payload.password, user.hashed_password):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
            user.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
        db.commit()
        raise invalid_credentials

    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    return _issue_tokens(db, user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    invalid = HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    try:
        token_payload = decode_token(payload.refresh_token)
    except JWTError as error:
        raise invalid from error

    if token_payload.get("type") != "refresh":
        raise invalid

    token_hash = _hash_token(payload.refresh_token)
    stored = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))

    now = datetime.now(timezone.utc)
    expires_at = stored.expires_at if stored and stored.expires_at.tzinfo else (stored.expires_at.replace(tzinfo=timezone.utc) if stored else None)
    if stored is None or stored.is_revoked or expires_at < now:
        raise invalid

    user = db.get(User, int(token_payload["sub"]))
    if user is None or not user.is_active:
        raise invalid

    stored.is_revoked = True
    db.commit()

    return _issue_tokens(db, user)


@router.post("/logout", response_model=OtpActionResponse)
def logout(payload: LogoutRequest, db: Session = Depends(get_db)) -> OtpActionResponse:
    token_hash = _hash_token(payload.refresh_token)
    stored = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    if stored is not None:
        stored.is_revoked = True
        db.commit()

    return OtpActionResponse(message="Logged out")


@router.get("/me", response_model=MeResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> MeResponse:
    profile_complete = False
    profile = None
    if current_user.user_type == UserType.STUDENT:
        profile = db.scalar(select(Profile).where(Profile.user_id == current_user.id))
        profile_complete = profile is not None

    return MeResponse(
        id=current_user.id,
        email=current_user.email,
        user_type=current_user.user_type,
        is_active=current_user.is_active,
        is_email_verified=current_user.is_email_verified,
        fee_verified=current_user.fee_verified,
        created_at=current_user.created_at,
        profile_complete=profile_complete,
        profile=profile,
    )


@router.patch("/profile", response_model=MeResponse)
def update_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MeResponse:
    """Updates editable profile fields. ASSUMPTION: only students have an
    editable profile record (Phase 1's models only define `profiles` for
    students) — TPO/Admin accounts have no profile-table fields to patch
    here, so this is a no-op (still returns their current `/auth/me` view)
    for those roles rather than a 500 from a missing table.
    """
    if current_user.user_type == UserType.STUDENT:
        profile = db.scalar(select(Profile).where(Profile.user_id == current_user.id))
        if profile is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Complete onboarding before editing your profile")

        for field_name, value in payload.model_dump(exclude_unset=True).items():
            setattr(profile, field_name, value)
        db.commit()

    return get_me(current_user, db)


@router.post("/change-password/request-otp", response_model=OtpActionResponse)
async def change_password_request_otp(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> OtpActionResponse:
    try:
        otp = otp_service.create_otp(db, current_user.email, OtpPurpose.CHANGE_PASSWORD)
    except OtpError as error:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail=error.message) from error

    await email_service.send_otp_email(current_user.email, otp, OtpPurpose.CHANGE_PASSWORD)
    return OtpActionResponse(message="OTP sent to your registered email")


@router.post("/change-password/verify-otp", response_model=OtpVerifyResponse)
def change_password_verify_otp(
    payload: OtpVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OtpVerifyResponse:
    if payload.email.lower() != current_user.email.lower():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Email does not match the logged-in account")

    try:
        otp_service.verify_otp(db, payload.email, payload.otp, OtpPurpose.CHANGE_PASSWORD)
    except OtpError as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=error.message) from error

    token = create_purpose_token(current_user.email, "change_password")
    return OtpVerifyResponse(token=token, expires_in_seconds=15 * 60)


@router.post("/change-password/complete", response_model=OtpActionResponse)
def change_password_complete(
    payload: ChangePasswordCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OtpActionResponse:
    try:
        verified_email = decode_purpose_token(payload.change_token, "change_password")
    except JWTError as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid or expired change-password token") from error

    if verified_email.lower() != current_user.email.lower():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Token does not match the logged-in account")

    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")

    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()

    return OtpActionResponse(message="Password changed successfully")


@router.post("/forgot-password/request-otp", response_model=OtpActionResponse)
async def forgot_password_request_otp(payload: OtpEmailRequest, db: Session = Depends(get_db)) -> OtpActionResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No account found with this email")

    try:
        otp = otp_service.create_otp(db, payload.email, OtpPurpose.FORGOT_PASSWORD)
    except OtpError as error:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail=error.message) from error

    await email_service.send_otp_email(payload.email, otp, OtpPurpose.FORGOT_PASSWORD)
    return OtpActionResponse(message="OTP sent to your email")


@router.post("/forgot-password/verify-otp", response_model=OtpVerifyResponse)
def forgot_password_verify_otp(payload: OtpVerifyRequest, db: Session = Depends(get_db)) -> OtpVerifyResponse:
    try:
        otp_service.verify_otp(db, payload.email, payload.otp, OtpPurpose.FORGOT_PASSWORD)
    except OtpError as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=error.message) from error

    token = create_purpose_token(payload.email, "forgot_password")
    return OtpVerifyResponse(token=token, expires_in_seconds=15 * 60)


@router.post("/forgot-password/reset", response_model=OtpActionResponse)
def forgot_password_reset(payload: ForgotPasswordResetRequest, db: Session = Depends(get_db)) -> OtpActionResponse:
    try:
        verified_email = decode_purpose_token(payload.reset_token, "forgot_password")
    except JWTError as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token") from error

    if verified_email.lower() != payload.email.lower():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Reset token does not match this email")

    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No account found with this email")

    user.hashed_password = hash_password(payload.new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    return OtpActionResponse(message="Password reset successfully")
