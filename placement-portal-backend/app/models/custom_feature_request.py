"""custom_feature_requests table — proposals for new platform features submitted by College Admins to SuperAdmin."""
import enum
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CustomFeatureStatus(str, enum.Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DECLINED = "declined"


class CustomFeatureRequest(Base):
    __tablename__ = "custom_feature_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    college_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True
    )
    admin_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    target_user: Mapped[str] = mapped_column(String(50), nullable=False, default="all")
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="General")
    priority: Mapped[str] = mapped_column(String(50), nullable=False, default="medium")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")

    superadmin_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    college: Mapped["College"] = relationship("College")
    admin: Mapped["User"] = relationship("User")

    @property
    def college_name(self) -> str | None:
        return self.college.name if self.college else None

    @property
    def admin_email(self) -> str | None:
        return self.admin.email if self.admin else None

