"""drives table — a company's placement drive with structured eligibility criteria."""
import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, Float, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DriveStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"


class DriveTestStatus(str, enum.Enum):
    NOT_CREATED = "not_created"
    OPEN = "open"
    CLOSED = "closed"


class Drive(Base):
    __tablename__ = "drives"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    college_id: Mapped[int] = mapped_column(ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(255), nullable=False)
    jd_text: Mapped[str] = mapped_column(Text, nullable=False)
    placement_type: Mapped[str | None] = mapped_column(String(100), default="Internship + Placement", nullable=True)
    student_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    min_ctc: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_ctc: Mapped[float | None] = mapped_column(Float, nullable=True)
    # min_cgpa, max_backlogs, department_list, min_tenth, min_twelfth, min_percentile
    eligibility_criteria: Mapped[dict] = mapped_column(JSON, nullable=False)
    bond_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[DriveStatus] = mapped_column(
        SAEnum(DriveStatus, name="drive_status_enum", values_callable=lambda obj: [e.value for e in obj]), default=DriveStatus.OPEN, nullable=False
    )
    test_status: Mapped[DriveTestStatus] = mapped_column(
        SAEnum(DriveTestStatus, name="drive_test_status_enum", values_callable=lambda obj: [e.value for e in obj]), default=DriveTestStatus.NOT_CREATED, nullable=False
    )
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    college: Mapped["College"] = relationship(back_populates="drives")
    company: Mapped["Company"] = relationship(back_populates="drives")
    created_by_user: Mapped["User"] = relationship(back_populates="drives_created", foreign_keys=[created_by])
    applications: Mapped[list["Application"]] = relationship(back_populates="drive", cascade="all, delete-orphan")
    interview_sessions: Mapped[list["InterviewSession"]] = relationship(back_populates="drive")
    instant_tests: Mapped[list["InstantTest"]] = relationship(back_populates="drive")
