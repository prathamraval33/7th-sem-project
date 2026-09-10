"""curated_subject_resources table — AI-curated books, articles, and videos for curriculum subjects."""
import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SubjectResourceType(str, enum.Enum):
    BOOK = "book"
    ARTICLE = "article"
    VIDEO = "video"


class CurationApprovalStatus(str, enum.Enum):
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class CuratedSubjectResource(Base):
    __tablename__ = "curated_subject_resources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("curriculum_subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    college_id: Mapped[int] = mapped_column(ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_type: Mapped[SubjectResourceType] = mapped_column(
        SAEnum(SubjectResourceType, name="subject_resource_type_enum", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    link: Mapped[str] = mapped_column(String(1000), nullable=False)
    ai_summary: Mapped[str] = mapped_column(Text, nullable=False)
    approval_status: Mapped[CurationApprovalStatus] = mapped_column(
        SAEnum(CurationApprovalStatus, name="curation_approval_status_enum", values_callable=lambda obj: [e.value for e in obj]),
        default=CurationApprovalStatus.PENDING_REVIEW,
        nullable=False,
    )
    reviewed_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    subject: Mapped["CurriculumSubject"] = relationship(back_populates="curated_resources")
    college: Mapped["College"] = relationship(back_populates="curated_resources")
    reviewer: Mapped[Optional["User"]] = relationship()
