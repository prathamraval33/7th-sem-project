"""features table — master catalog of optional platform features."""
import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class FeatureStatus(str, enum.Enum):
    ACTIVE = "active"
    DEPRECATED = "deprecated"


class BillingType(str, enum.Enum):
    ONE_TIME = "one_time"
    MONTHLY = "monthly"
    ANNUAL = "annual"


class Feature(Base):
    __tablename__ = "features"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="General", nullable=False)
    target_role: Mapped[str] = mapped_column(String(100), default="Student", nullable=False)
    # Price in INR — null or 0 means free (payment step is skipped entirely).
    price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True, default=None)
    billing_type: Mapped[BillingType] = mapped_column(
        SAEnum(BillingType, name="billing_type_enum", values_callable=lambda obj: [e.value for e in obj]),
        default=BillingType.ONE_TIME,
        nullable=False,
    )
    # CROSS-CUTTING REQUIREMENT: the College Admin "browse available features" endpoint
    # must filter status == DEPRECATED out of what's requestable,
    # while endpoints reporting a college's already-enabled features must keep showing them.
    status: Mapped[FeatureStatus] = mapped_column(
        SAEnum(FeatureStatus, name="feature_status_enum", values_callable=lambda obj: [e.value for e in obj]),
        default=FeatureStatus.ACTIVE,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    college_associations: Mapped[list["CollegeFeature"]] = relationship(
        back_populates="feature", cascade="all, delete-orphan"
    )

