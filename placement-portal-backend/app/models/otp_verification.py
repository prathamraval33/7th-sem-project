"""otp_verifications table — backs signup, forgot-password, and change-password OTP flows."""
import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class OtpPurpose(str, enum.Enum):
    SIGNUP = "signup"
    FORGOT_PASSWORD = "forgot_password"
    # ASSUMPTION: the master prompt's compact table listing only names
    # signup/forgot_password, but its own "Change password" auth flow
    # section requires a third purpose (`purpose=change_password`) on this
    # same table. Added here so that flow is actually implementable later.
    CHANGE_PASSWORD = "change_password"


class OtpVerification(Base):
    __tablename__ = "otp_verifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    otp_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    purpose: Mapped[OtpPurpose] = mapped_column(SAEnum(OtpPurpose, name="otp_purpose_enum", values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
