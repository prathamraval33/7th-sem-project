"""answers table — a student's answer to a mock interview question."""
from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    answer_text: Mapped[str] = mapped_column(Text, nullable=False)
    ai_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    rating: Mapped[str | None] = mapped_column(String(20), nullable=True)
    what_was_missing: Mapped[str | None] = mapped_column(Text, nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)

    question: Mapped["Question"] = relationship(back_populates="answer")
