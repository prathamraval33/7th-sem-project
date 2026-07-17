"""Shared analytics — student readiness score + per-drive TPO analytics
(department-wise applied/selected + package stats), reusing scoring.py.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_student, require_tpo
from app.db.session import get_db
from app.models.application import Application, ApplicationStatus
from app.models.drive import Drive
from app.models.profile import Profile
from app.models.user import User
from app.schemas.analytics import AnalyticsResponse
from app.services import scoring

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/me", response_model=AnalyticsResponse)
def get_my_analytics(current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    return scoring.update_analytics(db, current_user.id)


class DepartmentStat(BaseModel):
    department: str
    applied: int
    selected: int


class PackageStats(BaseModel):
    top: Optional[float] = None
    median: Optional[float] = None
    average: Optional[float] = None


class DriveAnalyticsResponse(BaseModel):
    drive_id: int
    total_applicants: int
    total_selected: int
    department_stats: list[DepartmentStat]
    package_stats: PackageStats


@router.get("/tpo/{drive_id}", response_model=DriveAnalyticsResponse)
def get_drive_analytics(drive_id: int, current_user: User = Depends(require_tpo), db: Session = Depends(get_db)) -> DriveAnalyticsResponse:
    drive = db.get(Drive, drive_id)
    if drive is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Drive not found")

    applications = db.scalars(select(Application).where(Application.drive_id == drive_id)).all()

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

    return DriveAnalyticsResponse(
        drive_id=drive_id,
        total_applicants=len(applications),
        total_selected=sum(1 for a in applications if a.status == ApplicationStatus.SELECTED),
        department_stats=department_stats,
        package_stats=package_stats,
    )
