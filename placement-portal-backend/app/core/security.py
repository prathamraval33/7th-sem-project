"""JWT creation/verification and password hashing utilities."""
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _create_token(
    subject: str, user_type: str, token_type: str, expires_delta: timedelta, college_id: int | None = None
) -> str:
    now = datetime.now(timezone.utc)
    to_encode: dict[str, Any] = {
        "sub": subject,
        "user_type": user_type,
        "type": token_type,
        "college_id": college_id,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_access_token(subject: str, user_type: str, college_id: int | None = None) -> str:
    return _create_token(
        subject,
        user_type,
        ACCESS_TOKEN_TYPE,
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        college_id=college_id,
    )


def create_refresh_token(subject: str, user_type: str, college_id: int | None = None) -> str:
    return _create_token(
        subject,
        user_type,
        REFRESH_TOKEN_TYPE,
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        college_id=college_id,
    )


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT's signature/expiry.

    Raises `jose.JWTError` (or a subclass) if the token is invalid or expired —
    callers are responsible for catching it.
    """
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


PURPOSE_TOKEN_EXPIRE_MINUTES = 15


def create_purpose_token(subject: str, purpose: str) -> str:
    """Short-lived, single-purpose JWT issued right after a successful OTP
    check (signup / forgot_password / change_password) so the next step of
    that flow can't be skipped. Not an access/refresh token — carries its
    own `purpose` claim instead of `type=access|refresh`.
    """
    now = datetime.now(timezone.utc)
    to_encode: dict[str, Any] = {
        "sub": subject,
        "purpose": purpose,
        "type": "purpose",
        "iat": now,
        "exp": now + timedelta(minutes=PURPOSE_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_purpose_token(token: str, expected_purpose: str) -> str:
    """Decodes a purpose token and returns its subject (email) if valid and
    matching `expected_purpose`. Raises `jose.JWTError` otherwise.
    """
    payload = decode_token(token)
    if payload.get("type") != "purpose" or payload.get("purpose") != expected_purpose:
        raise JWTError("Token is not valid for this action")
    return payload["sub"]
