"""resumes table — uploaded + AI-enhanced resume versions per student."""
import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ResumeSource(str, enum.Enum):
    UPLOADED = "uploaded"
    ENHANCED = "enhanced"


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    parsed_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[ResumeSource] = mapped_column(SAEnum(ResumeSource, name="resume_source_enum", values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    # Only one resume per student should be active at a time — enforced at
    # the service layer (later phase), not a DB constraint here.
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship(back_populates="resumes")
