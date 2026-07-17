"""Student-facing instant test attempt flow. TPO-side creation/management
lives in `tpo.py` per the master prompt's explicit `/tpo/...` endpoint paths.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_student
from app.db.session import get_db
from app.models.drive import Drive, DriveTestStatus
from app.models.instant_test import InstantTest, InstantTestStatus
from app.models.test_attempt import TestAttempt
from app.models.user import User
from app.schemas.instant_test import InstantTestResponse
from app.schemas.test_attempt import TestAttemptCreate, TestAttemptResponse
from app.services import groq_client

router = APIRouter(prefix="/instant-tests", tags=["instant-test"])

_GRADING_SYSTEM_PROMPT = """You are grading a student's instant placement test. You will receive a
list of questions (with type, difficulty, and max marks) and the student's answers. Respond ONLY
with a JSON object of the exact shape: {"results": [{"marks_earned": number, "feedback": string}],
"weak_areas": [string, ...]}. `results` must be in the same order as the given questions.
Only include entries in weak_areas for genuinely weak technical/subjective performance —
omit it entirely (empty list) if the test was purely objective/well-answered."""


def _ensure_attemptable(test: InstantTest, db: Session) -> None:
    if test.status != InstantTestStatus.OPEN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="This test is closed")
    if test.drive_id is not None:
        drive = db.get(Drive, test.drive_id)
        if drive is not None and drive.test_status != DriveTestStatus.OPEN:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="This test is closed")


@router.get("/{test_id}", response_model=InstantTestResponse)
def get_instant_test(
    test_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> InstantTest:
    test = db.get(InstantTest, test_id)
    if test is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Test not found")
    _ensure_attemptable(test, db)
    return test


@router.post("/{test_id}/attempt", response_model=TestAttemptResponse, status_code=status.HTTP_201_CREATED)
async def submit_test_attempt(
    test_id: int,
    payload: TestAttemptCreate,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> TestAttempt:
    test = db.get(InstantTest, test_id)
    if test is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Test not found")
    _ensure_attemptable(test, db)

    existing = db.scalar(
        select(TestAttempt).where(TestAttempt.test_id == test_id, TestAttempt.user_id == current_user.id)
    )
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="You have already attempted this test")

    questions = test.questions
    user_prompt = f"Questions: {questions}\n\nStudent answers (by question index): {payload.answers}"
    grading = await groq_client.generate_json(_GRADING_SYSTEM_PROMPT, user_prompt)

    results = grading.get("results", [])
    total_score = sum(float(item.get("marks_earned", 0)) for item in results)
    weak_areas = grading.get("weak_areas") or None

    attempt = TestAttempt(
        test_id=test_id,
        user_id=current_user.id,
        answers=payload.answers,
        score=total_score,
        weak_areas=weak_areas,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return attempt
