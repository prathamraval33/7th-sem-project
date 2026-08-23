"""Drive listing/detail for students — matched drives (eligibility_engine)
plus a general browse list with a live-computed eligibility badge.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_user, require_student
from app.db.session import get_db
from app.models.drive import Drive, DriveStatus
from app.models.profile import Profile
from app.models.user import User
from app.schemas.drive import DriveResponse
from app.services.eligibility_engine import check_drive_eligibility

router = APIRouter(prefix="/drives", tags=["drives"])


class DriveWithEligibility(DriveResponse):
    is_eligible: bool
    eligibility_reasons: list[str] = []


def _get_own_profile(db: Session, user: User) -> Profile:
    profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
    if profile is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Complete onboarding before viewing drives")
    return profile


@router.get("/matched", response_model=list[DriveResponse])
def get_matched_drives(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> list[Drive]:
    profile = _get_own_profile(db, current_user)
    query = select(Drive).options(joinedload(Drive.company)).where(Drive.status == DriveStatus.OPEN)
    if current_user.college_id is not None:
        query = query.where(Drive.college_id == current_user.college_id)

    open_drives = db.scalars(query).all()
    return [drive for drive in open_drives if check_drive_eligibility(profile, drive)[0]]


@router.get("", response_model=list[DriveWithEligibility])
def list_drives(
    status_filter: Optional[DriveStatus] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DriveWithEligibility]:
    query = select(Drive).options(joinedload(Drive.company))
    if current_user.college_id is not None and current_user.user_type.value != "superadmin":
        query = query.where(Drive.college_id == current_user.college_id)
    if status_filter is not None:
        query = query.where(Drive.status == status_filter)
    drives = db.scalars(query.order_by(Drive.created_at.desc())).all()

    profile = None
    if current_user.user_type.value == "student":
        profile = db.scalar(select(Profile).where(Profile.user_id == current_user.id))

    results: list[DriveWithEligibility] = []
    for drive in drives:
        is_eligible, reasons = (check_drive_eligibility(profile, drive) if profile else (False, ["No profile on record"]))
        results.append(
            DriveWithEligibility(
                **DriveResponse.model_validate(drive).model_dump(),
                is_eligible=is_eligible,
                eligibility_reasons=reasons,
            )
        )
    return results


@router.get("/{drive_id}", response_model=DriveWithEligibility)
def get_drive(
    drive_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DriveWithEligibility:
    drive = db.scalar(select(Drive).options(joinedload(Drive.company)).where(Drive.id == drive_id))
    if drive is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Drive not found")

    if (
        current_user.college_id is not None
        and current_user.user_type.value != "superadmin"
        and drive.college_id is not None
        and drive.college_id != current_user.college_id
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You do not have access to this drive")

    is_eligible, reasons = False, ["No profile on record"]
    if current_user.user_type.value == "student":
        profile = db.scalar(select(Profile).where(Profile.user_id == current_user.id))
        if profile is not None:
            is_eligible, reasons = check_drive_eligibility(profile, drive)

    return DriveWithEligibility(
        **DriveResponse.model_validate(drive).model_dump(),
        is_eligible=is_eligible,
        eligibility_reasons=reasons,
    )
