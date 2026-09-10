"""curriculum_uploads table — tracks curriculum PDF documents uploaded by College Admins."""
import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CurriculumExtractionStatus(str, enum.Enum):
    PROCESSING = "processing"
    READY_FOR_REVIEW = "ready_for_review"
    CONFIRMED = "confirmed"
    FAILED = "failed"


class CurriculumUpload(Base):
    __tablename__ = "curriculum_uploads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    college_id: Mapped[int] = mapped_column(ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    extraction_status: Mapped[CurriculumExtractionStatus] = mapped_column(
        SAEnum(CurriculumExtractionStatus, name="curriculum_extraction_status_enum", values_callable=lambda obj: [e.value for e in obj]),
        default=CurriculumExtractionStatus.PROCESSING,
        nullable=False,
    )
    raw_extracted_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    college: Mapped["College"] = relationship(back_populates="curriculum_uploads")
    uploader: Mapped["User"] = relationship()
    subjects: Mapped[list["CurriculumSubject"]] = relationship(back_populates="upload", cascade="all, delete-orphan")
