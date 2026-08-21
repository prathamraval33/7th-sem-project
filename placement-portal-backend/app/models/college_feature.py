"""college_features table — linking colleges and features with request/approval status."""
import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class FeatureRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


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
        default=FeatureRequestStatus.PENDING,
        nullable=False,
    )
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decided_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    college: Mapped["College"] = relationship(back_populates="feature_requests")
    feature: Mapped["Feature"] = relationship(back_populates="college_associations")
    decided_by_user: Mapped["User"] = relationship(foreign_keys=[decided_by])
