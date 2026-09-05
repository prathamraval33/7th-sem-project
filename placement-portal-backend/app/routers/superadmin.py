"""SuperAdmin routes for multi-tenant platform management."""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import require_superadmin
from app.core.feature_gating import _as_utc, check_all_expiries
from app.core.security import hash_password
from app.db.session import get_db
from app.models.announcement import Announcement
from app.models.application import Application
from app.models.audit_log import AuditLog
from app.models.college import College, CollegeStatus
from app.models.college_feature import CollegeFeature, FeatureRequestStatus
from app.models.drive import Drive
from app.models.feature import Feature, FeatureStatus, BillingType
from app.models.notification import Notification, NotificationType
from app.models.profile import Profile
from app.models.transaction import Transaction, TransactionStatus
from app.models.user import User, UserType
from app.schemas.superadmin import (
    AnnouncementCreate,
    AnnouncementResponse,
    AuditLogResponse,
    CollegeCreate,
    CollegeDetail,
    CollegeStatusUpdate,
    CollegeSummary,
    DashboardSummary,
    FeatureCollegeStatus,
    FeatureCreate,
    FeatureRequestResponse,
    FeatureResponse,
    FeatureUpdate,
    SendReminderResponse,
    StatusUpdateResponse,
    SubscriptionItemResponse,
    SubscriptionListResponse,
    SubscriptionSummaryResponse,
    SubscriptionTransactionResponse,
    SuperadminAnalyticsResponse,
)
from app.services import email_service, otp_service
from app.models.otp_verification import OtpPurpose

logger = logging.getLogger(__name__)

BVM_DOMAIN = "bvmengineering.ac.in"

router = APIRouter(prefix="/superadmin", tags=["superadmin"])


@router.get("/dashboard", response_model=DashboardSummary)
def dashboard_summary(current_user: User = Depends(require_superadmin), db: Session = Depends(get_db)) -> DashboardSummary:
    total_colleges = db.scalar(select(func.count()).select_from(College)) or 0
    active_colleges = db.scalar(select(func.count()).select_from(College).where(College.status == CollegeStatus.ACTIVE)) or 0
    suspended_colleges = db.scalar(select(func.count()).select_from(College).where(College.status == CollegeStatus.SUSPENDED)) or 0
    total_students = db.scalar(select(func.count()).select_from(User).where(User.user_type == UserType.STUDENT)) or 0
    total_tpos = db.scalar(select(func.count()).select_from(User).where(User.user_type == UserType.TPO)) or 0
    total_drives = db.scalar(select(func.count()).select_from(Drive)) or 0
    pending_feature_requests = db.scalar(
        select(func.count()).select_from(CollegeFeature).where(CollegeFeature.status == FeatureRequestStatus.PENDING_REVIEW)
    ) or 0

    return DashboardSummary(
        total_colleges=total_colleges,
        active_colleges=active_colleges,
        suspended_colleges=suspended_colleges,
        total_students=total_students,
        total_tpos=total_tpos,
        total_drives=total_drives,
        pending_feature_requests=pending_feature_requests,
    )


@router.get("/colleges", response_model=list[CollegeSummary])
def list_colleges(current_user: User = Depends(require_superadmin), db: Session = Depends(get_db)) -> list[CollegeSummary]:
    colleges = db.scalars(select(College).order_by(College.created_at.desc())).all()
    results: list[CollegeSummary] = []

    for college in colleges:
        admin = db.scalar(
            select(User)
            .where(User.college_id == college.id, User.user_type == UserType.ADMIN)
            .order_by(User.id.asc())
        )
        students = db.scalar(
            select(func.count())
            .select_from(User)
            .where(User.college_id == college.id, User.user_type == UserType.STUDENT)
        ) or 0
        tpos = db.scalar(
            select(func.count())
            .select_from(User)
            .where(User.college_id == college.id, User.user_type == UserType.TPO)
        ) or 0
        drives = db.scalar(
            select(func.count()).select_from(Drive).where(Drive.college_id == college.id)
        ) or 0
        applications = db.scalar(
            select(func.count())
            .select_from(Application)
            .join(Drive, Application.drive_id == Drive.id)
            .where(Drive.college_id == college.id)
        ) or 0

        results.append(
            CollegeSummary(
                id=college.id,
                name=college.name,
                domain=college.domain,
                status=college.status,
                created_at=college.created_at,
                students=students,
                tpos=tpos,
                drives=drives,
                applications=applications,
                admin_name=admin.profile.full_name if admin and admin.profile else None,
                admin_email=admin.email if admin else None,
            )
        )

    return results


@router.post("/colleges", response_model=CollegeSummary, status_code=status.HTTP_201_CREATED)
async def create_college(payload: CollegeCreate, current_user: User = Depends(require_superadmin), db: Session = Depends(get_db)) -> CollegeSummary:
    if db.scalar(select(College).where(College.domain == payload.domain.lower())) is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="A college with this domain already exists")

    college = College(name=payload.name.strip(), domain=payload.domain.strip().lower(), status=CollegeStatus.ACTIVE)
    db.add(college)
    db.flush()

    admin_user = User(
        email=payload.admin_email,
        hashed_password=hash_password(payload.admin_password),
        user_type=UserType.ADMIN,
        college_id=college.id,
        is_email_verified=True,
        is_active=True,
    )
    db.add(admin_user)
    db.flush()

    try:
        from app.models.profile import Profile

        profile = Profile(
            user_id=admin_user.id,
            student_id=payload.admin_email.split("@")[0].upper(),
            full_name=payload.admin_name,
            branch="General",
            cgpa=0.0,
            active_backlogs=0,
            tenth_percentage=0.0,
            twelfth_percentage=0.0,
            skills=[],
        )
        db.add(profile)
    except Exception:
        db.rollback()

    admin = db.scalar(select(User).where(User.id == admin_user.id))
    try:
        otp = otp_service.create_otp(db, admin_user.email, OtpPurpose.SIGNUP)
        await email_service.send_otp_email(admin_user.email, otp, OtpPurpose.SIGNUP)
        db.commit()
        db.refresh(college)
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail="College was not created because the admin verification email could not be sent.",
        ) from error

    return CollegeSummary(
        id=college.id,
        name=college.name,
        domain=college.domain,
        status=college.status,
        created_at=college.created_at,
        students=0,
        tpos=0,
        drives=0,
        applications=0,
        admin_name=payload.admin_name,
        admin_email=payload.admin_email,
    )


@router.get("/colleges/{college_id}", response_model=CollegeDetail)
def get_college(college_id: int, current_user: User = Depends(require_superadmin), db: Session = Depends(get_db)) -> CollegeDetail:
    college = db.get(College, college_id)
    if college is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="College not found")

    admin = db.scalar(select(User).where(User.college_id == college.id, User.user_type == UserType.ADMIN).order_by(User.id.asc()))
    students = db.scalar(select(func.count()).select_from(User).where(User.college_id == college.id, User.user_type == UserType.STUDENT)) or 0
    tpos = db.scalar(select(func.count()).select_from(User).where(User.college_id == college.id, User.user_type == UserType.TPO)) or 0
    drives = db.scalar(select(func.count()).select_from(Drive).where(Drive.college_id == college.id)) or 0
    applications = db.scalar(
        select(func.count())
        .select_from(Application)
        .join(Drive, Application.drive_id == Drive.id)
        .where(Drive.college_id == college.id)
    ) or 0

    enabled_features = db.scalars(
        select(Feature.name)
        .join(CollegeFeature, CollegeFeature.feature_id == Feature.id)
        .where(CollegeFeature.college_id == college.id, CollegeFeature.status == FeatureRequestStatus.ACTIVE)
    ).all()
    pending_features = db.scalars(
        select(Feature.name)
        .join(CollegeFeature, CollegeFeature.feature_id == Feature.id)
        .where(CollegeFeature.college_id == college.id, CollegeFeature.status == FeatureRequestStatus.PENDING_REVIEW)
    ).all()

    return CollegeDetail(
        id=college.id,
        name=college.name,
        domain=college.domain,
        status=college.status,
        created_at=college.created_at,
        updated_at=college.updated_at,
        admin_name=admin.profile.full_name if admin and admin.profile else None,
        admin_email=admin.email if admin else None,
        students=students,
        tpos=tpos,
        drives=drives,
        applications=applications,
        enabled_features=list(enabled_features),
        pending_features=list(pending_features),
    )


@router.patch("/colleges/{college_id}/status", response_model=StatusUpdateResponse)
def update_college_status(
    college_id: int,
    payload: CollegeStatusUpdate,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> StatusUpdateResponse:
    college = db.get(College, college_id)
    if college is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="College not found")

    college.status = payload.status
    db.commit()

    log = AuditLog(action="college_status_updated", details=f"{college.name} -> {payload.status.value}", performed_by=current_user.id)
    db.add(log)
    db.commit()
    return {"message": "College status updated", "status": payload.status.value}


@router.delete("/colleges/{college_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_college(
    college_id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> Response:
    college = db.get(College, college_id)
    if college is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="College not found")

    college_name = college.name
    db.delete(college)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="College cannot be deleted while it has related platform records. Suspend it instead.",
        ) from error

    db.add(AuditLog(action="college_deleted", details=college_name, performed_by=current_user.id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/features", response_model=list[FeatureResponse])
def list_features(current_user: User = Depends(require_superadmin), db: Session = Depends(get_db)) -> list[FeatureResponse]:
    features = db.scalars(select(Feature).order_by(Feature.name)).all()
    return [FeatureResponse.model_validate(feature) for feature in features]


@router.post("/features", response_model=FeatureResponse, status_code=status.HTTP_201_CREATED)
def create_feature(payload: FeatureCreate, current_user: User = Depends(require_superadmin), db: Session = Depends(get_db)) -> FeatureResponse:
    if db.scalar(select(Feature).where(Feature.code == payload.code.lower())) is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Feature code already exists")

    feature = Feature(
        code=payload.code.strip().lower(),
        name=payload.name.strip(),
        description=payload.description.strip(),
        category=payload.category.strip(),
        target_role=payload.target_role.strip(),
        price=payload.price,
        billing_type=payload.billing_type or BillingType.ONE_TIME,
        status=payload.status,
    )
    db.add(feature)
    db.flush()  # get feature.id before auto-granting to BVM

    # Auto-grant to BVM (the default fully-featured testing tenant)
    bvm = db.scalar(select(College).where(College.domain == BVM_DOMAIN))
    if bvm is not None:
        existing = db.scalar(
            select(CollegeFeature).where(
                CollegeFeature.college_id == bvm.id,
                CollegeFeature.feature_id == feature.id,
            )
        )
        if existing is None:
            cf = CollegeFeature(
                college_id=bvm.id,
                feature_id=feature.id,
                status=FeatureRequestStatus.ACTIVE,
                is_auto_granted=True,
                decided_by=current_user.id,
                decided_at=datetime.now(timezone.utc),
                approved_at=datetime.now(timezone.utc),
            )
            db.add(cf)
            logger.info("Auto-granted feature '%s' to BVM (college_id=%s)", feature.name, bvm.id)

    db.commit()
    db.refresh(feature)
    return FeatureResponse.model_validate(feature)


@router.patch("/features/{feature_id}", response_model=FeatureResponse)
def update_feature(feature_id: int, payload: FeatureUpdate, current_user: User = Depends(require_superadmin), db: Session = Depends(get_db)) -> FeatureResponse:
    feature = db.get(Feature, feature_id)
    if feature is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Feature not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is None:
            continue
        if key == "status":
            setattr(feature, key, FeatureStatus(value))
        else:
            setattr(feature, key, value.strip() if isinstance(value, str) else value)

    db.commit()
    db.refresh(feature)
    return FeatureResponse.model_validate(feature)


@router.delete("/features/{feature_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_feature(feature_id: int, current_user: User = Depends(require_superadmin), db: Session = Depends(get_db)) -> Response:
    feature = db.get(Feature, feature_id)
    if feature is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Feature not found")
    db.delete(feature)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


_COLLEGE_FEATURE_STATUS_LABELS = {
    FeatureRequestStatus.PENDING_REVIEW: "pending_review",
    FeatureRequestStatus.REJECTED: "rejected",
    FeatureRequestStatus.APPROVED_AWAITING_PAYMENT: "approved_awaiting_payment",
    FeatureRequestStatus.ACTIVE: "active",
    FeatureRequestStatus.PAYMENT_FAILED: "payment_failed",
    FeatureRequestStatus.EXPIRED: "expired",
    FeatureRequestStatus.REVOKED: "revoked",
}


@router.get("/features/{feature_id}/colleges", response_model=list[FeatureCollegeStatus])
def list_feature_college_status(
    feature_id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> list[FeatureCollegeStatus]:
    feature = db.get(Feature, feature_id)
    if feature is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Feature not found")

    # Start from every college and LEFT JOIN the request/grant row for this
    # feature so colleges with no row still show up as "not_requested".
    rows = db.execute(
        select(College, CollegeFeature)
        .outerjoin(
            CollegeFeature,
            (CollegeFeature.college_id == College.id) & (CollegeFeature.feature_id == feature_id),
        )
        .order_by(College.name)
    ).all()

    result: list[FeatureCollegeStatus] = []
    for college, cf in rows:
        if cf is None:
            result.append(
                FeatureCollegeStatus(college_id=college.id, college_name=college.name, status="not_requested")
            )
            continue
        result.append(
            FeatureCollegeStatus(
                college_id=college.id,
                college_name=college.name,
                request_id=cf.id,
                status=_COLLEGE_FEATURE_STATUS_LABELS.get(cf.status, "not_requested"),
                date=cf.decided_at or cf.requested_at,
            )
        )
    return result


@router.post("/features/{feature_id}/colleges/{college_id}/grant", response_model=StatusUpdateResponse)
def grant_feature_to_college(
    feature_id: int,
    college_id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> StatusUpdateResponse:
    feature = db.get(Feature, feature_id)
    college = db.get(College, college_id)
    if feature is None or college is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Feature or college not found")
    if college.status == CollegeStatus.SUSPENDED:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Cannot grant a feature to a suspended college. Reactivate it first.")

    row = db.scalar(
        select(CollegeFeature).where(CollegeFeature.college_id == college_id, CollegeFeature.feature_id == feature_id)
    )
    now = datetime.now(timezone.utc)
    if row is None:
        row = CollegeFeature(college_id=college_id, feature_id=feature_id, status=FeatureRequestStatus.ACTIVE)
        db.add(row)
    else:
        row.status = FeatureRequestStatus.ACTIVE
    row.decided_at = now
    row.approved_at = now
    row.decided_by = current_user.id
    db.commit()

    log = AuditLog(action="feature_granted", details=f"{college.name} -> {feature.name}", performed_by=current_user.id)
    db.add(log)
    db.commit()
    return {"message": "Feature granted", "status": "active"}


@router.post("/features/{feature_id}/colleges/{college_id}/revoke", response_model=StatusUpdateResponse)
def revoke_feature_from_college(
    feature_id: int,
    college_id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> StatusUpdateResponse:
    feature = db.get(Feature, feature_id)
    college = db.get(College, college_id)
    if feature is None or college is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Feature or college not found")

    row = db.scalar(
        select(CollegeFeature).where(CollegeFeature.college_id == college_id, CollegeFeature.feature_id == feature_id)
    )
    if row is None or row.status != FeatureRequestStatus.ACTIVE:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="This college does not currently have this feature enabled")

    row.status = FeatureRequestStatus.REVOKED
    row.decided_at = datetime.now(timezone.utc)
    row.decided_by = current_user.id
    db.commit()

    log = AuditLog(action="feature_revoked", details=f"{college.name} -> {feature.name}", performed_by=current_user.id)
    db.add(log)
    db.commit()
    return {"message": "Feature revoked", "status": "revoked"}


@router.get("/feature-requests", response_model=list[FeatureRequestResponse])
def list_feature_requests(current_user: User = Depends(require_superadmin), db: Session = Depends(get_db)) -> list[FeatureRequestResponse]:
    rows = db.scalars(
        select(CollegeFeature)
        .options(joinedload(CollegeFeature.college), joinedload(CollegeFeature.feature))
        .order_by(CollegeFeature.requested_at.desc())
    ).all()

    result: list[FeatureRequestResponse] = []
    for row in rows:
        result.append(
            FeatureRequestResponse(
                id=row.id,
                college_id=row.college_id,
                college_name=row.college.name,
                feature_id=row.feature_id,
                feature_name=row.feature.name,
                status=row.status,
                requested_at=row.requested_at,
                decided_at=row.decided_at,
                decided_by=row.decided_by,
            )
        )
    return result


@router.post("/feature-requests/{request_id}/approve", response_model=StatusUpdateResponse)
def approve_feature_request(
    request_id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> StatusUpdateResponse:
    request_row = db.get(CollegeFeature, request_id)
    if request_row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Feature request not found")
    if request_row.college.status == CollegeStatus.SUSPENDED:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Cannot approve a feature request for a suspended college. Reactivate it first.")

    now = datetime.now(timezone.utc)
    feature = db.get(Feature, request_row.feature_id)
    price = float(feature.price) if feature and feature.price else 0

    admin_users = db.scalars(
        select(User).where(
            User.college_id == request_row.college_id,
            User.user_type == UserType.ADMIN,
            User.is_active == True,
        )
    ).all()

    if price <= 0:
        # Free feature — skip payment, go straight to ACTIVE
        request_row.status = FeatureRequestStatus.ACTIVE
        request_row.approved_at = now
        request_row.payment_due_at = None
        result_status = "active"
        msg = "Feature request approved (free — activated immediately)"
        for adm in admin_users:
            db.add(
                Notification(
                    recipient_id=adm.id,
                    sender_id=current_user.id,
                    type=NotificationType.FEATURE_REQUEST_DECIDED,
                    message=f"Your request for feature '{request_row.feature.name}' has been approved and activated.",
                )
            )
    else:
        # Paid feature — wait for payment with explicit 7-day deadline
        payment_due_at = now + timedelta(days=7)
        request_row.status = FeatureRequestStatus.APPROVED_AWAITING_PAYMENT
        request_row.approved_at = now
        request_row.payment_due_at = payment_due_at
        result_status = "approved_awaiting_payment"
        msg = "Feature request approved — awaiting payment"
        due_str = payment_due_at.strftime("%b %d, %Y")
        for adm in admin_users:
            db.add(
                Notification(
                    recipient_id=adm.id,
                    sender_id=current_user.id,
                    type=NotificationType.FEATURE_REQUEST_DECIDED,
                    message=f"Your request for feature '{request_row.feature.name}' has been approved.",
                )
            )
            db.add(
                Notification(
                    recipient_id=adm.id,
                    sender_id=current_user.id,
                    type=NotificationType.PAYMENT_COMPLETION_REQUIRED,
                    message=f"Payment of ₹{price:,.2f} is required for '{request_row.feature.name}'. Please complete payment by {due_str} (7 days).",
                )
            )

    request_row.decided_at = now
    request_row.decided_by = current_user.id
    db.commit()

    log = AuditLog(action="feature_approved", details=f"{request_row.college.name} -> {request_row.feature.name}", performed_by=current_user.id)
    db.add(log)
    db.commit()
    return {"message": msg, "status": result_status}


@router.post("/feature-requests/{request_id}/reject", response_model=StatusUpdateResponse)
def reject_feature_request(
    request_id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> StatusUpdateResponse:
    request_row = db.get(CollegeFeature, request_id)
    if request_row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Feature request not found")
    request_row.status = FeatureRequestStatus.REJECTED
    request_row.decided_at = datetime.now(timezone.utc)
    request_row.decided_by = current_user.id
    db.commit()

    # Notify college admin of rejection
    admin_users = db.scalars(
        select(User).where(
            User.college_id == request_row.college_id,
            User.user_type == UserType.ADMIN,
            User.is_active == True,
        )
    ).all()
    for adm in admin_users:
        db.add(
            Notification(
                recipient_id=adm.id,
                sender_id=current_user.id,
                type=NotificationType.FEATURE_REQUEST_DECIDED,
                message=f"Your request for feature '{request_row.feature.name}' was not approved at this time.",
            )
        )
    db.commit()

    log = AuditLog(action="feature_rejected", details=f"{request_row.college.name} -> {request_row.feature.name}", performed_by=current_user.id)
    db.add(log)
    db.commit()
    return {"message": "Feature request rejected", "status": "rejected"}


@router.get("/announcements", response_model=list[AnnouncementResponse])
def list_announcements(current_user: User = Depends(require_superadmin), db: Session = Depends(get_db)) -> list[AnnouncementResponse]:
    rows = db.scalars(select(Announcement).order_by(Announcement.created_at.desc())).all()
    output: list[AnnouncementResponse] = []
    for row in rows:
        creator = db.get(User, row.created_by)
        output.append(
            AnnouncementResponse(
                id=row.id,
                content=row.content,
                created_by=row.created_by,
                created_at=row.created_at,
                creator_email=creator.email if creator else None,
            )
        )
    return output


@router.post("/announcements", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def create_announcement(payload: AnnouncementCreate, current_user: User = Depends(require_superadmin), db: Session = Depends(get_db)) -> AnnouncementResponse:
    announcement = Announcement(content=payload.content.strip(), created_by=current_user.id)
    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    log = AuditLog(action="announcement_sent", details=payload.content.strip(), performed_by=current_user.id)
    db.add(log)
    db.commit()

    return AnnouncementResponse(
        id=announcement.id,
        content=announcement.content,
        created_by=announcement.created_by,
        created_at=announcement.created_at,
        creator_email=current_user.email,
    )


@router.get("/audit-log", response_model=list[AuditLogResponse])
def list_audit_log(current_user: User = Depends(require_superadmin), db: Session = Depends(get_db)) -> list[AuditLogResponse]:
    rows = db.scalars(select(AuditLog).order_by(AuditLog.timestamp.desc())).all()
    output: list[AuditLogResponse] = []
    for row in rows:
        performer = db.get(User, row.performed_by)
        output.append(
            AuditLogResponse(
                id=row.id,
                action=row.action,
                details=row.details,
                performed_by=row.performed_by,
                performed_by_email=performer.email if performer else None,
                timestamp=row.timestamp,
            )
        )
    return output


@router.get("/analytics", response_model=SuperadminAnalyticsResponse)
def list_analytics(
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> SuperadminAnalyticsResponse:
    # Revenue analytics — exclude BVM auto-grants (is_test_data=True)
    total_revenue = db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), 0))
        .where(Transaction.status == TransactionStatus.PAID, Transaction.is_test_data == False)
    ) or 0

    # Revenue by feature
    revenue_by_feature_rows = db.execute(
        select(Feature.name, func.coalesce(func.sum(Transaction.amount), 0).label("revenue"))
        .join(Feature, Feature.id == Transaction.feature_id)
        .where(Transaction.status == TransactionStatus.PAID, Transaction.is_test_data == False)
        .group_by(Feature.name)
        .order_by(func.sum(Transaction.amount).desc())
    ).all()
    revenue_by_feature = [{"name": row[0], "revenue": float(row[1])} for row in revenue_by_feature_rows]

    # Revenue by college
    revenue_by_college_rows = db.execute(
        select(College.name, func.coalesce(func.sum(Transaction.amount), 0).label("revenue"))
        .join(College, College.id == Transaction.college_id)
        .where(Transaction.status == TransactionStatus.PAID, Transaction.is_test_data == False)
        .group_by(College.name)
        .order_by(func.sum(Transaction.amount).desc())
    ).all()
    revenue_by_college = [{"name": row[0], "revenue": float(row[1])} for row in revenue_by_college_rows]

    return {
        "colleges_over_time": [
            {"month": "Aug 2026", "count": db.scalar(select(func.count()).select_from(College)) or 0},
        ],
        "feature_usage": [],
        "totals": dashboard_summary(current_user, db).model_dump(),
        "total_revenue": float(total_revenue),
        "revenue_by_feature": revenue_by_feature,
        "revenue_by_college": revenue_by_college,
    }


@router.get("/subscriptions", response_model=SubscriptionListResponse)
def list_subscriptions(
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> SubscriptionListResponse:
    # 1. Update any expired subscriptions or past-due payment windows
    check_all_expiries(db)

    now = datetime.now(timezone.utc)

    # 2. Fetch all CollegeFeature entries with relationships
    rows = db.scalars(
        select(CollegeFeature)
        .options(joinedload(CollegeFeature.college), joinedload(CollegeFeature.feature))
        .order_by(CollegeFeature.requested_at.desc())
    ).all()

    # 3. Preload all transactions mapped by (college_id, feature_id)
    txns = db.scalars(
        select(Transaction).order_by(Transaction.created_at.desc())
    ).all()
    latest_tx_map: dict[tuple[int, int], Transaction] = {}
    for tx in txns:
        if tx.college_id is not None and tx.feature_id is not None:
            key = (tx.college_id, tx.feature_id)
            if key not in latest_tx_map:
                latest_tx_map[key] = tx

    items: list[SubscriptionItemResponse] = []
    active_count = 0
    one_time_count = 0
    expired_count = 0
    pending_payment_count = 0
    expiring_soon_items: list[SubscriptionItemResponse] = []

    for cf in rows:
        feat = cf.feature
        coll = cf.college
        if not feat or not coll:
            continue

        b_type = feat.billing_type.value if hasattr(feat.billing_type, "value") else str(feat.billing_type)
        st = cf.status.value if hasattr(cf.status, "value") else str(cf.status)
        price_val = float(feat.price) if feat.price is not None else 0.0
        amount_charged_val = float(cf.amount_charged) if cf.amount_charged is not None else None

        # Calculate days until expiry if active and has expiry
        days_until_exp = None
        exp_utc = _as_utc(cf.expires_at)
        due_utc = _as_utc(cf.payment_due_at)

        if cf.status == FeatureRequestStatus.ACTIVE and exp_utc:
            delta = exp_utc - now
            days_until_exp = delta.days

        # Calculate days until payment due if awaiting payment
        days_until_due = None
        if cf.status == FeatureRequestStatus.APPROVED_AWAITING_PAYMENT and due_utc:
            delta = due_utc - now
            days_until_due = delta.days

        # Last transaction
        last_tx = latest_tx_map.get((cf.college_id, cf.feature_id))
        last_tx_resp = None
        if last_tx:
            last_tx_resp = SubscriptionTransactionResponse(
                id=last_tx.id,
                amount=float(last_tx.amount),
                currency=last_tx.currency,
                status=last_tx.status.value if hasattr(last_tx.status, "value") else str(last_tx.status),
                razorpay_order_id=last_tx.razorpay_order_id,
                razorpay_payment_id=last_tx.razorpay_payment_id,
                created_at=last_tx.created_at,
                paid_at=last_tx.paid_at,
            )

        item = SubscriptionItemResponse(
            id=cf.id,
            college_id=cf.college_id,
            college_name=coll.name,
            feature_id=cf.feature_id,
            feature_name=feat.name,
            feature_code=feat.code,
            billing_type=b_type,
            price=price_val,
            amount_charged=amount_charged_val,
            status=st,
            requested_at=cf.requested_at,
            approved_at=cf.approved_at,
            paid_at=cf.paid_at,
            expires_at=cf.expires_at,
            payment_due_at=cf.payment_due_at,
            reminder_count=cf.reminder_count or 0,
            last_reminder_sent_at=cf.last_reminder_sent_at,
            days_until_expiry=days_until_exp,
            days_until_payment_due=days_until_due,
            last_transaction=last_tx_resp,
        )
        items.append(item)

        # KPI aggregations
        if cf.status == FeatureRequestStatus.ACTIVE:
            if b_type in ("monthly", "annual"):
                active_count += 1
            elif b_type == "one_time":
                one_time_count += 1
        elif cf.status in (FeatureRequestStatus.EXPIRED, FeatureRequestStatus.APPROVAL_EXPIRED):
            expired_count += 1
        elif cf.status in (FeatureRequestStatus.APPROVED_AWAITING_PAYMENT, FeatureRequestStatus.PAYMENT_FAILED):
            pending_payment_count += 1

        # Expiring soon panel: active subs expiring within 7 days
        if (
            cf.status == FeatureRequestStatus.ACTIVE
            and exp_utc is not None
            and now < exp_utc <= now + timedelta(days=7)
        ):
            expiring_soon_items.append(item)

    # Sort expiring soon by soonest first
    expiring_soon_items.sort(key=lambda x: _as_utc(x.expires_at) or now)

    summary = SubscriptionSummaryResponse(
        active_count=active_count,
        one_time_count=one_time_count,
        expired_count=expired_count,
        pending_payment_count=pending_payment_count,
        expiring_soon=expiring_soon_items,
    )

    return SubscriptionListResponse(subscriptions=items, summary=summary)


@router.get("/subscriptions/{id}/transactions", response_model=list[SubscriptionTransactionResponse])
def get_subscription_transactions(
    id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> list[SubscriptionTransactionResponse]:
    cf = db.get(CollegeFeature, id)
    if cf is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Subscription not found")

    txns = db.scalars(
        select(Transaction)
        .where(Transaction.college_id == cf.college_id, Transaction.feature_id == cf.feature_id)
        .order_by(Transaction.created_at.desc())
    ).all()

    return [
        SubscriptionTransactionResponse(
            id=tx.id,
            amount=float(tx.amount),
            currency=tx.currency,
            status=tx.status.value if hasattr(tx.status, "value") else str(tx.status),
            razorpay_order_id=tx.razorpay_order_id,
            razorpay_payment_id=tx.razorpay_payment_id,
            created_at=tx.created_at,
            paid_at=tx.paid_at,
        )
        for tx in txns
    ]


@router.post("/subscriptions/{id}/remind", response_model=SendReminderResponse)
def send_payment_reminder(
    id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> SendReminderResponse:
    cf = db.get(CollegeFeature, id)
    if cf is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Subscription not found")

    if cf.status not in (FeatureRequestStatus.APPROVED_AWAITING_PAYMENT, FeatureRequestStatus.PAYMENT_FAILED):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot send payment reminder for subscription in '{cf.status.value}' status",
        )

    admin_users = db.scalars(
        select(User).where(
            User.college_id == cf.college_id,
            User.user_type == UserType.ADMIN,
            User.is_active == True,
        )
    ).all()

    price = float(cf.feature.price) if cf.feature and cf.feature.price else 0.0
    due_str = cf.payment_due_at.strftime("%b %d, %Y") if cf.payment_due_at else "soon"
    msg = f"Payment Reminder: Pending payment of ₹{price:,.2f} for '{cf.feature.name}' is due by {due_str}. Please complete payment to activate feature."

    for adm in admin_users:
        db.add(
            Notification(
                recipient_id=adm.id,
                sender_id=current_user.id,
                type=NotificationType.PAYMENT_REMINDER,
                message=msg,
            )
        )

    now = datetime.now(timezone.utc)
    cf.reminder_count = (cf.reminder_count or 0) + 1
    cf.last_reminder_sent_at = now
    db.commit()

    return SendReminderResponse(
        message="Payment reminder sent successfully",
        reminder_count=cf.reminder_count,
        last_reminder_sent_at=now,
    )


@router.post("/subscriptions/{id}/remind-renewal", response_model=SendReminderResponse)
def send_renewal_reminder(
    id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
) -> SendReminderResponse:
    cf = db.get(CollegeFeature, id)
    if cf is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Subscription not found")

    if cf.status != FeatureRequestStatus.ACTIVE or not cf.expires_at:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Can only send renewal reminders for active subscriptions with an expiration date",
        )

    admin_users = db.scalars(
        select(User).where(
            User.college_id == cf.college_id,
            User.user_type == UserType.ADMIN,
            User.is_active == True,
        )
    ).all()

    exp_str = cf.expires_at.strftime("%b %d, %Y")
    msg = f"Renewal Notice: Your subscription for '{cf.feature.name}' will expire on {exp_str}. Please renew soon to ensure uninterrupted access."

    for adm in admin_users:
        db.add(
            Notification(
                recipient_id=adm.id,
                sender_id=current_user.id,
                type=NotificationType.SUBSCRIPTION_EXPIRING_SOON,
                message=msg,
            )
        )

    now = datetime.now(timezone.utc)
    cf.reminder_count = (cf.reminder_count or 0) + 1
    cf.last_reminder_sent_at = now
    db.commit()

    return SendReminderResponse(
        message="Renewal reminder sent successfully",
        reminder_count=cf.reminder_count,
        last_reminder_sent_at=now,
    )
