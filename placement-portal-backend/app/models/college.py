"""colleges table — platform institutions in the multi-tenant architecture."""
import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CollegeStatus(str, enum.Enum):
    PENDING_SETUP = "pending_setup"
    READY_FOR_REVIEW = "ready_for_review"
    ACTIVE = "active"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class College(Base):
    __tablename__ = "colleges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    domain: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    status: Mapped[CollegeStatus] = mapped_column(
        SAEnum(CollegeStatus, name="college_status_enum", values_callable=lambda obj: [e.value for e in obj]),
        default=CollegeStatus.ACTIVE,
        nullable=False,
    )
    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_mobile: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contact_mobile_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Institutional Subscription Fields (₹10,000 / month standard)
    subscription_status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    subscription_plan: Mapped[str] = mapped_column(String(50), default="campus_monthly", nullable=False)
    subscription_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=10000.00, nullable=False)
    subscription_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    subscription_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    users: Mapped[list["User"]] = relationship(back_populates="college", cascade="all, delete-orphan")
    drives: Mapped[list["Drive"]] = relationship(back_populates="college", cascade="all, delete-orphan")
    resources: Mapped[list["Resource"]] = relationship(back_populates="college", cascade="all, delete-orphan")
    feature_requests: Mapped[list["CollegeFeature"]] = relationship(back_populates="college", cascade="all, delete-orphan")
    curriculum_uploads: Mapped[list["CurriculumUpload"]] = relationship(back_populates="college", cascade="all, delete-orphan")
    curriculum_subjects: Mapped[list["CurriculumSubject"]] = relationship(back_populates="college", cascade="all, delete-orphan")
    curated_resources: Mapped[list["CuratedSubjectResource"]] = relationship(back_populates="college", cascade="all, delete-orphan")
