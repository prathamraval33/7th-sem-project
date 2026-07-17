"""questions table — individual questions belonging to a mock interview session."""
import enum

from sqlalchemy import Enum as SAEnum, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class QuestionType(str, enum.Enum):
    APTITUDE = "aptitude"
    TECHNICAL = "technical"
    CODING = "coding"
    HR = "hr"


class DifficultyLevel(str, enum.Enum):
    # ASSUMPTION: master prompt leaves `difficulty` un-enumerated; these
    # three levels are the standard sensible set.
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    q_type: Mapped[QuestionType] = mapped_column(SAEnum(QuestionType, name="question_type_enum", values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    difficulty: Mapped[DifficultyLevel] = mapped_column(
        SAEnum(DifficultyLevel, name="difficulty_level_enum", values_callable=lambda obj: [e.value for e in obj]), nullable=False
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)

    session: Mapped["InterviewSession"] = relationship(back_populates="questions")
    answer: Mapped["Answer"] = relationship(back_populates="question", uselist=False, cascade="all, delete-orphan")
