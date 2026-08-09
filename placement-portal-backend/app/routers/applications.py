"""Apply-to-drive (server-side fee-verification + placement-lock enforcement),
application tracker, and withdraw.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_student
from app.db.session import get_db
from app.models.application import Application, ApplicationStatus
from app.models.drive import Drive
from app.models.profile import Profile
from app.models.user import User
from app.schemas.application import ApplicationCreate, ApplicationResponse
from app.services import scoring
from app.services.eligibility_engine import check_drive_eligibility

router = APIRouter(tags=["applications"])


@router.post("/applications", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def apply_to_drive(
    payload: ApplicationCreate,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> Application:
    # Fee verification bypassed for student applications
    drive = db.get(Drive, payload.drive_id)
    if drive is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Drive not found")

    profile = db.scalar(select(Profile).where(Profile.user_id == current_user.id))
    if profile is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Complete onboarding before applying")

    is_eligible, reasons = check_drive_eligibility(profile, drive)
    if profile.is_placed and not profile.placement_lock_override:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="You are already placed. Ask a TPO/Admin for a dream-company override to apply further.",
        )

    existing = db.scalar(
        select(Application).where(
            Application.user_id == current_user.id,
            Application.drive_id == payload.drive_id,
            Application.status != ApplicationStatus.WITHDRAWN,
        )
    )
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="You have already applied to this drive")

    application = Application(
        user_id=current_user.id,
        drive_id=payload.drive_id,
        status=ApplicationStatus.ELIGIBLE if is_eligible else ApplicationStatus.NOT_ELIGIBLE,
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    scoring.update_analytics(db, current_user.id)

    return application


@router.get("/student/applications", response_model=list[ApplicationResponse])
def list_my_applications(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> list[Application]:
    return list(
        db.scalars(
            select(Application)
            .where(Application.user_id == current_user.id)
            .order_by(Application.applied_on.desc())
        ).all()
    )


@router.post("/student/applications/{application_id}/withdraw", response_model=ApplicationResponse)
def withdraw_application(
    application_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> Application:
    application = db.get(Application, application_id)
    if application is None or application.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Application not found")

    blocked_statuses = {
        ApplicationStatus.SHORTLISTED,
        ApplicationStatus.SELECTED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
    }
    if application.status in blocked_statuses:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="This application can no longer be withdrawn — contact the TPO directly",
        )

    application.status = ApplicationStatus.WITHDRAWN
    db.commit()
    db.refresh(application)

    return application
