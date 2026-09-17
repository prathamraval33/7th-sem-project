"""Signup OTP flow, login, refresh, logout, forgot-password OTP flow,
OTP-gated change-password, `GET /auth/me`, and `PATCH /auth/profile`.
"""
import hashlib
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models.college import College, CollegeStatus
from app.models.college_registration import CollegeRegistration
from app.models.notification import Notification, NotificationType

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.feature_gating import get_active_features_for_college
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
from app.models.otp_verification import OtpPurpose, OtpVerification
from app.models.profile import Profile
from app.models.refresh_token import RefreshToken
from app.models.user import User, UserType
from app.schemas.college_onboarding import (
    CollegeRegistrationComplete,
    CollegeRegistrationOtpVerify,
    CollegeRegistrationRequest,
    CollegeRegistrationResponse,
    CollegeRegistrationVerifyResponse,
)
from app.schemas.otp_verification import (
    OtpActionResponse,
    OtpEmailRequest,
    OtpVerifyRequest,
    OtpVerifyResponse,
    SignupRequestOtp,
)
from app.services import email_service, otp_service
from app.services.college_onboarding_service import (
    cleanup_expired_registrations,
    extract_domain,
    is_blocked_domain,
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
    access_token = create_access_token(str(user.id), user.user_type.value, college_id=user.college_id)
    refresh_token = create_refresh_token(str(user.id), user.user_type.value, college_id=user.college_id)

    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=_hash_token(refresh_token),
            expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        )
    )
    db.commit()

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


def _resolve_college_for_email(db: Session, email: str) -> College:
    parts = email.split("@")
    if len(parts) != 2 or not parts[1]:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format.",
        )
    domain = parts[1].lower().strip()
    college = db.scalar(
        select(College).where(func.lower(College.domain) == domain)
    )
    if college is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"The email domain '{domain}' is not registered with any active institution on this platform.",
        )
    if college.status != CollegeStatus.ACTIVE:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="This college is not yet active on the platform — please contact your placement office.",
        )
    return college


# --------------------------------------------------------------------------
# College Self-Service Registration & Onboarding Endpoints (Spec Parts 2 & 5)
# --------------------------------------------------------------------------
@router.post("/college-registration/request-otp", response_model=CollegeRegistrationResponse)
async def college_registration_request_otp(
    payload: CollegeRegistrationRequest, db: Session = Depends(get_db)
) -> CollegeRegistrationResponse:
    # 1. Spec 2.3: Reject personal / public email providers
    if is_blocked_domain(payload.email):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Please register using your official college email address. Personal email addresses (Gmail, Yahoo, etc.) can't be used to register an institution.",
        )

    domain = extract_domain(payload.email)

    # 2. Spec 2.4: Collision check against existing colleges
    existing_college = db.scalar(
        select(College).where(func.lower(College.domain) == domain)
    )
    if existing_college is not None:
        # Notify existing College Admin(s)
        admins = list(
            db.scalars(
                select(User).where(
                    User.college_id == existing_college.id,
                    User.user_type == UserType.ADMIN,
                    User.is_active.is_(True),
                )
            ).all()
        )
        for adm in admins:
            db.add(
                Notification(
                    recipient_id=adm.id,
                    type=NotificationType.COLLEGE_COLLISION_ALERT,
                    message=(
                        f"Registration attempt alert: Someone attempted to register a new college account "
                        f"using your institution's email domain ('{domain}') with email '{payload.email}'. "
                        f"If this was a colleague, you can add them as an administrator in your Admin Console."
                    ),
                )
            )
        db.commit()

        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail=(
                "This college is already registered on the platform. Please contact your institution's "
                "existing administrator for access, or get in touch with us if you believe this is an error."
            ),
        )

    # 3. Check if an account already exists with this email
    existing_user = db.scalar(select(User).where(User.email == payload.email.lower().strip()))
    if existing_user is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists. Please sign in.",
        )

    # 4. Spec 2.9: Clean up expired registrations before checking pending reservations
    cleanup_expired_registrations(db)

    # Check if another registration for this domain is currently active
    now = datetime.now(timezone.utc)
    pending_collision = db.scalar(
        select(CollegeRegistration).where(
            CollegeRegistration.domain == domain,
            CollegeRegistration.status.in_(["pending_otp", "verified"]),
            CollegeRegistration.expires_at > now,
            CollegeRegistration.email != payload.email.lower().strip(),
        )
    )
    if pending_collision is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail=(
                "A registration attempt for this institutional domain is already in progress. "
                "Please wait for it to complete or expire before submitting a new request."
            ),
        )

    # 5. Store / update registration record with 48h TTL
    expires_at = now + timedelta(hours=settings.COLLEGE_REGISTRATION_EXPIRY_HOURS)
    reg = db.scalar(select(CollegeRegistration).where(CollegeRegistration.email == payload.email.lower().strip()))
    if reg is None:
        reg = CollegeRegistration(
            college_name=payload.college_name.strip(),
            admin_name=payload.admin_name.strip(),
            email=payload.email.lower().strip(),
            domain=domain,
            mobile_number=payload.mobile_number.strip() if payload.mobile_number else None,
            status="pending_otp",
            expires_at=expires_at,
        )
        db.add(reg)
    else:
        reg.college_name = payload.college_name.strip()
        reg.admin_name = payload.admin_name.strip()
        reg.domain = domain
        reg.mobile_number = payload.mobile_number.strip() if payload.mobile_number else None
        reg.status = "pending_otp"
        reg.expires_at = expires_at

    db.commit()

    # 6. Generate OTP and dispatch email
    try:
        otp = otp_service.create_otp(db, payload.email.lower().strip(), OtpPurpose.COLLEGE_REGISTRATION)
    except OtpError as error:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail=error.message) from error

    await email_service.send_otp_email(payload.email.lower().strip(), otp, OtpPurpose.COLLEGE_REGISTRATION)

    return CollegeRegistrationResponse(
        message="Verification code sent to your official college email address.",
        email=payload.email.lower().strip(),
        college_name=payload.college_name.strip(),
    )


@router.post("/college-registration/verify-otp", response_model=CollegeRegistrationVerifyResponse)
def college_registration_verify_otp(
    payload: CollegeRegistrationOtpVerify, db: Session = Depends(get_db)
) -> CollegeRegistrationVerifyResponse:
    clean_email = payload.email.lower().strip()
    clean_otp = payload.otp.strip()
    now = datetime.now(timezone.utc)

    # 1. Verify OTP with brute force throttling & expiration
    try:
        otp_service.verify_otp(db, clean_email, clean_otp, OtpPurpose.COLLEGE_REGISTRATION)
    except OtpError as error:
        # Resilience: If this registration was already marked verified and user re-submits the matching OTP
        # (e.g. client error or retry), re-issue the purpose token instead of failing with 400.
        reg = db.scalar(
            select(CollegeRegistration).where(
                CollegeRegistration.email == clean_email,
                CollegeRegistration.status == "verified",
                CollegeRegistration.expires_at > now,
            )
        )
        recent_otp = db.scalar(
            select(OtpVerification)
            .where(
                OtpVerification.email == clean_email,
                OtpVerification.purpose == OtpPurpose.COLLEGE_REGISTRATION,
                OtpVerification.is_used.is_(True),
            )
            .order_by(OtpVerification.created_at.desc())
        )
        if (
            reg is not None
            and recent_otp is not None
            and verify_password(clean_otp, recent_otp.otp_hash)
            and (
                recent_otp.expires_at.replace(tzinfo=timezone.utc)
                if recent_otp.expires_at.tzinfo is None
                else recent_otp.expires_at
            ) > now
        ):
            token = create_purpose_token(clean_email, "college_registration")
            return CollegeRegistrationVerifyResponse(
                token=token,
                verification_token=token,
                expires_in_seconds=15 * 60,
                email=clean_email,
                college_name=reg.college_name,
            )
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=error.message) from error

    # 2. Find pending registration record
    reg = db.scalar(
        select(CollegeRegistration).where(
            CollegeRegistration.email == clean_email,
            CollegeRegistration.status.in_(["pending_otp", "verified"]),
            CollegeRegistration.expires_at > now,
        )
    )
    if reg is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Registration session expired or not found. Please start registration again.",
        )

    reg.status = "verified"
    db.commit()

    token = create_purpose_token(clean_email, "college_registration")
    return CollegeRegistrationVerifyResponse(
        token=token,
        verification_token=token,
        expires_in_seconds=15 * 60,
        email=clean_email,
        college_name=reg.college_name,
    )


@router.post("/college-registration/complete")
def college_registration_complete(
    payload: CollegeRegistrationComplete, db: Session = Depends(get_db)
) -> dict:
    # 1. Verify purpose token
    try:
        verified_email = decode_purpose_token(payload.registration_token, "college_registration")
    except JWTError as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid or expired registration token") from error

    if verified_email.lower() != payload.email.lower().strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Token does not match submitted email")

    # 2. Retrieve verified registration record
    now = datetime.now(timezone.utc)
    reg = db.scalar(
        select(CollegeRegistration).where(
            CollegeRegistration.email == payload.email.lower().strip(),
            CollegeRegistration.status == "verified",
            CollegeRegistration.expires_at > now,
        )
    )
    if reg is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Verified registration session not found or has expired. Please verify OTP again.",
        )

    # 3. Final collision check
    if db.scalar(select(College).where(func.lower(College.domain) == reg.domain.lower())) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="This institutional domain has already been registered.")

    if db.scalar(select(College).where(func.lower(College.name) == reg.college_name.lower())) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="An institution with this name already exists.")

    if db.scalar(select(User).where(User.email == reg.email.lower())) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

    # 4. Atomic tenant & College Admin account creation (Spec 2.7 & 5.1)
    new_college = College(
        name=reg.college_name.strip(),
        domain=reg.domain.lower().strip(),
        status=CollegeStatus.PENDING_SETUP,
        subscription_status="pending_payment",
        subscription_plan="campus_monthly",
        subscription_amount=10000.00,
        contact_name=reg.admin_name.strip(),
        contact_mobile=reg.mobile_number,
        contact_mobile_verified=False,
        registered_at=now,
    )
    db.add(new_college)
    db.flush()

    admin_user = User(
        college_id=new_college.id,
        email=reg.email.lower().strip(),
        hashed_password=hash_password(payload.password),
        user_type=UserType.ADMIN,
        is_active=True,
        is_email_verified=True,
    )
    db.add(admin_user)
    db.flush()

    # Mark registration as completed
    reg.status = "completed"

    # Send initial welcome notification to the admin
    db.add(
        Notification(
            recipient_id=admin_user.id,
            type=NotificationType.SYSTEM,
            message=(
                f"Welcome to Placement Portal! '{new_college.name}' is registered in setup mode. "
                f"Follow the progressive checklist on your dashboard to configure your college for approval."
            ),
        )
    )

    access_token = create_access_token(
        subject=str(admin_user.id),
        user_type=admin_user.user_type.value,
        college_id=new_college.id,
    )
    refresh_token = create_refresh_token(
        subject=str(admin_user.id),
        user_type=admin_user.user_type.value,
        college_id=new_college.id,
    )

    db.commit()

    return {
        "message": "Institution registered successfully! Status: PENDING_SETUP",
        "redirect": "/login",
        "college_id": new_college.id,
        "college_name": new_college.name,
        "admin_name": reg.admin_name,
        "email": admin_user.email,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "subscription_required": True,
        "subscription_amount": 10000.00,
    }


@router.post("/signup/request-otp", response_model=OtpActionResponse)
async def signup_request_otp(payload: SignupRequestOtp, db: Session = Depends(get_db)) -> OtpActionResponse:
    # Validate that the student's email domain matches an active onboarded college
    _resolve_college_for_email(db, payload.email)

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

    college = _resolve_college_for_email(db, payload.email)

    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="An account with this email already exists")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        user_type=UserType.STUDENT,
        is_email_verified=True,
        college_id=college.id,
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
        college_id=current_user.college_id,
        college_name=current_user.college.name if current_user.college else None,
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
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == current_user.id)
        .values(is_revoked=True)
    )
    db.commit()

    return OtpActionResponse(message="Password changed successfully")


@router.post("/forgot-password/request-otp", response_model=OtpActionResponse)
async def forgot_password_request_otp(payload: OtpEmailRequest, db: Session = Depends(get_db)) -> OtpActionResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        return OtpActionResponse(message="If an account exists with this email, an OTP has been sent.")

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
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id)
        .values(is_revoked=True)
    )
    db.commit()

    return OtpActionResponse(message="Password reset successfully")


@router.get("/active-features", response_model=list[str])
def get_user_active_features(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[str]:
    """Return active feature codes for the current user's college.
    
    Used by frontend sidebar and routing to dynamically show/hide gated features.
    SuperAdmins have no college and return an empty list (SuperAdmin uses Command Deck).
    """
    if current_user.user_type == UserType.SUPERADMIN or current_user.college_id is None:
        return []
    return get_active_features_for_college(db, current_user.college_id)
