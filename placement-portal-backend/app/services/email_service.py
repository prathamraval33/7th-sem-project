"""Sends OTP + notification emails via fastapi-mail, configured from the
SMTP_* settings wired in Phase 1's config.py.
"""
import logging

from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

from app.core.config import settings
from app.models.otp_verification import OtpPurpose

logger = logging.getLogger(__name__)

_PURPOSE_SUBJECTS = {
    OtpPurpose.SIGNUP: "Verify your email — Placement Portal",
    OtpPurpose.FORGOT_PASSWORD: "Reset your password — Placement Portal",
    OtpPurpose.CHANGE_PASSWORD: "Confirm your password change — Placement Portal",
}


def _get_connection_config() -> ConnectionConfig:
    return ConnectionConfig(
        MAIL_USERNAME=settings.SMTP_USERNAME,
        MAIL_PASSWORD=settings.SMTP_PASSWORD,
        MAIL_FROM=settings.SMTP_FROM_EMAIL,
        MAIL_FROM_NAME=settings.SMTP_FROM_NAME,
        MAIL_PORT=settings.SMTP_PORT,
        MAIL_SERVER=settings.SMTP_HOST,
        MAIL_STARTTLS=settings.SMTP_USE_TLS,
        MAIL_SSL_TLS=not settings.SMTP_USE_TLS,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
    )


async def send_otp_email(to_email: str, otp: str, purpose: OtpPurpose) -> None:
    subject = _PURPOSE_SUBJECTS.get(purpose, "Your verification code — Placement Portal")
    body = (
        f"<p>Your one-time verification code is:</p>"
        f"<h2>{otp}</h2>"
        f"<p>This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>"
    )

    message = MessageSchema(
        subject=subject,
        recipients=[to_email],
        body=body,
        subtype=MessageType.html,
    )

    fm = FastMail(_get_connection_config())
    try:
        await fm.send_message(message)
    except Exception:
        # Never let an email delivery failure surface as a raw 500 to the
        # caller's caller — log it; the OTP record still exists and the
        # user can request a resend.
        logger.exception("Failed to send OTP email to %s", to_email)
        raise


async def send_notification_email(to_email: str, subject: str, body_html: str) -> None:
    message = MessageSchema(
        subject=subject,
        recipients=[to_email],
        body=body_html,
        subtype=MessageType.html,
    )

    fm = FastMail(_get_connection_config())
    try:
        await fm.send_message(message)
    except Exception:
        logger.exception("Failed to send notification email to %s", to_email)
        raise
