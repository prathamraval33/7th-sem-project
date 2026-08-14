"""Live Career Insights — GET dashboard (internal drives + cached external/
AI), POST manual refresh (rate-limited).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_student
from app.db.session import get_db
from app.models.profile import Profile
from app.models.user import User
from app.schemas.dashboard_insight import InsightsDashboardResponse
from app.services import web_insights_service
from app.utils.exceptions import RateLimitError, SearchProviderError

router = APIRouter(prefix="/insights", tags=["insights"])


def _get_own_profile(db: Session, user: User) -> Profile:
    profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
    if profile is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Complete onboarding to see career insights")
    return profile


@router.get("/dashboard", response_model=InsightsDashboardResponse)
async def get_dashboard_insights(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> InsightsDashboardResponse:
    profile = _get_own_profile(db, current_user)
    try:
        data = await web_insights_service.get_dashboard_insights(db, current_user, profile)
    except Exception as error:
        internal_drives = web_insights_service.get_internal_matched_drives(db, profile)
        data = {
            "internal_drives": internal_drives,
            "external_opportunities": [],
            "resume_suggestions": [],
            "trending_skills": profile.skills or ["Problem Solving"],
        }

    return InsightsDashboardResponse(**data)


@router.post("/refresh", response_model=InsightsDashboardResponse)
async def refresh_insights(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> InsightsDashboardResponse:
    profile = _get_own_profile(db, current_user)
    try:
        await web_insights_service.refresh_insights(db, current_user, profile)
        data = await web_insights_service.get_dashboard_insights(db, current_user, profile)
    except RateLimitError as error:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail=error.message) from error
    except Exception as error:
        data = await web_insights_service.get_dashboard_insights(db, current_user, profile)

    return InsightsDashboardResponse(**data)
