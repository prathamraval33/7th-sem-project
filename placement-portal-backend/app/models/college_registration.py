"""college_registrations table — transient registration records before OTP and password completion.

Holds unverified college onboarding attempts for up to 48 hours. After 48 hours without
verification, records expire and release domain reservations per Spec 2.9.
"""
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CollegeRegistration(Base):
    __tablename__ = "college_registrations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    college_name: Mapped[str] = mapped_column(String(255), nullable=False)
    admin_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    domain: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    mobile_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending_otp", nullable=False)  # pending_otp, verified, completed, expired
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
