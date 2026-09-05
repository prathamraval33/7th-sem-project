"""college_features table — linking colleges and features with request/approval/payment status."""
import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Integer, Numeric, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class FeatureRequestStatus(str, enum.Enum):
    # Full lifecycle — see implementation_plan.md §1.2 for transition rules.
    PENDING_REVIEW = "pending_review"
    REJECTED = "rejected"
    APPROVED_AWAITING_PAYMENT = "approved_awaiting_payment"
    ACTIVE = "active"
    PAYMENT_FAILED = "payment_failed"
    EXPIRED = "expired"
    APPROVAL_EXPIRED = "approval_expired"
    REVOKED = "revoked"


class CollegeFeature(Base):
    __tablename__ = "college_features"
    __table_args__ = (
        UniqueConstraint("college_id", "feature_id", name="uq_college_feature"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    college_id: Mapped[int] = mapped_column(ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    feature_id: Mapped[int] = mapped_column(ForeignKey("features.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[FeatureRequestStatus] = mapped_column(
        SAEnum(FeatureRequestStatus, name="feature_request_status_enum", values_callable=lambda obj: [e.value for e in obj]),
        default=FeatureRequestStatus.PENDING_REVIEW,
        nullable=False,
    )
    # Amount actually charged (populated when payment succeeds)
    amount_charged: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True, default=None)
    # Key timestamps — each set at the appropriate lifecycle transition
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Only populated for monthly/annual billing — when this date passes, status flips to EXPIRED.
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Payment deadline for approved_awaiting_payment (7 days after approval) — flips to APPROVAL_EXPIRED if passed.
    payment_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Tracking for reminder nudges sent by SuperAdmin
    reminder_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_reminder_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decided_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    # True for BVM auto-granted features — excluded from revenue analytics.
    is_auto_granted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    college: Mapped["College"] = relationship(back_populates="feature_requests")
    feature: Mapped["Feature"] = relationship(back_populates="college_associations")
    decided_by_user: Mapped["User"] = relationship(foreign_keys=[decided_by])

