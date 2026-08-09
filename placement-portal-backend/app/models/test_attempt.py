"""test_attempts table — a student's attempt at an instant test."""
import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, Float, ForeignKey, Integer, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AttemptEndedReason(str, enum.Enum):
    COMPLETED = "completed"
    TIMEOUT = "timeout"
    VIOLATION_LIMIT = "violation_limit"


class TestAttempt(Base):
    __tablename__ = "test_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    test_id: Mapped[int] = mapped_column(ForeignKey("instant_tests.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    answers: Mapped[dict] = mapped_column(JSON, nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    weak_areas: Mapped[list | None] = mapped_column(JSON, nullable=True)
    total_violation_count: Mapped[int] = mapped_column(Integer, server_default="0", default=0, nullable=False)
    ended_reason: Mapped[AttemptEndedReason | None] = mapped_column(
        SAEnum(AttemptEndedReason, name="attempt_ended_reason_enum", values_callable=lambda obj: [e.value for e in obj]),
        nullable=True,
    )
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    test: Mapped["InstantTest"] = relationship(back_populates="attempts")
    user: Mapped["User"] = relationship(back_populates="test_attempts")
    violations: Mapped[list["TestViolation"]] = relationship(back_populates="attempt", cascade="all, delete-orphan")
