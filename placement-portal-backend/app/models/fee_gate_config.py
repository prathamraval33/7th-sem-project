"""fee_gate_config table — per-college toggle matrix for gating features to unverified students."""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class FeeGateConfig(Base):
    __tablename__ = "fee_gate_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    college_id: Mapped[int] = mapped_column(
        ForeignKey("colleges.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    browse_drives: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    apply_to_drives: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    official_tests: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    practice_tests: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    mock_interview_gen: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    mock_interview_drive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resume_analyzer: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    resume_enhancer: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    career_insights: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    verification_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    updated_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    college: Mapped["College"] = relationship(back_populates="fee_gate_config")
    updater: Mapped["User | None"] = relationship(foreign_keys=[updated_by])
