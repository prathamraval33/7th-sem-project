"""Shared validation helpers reused across schema files — not one of the 16
named entity schema files itself, just a small internal helper (mirrors how
enums are centralized in app/models) to avoid duplicating the same regex in
every file.
"""
import re
from typing import Annotated

from pydantic import AfterValidator

BVM_EMAIL_PATTERN = re.compile(r"^[A-Za-z0-9._%+-]+@bvmengineering\.ac\.in$", re.IGNORECASE)
OTP_PATTERN = re.compile(r"^\d{6}$")


def validate_bvm_email(value: str) -> str:
    """Strictly anchored to the exact `@bvmengineering.ac.in` domain (case
    insensitive) — rejects subdomains/lookalikes, not just an `.endswith()`
    check, per the master prompt's security requirement.
    """
    if not BVM_EMAIL_PATTERN.match(value):
        raise ValueError("Email must be a valid @bvmengineering.ac.in address")
    return value.lower()


def validate_password_strength(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not any(char.isdigit() for char in value):
        raise ValueError("Password must contain at least one number")
    return value


def validate_otp_code(value: str) -> str:
    if not OTP_PATTERN.match(value):
        raise ValueError("OTP must be exactly 6 numeric digits")
    return value


BvmEmail = Annotated[str, AfterValidator(validate_bvm_email)]
StrongPassword = Annotated[str, AfterValidator(validate_password_strength)]
OtpCode = Annotated[str, AfterValidator(validate_otp_code)]
