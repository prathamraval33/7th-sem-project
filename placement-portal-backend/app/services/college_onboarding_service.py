"""Service logic for college onboarding validation, checklist tracking, and lifecycle transitions."""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.branch import Branch
from app.models.college import College, CollegeStatus
from app.models.college_registration import CollegeRegistration
from app.models.curriculum_subject import CurriculumSubject
from app.models.curriculum_upload import CurriculumUpload
from app.models.fee_receipt_template import FeeReceiptTemplate
from app.models.notification import Notification, NotificationType
from app.models.user import User, UserType
from app.schemas.college_onboarding import ChecklistItem, SetupChecklistResponse


def extract_domain(email_or_domain: str) -> str:
    parts = email_or_domain.lower().strip().split("@")
    return parts[-1].strip()


def is_blocked_domain(email_or_domain: str) -> bool:
    domain = extract_domain(email_or_domain)
    blocked_list = [d.lower().strip() for d in settings.BLOCKED_EMAIL_DOMAINS]
    return domain in blocked_list


def cleanup_expired_registrations(db: Session) -> int:
    """Expire unverified registrations older than 48 hours to release domain reservations (Spec 2.9)."""
    now = datetime.now(timezone.utc)
    expired_records = list(
        db.scalars(
            select(CollegeRegistration).where(
                CollegeRegistration.status.in_(["pending_otp", "verified"]),
                CollegeRegistration.expires_at < now,
            )
        ).all()
    )
    for record in expired_records:
        record.status = "expired"
    if expired_records:
        db.commit()
    return len(expired_records)


def compute_setup_checklist(
    db: Session, college: College, current_user_id: Optional[int] = None
) -> SetupChecklistResponse:
    """Computes completion status for blocking and recommended checklist items.
    Automatically transitions college to `ready_for_review` when all blocking items are complete.
    """
    # 1. Evaluate Blocking items
    # Item 1: Student email domain
    has_domain = bool(college.domain and len(college.domain.strip()) >= 3)
    domain_item = ChecklistItem(
        id="student_domain",
        title="Student Email Domain",
        description="Verify the allowed email domain (@" + (college.domain or "institution.edu") + ") for student signups.",
        is_blocking=True,
        is_completed=has_domain,
        deep_link="/admin/settings?tab=profile&focus=domain",
        explanation="Without this configured, no students can register because student accounts are verified against this domain.",
    )

    # Item 2: At least one TPO account
    tpo_count = db.scalar(
        select(func.count(User.id)).where(
            User.college_id == college.id,
            User.user_type == UserType.TPO,
            User.is_active.is_(True),
        )
    ) or 0
    tpo_item = ChecklistItem(
        id="tpo_account",
        title="Placement Officer (TPO) Account",
        description="Create at least one Training & Placement Officer account.",
        is_blocking=True,
        is_completed=tpo_count >= 1,
        deep_link="/admin/users?tab=staff&action=new&role=tpo",
        explanation="A placement portal requires a placement officer to post drives and manage student applicants.",
    )

    # Item 3: Basic college profile completion
    missing_profile_fields = []
    if not college.name or not str(college.name).strip():
        missing_profile_fields.append("Institutional Name")
    if not college.contact_name or not str(college.contact_name).strip():
        missing_profile_fields.append("Primary Contact Person Name")

    has_basic_profile = len(missing_profile_fields) == 0

    if missing_profile_fields:
        profile_desc = f"Confirm institutional name and primary administrative contact details. (Remaining: {', '.join(missing_profile_fields)})"
        profile_explanation = f"Action Required: Please provide {', '.join(missing_profile_fields)} in your institutional profile settings."
        profile_link = "/admin/settings?tab=profile&focus=contact"
    else:
        profile_desc = "Institutional name and primary administrative contact details confirmed."
        profile_explanation = "Essential institutional records are confirmed for official student documentation."
        profile_link = "/admin/settings?tab=profile"

    profile_item = ChecklistItem(
        id="basic_profile",
        title="Basic College Profile",
        description=profile_desc,
        is_blocking=True,
        is_completed=has_basic_profile,
        deep_link=profile_link,
        explanation=profile_explanation,
        missing_fields=missing_profile_fields if missing_profile_fields else None,
    )

    # Item 4: Institutional Platform Subscription (₹10,000 / month)
    now = datetime.now(timezone.utc)
    has_active_subscription = bool(
        getattr(college, "subscription_status", "pending_payment") == "active"
        and (
            college.subscription_expires_at is None
            or (
                college.subscription_expires_at.replace(tzinfo=timezone.utc)
                if college.subscription_expires_at.tzinfo is None
                else college.subscription_expires_at
            ) > now
        )
    )
    sub_item = ChecklistItem(
        id="campus_subscription",
        title="Campus License Subscription (₹10,000/mo)",
        description="Activate your monthly institutional platform license to enable student placement drives.",
        is_blocking=True,
        is_completed=has_active_subscription,
        deep_link="/admin/settings?tab=subscription",
        explanation="Required institutional subscription fee before student accounts and placement recruitment drives can be activated.",
    )

    blocking_items = [domain_item, tpo_item, profile_item, sub_item]
    blocking_completed = sum(1 for item in blocking_items if item.is_completed)
    blocking_total = len(blocking_items)
    all_blocking_complete = blocking_completed == blocking_total

    # 2. Evaluate Recommended/Optional items
    # Item 4: Second Administrator (Spec 4.4)
    admin_count = db.scalar(
        select(func.count(User.id)).where(
            User.college_id == college.id,
            User.user_type == UserType.ADMIN,
            User.is_active.is_(True),
        )
    ) or 0
    second_admin_item = ChecklistItem(
        id="second_admin",
        title="Add a Second Administrator",
        description="Invite a secondary administrator to protect against account lockout.",
        is_blocking=False,
        is_completed=admin_count >= 2,
        deep_link="/admin/users?tab=staff&action=new&role=admin",
        explanation="If a single administrator leaves or loses access, your institution could be locked out of its tenant.",
    )

    # Item 5: Fee Receipt Template
    fee_template_count = db.scalar(
        select(func.count(FeeReceiptTemplate.id)).where(FeeReceiptTemplate.college_id == college.id)
    ) or 0
    fee_item = ChecklistItem(
        id="fee_template",
        title="Fee Receipt Template",
        description="Upload a reference fee receipt to enable automated AI receipt verification.",
        is_blocking=False,
        is_completed=fee_template_count >= 1,
        deep_link="/admin/settings?tab=fees",
        explanation="Enables OCR template matching to verify student placement registration fees automatically.",
    )

    # Item 6: Curriculum / Syllabus Upload
    curriculum_count = db.scalar(
        select(func.count(CurriculumUpload.id)).where(CurriculumUpload.college_id == college.id)
    ) or 0
    subject_count = db.scalar(
        select(func.count(CurriculumSubject.id)).where(CurriculumSubject.college_id == college.id)
    ) or 0
    has_curriculum = curriculum_count >= 1 or subject_count >= 1
    curriculum_item = ChecklistItem(
        id="curriculum",
        title="Curriculum & Syllabus Upload",
        description="Upload branch syllabus PDFs to generate targeted study resources.",
        is_blocking=False,
        is_completed=has_curriculum,
        deep_link="/admin/curriculum",
        explanation="Powers curriculum-driven preparation resources and personalized interview question banks.",
    )

    # Item 7: Academic Branches
    branch_count = db.scalar(
        select(func.count(Branch.id)).where(Branch.is_active.is_(True))
    ) or 0
    branch_item = ChecklistItem(
        id="branches",
        title="Academic Branches",
        description="Configure academic departments and eligible branches (e.g. IT, Computer Engineering).",
        is_blocking=False,
        is_completed=branch_count >= 1,
        deep_link="/admin/settings?tab=branches",
        explanation="Allows filtering candidates by departmental criteria in recruitment drives.",
    )

    optional_items = [second_admin_item, fee_item, curriculum_item, branch_item]
    optional_completed = sum(1 for item in optional_items if item.is_completed)
    optional_total = len(optional_items)

    total_items = blocking_total + optional_total
    total_percentage = round(((blocking_completed + optional_completed) / total_items) * 100)

    # 3. Automatic status transition: pending_setup -> ready_for_review (Spec 3.1)
    if college.status == CollegeStatus.PENDING_SETUP and all_blocking_complete:
        college.status = CollegeStatus.READY_FOR_REVIEW
        db.add(college)

        # Notify SuperAdmins
        superadmins = list(db.scalars(select(User).where(User.user_type == UserType.SUPERADMIN)).all())
        for sa in superadmins:
            db.add(
                Notification(
                    recipient_id=sa.id,
                    type=NotificationType.COLLEGE_READY_FOR_REVIEW,
                    message=f"Institution '{college.name}' has completed all required setup items and is ready for your review.",
                )
            )

        # Notify College Admin
        if current_user_id:
            db.add(
                Notification(
                    recipient_id=current_user_id,
                    type=NotificationType.COLLEGE_READY_FOR_REVIEW,
                    message=f"Congratulations! You have completed all required setup steps for '{college.name}'. Your institution is now in the review queue for platform activation.",
                )
            )

        db.commit()
        db.refresh(college)

    return SetupChecklistResponse(
        college_id=college.id,
        college_name=college.name,
        status=college.status.value,
        total_percentage=total_percentage,
        blocking_completed=blocking_completed,
        blocking_total=blocking_total,
        optional_completed=optional_completed,
        optional_total=optional_total,
        all_blocking_complete=all_blocking_complete,
        items=blocking_items + optional_items,
    )
