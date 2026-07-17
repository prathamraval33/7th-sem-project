"""instant_tests table — TPO-created AI-generated tests, optionally tied to a drive."""
import enum
from typing import Optional

from sqlalchemy import Boolean, Enum as SAEnum, ForeignKey, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class InstantTestStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"


class InstantTest(Base):
    __tablename__ = "instant_tests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    drive_id: Mapped[int | None] = mapped_column(ForeignKey("drives.id", ondelete="CASCADE"), nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    # Topics/difficulty/company need as described by the TPO.
    prompt_config: Mapped[dict] = mapped_column(JSON, nullable=False)
    questions: Mapped[list] = mapped_column(JSON, nullable=False)
    min_passing_marks: Mapped[int] = mapped_column(Integer, nullable=False)
    use_top_n: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    top_n_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[InstantTestStatus] = mapped_column(
        SAEnum(InstantTestStatus, name="instant_test_status_enum", values_callable=lambda obj: [e.value for e in obj]),
        default=InstantTestStatus.OPEN,
        nullable=False,
    )

    drive: Mapped[Optional["Drive"]] = relationship(back_populates="instant_tests")
    created_by_user: Mapped["User"] = relationship(
        back_populates="instant_tests_created", foreign_keys=[created_by]
    )
    attempts: Mapped[list["TestAttempt"]] = relationship(back_populates="test", cascade="all, delete-orphan")
