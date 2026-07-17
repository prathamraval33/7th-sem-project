"""contact_messages table — public Contact Us submissions, routed by category."""
import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ContactCategory(str, enum.Enum):
    GENERAL = "general"
    PLACEMENT = "placement"


class ContactStatus(str, enum.Enum):
    NEW = "new"
    READ = "read"
    RESOLVED = "resolved"


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[ContactCategory] = mapped_column(
        SAEnum(ContactCategory, name="contact_category_enum", values_callable=lambda obj: [e.value for e in obj]), nullable=False
    )
    submitted_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[ContactStatus] = mapped_column(
        SAEnum(ContactStatus, name="contact_status_enum", values_callable=lambda obj: [e.value for e in obj]), default=ContactStatus.NEW, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    submitted_by: Mapped[Optional["User"]] = relationship(back_populates="contact_messages")
