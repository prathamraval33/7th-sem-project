"""fee_receipts table — placement fee receipt upload + OCR/Groq legitimacy verdict."""
import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, Float, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class FeeVerdict(str, enum.Enum):
    VALID = "valid"
    INVALID = "invalid"


class FeeReceipt(Base):
    __tablename__ = "fee_receipts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_verdict: Mapped[FeeVerdict | None] = mapped_column(SAEnum(FeeVerdict, name="fee_verdict_enum", values_callable=lambda obj: [e.value for e in obj]), nullable=True)
    ai_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Template-matched verification & TPO manual review extensions
    matched_against_template_id: Mapped[int | None] = mapped_column(
        ForeignKey("fee_receipt_templates.id", ondelete="SET NULL"), nullable=True
    )
    structural_match_result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    content_valid_result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    verified_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    user: Mapped["User"] = relationship(back_populates="fee_receipts", foreign_keys=[user_id])
    matched_template: Mapped["FeeReceiptTemplate | None"] = relationship(foreign_keys=[matched_against_template_id])
    verifier: Mapped["User | None"] = relationship(foreign_keys=[verified_by])

