"""colleges table — platform institutions in the multi-tenant architecture."""
import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CollegeStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"


class College(Base):
    __tablename__ = "colleges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    domain: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    status: Mapped[CollegeStatus] = mapped_column(
        SAEnum(CollegeStatus, name="college_status_enum", values_callable=lambda obj: [e.value for e in obj]),
        default=CollegeStatus.ACTIVE,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    users: Mapped[list["User"]] = relationship(back_populates="college", cascade="all, delete-orphan")
    drives: Mapped[list["Drive"]] = relationship(back_populates="college", cascade="all, delete-orphan")
    resources: Mapped[list["Resource"]] = relationship(back_populates="college", cascade="all, delete-orphan")
    feature_requests: Mapped[list["CollegeFeature"]] = relationship(back_populates="college", cascade="all, delete-orphan")
