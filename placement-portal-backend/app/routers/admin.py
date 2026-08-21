"""Admin — platform-wide drive moderation, student/TPO oversight, activity
feed, and global analytics.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import require_admin
from app.core.security import hash_password
from app.db.session import get_db
from app.models.application import Application, ApplicationStatus
from app.models.drive import Drive, DriveStatus
from app.models.notification import Notification, NotificationType
from app.models.profile import Profile
from app.models.user import User, UserType
from app.models.analytics import Analytics
from app.schemas.drive import DriveResponse, DriveUpdate
from app.schemas.profile import ProfilePlacementOverrideUpdate, ProfileResponse
from app.schemas.admin import AdminUserCreate, AdminUserUpdate

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/drives", response_model=list[DriveResponse])
def list_all_drives(current_user: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[Drive]:
    query = select(Drive).options(joinedload(Drive.company))
    if current_user.college_id is not None:
        query = query.where(Drive.college_id == current_user.college_id)
    return list(db.scalars(query.order_by(Drive.created_at.desc())).all())


@router.patch("/drives/{drive_id}", response_model=DriveResponse)
def update_drive(
    drive_id: int, payload: DriveUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)
) -> Drive:
    drive = db.get(Drive, drive_id)
    if drive is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Drive not found")
    if (
        current_user.college_id is not None
        and drive.college_id is not None
        and drive.college_id != current_user.college_id
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You do not have access to this drive")

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
    if (
        current_user.college_id is not None
        and drive.college_id is not None
        and drive.college_id != current_user.college_id
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You do not have access to this drive")
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
    query = select(User).where(User.user_type == UserType.STUDENT)
    if current_user.college_id is not None:
        query = query.where(User.college_id == current_user.college_id)
    
    users = db.scalars(query).all()
    entries: list[StudentListEntry] = []
    for user in users:
        profile = user.profile
        
        if branch is not None:
            if not profile or profile.branch != branch:
                continue
        if is_placed is not None:
            if not profile or profile.is_placed != is_placed:
                continue

        entries.append(
            StudentListEntry(
                user_id=user.id, 
                email=user.email, 
                full_name=profile.full_name if profile else "Profile Not Setup", 
                branch=profile.branch if profile else "N/A",
                is_placed=profile.is_placed if profile else False, 
                fee_verified=user.fee_verified, 
                is_active=user.is_active,
            )
        )
    return entries


class StudentCard(BaseModel):
    user_id: int
    email: str
    full_name: str
    branch: str
    fee_verified: bool
    is_placed: bool
    placement_lock_override: bool = False
    readiness_score: float = 0.0
    user_type: str = "student"


@router.get("/students/all", response_model=list[StudentCard])
def list_all_students_card(current_user: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[StudentCard]:
    query = select(User).order_by(User.created_at.desc())
    if current_user.college_id is not None:
        query = query.where(User.college_id == current_user.college_id)
    users = db.scalars(query).all()
    cards: list[StudentCard] = []
    for user in users:
        profile = user.profile
        analytics = user.analytics
        readiness = analytics.readiness_score if analytics else 0.0
        cards.append(
            StudentCard(
                user_id=user.id, 
                email=user.email,
                full_name=profile.full_name if profile else ("Admin / TPO Account" if user.user_type != UserType.STUDENT else "Profile Not Setup"), 
                branch=profile.branch if profile else (user.user_type.value.upper() if user.user_type != UserType.STUDENT else "N/A"),
                fee_verified=user.fee_verified, 
                is_placed=profile.is_placed if profile else False,
                placement_lock_override=profile.placement_lock_override if profile else False,
                readiness_score=float(readiness) if readiness else 0.0,
                user_type=user.user_type.value,
            )
        )
    return cards


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user_direct(
    payload: AdminUserCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    new_user = User(
        college_id=current_user.college_id,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        user_type=payload.user_type,
        is_email_verified=True,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if payload.user_type == UserType.STUDENT:
        email_prefix = payload.email.split("@")[0].upper()
        profile = Profile(
            user_id=new_user.id,
            student_id=email_prefix,
            full_name=payload.full_name or "Student",
            branch=payload.branch or "IT",
            cgpa=payload.cgpa if payload.cgpa is not None else 0.0,
            active_backlogs=payload.active_backlogs or 0,
            tenth_percentage=payload.tenth_percentage if payload.tenth_percentage is not None else 0.0,
            twelfth_percentage=payload.twelfth_percentage if payload.twelfth_percentage is not None else 0.0,
            skills=payload.skills or [],
        )
        db.add(profile)
        db.commit()

    return {"message": "User created successfully", "user_id": new_user.id}


@router.patch("/users/{user_id}")
def update_user_direct(
    user_id: int, payload: AdminUserUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    if (
        current_user.college_id is not None
        and target_user.college_id is not None
        and target_user.college_id != current_user.college_id
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You do not have permission to manage this user")

    if payload.email is not None:
        target_user.email = payload.email
    if payload.user_type is not None:
        target_user.user_type = payload.user_type
    if payload.is_active is not None:
        target_user.is_active = payload.is_active

    if target_user.user_type == UserType.STUDENT:
        profile = target_user.profile
        if not profile:
            profile = Profile(
                user_id=target_user.id,
                student_id=target_user.email.split("@")[0].upper(),
                full_name=payload.full_name or "Student",
                branch=payload.branch or "IT",
                cgpa=payload.cgpa or 0.0,
                active_backlogs=payload.active_backlogs or 0,
                tenth_percentage=0.0,
                twelfth_percentage=0.0,
            )
            db.add(profile)
        else:
            if payload.full_name is not None:
                profile.full_name = payload.full_name
            if payload.branch is not None:
                profile.branch = payload.branch
            if payload.cgpa is not None:
                profile.cgpa = payload.cgpa
            if payload.active_backlogs is not None:
                profile.active_backlogs = payload.active_backlogs
            if payload.is_placed is not None:
                profile.is_placed = payload.is_placed

    db.commit()
    return {"message": "User updated successfully"}


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_direct(
    user_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    if target_user.id == current_user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own admin account")
    if (
        current_user.college_id is not None
        and target_user.college_id is not None
        and target_user.college_id != current_user.college_id
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You do not have permission to manage this user")

    db.delete(target_user)
    db.commit()


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
    return {"message": "Warning sent to student"}


@router.post("/placement-override")
def set_placement_override(
    payload: ProfilePlacementOverrideUpdate,
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    profile = db.scalar(select(Profile).where(Profile.user_id == user_id))
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Profile not found")

    profile.placement_lock_override = payload.placement_lock_override
    db.commit()
    return {"message": "Placement override updated"}


@router.post("/students/{user_id}/deactivate")
def deactivate_student(
    user_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)
) -> dict:
    student = db.get(User, user_id)
    if student is None or student.user_type != UserType.STUDENT:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Student not found")

    student.is_active = False
    db.add(
        Notification(
            recipient_id=user_id,
            sender_id=current_user.id,
            type=NotificationType.NOTICE,
            message="Your student account has been deactivated by the administrator.",
        )
    )
    db.commit()
    return {"message": "Student account deactivated successfully"}


@router.post("/tpo/{tpo_id}/notify", status_code=status.HTTP_201_CREATED)
def notify_tpo(
    tpo_id: int, payload: WarnRequest, current_user: User = Depends(require_admin), db: Session = Depends(get_db)
) -> dict:
    tpo_user = db.get(User, tpo_id)
    if tpo_user is None or tpo_user.user_type != UserType.TPO:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="TPO not found")

    db.add(
        Notification(
            recipient_id=tpo_id,
            sender_id=current_user.id,
            type=NotificationType.NOTICE,
            message=payload.message,
        )
    )
    db.commit()
    return {"message": "Notice sent to TPO"}


@router.delete("/students/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(user_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)) -> None:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    db.delete(user)
    db.commit()


class ActivityEntry(BaseModel):
    id: str
    type: str
    description: str
    actor_email: str
    action: str
    target_entity: str
    created_at: datetime
    timestamp: datetime


@router.get("/activity", response_model=list[ActivityEntry])
def get_activity_feed(current_user: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[ActivityEntry]:
    entries: list[ActivityEntry] = []

    for drive in db.scalars(select(Drive).options(joinedload(Drive.company)).order_by(Drive.created_at.desc()).limit(50)).all():
        comp_name = drive.company.name if drive.company else ""
        title = f"{drive.role} ({comp_name})" if comp_name else drive.role
        entries.append(
            ActivityEntry(
                id=f"drive_{drive.id}",
                type="drive_created",
                description=f"Placement Drive Created: {title}",
                actor_email="TPO Office",
                action="created placement drive",
                target_entity=title,
                created_at=drive.created_at,
                timestamp=drive.created_at
            )
        )

    for application in db.scalars(select(Application).order_by(Application.applied_on.desc()).limit(50)).all():
        user = application.user or db.get(User, application.user_id)
        drive = application.drive or db.get(Drive, application.drive_id)
        comp_name = drive.company.name if (drive and drive.company) else ""
        drive_title = f"{drive.role} ({comp_name})" if (drive and comp_name) else (drive.role if drive else f"Drive #{application.drive_id}")
        
        user_email = user.email if user else "Student"
        status_label = application.status.value.capitalize()

        entries.append(
            ActivityEntry(
                id=f"app_{application.id}",
                type="application",
                description=f"{user_email} applied for {drive_title} — Status: {status_label}",
                actor_email=user_email,
                action="applied to",
                target_entity=f"{drive_title} — Status: {status_label}",
                created_at=application.applied_on,
                timestamp=application.applied_on
            )
        )

    for notification in db.scalars(
        select(Notification).where(Notification.type.in_([NotificationType.WARNING, NotificationType.NOTICE]))
        .order_by(Notification.created_at.desc()).limit(50)
    ).all():
        entries.append(
            ActivityEntry(
                id=f"notif_{notification.id}",
                type=notification.type.value,
                description=notification.message,
                actor_email=notification.sender.email if notification.sender else "System",
                action="sent notification",
                target_entity="Student",
                created_at=notification.created_at,
                timestamp=notification.created_at
            )
        )

    entries.sort(key=lambda entry: entry.created_at, reverse=True)
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
    total_students: int
    placed_students: int
    active_drives: int
    average_readiness_score: float
    total_drives: int
    total_applications: int
    total_selected: int


@router.get("/analytics", response_model=AdminAnalyticsResponse)
def get_admin_analytics(current_user: User = Depends(require_admin), db: Session = Depends(get_db)) -> AdminAnalyticsResponse:
    cid = current_user.college_id
    app_query = select(Application)
    drive_query = select(Drive)
    user_cond = [User.user_type == UserType.STUDENT]

    if cid is not None:
        app_query = app_query.join(Drive, Application.drive_id == Drive.id).where(Drive.college_id == cid)
        drive_query = drive_query.where(Drive.college_id == cid)
        user_cond.append(User.college_id == cid)

    applications = db.scalars(app_query).all()

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
    total_drives = len(db.scalars(drive_query).all())
    active_drives = len(db.scalars(drive_query.where(Drive.status == DriveStatus.OPEN)).all())
    
    total_students = db.scalar(select(func.count()).select_from(Profile).join(User).where(*user_cond))
    placed_students = db.scalar(select(func.count()).select_from(Profile).join(User).where(*user_cond, Profile.is_placed == True))
    
    avg_readiness = db.scalar(
        select(func.avg(Analytics.readiness_score)).join(User, Analytics.user_id == User.id).where(*user_cond)
        if cid is not None else select(func.avg(Analytics.readiness_score))
    )
    average_readiness_score = float(avg_readiness) if avg_readiness else 0.0

    return AdminAnalyticsResponse(
        department_stats=department_stats,
        package_stats=package_stats,
        total_students=total_students or 0,
        placed_students=placed_students or 0,
        active_drives=active_drives or 0,
        average_readiness_score=average_readiness_score,
        total_drives=total_drives,
        total_applications=len(applications),
        total_selected=total_selected,
    )
