"""test_violations table — tracking anti-cheating/proctoring violations per test attempt."""
import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ViolationType(str, enum.Enum):
    TAB_SWITCH = "tab_switch"
    COPY_ATTEMPT = "copy_attempt"
    DEVTOOLS = "devtools"
    NOISE = "noise"
    FACE_AWAY = "face_away"
    NO_FACE = "no_face"
    MULTI_FACE = "multi_face"
    SCREENSHOT_ATTEMPT = "screenshot_attempt"


class TestViolation(Base):
    __tablename__ = "test_violations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    attempt_id: Mapped[int] = mapped_column(
        ForeignKey("test_attempts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    violation_type: Mapped[ViolationType] = mapped_column(
        SAEnum(ViolationType, name="violation_type_enum", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
    )
    strike_number: Mapped[int] = mapped_column(Integer, nullable=False)
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    attempt: Mapped["TestAttempt"] = relationship(back_populates="violations")
