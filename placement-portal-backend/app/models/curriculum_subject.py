"""curriculum_subjects table — verified academic subjects per college/branch/semester."""
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CurriculumSubject(Base):
    __tablename__ = "curriculum_subjects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    college_id: Mapped[int] = mapped_column(ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    source_upload_id: Mapped[Optional[int]] = mapped_column(ForeignKey("curriculum_uploads.id", ondelete="SET NULL"), nullable=True, index=True)
    branch_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    semester_number: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    subject_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    is_prioritized: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    college: Mapped["College"] = relationship(back_populates="curriculum_subjects")
    upload: Mapped[Optional["CurriculumUpload"]] = relationship(back_populates="subjects")
    curated_resources: Mapped[list["CuratedSubjectResource"]] = relationship(back_populates="subject", cascade="all, delete-orphan")
