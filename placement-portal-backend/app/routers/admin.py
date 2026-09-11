"""Admin — platform-wide drive moderation, student/TPO oversight, activity
feed, and global analytics.
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func
from sqlalchemy.orm import Session, joinedload

from app.models.fee_receipt_template import FeeReceiptTemplate
from app.schemas.fee_receipt import FeeReceiptTemplateResponse
from app.services import fee_receipt_service
from app.utils.exceptions import FileValidationError
from app.utils.file_storage import (
    FEE_RECEIPT_EXTENSIONS,
    read_upload_file_limited,
    save_upload,
    validate_file,
)

from app.core.dependencies import require_admin
from app.core.feature_gating import _maybe_expire
from app.core.security import hash_password
from app.db.session import get_db
from app.models.analytics import Analytics
from app.models.application import Application, ApplicationStatus
from app.models.college import College
from app.models.college_feature import CollegeFeature, FeatureRequestStatus
from app.models.drive import Drive, DriveStatus
from app.models.feature import Feature, FeatureStatus
from app.models.notification import Notification, NotificationType
from app.models.profile import Profile
from app.models.user import User, UserType
from app.schemas.admin import (
    AdminFeatureResponse,
    AdminUserCreate,
    AdminUserUpdate,
    CollegeDomainUpdate,
    CollegeInfoResponse,
)
from app.schemas.drive import DriveResponse, DriveUpdate
from app.schemas.profile import ProfilePlacementOverrideUpdate, ProfileResponse

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


@router.get("/features", response_model=list[AdminFeatureResponse])
def list_admin_features(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[AdminFeatureResponse]:
    """Return all non-deprecated features and their current status for this college."""
    cid = current_user.college_id
    if cid is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No college associated with this account")

    features = db.scalars(
        select(Feature)
        .where(Feature.status == FeatureStatus.ACTIVE)
        .order_by(Feature.name.asc())
    ).all()

    cf_map = {
        cf.feature_id: cf
        for cf in db.scalars(select(CollegeFeature).where(CollegeFeature.college_id == cid)).all()
    }

    result: list[AdminFeatureResponse] = []
    for feat in features:
        cf = cf_map.get(feat.id)
        if cf:
            _maybe_expire(cf, db)
            st = cf.status.value
            amount = float(cf.amount_charged) if cf.amount_charged is not None else None
            req_at = cf.requested_at
            dec_at = cf.decided_at
            app_at = cf.approved_at
            paid_at = cf.paid_at
            exp_at = cf.expires_at
            auto = cf.is_auto_granted
        else:
            st = "not_requested"
            amount = None
            req_at = None
            dec_at = None
            app_at = None
            paid_at = None
            exp_at = None
            auto = False

        result.append(
            AdminFeatureResponse(
                id=feat.id,
                code=feat.code,
                name=feat.name,
                description=feat.description,
                category=feat.category,
                target_role=feat.target_role,
                price=float(feat.price) if feat.price is not None else None,
                billing_type=feat.billing_type.value if hasattr(feat.billing_type, "value") else str(feat.billing_type),
                status=st,
                amount_charged=amount,
                requested_at=req_at,
                decided_at=dec_at,
                approved_at=app_at,
                paid_at=paid_at,
                expires_at=exp_at,
                is_auto_granted=auto,
            )
        )
    return result


@router.post("/features/{feature_id}/request", response_model=AdminFeatureResponse)
def request_feature(
    feature_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminFeatureResponse:
    """Request an optional feature for the current admin's college."""
    cid = current_user.college_id
    if cid is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No college associated with this account")

    feature = db.get(Feature, feature_id)
    if feature is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Feature not found")

    if feature.status == FeatureStatus.DEPRECATED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Feature is deprecated and cannot be requested")

    if feature.status == FeatureStatus.DRAFT:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Feature is not yet available for request")

    cf = db.scalar(
        select(CollegeFeature).where(
            CollegeFeature.college_id == cid,
            CollegeFeature.feature_id == feature_id,
        )
    )

    now = datetime.now(timezone.utc)
    if cf is not None:
        if cf.status in (
            FeatureRequestStatus.PENDING_REVIEW,
            FeatureRequestStatus.APPROVED_AWAITING_PAYMENT,
            FeatureRequestStatus.ACTIVE,
        ):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail=f"Feature is already in '{cf.status.value}' status for your institution",
            )
        # Re-requesting after rejection, expiry, approval_expired, or payment failure
        cf.status = FeatureRequestStatus.PENDING_REVIEW
        cf.requested_at = now
        cf.decided_at = None
        cf.decided_by = None
        cf.approved_at = None
        cf.paid_at = None
        cf.amount_charged = None
        cf.expires_at = None
        cf.payment_due_at = None
        cf.reminder_count = 0
        cf.last_reminder_sent_at = None
    else:
        cf = CollegeFeature(
            college_id=cid,
            feature_id=feature_id,
            status=FeatureRequestStatus.PENDING_REVIEW,
            requested_at=now,
            reminder_count=0,
        )
        db.add(cf)

    # Notify all active SuperAdmins about incoming feature request
    college = db.get(College, cid)
    college_name = college.name if college else f"College #{cid}"
    superadmins = db.scalars(
        select(User).where(User.user_type == UserType.SUPERADMIN, User.is_active == True)
    ).all()
    for sa in superadmins:
        db.add(
            Notification(
                recipient_id=sa.id,
                sender_id=current_user.id,
                type=NotificationType.FEATURE_REQUEST_RECEIVED,
                message=f"{college_name} requested feature '{feature.name}'.",
            )
        )

    db.commit()
    db.refresh(cf)

    return AdminFeatureResponse(
        id=feature.id,
        code=feature.code,
        name=feature.name,
        description=feature.description,
        category=feature.category,
        target_role=feature.target_role,
        price=float(feature.price) if feature.price is not None else None,
        billing_type=feature.billing_type.value if hasattr(feature.billing_type, "value") else str(feature.billing_type),
        status=cf.status.value,
        amount_charged=float(cf.amount_charged) if cf.amount_charged is not None else None,
        requested_at=cf.requested_at,
        decided_at=cf.decided_at,
        approved_at=cf.approved_at,
        paid_at=cf.paid_at,
        expires_at=cf.expires_at,
        is_auto_granted=cf.is_auto_granted,
    )


@router.get("/college", response_model=CollegeInfoResponse)
def get_college_info(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> CollegeInfoResponse:
    """Fetch current college details and platform stats for this College Admin."""
    cid = current_user.college_id
    if cid is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No college associated with this admin account")

    college = db.get(College, cid)
    if college is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="College not found")

    student_count = db.scalar(
        select(func.count(User.id)).where(User.college_id == cid, User.user_type == UserType.STUDENT)
    ) or 0
    tpo_count = db.scalar(
        select(func.count(User.id)).where(User.college_id == cid, User.user_type == UserType.TPO)
    ) or 0
    drive_count = db.scalar(
        select(func.count(Drive.id)).where(Drive.college_id == cid)
    ) or 0
    app_count = db.scalar(
        select(func.count(Application.id)).join(Drive, Application.drive_id == Drive.id).where(Drive.college_id == cid)
    ) or 0

    return CollegeInfoResponse(
        id=college.id,
        name=college.name,
        domain=college.domain,
        status=college.status.value if hasattr(college.status, "value") else str(college.status),
        created_at=college.created_at,
        students=student_count,
        tpos=tpo_count,
        drives=drive_count,
        applications=app_count,
    )


@router.patch("/college/domain", response_model=CollegeInfoResponse)
def update_college_domain(
    payload: CollegeDomainUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> CollegeInfoResponse:
    """Update the institution's allowed email domain for student signups."""
    cid = current_user.college_id
    if cid is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No college associated with this admin account")

    college = db.get(College, cid)
    if college is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="College not found")

    new_domain = payload.domain.lower().strip()
    if "@" in new_domain:
        new_domain = new_domain.split("@")[-1].strip()

    if "." not in new_domain or len(new_domain) < 4:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid domain format. Example: college.edu or college.ac.in")

    # Check for domain collisions across platform
    existing = db.scalar(
        select(College).where(func.lower(College.domain) == new_domain, College.id != cid)
    )
    if existing is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail=f"The domain '{new_domain}' is already assigned to another institution ('{existing.name}').",
        )

    college.domain = new_domain
    db.commit()
    db.refresh(college)

    return get_college_info(current_user=current_user, db=db)


# --------------------------------------------------------------------------
# College Fee Receipt Templates (Reference samples for template matching)
# --------------------------------------------------------------------------
@router.post("/college/fee-template", response_model=FeeReceiptTemplateResponse, status_code=status.HTTP_201_CREATED)
@router.post("/college/fee-templates", response_model=FeeReceiptTemplateResponse, status_code=status.HTTP_201_CREATED)
async def upload_college_fee_template(
    file: UploadFile = File(...),
    template_name: Optional[str] = Form(None),
    deactivate_others: bool = Form(False),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> FeeReceiptTemplate:
    """Upload an official reference fee receipt sample for the admin's college.
    Runs OCR and stores extracted text for student template-matching.
    Supports multiple active templates per institution.
    """
    if current_user.college_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No college associated with this admin account")

    try:
        file_bytes = await read_upload_file_limited(file)
        validate_file(file.filename or "", len(file_bytes), FEE_RECEIPT_EXTENSIONS, content_bytes=file_bytes)
    except FileValidationError as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=error.message) from error

    relative_path = save_upload(file_bytes, file.filename, subfolder="fee_receipt_templates")
    extracted_text = fee_receipt_service.extract_receipt_text(relative_path)

    # If admin explicitly asked to deactivate others (replace all mode)
    if deactivate_others:
        previous_templates = db.scalars(
            select(FeeReceiptTemplate).where(
                FeeReceiptTemplate.college_id == current_user.college_id,
                FeeReceiptTemplate.is_active == True,
            )
        ).all()
        for t in previous_templates:
            t.is_active = False

    cleaned_name = (template_name.strip() if template_name and template_name.strip() else None) or (
        file.filename.rsplit(".", 1)[0].replace("_", " ").title() if file.filename else "Official Fee Receipt"
    )

    template = FeeReceiptTemplate(
        college_id=current_user.college_id,
        template_name=cleaned_name,
        file_path=relative_path,
        original_filename=file.filename,
        extracted_text=extracted_text,
        uploaded_by=current_user.id,
        is_active=True,
    )
    db.add(template)
    db.commit()
    db.refresh(template)

    return template


@router.get("/college/fee-templates", response_model=list[FeeReceiptTemplateResponse])
def list_college_fee_templates(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[FeeReceiptTemplate]:
    """Retrieve all reference sample templates for the admin's college, newest first."""
    if current_user.college_id is None:
        return []

    templates = db.scalars(
        select(FeeReceiptTemplate)
        .where(FeeReceiptTemplate.college_id == current_user.college_id)
        .order_by(FeeReceiptTemplate.created_at.desc())
    ).all()
    return list(templates)


@router.get("/college/fee-template", response_model=Optional[FeeReceiptTemplateResponse])
def get_college_fee_template(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Optional[FeeReceiptTemplate]:
    """Retrieve the primary/latest active reference sample template for the admin's college."""
    if current_user.college_id is None:
        return None

    template = db.scalar(
        select(FeeReceiptTemplate)
        .where(
            FeeReceiptTemplate.college_id == current_user.college_id,
            FeeReceiptTemplate.is_active == True,
        )
        .order_by(FeeReceiptTemplate.created_at.desc())
    )
    return template


@router.patch("/college/fee-templates/{template_id}/toggle-active", response_model=FeeReceiptTemplateResponse)
def toggle_college_fee_template_active(
    template_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> FeeReceiptTemplate:
    """Toggles active/inactive status for a specific template."""
    template = db.get(FeeReceiptTemplate, template_id)
    if not template or template.college_id != current_user.college_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Template not found")

    template.is_active = not template.is_active
    db.commit()
    db.refresh(template)
    return template


@router.delete("/college/fee-templates/{template_id}", status_code=status.HTTP_200_OK)
def delete_college_fee_template_by_id(
    template_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Deletes a specific reference template for this college."""
    template = db.get(FeeReceiptTemplate, template_id)
    if not template or template.college_id != current_user.college_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Template not found")

    db.delete(template)
    db.commit()
    return {"message": "Template removed successfully", "template_id": template_id}


@router.delete("/college/fee-template", status_code=status.HTTP_200_OK)
def deactivate_college_fee_template(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Deactivates all active reference sample templates for this college."""
    if current_user.college_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No college associated with this admin account")

    templates = db.scalars(
        select(FeeReceiptTemplate).where(
            FeeReceiptTemplate.college_id == current_user.college_id,
            FeeReceiptTemplate.is_active == True,
        )
    ).all()
    for t in templates:
        t.is_active = False
    db.commit()
    return {"message": "All reference samples deactivated"}

