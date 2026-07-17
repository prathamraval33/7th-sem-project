"""dashboard_insights table — cached Live Career Insights (external + AI) per student."""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DashboardInsight(Base):
    __tablename__ = "dashboard_insights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    external_opportunities: Mapped[list | None] = mapped_column(JSON, nullable=True)
    resume_suggestions: Mapped[list | None] = mapped_column(JSON, nullable=True)
    trending_skills: Mapped[list | None] = mapped_column(JSON, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_manual_refresh_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="dashboard_insight")
