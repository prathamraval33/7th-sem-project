"""Admin — platform-wide drive moderation, student/TPO oversight, activity
feed, and global analytics.
"""
from datetime import datetime, timezone, timedelta
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
from app.models.audit_log import AuditLog
from app.models.college import College
from app.models.college_feature import CollegeFeature, FeatureRequestStatus
from app.models.contact_message import ContactMessage, ContactStatus
from app.models.custom_feature_request import CustomFeatureRequest, CustomFeatureStatus
from app.models.drive import Drive, DriveStatus
from app.models.feature import Feature, FeatureStatus
from app.models.notification import Notification, NotificationType
from app.models.profile import Profile
from app.models.transaction import Transaction
from app.models.user import User, UserType
from app.schemas.admin import (
    AdminFeatureResponse,
    AdminUserCreate,
    AdminUserUpdate,
    CollegeDomainUpdate,
    CollegeInfoResponse,
    CollegeProfileUpdate,
    CollegeBillingTransactionResponse,
)
from app.schemas.college_onboarding import SetupChecklistResponse
from app.services.college_onboarding_service import compute_setup_checklist
from app.schemas.custom_feature_request import (
    CustomFeatureRequestCreate,
    CustomFeatureRequestResponse,
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
    category: Optional[str] = "general"
    severity: Optional[str] = "info"
    details: Optional[str] = None


@router.get("/activity", response_model=list[ActivityEntry])
def get_activity_feed(current_user: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[ActivityEntry]:
    entries: list[ActivityEntry] = []
    cid = current_user.college_id

    # 1. Drives created
    drive_query = select(Drive).options(joinedload(Drive.company))
    if cid is not None:
        drive_query = drive_query.where(Drive.college_id == cid)
    for drive in db.scalars(drive_query.order_by(Drive.created_at.desc()).limit(50)).all():
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
                timestamp=drive.created_at,
                category="drives",
                severity="info",
                details=f"Placement drive for {title} registered with deadline {drive.deadline.strftime('%Y-%m-%d %H:%M') if drive.deadline else 'TBD'}",
            )
        )

    # 2. Student Applications
    app_query = select(Application).join(Drive, Application.drive_id == Drive.id).options(
        joinedload(Application.user), joinedload(Application.drive).joinedload(Drive.company)
    )
    if cid is not None:
        app_query = app_query.where(Drive.college_id == cid)
    for application in db.scalars(app_query.order_by(Application.applied_on.desc()).limit(50)).all():
        user = application.user or db.get(User, application.user_id)
        drive = application.drive or db.get(Drive, application.drive_id)
        comp_name = drive.company.name if (drive and drive.company) else ""
        drive_title = f"{drive.role} ({comp_name})" if (drive and comp_name) else (drive.role if drive else f"Drive #{application.drive_id}")
        
        user_email = user.email if user else "Student"
        status_label = application.status.value.capitalize()

        sev = "info"
        if application.status.value in ("selected", "offer_accepted"):
            sev = "success"
        elif application.status.value in ("rejected", "withdrawn"):
            sev = "warning"

        entries.append(
            ActivityEntry(
                id=f"app_{application.id}",
                type="application",
                description=f"{user_email} applied for {drive_title} — Status: {status_label}",
                actor_email=user_email,
                action="applied to",
                target_entity=f"{drive_title} — Status: {status_label}",
                created_at=application.applied_on,
                timestamp=application.applied_on,
                category="applications",
                severity=sev,
                details=f"Application #{application.id} for {drive_title}. Current state: {status_label}",
            )
        )

    # 3. Disciplinary Warnings & Notices
    notif_query = (
        select(Notification)
        .join(User, Notification.recipient_id == User.id)
        .options(joinedload(Notification.sender), joinedload(Notification.recipient))
        .where(Notification.type.in_([NotificationType.WARNING, NotificationType.NOTICE, NotificationType.TEST_VIOLATION]))
    )
    if cid is not None:
        notif_query = notif_query.where(User.college_id == cid)
    for notification in db.scalars(notif_query.order_by(Notification.created_at.desc()).limit(50)).all():
        is_warn = notification.type in (NotificationType.WARNING, NotificationType.TEST_VIOLATION)
        target = notification.recipient.email if notification.recipient else "Student"
        entries.append(
            ActivityEntry(
                id=f"notif_{notification.id}",
                type=notification.type.value,
                description=notification.message,
                actor_email=notification.sender.email if notification.sender else "System",
                action="issued warning" if is_warn else "sent notice",
                target_entity=target,
                created_at=notification.created_at,
                timestamp=notification.created_at,
                category="warnings" if is_warn else "notices",
                severity="warning" if is_warn else "info",
                details=f"Notification delivered to {target}. Type: {notification.type.value}",
            )
        )

    # 4. Institutional AuditLog Entries
    college = db.get(College, cid) if cid else None
    college_name = college.name if college else ""
    audit_query = select(AuditLog).options(joinedload(AuditLog.performed_by_user)).order_by(AuditLog.timestamp.desc()).limit(50)
    for audit in db.scalars(audit_query).all():
        belongs = False
        if cid is None:
            belongs = True
        elif audit.performed_by_user and audit.performed_by_user.college_id == cid:
            belongs = True
        elif college_name and audit.details and college_name.lower() in audit.details.lower():
            belongs = True
        elif audit.action in ("announcement_sent", "platform_config_updated"):
            belongs = True

        if belongs:
            sev = "info"
            act_lower = audit.action.lower()
            det_lower = (audit.details or "").lower()
            if "warn" in act_lower or "suspend" in det_lower:
                sev = "warning"
            elif "delete" in act_lower or "critical" in det_lower or "reject" in act_lower:
                sev = "critical"
            elif "grant" in act_lower or "active" in det_lower or "verify" in act_lower or "approve" in act_lower:
                sev = "success"

            entries.append(
                ActivityEntry(
                    id=f"audit_{audit.id}",
                    type="audit_log",
                    description=audit.details or audit.action,
                    actor_email=audit.performed_by_user.email if audit.performed_by_user else "SuperAdmin Console",
                    action=audit.action.replace("_", " ").title(),
                    target_entity=college_name or "Institutional Platform",
                    created_at=audit.timestamp,
                    timestamp=audit.timestamp,
                    category="audit",
                    severity=sev,
                    details=audit.details,
                )
            )

    entries.sort(key=lambda entry: entry.created_at, reverse=True)
    return entries[:120]


# ─── Admin Messages Hub Schemas & Endpoints ─────────────────────────────────

class AdminMessageItem(BaseModel):
    id: str
    source_type: str  # "contact" | "notification"
    source_id: int
    sender_name: str
    sender_email: str
    sender_role: str  # "student" | "tpo" | "visitor" | "admin" | "system"
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None
    recipient_role: Optional[str] = None
    subject: str
    content: str
    category: str  # "inquiry" | "broadcast" | "warning" | "notice" | "system"
    status: str  # "new" | "read" | "resolved"
    is_read: bool
    created_at: datetime
    contact_phone: Optional[str] = None
    academic_info: Optional[dict] = None


class AdminBroadcastRequest(BaseModel):
    target_audience: str  # "all_students" | "all_tpos" | "all" | "email"
    subject: str
    message: str
    severity: str = "notice"  # "notice" | "warning" | "info"
    target_email: Optional[str] = None


class MessageStatusUpdate(BaseModel):
    status: str  # "new" | "read" | "resolved"


class AdminReplyRequest(BaseModel):
    reply_message: str
    target_email: str
    target_name: Optional[str] = None
    send_as_notification: bool = True


@router.get("/messages", response_model=list[AdminMessageItem])
def get_admin_messages(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[AdminMessageItem]:
    import re
    items: list[AdminMessageItem] = []
    cid = current_user.college_id

    # 1. Contact Messages (public or student contact inquiries)
    contact_stmt = select(ContactMessage).options(
        joinedload(ContactMessage.submitted_by).joinedload(User.profile)
    ).order_by(ContactMessage.created_at.desc()).limit(100)

    for cm in db.scalars(contact_stmt).all():
        if cid is not None and cm.submitted_by and cm.submitted_by.college_id not in (None, cid):
            continue

        phone = None
        acad = None
        role = "visitor"
        if cm.submitted_by:
            role = cm.submitted_by.user_type.value
            if cm.submitted_by.profile:
                p = cm.submitted_by.profile
                acad = {
                    "student_id": p.student_id,
                    "branch": p.branch,
                    "cgpa": p.cgpa,
                }

        # Check if message contains a phone number or extract
        phone_match = re.search(r"(\+?[0-9]{10,13})", cm.message)
        if phone_match:
            phone = phone_match.group(1)

        items.append(
            AdminMessageItem(
                id=f"contact_{cm.id}",
                source_type="contact",
                source_id=cm.id,
                sender_name=cm.name,
                sender_email=cm.email,
                sender_role=role,
                recipient_name=current_user.email.split("@")[0].title(),
                recipient_email=current_user.email,
                recipient_role="admin",
                subject=f"{cm.category.value.capitalize()} Inquiry from {cm.name}",
                content=cm.message,
                category="inquiry",
                status=cm.status.value,
                is_read=(cm.status.value != "new"),
                created_at=cm.created_at,
                contact_phone=phone,
                academic_info=acad,
            )
        )

    # 2. College Notifications (Notices, Warnings, Info, Broadcasts)
    notif_stmt = (
        select(Notification)
        .options(
            joinedload(Notification.recipient).joinedload(User.profile),
            joinedload(Notification.sender),
        )
        .order_by(Notification.created_at.desc())
        .limit(100)
    )
    for notif in db.scalars(notif_stmt).all():
        is_relevant = False
        if cid is None:
            is_relevant = True
        elif notif.recipient and notif.recipient.college_id == cid:
            is_relevant = True
        elif notif.sender and notif.sender.college_id == cid:
            is_relevant = True
        elif notif.recipient_id == current_user.id or notif.sender_id == current_user.id:
            is_relevant = True

        if not is_relevant:
            continue

        cat = "notice"
        if notif.type in (NotificationType.WARNING, NotificationType.TEST_VIOLATION):
            cat = "warning"
        elif notif.type in (NotificationType.SYSTEM, NotificationType.COLLEGE_COLLISION_ALERT):
            cat = "system"
        elif notif.sender_id == current_user.id:
            cat = "broadcast"

        sender_name = "Admin Office" if not notif.sender else (notif.sender.email.split("@")[0].title())
        sender_role = "admin" if not notif.sender else notif.sender.user_type.value
        recipient_name = notif.recipient.email.split("@")[0].title() if notif.recipient else "Campus Members"
        recipient_role = notif.recipient.user_type.value if notif.recipient else "all"

        acad = None
        if notif.recipient and notif.recipient.profile:
            p = notif.recipient.profile
            acad = {
                "student_id": p.student_id,
                "branch": p.branch,
                "cgpa": p.cgpa,
            }

        items.append(
            AdminMessageItem(
                id=f"notif_{notif.id}",
                source_type="notification",
                source_id=notif.id,
                sender_name=sender_name,
                sender_email=notif.sender.email if notif.sender else "system@placementportal.edu",
                sender_role=sender_role,
                recipient_name=recipient_name,
                recipient_email=notif.recipient.email if notif.recipient else "",
                recipient_role=recipient_role,
                subject=f"{cat.capitalize()}: {notif.message[:45]}...",
                content=notif.message,
                category=cat,
                status="read" if notif.is_read else "new",
                is_read=notif.is_read,
                created_at=notif.created_at,
                contact_phone=None,
                academic_info=acad,
            )
        )

    items.sort(key=lambda x: x.created_at, reverse=True)
    return items


@router.post("/messages/broadcast", status_code=status.HTTP_201_CREATED)
def admin_broadcast_message(
    payload: AdminBroadcastRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    cid = current_user.college_id
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message body cannot be empty.")

    notif_type = NotificationType.NOTICE
    if payload.severity == "warning":
        notif_type = NotificationType.WARNING
    elif payload.severity == "info":
        notif_type = NotificationType.INFO

    # Determine recipient users
    user_query = select(User).where(User.is_active == True)
    if cid is not None:
        user_query = user_query.where(User.college_id == cid)

    if payload.target_audience == "all_students":
        user_query = user_query.where(User.user_type == UserType.STUDENT)
    elif payload.target_audience == "all_tpos":
        user_query = user_query.where(User.user_type == UserType.TPO)
    elif payload.target_audience == "email" and payload.target_email:
        user_query = user_query.where(User.email == payload.target_email.strip().lower())

    recipients = list(db.scalars(user_query).all())
    if not recipients and payload.target_audience == "email":
        raise HTTPException(status_code=404, detail=f"No user found with email {payload.target_email}")

    formatted_msg = f"[{payload.subject}] {payload.message}" if payload.subject else payload.message
    created_count = 0
    for r in recipients:
        db.add(
            Notification(
                recipient_id=r.id,
                sender_id=current_user.id,
                type=notif_type,
                message=formatted_msg,
                is_read=False,
            )
        )
        created_count += 1

    target_desc = payload.target_audience
    if payload.target_audience == "email" and payload.target_email:
        target_desc = payload.target_email

    audit_entry = AuditLog(
        action="admin_broadcast_sent",
        details=f"Broadcast sent to {target_desc} ({created_count} recipients). Subject: '{payload.subject}'. Severity: {payload.severity}",
        performed_by=current_user.id,
    )
    db.add(audit_entry)
    db.commit()

    return {
        "success": True,
        "message": f"Broadcast delivered to {created_count} recipients.",
        "recipients_count": created_count,
    }


@router.patch("/messages/{source_type}/{message_id}/status")
def update_message_status(
    source_type: str,
    message_id: int,
    payload: MessageStatusUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if source_type == "contact":
        msg = db.get(ContactMessage, message_id)
        if not msg:
            raise HTTPException(status_code=404, detail="Contact message not found.")
        try:
            msg.status = ContactStatus(payload.status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status value.")
        db.commit()
        return {"status": msg.status.value}
    elif source_type == "notification":
        notif = db.get(Notification, message_id)
        if not notif:
            raise HTTPException(status_code=404, detail="Notification not found.")
        notif.is_read = (payload.status in ("read", "resolved"))
        db.commit()
        return {"status": "read" if notif.is_read else "new"}
    else:
        raise HTTPException(status_code=400, detail="Invalid source type.")


@router.post("/messages/reply")
def reply_to_message(
    payload: AdminReplyRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    target_user = db.scalar(select(User).where(User.email == payload.target_email.strip().lower()))
    if target_user and payload.send_as_notification:
        notif = Notification(
            recipient_id=target_user.id,
            sender_id=current_user.id,
            type=NotificationType.NOTICE,
            message=f"[Admin Reply] {payload.reply_message}",
            is_read=False,
        )
        db.add(notif)

    db.add(
        AuditLog(
            action="admin_message_replied",
            details=f"Admin replied to {payload.target_email}. Message snippet: {payload.reply_message[:80]}",
            performed_by=current_user.id,
        )
    )
    db.commit()
    return {"success": True, "message": f"Reply dispatched to {payload.target_email}"}



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

    # Subscription status and cycle dates calculation (supporting old/enrolled/live colleges)
    now = datetime.now(timezone.utc)
    dirty = False
    if college.subscription_started_at is None:
        college.subscription_started_at = college.created_at or now
        dirty = True
    if college.subscription_expires_at is None:
        college.subscription_expires_at = college.subscription_started_at + timedelta(days=30)
        dirty = True

    exp = college.subscription_expires_at
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    is_expired = bool(exp and now >= exp)
    if is_expired and college.subscription_status == "active":
        college.subscription_status = "expired"
        dirty = True
    elif not is_expired and college.subscription_status == "expired":
        college.subscription_status = "active"
        dirty = True

    if dirty:
        db.commit()
        db.refresh(college)

    days_remaining = 0
    if exp and exp > now:
        days_remaining = max(0, (exp - now).days)

    can_renew = is_expired or (college.subscription_status in ["expired", "pending_payment"])

    return CollegeInfoResponse(
        id=college.id,
        name=college.name,
        domain=college.domain,
        contact_name=college.contact_name,
        contact_mobile=college.contact_mobile,
        contact_mobile_verified=college.contact_mobile_verified,
        status=college.status.value if hasattr(college.status, "value") else str(college.status),
        created_at=college.created_at,
        students=student_count,
        tpos=tpo_count,
        drives=drive_count,
        applications=app_count,
        subscription_status=college.subscription_status or "active",
        subscription_plan=college.subscription_plan or "campus_standard",
        subscription_amount=float(college.subscription_amount or 10000.00),
        subscription_started_at=college.subscription_started_at,
        subscription_expires_at=college.subscription_expires_at,
        is_subscription_expired=is_expired,
        days_remaining=days_remaining,
        can_renew=can_renew,
    )


@router.get("/college/setup-checklist", response_model=SetupChecklistResponse)
def get_college_setup_checklist(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SetupChecklistResponse:
    """Fetch live progressive setup checklist for this college admin, auto-transitioning to ready_for_review if complete."""
    cid = current_user.college_id
    if cid is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No college associated with this admin account")

    college = db.get(College, cid)
    if college is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="College not found")

    return compute_setup_checklist(db=db, college=college, current_user_id=current_user.id)


@router.patch("/college/profile", response_model=CollegeInfoResponse)
def update_college_profile(
    payload: CollegeProfileUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> CollegeInfoResponse:
    """Update the institution's official name, primary contact person name, and contact phone."""
    cid = current_user.college_id
    if cid is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No college associated with this admin account")

    college = db.get(College, cid)
    if college is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="College not found")

    if payload.name is not None:
        new_name = payload.name.strip()
        if len(new_name) < 2:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Institution name must be at least 2 characters")
        existing = db.scalar(
            select(College).where(func.lower(College.name) == new_name.lower(), College.id != cid)
        )
        if existing is not None:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail=f"An institution with the name '{new_name}' already exists.",
            )
        college.name = new_name

    if payload.contact_name is not None:
        cleaned_contact = payload.contact_name.strip()
        college.contact_name = cleaned_contact if cleaned_contact else None

    if payload.contact_mobile is not None:
        cleaned_mobile = payload.contact_mobile.strip()
        college.contact_mobile = cleaned_mobile if cleaned_mobile else None

    db.commit()
    db.refresh(college)

    return get_college_info(current_user=current_user, db=db)


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


@router.post("/custom-features", response_model=CustomFeatureRequestResponse, status_code=status.HTTP_201_CREATED)
def submit_custom_feature_request(
    payload: CustomFeatureRequestCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> CustomFeatureRequest:
    """College Admin proposes a new custom platform feature to SuperAdmin."""
    if current_user.college_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No college associated with this admin account")

    req = CustomFeatureRequest(
        college_id=current_user.college_id,
        admin_id=current_user.id,
        title=payload.title,
        description=payload.description,
        target_user=payload.target_user,
        category=payload.category,
        priority=payload.priority,
        status=CustomFeatureStatus.PENDING.value,
    )
    db.add(req)

    # Notify all active SuperAdmins
    college = db.get(College, current_user.college_id)
    college_name = college.name if college else f"College #{current_user.college_id}"
    superadmins = db.scalars(
        select(User).where(User.user_type == UserType.SUPERADMIN, User.is_active == True)
    ).all()
    for sa in superadmins:
        db.add(
            Notification(
                recipient_id=sa.id,
                sender_id=current_user.id,
                type=NotificationType.FEATURE_REQUEST_RECEIVED,
                message=f"{college_name} submitted custom feature proposal: '{payload.title}'.",
            )
        )

    db.commit()
    db.refresh(req)
    return req


@router.get("/custom-features", response_model=list[CustomFeatureRequestResponse])
def list_custom_feature_requests(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[CustomFeatureRequest]:
    """List all custom feature proposals submitted by this college."""
    if current_user.college_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No college associated with this admin account")

    requests = list(
        db.scalars(
            select(CustomFeatureRequest)
            .options(joinedload(CustomFeatureRequest.college), joinedload(CustomFeatureRequest.admin))
            .where(CustomFeatureRequest.college_id == current_user.college_id)
            .order_by(CustomFeatureRequest.created_at.desc())
        ).all()
    )
    return requests


@router.get("/billing/transactions", response_model=list[CollegeBillingTransactionResponse])
def get_college_billing_transactions(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[CollegeBillingTransactionResponse]:
    """List all payment transactions and invoices for this college (subscription + modules)."""
    cid = current_user.college_id
    if cid is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No college associated with this admin account")

    txns = list(
        db.scalars(
            select(Transaction)
            .options(joinedload(Transaction.feature))
            .where(Transaction.college_id == cid)
            .order_by(Transaction.created_at.desc())
        ).all()
    )

    results = []
    for t in txns:
        desc = (
            "Campus Standard License (Monthly)"
            if t.feature_id is None
            else f"Add-on: {t.feature.name if t.feature else 'Feature'}"
        )
        results.append(
            CollegeBillingTransactionResponse(
                id=t.id,
                amount=float(t.amount),
                currency=t.currency or "INR",
                status=t.status.value if hasattr(t.status, "value") else str(t.status),
                description=desc,
                razorpay_order_id=t.razorpay_order_id,
                razorpay_payment_id=t.razorpay_payment_id,
                created_at=t.created_at,
                paid_at=t.paid_at,
            )
        )
    return results



