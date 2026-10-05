"""Schemas covering `interview_sessions`, `questions`, and `answers` —
grouped into one file per the master prompt's frontend/backend folder
structure ("interview.py").
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.interview_session import InterviewMode, InterviewSessionStatus
from app.models.question import DifficultyLevel, QuestionType


class MockInterviewStartRequest(BaseModel):
    company_name: str
    skills: list[str] = []
    mode: InterviewMode
    difficulty_level: str = "fresher"
    drive_id: Optional[int] = None


class MockInterviewFromResumeRequest(BaseModel):
    resume_id: int
    company_name: str
    difficulty_level: str = "fresher"


class AnswerSubmitRequest(BaseModel):
    answer_text: str


class QuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_text: str
    q_type: QuestionType
    difficulty: DifficultyLevel
    order_index: int
    total_questions: int = 10
    resume_reference: Optional[str] = None


class AnswerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_id: int
    answer_text: str
    ai_feedback: Optional[str] = None
    rating: Optional[str] = None
    what_was_missing: Optional[str] = None
    interviewer_note_reveal: Optional[str] = None
    score: Optional[float] = None


class InterviewSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    drive_id: Optional[int] = None
    company_name: str
    skills: list[str] = []
    mode: InterviewMode
    difficulty_level: str = "fresher"
    overall_score: Optional[float] = None
    weak_areas: Optional[list[str]] = None
    status: InterviewSessionStatus
    created_at: datetime


class MockInterviewResultResponse(InterviewSessionResponse):
    """GET /mock-interview/{session_id}/result — the session plus its full
    question/answer trail.
    """

    questions: list[QuestionResponse] = []
    answers: list[AnswerResponse] = []
    rating_distribution: Optional[dict[str, int]] = None
