"""profiles table — student-only academic/skill profile."""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    # Auto-derived from the email prefix (e.g. "23IT408" from
    # "23it408@bvmengineering.ac.in"); populated by the auth/profile service
    # in a later phase, read-only from the frontend's perspective.
    student_id: Mapped[str] = mapped_column(String(50), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    branch: Mapped[str] = mapped_column(String(100), nullable=False)
    cgpa: Mapped[float] = mapped_column(Float, nullable=False)
    active_backlogs: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tenth_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    twelfth_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    competitive_exam_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    competitive_exam_percentile: Mapped[float | None] = mapped_column(Float, nullable=True)
    skills: Mapped[list | None] = mapped_column(JSON, nullable=True)
    is_placed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    placement_lock_override: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="profile")
