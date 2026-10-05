"""AI mock interview — one question at a time, powered by interview_engine.py."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_student
from app.core.feature_gating import require_feature
from app.db.session import get_db
from app.models.interview_session import InterviewMode, InterviewSession, InterviewSessionStatus
from app.models.question import Question
from app.models.resume import Resume
from app.models.user import User
from app.schemas.interview import (
    AnswerResponse,
    AnswerSubmitRequest,
    MockInterviewFromResumeRequest,
    MockInterviewResultResponse,
    MockInterviewStartRequest,
    QuestionResponse,
)
from app.services import interview_engine, scoring

router = APIRouter(
    prefix="/mock-interview",
    tags=["mock-interview"],
    dependencies=[Depends(require_feature("mock_interviews"))],
)


class StartSessionResponse(QuestionResponse):
    session_id: int


class AnswerSubmitResponse(BaseModel):
    answer: AnswerResponse
    next_question: Optional[QuestionResponse] = None
    session_status: InterviewSessionStatus
    total_questions: int = interview_engine.MAX_INTERVIEW_QUESTIONS


@router.post("/start", response_model=StartSessionResponse, status_code=status.HTTP_201_CREATED)
async def start_mock_interview(
    payload: MockInterviewStartRequest,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> StartSessionResponse:
    session, question = await interview_engine.start_session(
        db,
        current_user.id,
        company_name=payload.company_name,
        skills=payload.skills,
        mode=payload.mode,
        difficulty_level=payload.difficulty_level,
        drive_id=payload.drive_id,
    )
    return StartSessionResponse(**QuestionResponse.model_validate(question).model_dump(), session_id=session.id)


@router.post("/from-resume", response_model=StartSessionResponse, status_code=status.HTTP_201_CREATED)
async def start_mock_interview_from_resume(
    payload: MockInterviewFromResumeRequest,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> StartSessionResponse:
    resume = db.get(Resume, payload.resume_id)
    if resume is None or resume.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Resume not found")
    if not resume.parsed_text:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="This resume has no extracted text to build questions from")

    # Part 2: pass full parsed text (up to 4000 chars) to ground questions in actual projects/experience
    resume_text = resume.parsed_text[:4000]

    session, question = await interview_engine.start_session(
        db,
        current_user.id,
        company_name=payload.company_name,
        skills=[],
        mode=InterviewMode.RESUME,
        difficulty_level=payload.difficulty_level,
        resume_text=resume_text,
    )
    return StartSessionResponse(**QuestionResponse.model_validate(question).model_dump(), session_id=session.id)


@router.post("/{session_id}/answer", response_model=AnswerSubmitResponse)
async def submit_answer(
    session_id: int,
    payload: AnswerSubmitRequest,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    session = db.get(InterviewSession, session_id)
    if session is None or session.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Interview session not found")
    if session.status != InterviewSessionStatus.IN_PROGRESS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="This interview session has already ended")

    current_question = db.scalar(
        select(Question)
        .where(Question.session_id == session_id)
        .order_by(Question.order_index.desc())
    )
    if current_question is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No active question for this session")
    if current_question.answer is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="This question has already been answered")

    answer, next_question, interviewer_note_reveal = await interview_engine.submit_answer(
        db, session, current_question, payload.answer_text
    )

    if session.status == InterviewSessionStatus.COMPLETED:
        scoring.update_analytics(db, current_user.id)

    answer_resp = AnswerResponse.model_validate(answer)
    answer_resp.interviewer_note_reveal = interviewer_note_reveal

    return AnswerSubmitResponse(
        answer=answer_resp,
        next_question=QuestionResponse.model_validate(next_question) if next_question else None,
        session_status=session.status,
    )


@router.get("/{session_id}/next-question", response_model=Optional[QuestionResponse])
def get_next_question(
    session_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> Question | None:
    session = db.get(InterviewSession, session_id)
    if session is None or session.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Interview session not found")

    if session.status == InterviewSessionStatus.COMPLETED:
        return None

    return db.scalar(
        select(Question).where(Question.session_id == session_id).order_by(Question.order_index.desc())
    )


@router.get("/{session_id}/result", response_model=MockInterviewResultResponse)
def get_mock_interview_result(
    session_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> MockInterviewResultResponse:
    session = db.get(InterviewSession, session_id)
    if session is None or session.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Interview session not found")
    if session.status == InterviewSessionStatus.IN_PROGRESS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="This interview is still in progress")

    answers = [question.answer for question in session.questions if question.answer is not None]

    rating_counts = {
        "interview_ready": 0,
        "good": 0,
        "somewhat_closer": 0,
        "not_relevant": 0,
    }

    q_map = {q.id: q for q in session.questions}
    answer_responses = []
    for a in answers:
        a_resp = AnswerResponse.model_validate(a)
        q = q_map.get(a.question_id)
        if q and q.interviewer_note:
            a_resp.interviewer_note_reveal = q.interviewer_note
        if a.rating in rating_counts:
            rating_counts[a.rating] += 1
        answer_responses.append(a_resp)

    return MockInterviewResultResponse(
        id=session.id,
        user_id=session.user_id,
        drive_id=session.drive_id,
        company_name=session.company_name,
        skills=session.skills or [],
        mode=session.mode,
        difficulty_level=session.difficulty_level,
        overall_score=session.overall_score,
        weak_areas=session.weak_areas,
        status=session.status,
        created_at=session.created_at,
        questions=[QuestionResponse.model_validate(q) for q in session.questions],
        answers=answer_responses,
        rating_distribution=rating_counts,
    )
