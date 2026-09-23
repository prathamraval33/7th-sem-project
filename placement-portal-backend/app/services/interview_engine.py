"""Builds prompts, manages the one-question-at-a-time Q&A flow, and scores
mock interviews. Sequence for `mode="full"` is aptitude -> technical ->
coding -> HR; single-stage modes ask several questions within that one
stage. Progress is derived from each session's already-created `Question`
rows (via `order_index`) rather than new session-level columns, since
Phase 1's `interview_sessions` schema is already fixed.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.answer import Answer
from app.models.interview_session import InterviewMode, InterviewSession, InterviewSessionStatus
from app.models.question import DifficultyLevel, Question, QuestionType
from app.services import groq_client

MAX_INTERVIEW_QUESTIONS = 10

# Exactly 10 questions for FULL mode: 2 Aptitude, 3 Technical, 3 Coding, 2 HR
FULL_STAGE_DISTRIBUTION: list[QuestionType] = [
    QuestionType.APTITUDE,   # Q1 (index 0)
    QuestionType.APTITUDE,   # Q2 (index 1)
    QuestionType.TECHNICAL,  # Q3 (index 2)
    QuestionType.TECHNICAL,  # Q4 (index 3)
    QuestionType.TECHNICAL,  # Q5 (index 4)
    QuestionType.CODING,     # Q6 (index 5)
    QuestionType.CODING,     # Q7 (index 6)
    QuestionType.CODING,     # Q8 (index 7)
    QuestionType.HR,         # Q9 (index 8)
    QuestionType.HR,         # Q10 (index 9)
]

_MODE_TO_QUESTION_TYPE = {
    InterviewMode.APTITUDE: QuestionType.APTITUDE,
    InterviewMode.TECHNICAL: QuestionType.TECHNICAL,
    InterviewMode.CODING: QuestionType.CODING,
    InterviewMode.HR: QuestionType.HR,
}


_QUESTION_SYSTEM_PROMPT = """You are a senior technical interviewer running a mock placement interview
for company "{company_name}" targeting the stack/skills: {skills}. You are currently in the
"{stage}" stage. Given the prior questions and feedback (if any), generate the single next
interview question for this stage. Respond ONLY with a JSON object of the exact shape:
{{"question_text": string, "difficulty": one of "easy"|"medium"|"hard"}}."""

_ANSWER_EVAL_SYSTEM_PROMPT = """You are grading one answer from a mock placement interview.
Given the question and the candidate's answer, respond ONLY with a JSON object of the exact shape:
{"score": number between 0 and 100, "feedback": short constructive string}."""

_WEAK_AREA_SYSTEM_PROMPT = """You are summarizing a completed mock interview. Given the full
transcript of questions, answers, per-answer feedback, and scores, respond ONLY with a JSON
object of the exact shape: {"weak_areas": [string, ...]} listing the 2-5 most significant weak
areas the candidate should improve on."""


def _stage_for_index(mode: InterviewMode, order_index: int) -> QuestionType | None:
    if order_index < 0 or order_index >= MAX_INTERVIEW_QUESTIONS:
        return None
    if mode == InterviewMode.FULL:
        return FULL_STAGE_DISTRIBUTION[order_index]
    return _MODE_TO_QUESTION_TYPE.get(mode)


async def _generate_question(company_name: str, skills: list[str], stage: QuestionType) -> dict:
    system_prompt = _QUESTION_SYSTEM_PROMPT.format(
        company_name=company_name, skills=", ".join(skills) or "general", stage=stage.value
    )
    return await groq_client.generate_json(system_prompt, "Generate the next question.")


async def _evaluate_answer(question: Question, answer_text: str) -> dict:
    user_prompt = f"Question ({question.q_type.value}): {question.question_text}\n\nCandidate answer: {answer_text}"
    return await groq_client.generate_json(_ANSWER_EVAL_SYSTEM_PROMPT, user_prompt)


async def _synthesize_weak_areas(db: Session, session: InterviewSession) -> list[str]:
    answers = db.scalars(
        select(Answer).join(Question, Answer.question_id == Question.id).where(Question.session_id == session.id)
    ).all()
    if not answers:
        return []

    transcript_lines = []
    for answer in answers:
        transcript_lines.append(
            f"Q ({answer.question.q_type.value}): {answer.question.question_text}\n"
            f"A: {answer.answer_text}\nFeedback: {answer.ai_feedback}\nScore: {answer.score}"
        )
    transcript = "\n\n".join(transcript_lines)

    result = await groq_client.generate_json(_WEAK_AREA_SYSTEM_PROMPT, transcript)
    return result.get("weak_areas", [])


async def _finalize_session(db: Session, session: InterviewSession) -> None:
    answers = db.scalars(
        select(Answer).join(Question, Answer.question_id == Question.id).where(Question.session_id == session.id)
    ).all()
    scores = [answer.score for answer in answers if answer.score is not None]

    session.overall_score = round(sum(scores) / len(scores), 2) if scores else None
    session.weak_areas = await _synthesize_weak_areas(db, session)
    session.status = InterviewSessionStatus.COMPLETED


async def start_session(
    db: Session,
    user_id: int,
    *,
    company_name: str,
    skills: list[str] | None,
    mode: InterviewMode,
    drive_id: int | None = None,
) -> tuple[InterviewSession, Question]:
    session = InterviewSession(
        user_id=user_id,
        drive_id=drive_id,
        company_name=company_name,
        skills=skills or [],
        mode=mode,
        status=InterviewSessionStatus.IN_PROGRESS,
    )
    db.add(session)
    db.flush()

    first_stage = _stage_for_index(mode, 0)
    question_data = await _generate_question(company_name, skills or [], first_stage)
    question = Question(
        session_id=session.id,
        question_text=question_data["question_text"],
        q_type=first_stage,
        difficulty=DifficultyLevel(question_data.get("difficulty", "medium")),
        order_index=0,
    )
    db.add(question)

    db.commit()
    db.refresh(session)
    db.refresh(question)

    return session, question


async def submit_answer(
    db: Session, session: InterviewSession, question: Question, answer_text: str
) -> tuple[Answer, Question | None]:
    """Evaluates the answer, then either generates the next question or
    finalizes the session (computing overall_score + weak_areas) if this
    was the last question (limit: MAX_INTERVIEW_QUESTIONS = 10).
    """
    evaluation = await _evaluate_answer(question, answer_text)
    answer = Answer(
        question_id=question.id,
        answer_text=answer_text,
        ai_feedback=evaluation.get("feedback"),
        score=evaluation.get("score"),
    )
    db.add(answer)

    next_index = question.order_index + 1
    next_stage = _stage_for_index(session.mode, next_index)

    next_question: Question | None = None
    if next_index >= MAX_INTERVIEW_QUESTIONS or next_stage is None:
        db.flush()
        await _finalize_session(db, session)
    else:
        question_data = await _generate_question(session.company_name, session.skills or [], next_stage)
        next_question = Question(
            session_id=session.id,
            question_text=question_data["question_text"],
            q_type=next_stage,
            difficulty=DifficultyLevel(question_data.get("difficulty", "medium")),
            order_index=next_index,
        )
        db.add(next_question)

    db.commit()
    db.refresh(answer)
    if next_question:
        db.refresh(next_question)

    return answer, next_question
