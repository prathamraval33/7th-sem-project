"""Admin — platform-wide drive moderation, student/TPO oversight, activity
feed, and global analytics.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.db.session import get_db
from app.models.application import Application, ApplicationStatus
from app.models.drive import Drive
from app.models.notification import Notification, NotificationType
from app.models.profile import Profile
from app.models.user import User, UserType
from app.schemas.drive import DriveResponse, DriveUpdate
from app.schemas.profile import ProfilePlacementOverrideUpdate, ProfileResponse

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/drives", response_model=list[DriveResponse])
def list_all_drives(current_user: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[Drive]:
    return list(db.scalars(select(Drive).order_by(Drive.created_at.desc())).all())


@router.patch("/drives/{drive_id}", response_model=DriveResponse)
def update_drive(
    drive_id: int, payload: DriveUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)
) -> Drive:
    drive = db.get(Drive, drive_id)
    if drive is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Drive not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "eligibility_criteria" in update_data and update_data["eligibility_criteria"] is not None:
        update_data["eligibility_criteria"] = payload.eligibility_criteria.model_dump()

    for field_name, value in update_data.items():
        setattr(drive, field_name, value)

    db.commit()
    db.refresh(drive)
    return drive


@router.delete("/drives/{drive_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_drive(drive_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)) -> None:
    drive = db.get(Drive, drive_id)
    if drive is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Drive not found")
    db.delete(drive)
    db.commit()


class StudentListEntry(BaseModel):
    user_id: int
    email: str
    full_name: str
    branch: str
    is_placed: bool
    fee_verified: bool
    is_active: bool


@router.get("/students", response_model=list[StudentListEntry])
def list_students(
    branch: Optional[str] = None,
    is_placed: Optional[bool] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[StudentListEntry]:
    query = select(Profile)
    if branch is not None:
        query = query.where(Profile.branch == branch)
    if is_placed is not None:
        query = query.where(Profile.is_placed == is_placed)

    profiles = db.scalars(query).all()
    entries: list[StudentListEntry] = []
    for profile in profiles:
        user = db.get(User, profile.user_id)
        if user is None:
            continue
        entries.append(
            StudentListEntry(
                user_id=user.id, email=user.email, full_name=profile.full_name, branch=profile.branch,
                is_placed=profile.is_placed, fee_verified=user.fee_verified, is_active=user.is_active,
            )
        )
    return entries


class StudentCard(BaseModel):
    user_id: int
    full_name: str
    branch: str
    fee_verified: bool
    is_placed: bool


@router.get("/students/all", response_model=list[StudentCard])
def list_all_students_card(current_user: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[StudentCard]:
    profiles = db.scalars(select(Profile)).all()
    cards: list[StudentCard] = []
    for profile in profiles:
        user = db.get(User, profile.user_id)
        if user is None:
            continue
        cards.append(
            StudentCard(
                user_id=user.id, full_name=profile.full_name, branch=profile.branch,
                fee_verified=user.fee_verified, is_placed=profile.is_placed,
            )
        )
    return cards


class WarnRequest(BaseModel):
    message: str


@router.post("/students/{user_id}/warn", status_code=status.HTTP_201_CREATED)
def warn_student(
    user_id: int, payload: WarnRequest, current_user: User = Depends(require_admin), db: Session = Depends(get_db)
) -> dict:
    student = db.get(User, user_id)
    if student is None or student.user_type != UserType.STUDENT:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Student not found")

    db.add(
        Notification(
            recipient_id=user_id, sender_id=current_user.id, type=NotificationType.WARNING, message=payload.message
        )
    )
    db.commit()
    return {"message": "Warning sent"}


@router.post("/students/{user_id}/deactivate", status_code=status.HTTP_200_OK)
def deactivate_student(
    user_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)
) -> dict:
    student = db.get(User, user_id)
    if student is None or student.user_type != UserType.STUDENT:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Student not found")

    student.is_active = False
    db.add(
        Notification(
            recipient_id=user_id, sender_id=current_user.id, type=NotificationType.NOTICE,
            message="Your account has been deactivated by the admin",
        )
    )
    db.commit()
    return {"message": "Student deactivated"}


@router.patch("/students/{user_id}/placement-override", response_model=ProfileResponse)
def toggle_placement_override(
    user_id: int,
    payload: ProfilePlacementOverrideUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Profile:
    profile = db.scalar(select(Profile).where(Profile.user_id == user_id))
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    profile.placement_lock_override = payload.placement_lock_override
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/tpo/{tpo_id}/notify", status_code=status.HTTP_201_CREATED)
def notify_tpo(
    tpo_id: int, payload: WarnRequest, current_user: User = Depends(require_admin), db: Session = Depends(get_db)
) -> dict:
    tpo_user = db.get(User, tpo_id)
    if tpo_user is None or tpo_user.user_type != UserType.TPO:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="TPO account not found")

    db.add(
        Notification(
            recipient_id=tpo_id, sender_id=current_user.id, type=NotificationType.NOTICE, message=payload.message
        )
    )
    db.commit()
    return {"message": "Notice sent"}


class ActivityEntry(BaseModel):
    type: str
    description: str
    timestamp: datetime


@router.get("/activity", response_model=list[ActivityEntry])
def get_activity_feed(current_user: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[ActivityEntry]:
    entries: list[ActivityEntry] = []

    for drive in db.scalars(select(Drive).order_by(Drive.created_at.desc()).limit(50)).all():
        entries.append(
            ActivityEntry(type="drive_created", description=f"Drive created: {drive.role} (id {drive.id})", timestamp=drive.created_at)
        )

    for application in db.scalars(select(Application).order_by(Application.applied_on.desc()).limit(50)).all():
        entries.append(
            ActivityEntry(
                type="application", description=f"Application #{application.id} -> {application.status.value}",
                timestamp=application.applied_on,
            )
        )

    for notification in db.scalars(
        select(Notification).where(Notification.type.in_([NotificationType.WARNING, NotificationType.NOTICE]))
        .order_by(Notification.created_at.desc()).limit(50)
    ).all():
        entries.append(
            ActivityEntry(type=notification.type.value, description=notification.message, timestamp=notification.created_at)
        )

    entries.sort(key=lambda entry: entry.timestamp, reverse=True)
    return entries[:100]


class DepartmentStat(BaseModel):
    department: str
    applied: int
    selected: int


class PackageStats(BaseModel):
    top: Optional[float] = None
    median: Optional[float] = None
    average: Optional[float] = None


class AdminAnalyticsResponse(BaseModel):
    department_stats: list[DepartmentStat]
    package_stats: PackageStats
    total_drives: int
    total_applications: int
    total_selected: int


@router.get("/analytics", response_model=AdminAnalyticsResponse)
def get_admin_analytics(current_user: User = Depends(require_admin), db: Session = Depends(get_db)) -> AdminAnalyticsResponse:
    applications = db.scalars(select(Application)).all()

    department_counts: dict[str, dict[str, int]] = {}
    packages: list[float] = []

    for application in applications:
        profile = db.scalar(select(Profile).where(Profile.user_id == application.user_id))
        branch = profile.branch if profile else "Unknown"
        bucket = department_counts.setdefault(branch, {"applied": 0, "selected": 0})
        bucket["applied"] += 1
        if application.status == ApplicationStatus.SELECTED:
            bucket["selected"] += 1
            if application.package_offered is not None:
                packages.append(application.package_offered)

    department_stats = [
        DepartmentStat(department=branch, applied=counts["applied"], selected=counts["selected"])
        for branch, counts in department_counts.items()
    ]

    packages_sorted = sorted(packages)
    package_stats = PackageStats(
        top=max(packages) if packages else None,
        median=(packages_sorted[len(packages_sorted) // 2] if packages_sorted else None),
        average=(round(sum(packages) / len(packages), 2) if packages else None),
    )

    total_selected = sum(1 for a in applications if a.status == ApplicationStatus.SELECTED)
    total_drives = len(db.scalars(select(Drive)).all())

    return AdminAnalyticsResponse(
        department_stats=department_stats,
        package_stats=package_stats,
        total_drives=total_drives,
        total_applications=len(applications),
        total_selected=total_selected,
    )
