"""Generate/hash/verify/expire signup, forgot-password, and change-password
OTPs. Reuses the same bcrypt context as user passwords (core/security.py)
rather than introducing a second hashing scheme.
"""
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.otp_verification import OtpPurpose, OtpVerification
from app.utils.exceptions import OtpExpiredError, OtpInvalidError, OtpRateLimitError

# Business-rule constants (not exposed as env vars — Phase 1's config.py
# already fixes the exact set of configurable settings; these are fixed
# application behavior, not deployment-specific config).
OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 10
OTP_RATE_LIMIT_MAX_REQUESTS = 3
OTP_RATE_LIMIT_WINDOW_MINUTES = 15


def _generate_otp_code() -> str:
    """Cryptographically-random 6-digit numeric OTP (never `random`)."""
    return "".join(str(secrets.randbelow(10)) for _ in range(OTP_LENGTH))


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def check_rate_limit(db: Session, email: str, purpose: OtpPurpose) -> None:
    window_start = _utcnow() - timedelta(minutes=OTP_RATE_LIMIT_WINDOW_MINUTES)
    recent_count = db.scalar(
        select(func.count()).select_from(OtpVerification).where(
            OtpVerification.email == email,
            OtpVerification.purpose == purpose,
            OtpVerification.created_at >= window_start,
        )
    )
    if recent_count is not None and recent_count >= OTP_RATE_LIMIT_MAX_REQUESTS:
        raise OtpRateLimitError()


def create_otp(db: Session, email: str, purpose: OtpPurpose) -> str:
    """Checks the rate limit, generates+hashes+stores a new OTP, and returns
    the *plaintext* code so the caller (email_service) can send it — it is
    never persisted in plaintext.
    """
    check_rate_limit(db, email, purpose)

    plaintext_otp = _generate_otp_code()
    record = OtpVerification(
        email=email,
        otp_hash=hash_password(plaintext_otp),
        purpose=purpose,
        expires_at=_utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES),
        is_used=False,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return plaintext_otp


def verify_otp(db: Session, email: str, otp: str, purpose: OtpPurpose) -> OtpVerification:
    """Validates against the most recent unused OTP for this email+purpose.
    Marks it used on success so it can never be replayed.
    """
    record = db.scalar(
        select(OtpVerification)
        .where(
            OtpVerification.email == email,
            OtpVerification.purpose == purpose,
            OtpVerification.is_used.is_(False),
        )
        .order_by(OtpVerification.created_at.desc())
    )

    if record is None or not verify_password(otp, record.otp_hash):
        raise OtpInvalidError()

    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < _utcnow():
        raise OtpExpiredError()

    record.is_used = True
    db.commit()
    db.refresh(record)

    return record
