"""interview_sessions table — an AI mock interview session."""
import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum as SAEnum, Float, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class InterviewMode(str, enum.Enum):
    APTITUDE = "aptitude"
    TECHNICAL = "technical"
    CODING = "coding"
    HR = "hr"
    FULL = "full"


class InterviewSessionStatus(str, enum.Enum):
    # ASSUMPTION: the master prompt lists a plain `status` field with no
    # enumerated values for this table; these three states are the minimum
    # needed to support the documented one-question-at-a-time flow.
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    drive_id: Mapped[int | None] = mapped_column(ForeignKey("drives.id", ondelete="SET NULL"), nullable=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    # ASSUMPTION: master prompt's "stack/skills" field stored as a JSON
    # array of skill/stack strings, mirroring profiles.skills.
    skills: Mapped[list | None] = mapped_column(JSON, nullable=True)
    mode: Mapped[InterviewMode] = mapped_column(SAEnum(InterviewMode, name="interview_mode_enum", values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    weak_areas: Mapped[list | None] = mapped_column(JSON, nullable=True)
    status: Mapped[InterviewSessionStatus] = mapped_column(
        SAEnum(InterviewSessionStatus, name="interview_session_status_enum", values_callable=lambda obj: [e.value for e in obj]),
        default=InterviewSessionStatus.IN_PROGRESS,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship(back_populates="interview_sessions")
    drive: Mapped[Optional["Drive"]] = relationship(back_populates="interview_sessions")
    questions: Mapped[list["Question"]] = relationship(back_populates="session", cascade="all, delete-orphan")
