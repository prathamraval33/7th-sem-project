"""transactions table — payment ledger for feature purchases/renewals.

A single college-feature relationship may have MULTIPLE transactions over time
(initial payment, monthly renewals, refunds). Each row is one Razorpay payment
attempt or event.
"""
import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TransactionStatus(str, enum.Enum):
    CREATED = "created"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    college_id: Mapped[int | None] = mapped_column(ForeignKey("colleges.id", ondelete="CASCADE"), nullable=True, index=True)
    feature_id: Mapped[int | None] = mapped_column(ForeignKey("features.id", ondelete="CASCADE"), nullable=True, index=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    status: Mapped[TransactionStatus] = mapped_column(
        SAEnum(TransactionStatus, name="transaction_status_enum", values_callable=lambda obj: [e.value for e in obj]),
        default=TransactionStatus.CREATED,
        nullable=False,
    )
    razorpay_order_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    razorpay_signature: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # True for BVM auto-grant test data — excluded from revenue analytics.
    is_test_data: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    college: Mapped["College"] = relationship()
    feature: Mapped["Feature"] = relationship()
