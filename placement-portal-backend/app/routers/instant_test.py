"""Student-facing instant test attempt flow with full proctoring, single-session guard,
and dual classification (Practice vs Official Placement Tests).
"""
import random
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.dependencies import require_student
from app.db.session import get_db
from app.models.drive import Drive, DriveTestStatus
from app.models.instant_test import InstantTest, InstantTestStatus
from app.models.test_attempt import TestAttempt, AttemptStatus, AttemptEndedReason
from app.models.test_violation import TestViolation, ViolationType
from app.models.notification import Notification, NotificationType
from app.models.user import User, UserType
from app.schemas.instant_test import (
    InstantTestResponse,
    TestAttemptStartResponse,
    TestViolationCreate,
    TestViolationResponse,
    TestAnswerSubmit,
)

router = APIRouter(prefix="/instant-tests", tags=["instant-test"])


def _ensure_attemptable(test: InstantTest, db: Session) -> None:
    if test.status != InstantTestStatus.OPEN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="This test is closed")
    if test.drive_id is not None:
        drive = db.get(Drive, test.drive_id)
        if drive is not None and drive.test_status != DriveTestStatus.OPEN:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="This test is closed")


@router.get("", response_model=dict[str, list[InstantTestResponse]])
def list_student_tests(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Returns practice tests and official drive tests for student."""
    tests = db.scalars(
        select(InstantTest).where(InstantTest.status == InstantTestStatus.OPEN)
    ).all()

    practice_tests = [t for t in tests if t.is_practice]
    official_tests = [t for t in tests if not t.is_practice]

    return {
        "practice_tests": practice_tests,
        "official_tests": official_tests,
    }


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


@router.post("/{test_id}/start", response_model=TestAttemptStartResponse)
def start_test_attempt(
    test_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    test = db.get(InstantTest, test_id)
    if test is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Test not found")
    _ensure_attemptable(test, db)

    now = datetime.now(timezone.utc)

    # 1. Single Active Session Check (30 seconds heartbeat threshold)
    existing_attempt = db.scalar(
        select(TestAttempt).where(
            TestAttempt.test_id == test_id,
            TestAttempt.user_id == current_user.id,
            TestAttempt.status == AttemptStatus.IN_PROGRESS,
        )
    )

    if existing_attempt:
        if (
            existing_attempt.last_heartbeat_at
            and (now - existing_attempt.last_heartbeat_at).total_seconds() < 35
        ):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="You already have an active test session in progress in another tab or device. Close it and try again.",
            )
        else:
            # Session takeover (stale heartbeat)
            existing_attempt.last_heartbeat_at = now
            db.commit()
            db.refresh(existing_attempt)
            attempt = existing_attempt
    else:
        # Check if already completed
        completed = db.scalar(
            select(TestAttempt).where(
                TestAttempt.test_id == test_id,
                TestAttempt.user_id == current_user.id,
                TestAttempt.status.in_([AttemptStatus.COMPLETED, AttemptStatus.ENDED]),
            )
        )
        if completed and not test.is_practice:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="You have already submitted an official attempt for this placement test.",
            )

        # Create randomized question & option order
        questions = list(test.questions)
        q_indices = list(range(len(questions)))
        random.shuffle(q_indices)

        option_map = {}
        shuffled_questions = []
        for i, original_idx in enumerate(q_indices):
            q_data = dict(questions[original_idx])
            opts = list(q_data.get("options", []))
            opt_indices = list(range(len(opts)))
            random.shuffle(opt_indices)

            shuffled_opts = [opts[o] for o in opt_indices]
            q_data["options"] = shuffled_opts
            q_data["shuffled_q_index"] = i
            q_data.pop("correct_option_index", None)  # Stripped for security

            option_map[str(original_idx)] = opt_indices
            shuffled_questions.append(q_data)

        ends_at = now + timedelta(minutes=test.duration_minutes)

        attempt = TestAttempt(
            test_id=test_id,
            user_id=current_user.id,
            status=AttemptStatus.IN_PROGRESS,
            started_at=now,
            ends_at=ends_at,
            last_heartbeat_at=now,
            question_order=q_indices,
            option_order_map=option_map,
            answers={},
            score=0.0,
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

    # Reconstruct questions for ongoing attempt
    questions = list(test.questions)
    shuffled_questions = []
    q_indices = attempt.question_order or list(range(len(questions)))
    option_map = attempt.option_order_map or {}

    for i, original_idx in enumerate(q_indices):
        q_data = dict(questions[original_idx])
        opts = list(q_data.get("options", []))
        opt_indices = option_map.get(str(original_idx), list(range(len(opts))))

        shuffled_opts = [opts[o] for o in opt_indices]
        q_data["options"] = shuffled_opts
        q_data["shuffled_q_index"] = i
        q_data.pop("correct_option_index", None)
        shuffled_questions.append(q_data)

    return {
        "attempt_id": attempt.id,
        "test_id": test.id,
        "title": test.title,
        "duration_minutes": test.duration_minutes,
        "started_at": attempt.started_at.isoformat(),
        "ends_at": attempt.ends_at.isoformat() if attempt.ends_at else now.isoformat(),
        "questions": shuffled_questions,
    }


@router.post("/attempts/{attempt_id}/heartbeat")
def record_heartbeat(
    attempt_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    attempt = db.get(TestAttempt, attempt_id)
    if not attempt or attempt.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    if attempt.status != AttemptStatus.IN_PROGRESS:
        return {"status": "inactive"}

    attempt.last_heartbeat_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}


@router.post("/attempts/{attempt_id}/violations", response_model=TestViolationResponse)
def log_violation(
    attempt_id: int,
    payload: TestViolationCreate,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    attempt = db.get(TestAttempt, attempt_id)
    if not attempt or attempt.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    if attempt.status != AttemptStatus.IN_PROGRESS:
        return {
            "strike_number": 0,
            "category_total": 0,
            "global_total": attempt.total_violation_count,
            "auto_ended": True,
            "ended_reason": attempt.ended_reason,
        }

    # Count strikes in this category
    existing_category_count = db.scalar(
        select(func.count(TestViolation.id)).where(
            TestViolation.attempt_id == attempt_id,
            TestViolation.violation_type == payload.violation_type,
        )
    ) or 0

    strike_number = existing_category_count + 1

    violation = TestViolation(
        attempt_id=attempt_id,
        violation_type=payload.violation_type,
        strike_number=strike_number,
        meta=payload.meta or {},
    )
    db.add(violation)
    attempt.total_violation_count += 1
    db.commit()
    db.refresh(attempt)

    # Fetch all violations for this attempt to compute category breakdown
    all_violations = db.scalars(
        select(TestViolation).where(TestViolation.attempt_id == attempt_id)
    ).all()

    counts_map = {}
    for v in all_violations:
        v_type = v.violation_type.value if hasattr(v.violation_type, "value") else str(v.violation_type)
        counts_map[v_type] = counts_map.get(v_type, 0) + 1

    auto_ended = False
    ended_reason = None

    # TPO Alert on 2nd Strike per Category (for official tests)
    if strike_number == 2:
        test = db.get(InstantTest, attempt.test_id)
        if test and not test.is_practice:
            notif = Notification(
                recipient_id=test.created_by,
                sender_id=None,
                type=NotificationType.TEST_VIOLATION,
                message=f"Student {current_user.email} received 2nd warning for {payload.violation_type.replace('_', ' ')} in '{test.title}'",
            )
            db.add(notif)
            db.commit()

    # Auto-End Conditions: 3rd strike in a single category OR 5 global strikes
    if strike_number >= 3 or attempt.total_violation_count >= 5:
        attempt.status = AttemptStatus.ENDED
        attempt.ended_reason = AttemptEndedReason.VIOLATION_LIMIT
        attempt.submitted_at = datetime.now(timezone.utc)
        db.commit()
        auto_ended = True
        ended_reason = AttemptEndedReason.VIOLATION_LIMIT.value

        test = db.get(InstantTest, attempt.test_id)
        if test and not test.is_practice:
            reason_txt = f"3 strikes in '{payload.violation_type.replace('_', ' ')}'" if strike_number >= 3 else "5 cumulative proctoring violations"
            notif = Notification(
                recipient_id=test.created_by,
                sender_id=None,
                type=NotificationType.TEST_AUTO_ENDED,
                message=f"Student {current_user.email}'s test attempt in '{test.title}' was force-ended due to {reason_txt}.",
            )
            db.add(notif)
            db.commit()

    return {
        "strike_number": strike_number,
        "category_total": strike_number,
        "global_total": attempt.total_violation_count,
        "auto_ended": auto_ended,
        "ended_reason": ended_reason,
        "category_counts": counts_map,
    }


@router.post("/attempts/{attempt_id}/answer")
def autosave_answer(
    attempt_id: int,
    payload: TestAnswerSubmit,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    attempt = db.get(TestAttempt, attempt_id)
    if not attempt or attempt.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Attempt is no longer in progress")

    current_answers = dict(attempt.answers or {})
    current_answers[str(payload.question_id)] = payload.selected_option_index
    attempt.answers = current_answers
    db.commit()

    return {"status": "saved"}


@router.post("/attempts/{attempt_id}/submit")
def submit_test_attempt(
    attempt_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    attempt = db.get(TestAttempt, attempt_id)
    if not attempt or attempt.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    test = db.get(InstantTest, attempt.test_id)
    if not test:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Test not found")

    if attempt.status == AttemptStatus.COMPLETED:
        return {"status": "already_completed", "score": attempt.score}

    # Grade objective answers
    questions = test.questions
    answers = attempt.answers or {}
    option_map = attempt.option_order_map or {}
    q_order = attempt.question_order or list(range(len(questions)))

    earned_score = 0.0
    total_possible = 0.0
    weak_areas = set()

    for i, orig_idx in enumerate(q_order):
        q = questions[orig_idx]
        marks = float(q.get("marks", 1))
        total_possible += marks
        correct_orig_opt = q.get("correct_option_index", 0)

        # Selected shuffled option index submitted by student
        user_shuffled_opt = answers.get(str(i))
        if user_shuffled_opt is not None:
            shuffled_mapping = option_map.get(str(orig_idx), list(range(len(q.get("options", [])))))
            # Map back to original option index
            if user_shuffled_opt < len(shuffled_mapping):
                real_opt_index = shuffled_mapping[user_shuffled_opt]
                if real_opt_index == correct_orig_opt:
                    earned_score += marks
                else:
                    weak_areas.add(q.get("category", "General Technical"))
            else:
                weak_areas.add(q.get("category", "General Technical"))
        else:
            weak_areas.add(q.get("category", "General Technical"))

    attempt.score = earned_score
    attempt.weak_areas = list(weak_areas)
    attempt.status = AttemptStatus.COMPLETED
    attempt.ended_reason = AttemptEndedReason.COMPLETED
    attempt.submitted_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "attempt_id": attempt.id,
        "score": earned_score,
        "total_possible": total_possible,
        "percentage": round((earned_score / total_possible * 100), 1) if total_possible > 0 else 0,
        "passed": earned_score >= test.min_passing_marks,
        "weak_areas": list(weak_areas),
    }


@router.get("/attempts/{attempt_id}/results")
def get_attempt_results(
    attempt_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    attempt = db.get(TestAttempt, attempt_id)
    if not attempt or attempt.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    test = db.get(InstantTest, attempt.test_id)
    if not test:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Test not found")

    questions = test.questions
    answers = attempt.answers or {}
    option_map = attempt.option_order_map or {}
    q_order = attempt.question_order or list(range(len(questions)))

    review_questions = []
    total_possible = 0.0
    for i, orig_idx in enumerate(q_order):
        q = dict(questions[orig_idx])
        marks = float(q.get("marks", 1))
        total_possible += marks

        user_shuffled_opt = answers.get(str(i))
        shuffled_mapping = option_map.get(str(orig_idx), list(range(len(q.get("options", [])))))
        opts = list(q.get("options", []))
        shuffled_opts = [opts[o] for o in shuffled_mapping]

        correct_orig_opt = q.get("correct_option_index", 0)
        # Find where the correct original option index landed in the shuffled options
        correct_shuffled_idx = shuffled_mapping.index(correct_orig_opt) if correct_orig_opt in shuffled_mapping else 0

        q["options"] = shuffled_opts
        q["user_selected_index"] = user_shuffled_opt
        q["correct_shuffled_index"] = correct_shuffled_idx
        q["is_correct"] = (
            user_shuffled_opt is not None
            and user_shuffled_opt < len(shuffled_mapping)
            and shuffled_mapping[user_shuffled_opt] == correct_orig_opt
        )
        review_questions.append(q)

    return {
        "attempt_id": attempt.id,
        "test_title": test.title,
        "is_practice": test.is_practice,
        "score": attempt.score,
        "total_possible": total_possible,
        "percentage": round((attempt.score / total_possible * 100), 1) if total_possible > 0 else 0,
        "passed": attempt.score >= test.min_passing_marks,
        "weak_areas": attempt.weak_areas or [],
        "total_violations": attempt.total_violation_count,
        "ended_reason": attempt.ended_reason,
        "review_questions": review_questions,
    }
