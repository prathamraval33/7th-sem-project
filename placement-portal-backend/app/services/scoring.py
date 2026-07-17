"""Placement Readiness Score calculation + the `analytics` table upsert.

ASSUMPTION: the master prompt names the four inputs (resume ai_score, avg
mock-interview score, profile completeness, application activity) but does
not specify exact weights — a 30/30/20/20 split is used here (resume +
interview performance weighted equally and highest, since they most directly
reflect placement readiness; profile completeness and activity are
supporting signals), and application-activity uses a capped linear scale
(each application worth 10 points, capped at 100) so a handful of
applications don't already max out the score.
"""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.analytics import Analytics
from app.models.application import Application
from app.models.interview_session import InterviewSession
from app.models.profile import Profile
from app.models.resume import Resume

RESUME_SCORE_WEIGHT = 0.30
INTERVIEW_SCORE_WEIGHT = 0.30
PROFILE_COMPLETENESS_WEIGHT = 0.20
APPLICATION_ACTIVITY_WEIGHT = 0.20

APPLICATION_ACTIVITY_POINTS_PER_APPLICATION = 10
APPLICATION_ACTIVITY_MAX_SCORE = 100

PROFILE_COMPLETENESS_FIELDS = (
    "full_name",
    "branch",
    "cgpa",
    "tenth_percentage",
    "twelfth_percentage",
    "skills",
)


def calculate_profile_completeness(profile: Profile | None) -> float:
    if profile is None:
        return 0.0

    filled = 0
    for field_name in PROFILE_COMPLETENESS_FIELDS:
        value = getattr(profile, field_name, None)
        if value not in (None, "", []):
            filled += 1

    return round((filled / len(PROFILE_COMPLETENESS_FIELDS)) * 100, 2)


def calculate_application_activity_score(total_applications: int) -> float:
    return float(min(total_applications * APPLICATION_ACTIVITY_POINTS_PER_APPLICATION, APPLICATION_ACTIVITY_MAX_SCORE))


def calculate_readiness_score(
    *,
    resume_ai_score: float | None,
    avg_interview_score: float | None,
    profile_completeness_pct: float,
    application_activity_score: float,
) -> float:
    resume_component = (resume_ai_score or 0.0) * RESUME_SCORE_WEIGHT
    interview_component = (avg_interview_score or 0.0) * INTERVIEW_SCORE_WEIGHT
    profile_component = profile_completeness_pct * PROFILE_COMPLETENESS_WEIGHT
    activity_component = application_activity_score * APPLICATION_ACTIVITY_WEIGHT

    score = resume_component + interview_component + profile_component + activity_component
    return round(max(0.0, min(score, 100.0)), 2)


def update_analytics(db: Session, user_id: int) -> Analytics:
    """Recomputes and upserts the per-user `analytics` row. Called after
    profile/resume/interview-affecting events (Phase 4 routers will invoke
    this — no route wiring happens in Phase 3).
    """
    profile = db.scalar(select(Profile).where(Profile.user_id == user_id))

    active_resume = db.scalar(
        select(Resume).where(Resume.user_id == user_id, Resume.is_active.is_(True))
    )
    resume_ai_score = active_resume.ai_score if active_resume else None

    interview_sessions = db.scalars(
        select(InterviewSession).where(InterviewSession.user_id == user_id)
    ).all()
    completed_scores = [s.overall_score for s in interview_sessions if s.overall_score is not None]
    avg_interview_score = sum(completed_scores) / len(completed_scores) if completed_scores else None

    total_applications = db.scalars(select(Application).where(Application.user_id == user_id)).all()
    application_count = len(total_applications)

    profile_completeness = calculate_profile_completeness(profile)
    activity_score = calculate_application_activity_score(application_count)
    readiness_score = calculate_readiness_score(
        resume_ai_score=resume_ai_score,
        avg_interview_score=avg_interview_score,
        profile_completeness_pct=profile_completeness,
        application_activity_score=activity_score,
    )

    analytics = db.scalar(select(Analytics).where(Analytics.user_id == user_id))
    if analytics is None:
        analytics = Analytics(user_id=user_id)
        db.add(analytics)

    analytics.total_applications = application_count
    analytics.interviews_taken = len(interview_sessions)
    analytics.avg_score = avg_interview_score
    analytics.readiness_score = readiness_score
    analytics.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(analytics)

    return analytics
