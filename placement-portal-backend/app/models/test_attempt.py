"""test_attempts table — a student's attempt at an instant test."""
import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, Float, ForeignKey, Integer, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AttemptStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ENDED = "ended"


class AttemptEndedReason(str, enum.Enum):
    COMPLETED = "completed"
    TIMEOUT = "timeout"
    VIOLATION_LIMIT = "violation_limit"
    SESSION_REPLACED = "session_replaced"


class TestAttempt(Base):
    __tablename__ = "test_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    test_id: Mapped[int] = mapped_column(ForeignKey("instant_tests.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[AttemptStatus] = mapped_column(
        SAEnum(AttemptStatus, name="attempt_status_enum", values_callable=lambda obj: [e.value for e in obj]),
        default=AttemptStatus.IN_PROGRESS,
        nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_heartbeat_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    question_order: Mapped[list | None] = mapped_column(JSON, nullable=True)
    option_order_map: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    answers: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    weak_areas: Mapped[list | None] = mapped_column(JSON, nullable=True)
    total_violation_count: Mapped[int] = mapped_column(Integer, server_default="0", default=0, nullable=False)
    ended_reason: Mapped[AttemptEndedReason | None] = mapped_column(
        SAEnum(AttemptEndedReason, name="attempt_ended_reason_enum", values_callable=lambda obj: [e.value for e in obj]),
        nullable=True,
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    test: Mapped["InstantTest"] = relationship(back_populates="attempts")
    user: Mapped["User"] = relationship(back_populates="test_attempts")
    violations: Mapped[list["TestViolation"]] = relationship(back_populates="attempt", cascade="all, delete-orphan")
