"""users table — all three roles (student, tpo, admin) share this table."""
import enum
from datetime import datetime

from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserType(str, enum.Enum):
    STUDENT = "student"
    TPO = "tpo"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    college_id: Mapped[int | None] = mapped_column(ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    user_type: Mapped[UserType] = mapped_column(SAEnum(UserType, name="user_type_enum", values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Student-only in practice; defaults false for tpo/admin and is simply unused for them.
    fee_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Multi-tenant college association (None for superadmin)
    college: Mapped[Optional["College"]] = relationship(back_populates="users")

    # One-to-one
    profile: Mapped["Profile"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    analytics: Mapped["Analytics"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    dashboard_insight: Mapped["DashboardInsight"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )

    # One-to-many
    fee_receipts: Mapped[list["FeeReceipt"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    resumes: Mapped[list["Resume"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    applications: Mapped[list["Application"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    interview_sessions: Mapped[list["InterviewSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    test_attempts: Mapped[list["TestAttempt"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    contact_messages: Mapped[list["ContactMessage"]] = relationship(back_populates="submitted_by")

    notifications_received: Mapped[list["Notification"]] = relationship(
        back_populates="recipient",
        foreign_keys="[Notification.recipient_id]",
        cascade="all, delete-orphan",
    )
    notifications_sent: Mapped[list["Notification"]] = relationship(
        back_populates="sender",
        foreign_keys="[Notification.sender_id]",
    )

    drives_created: Mapped[list["Drive"]] = relationship(
        back_populates="created_by_user", foreign_keys="[Drive.created_by]"
    )
    instant_tests_created: Mapped[list["InstantTest"]] = relationship(
        back_populates="created_by_user", foreign_keys="[InstantTest.created_by]"
    )
    resources_created: Mapped[list["Resource"]] = relationship(
        back_populates="created_by_user", foreign_keys="[Resource.created_by]"
    )
