"""applications table — a student's application to a drive."""
import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ApplicationStatus(str, enum.Enum):
    APPLIED = "applied"
    ELIGIBLE = "eligible"
    NOT_ELIGIBLE = "not_eligible"
    SHORTLISTED = "shortlisted"
    REJECTED = "rejected"
    SELECTED = "selected"
    WITHDRAWN = "withdrawn"


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    drive_id: Mapped[int] = mapped_column(ForeignKey("drives.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[ApplicationStatus] = mapped_column(
        SAEnum(ApplicationStatus, name="application_status_enum", values_callable=lambda obj: [e.value for e in obj]),
        default=ApplicationStatus.APPLIED,
        nullable=False,
    )
    current_stage: Mapped[str | None] = mapped_column(String(100), nullable=True)
    package_offered: Mapped[float | None] = mapped_column(Float, nullable=True)
    applied_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship(back_populates="applications")
    drive: Mapped["Drive"] = relationship(back_populates="applications")
