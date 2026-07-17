"""Student onboarding profile + weak-area aggregation across mock interviews
and instant tests.
"""
from collections import Counter
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_student
from app.db.session import get_db
from app.models.interview_session import InterviewSession
from app.models.profile import Profile
from app.models.test_attempt import TestAttempt
from app.models.user import User
from app.schemas.profile import ProfileCreate, ProfileResponse, ProfileUpdate
from app.services import scoring

router = APIRouter(tags=["student"])


def derive_student_id_from_email(email: str) -> str:
    """`23it408@bvmengineering.ac.in` -> `23IT408`."""
    return email.split("@", 1)[0].upper()


@router.post("/student/profile", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
def create_profile(
    payload: ProfileCreate,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> Profile:
    existing = db.scalar(select(Profile).where(Profile.user_id == current_user.id))
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Profile already exists — use PATCH /auth/profile to update it")

    profile = Profile(
        user_id=current_user.id,
        student_id=derive_student_id_from_email(current_user.email),
        **payload.model_dump(),
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    scoring.update_analytics(db, current_user.id)

    return profile


@router.get("/student/profile", response_model=ProfileResponse)
def get_own_profile(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> Profile:
    profile = db.scalar(select(Profile).where(Profile.user_id == current_user.id))
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Profile not found — complete onboarding first")
    return profile


class WeakAreaEntry(BaseModel):
    date: datetime
    source: str
    related_to: Optional[str] = None
    weak_areas: list[str]


class RecurringWeakArea(BaseModel):
    weak_area: str
    occurrences: int


class WeakAreasResponse(BaseModel):
    timeline: list[WeakAreaEntry]
    recurring: list[RecurringWeakArea]


@router.get("/student/weak-areas", response_model=WeakAreasResponse)
def get_weak_areas(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> WeakAreasResponse:
    sessions = db.scalars(
        select(InterviewSession).where(
            InterviewSession.user_id == current_user.id,
            InterviewSession.weak_areas.is_not(None),
        )
    ).all()
    attempts = db.scalars(
        select(TestAttempt).where(
            TestAttempt.user_id == current_user.id,
            TestAttempt.weak_areas.is_not(None),
        )
    ).all()

    timeline: list[WeakAreaEntry] = []
    for session in sessions:
        if session.weak_areas:
            timeline.append(
                WeakAreaEntry(
                    date=session.created_at,
                    source="mock_interview",
                    related_to=session.company_name,
                    weak_areas=session.weak_areas,
                )
            )
    for attempt in attempts:
        if attempt.weak_areas:
            timeline.append(
                WeakAreaEntry(
                    date=attempt.submitted_at,
                    source="instant_test",
                    related_to=f"test #{attempt.test_id}",
                    weak_areas=attempt.weak_areas,
                )
            )

    timeline.sort(key=lambda entry: entry.date, reverse=True)

    counter: Counter[str] = Counter()
    for entry in timeline:
        counter.update(entry.weak_areas)

    recurring = [
        RecurringWeakArea(weak_area=area, occurrences=count)
        for area, count in counter.most_common()
        if count >= 2
    ]

    return WeakAreasResponse(timeline=timeline, recurring=recurring)
