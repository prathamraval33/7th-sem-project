"""TPO — dashboard summary, drive management (structured form + eligible-
students/create-test/close-test), applicants + approve flow, instant tests
(create/results/analytics/close/history), student management (remove from
drive / deactivate / warn / placement override), and companies helper CRUD.
"""
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import require_tpo
from app.db.session import get_db
from app.models.application import Application, ApplicationStatus
from app.models.company import Company
from app.models.drive import Drive, DriveStatus, DriveTestStatus
from app.models.instant_test import InstantTest, InstantTestStatus
from app.models.notification import Notification, NotificationType
from app.models.profile import Profile
from app.models.test_attempt import TestAttempt
from app.models.user import User, UserType
from app.models.analytics import Analytics
from app.schemas.application import ApplicationResponse, ApplicationUpdate
from app.schemas.company import CompanyCreate, CompanyResponse
from app.schemas.drive import DriveCreate, DriveResponse, DriveUpdate
from app.schemas.instant_test import InstantTestCreate, InstantTestResponse
from app.schemas.profile import ProfilePlacementOverrideUpdate, ProfileResponse
from app.services import test_generator
from app.services.eligibility_engine import check_drive_eligibility
from app.utils.exceptions import InstantTestConfigError

router = APIRouter(prefix="/tpo", tags=["tpo"])


# --------------------------------------------------------------------------
# Companies (helper CRUD so TPOs can create a drive against a company_id)
# --------------------------------------------------------------------------
@router.post("/companies", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(
    payload: CompanyCreate, current_user: User = Depends(require_tpo), db: Session = Depends(get_db)
) -> Company:
    company = Company(**payload.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get("/companies", response_model=list[CompanyResponse])
def list_companies(current_user: User = Depends(require_tpo), db: Session = Depends(get_db)) -> list[Company]:
    return list(db.scalars(select(Company).order_by(Company.name)).all())


# --------------------------------------------------------------------------
# Dashboard summary
# --------------------------------------------------------------------------
class TpoDashboardSummary(BaseModel):
    total_students: int
    fee_verified_students: int
    placed_students: int
    average_readiness_score: float
    total_drives: int
    active_drives: int
    total_applied: int
    total_selected: int
    highest_ctc: float
    total_instant_tests: int
    recent_drives: list[DriveResponse]


@router.get("/dashboard/summary", response_model=TpoDashboardSummary)
def get_dashboard_summary(current_user: User = Depends(require_tpo), db: Session = Depends(get_db)) -> TpoDashboardSummary:
    total_students = db.scalar(select(func.count()).select_from(Profile).join(User).where(User.user_type == UserType.STUDENT))
    fee_verified_students = db.scalar(
        select(func.count()).select_from(User).where(User.user_type == UserType.STUDENT, User.fee_verified.is_(True))
    )
    total_drives = db.scalar(select(func.count()).select_from(Drive))
    total_applied = db.scalar(select(func.count()).select_from(Application))
    total_selected = db.scalar(
        select(func.count()).select_from(Application).where(Application.status == ApplicationStatus.SELECTED)
    )
    total_instant_tests = db.scalar(select(func.count()).select_from(InstantTest))
    recent_drives = db.scalars(select(Drive).order_by(Drive.created_at.desc()).limit(10)).all()
    
    placed_students = db.scalar(select(func.count()).select_from(Profile).join(User).where(User.user_type == UserType.STUDENT, Profile.is_placed == True))
    active_drives = db.scalar(select(func.count()).select_from(Drive).where(Drive.status == DriveStatus.OPEN))
    
    avg_readiness = db.scalar(select(func.avg(Analytics.readiness_score)))
    average_readiness_score = float(avg_readiness) if avg_readiness else 0.0
    
    highest_ctc = db.scalar(select(func.max(Application.package_offered)))

    return TpoDashboardSummary(
        total_students=total_students or 0,
        fee_verified_students=fee_verified_students or 0,
        placed_students=placed_students or 0,
        average_readiness_score=average_readiness_score,
        total_drives=total_drives or 0,
        active_drives=active_drives or 0,
        total_applied=total_applied or 0,
        total_selected=total_selected or 0,
        highest_ctc=float(highest_ctc) if highest_ctc else 0.0,
        total_instant_tests=total_instant_tests or 0,
        recent_drives=list(recent_drives),
    )


# --------------------------------------------------------------------------
# Drives
# --------------------------------------------------------------------------
@router.post("/drives", response_model=DriveResponse, status_code=status.HTTP_201_CREATED)
def create_drive(
    payload: DriveCreate, current_user: User = Depends(require_tpo), db: Session = Depends(get_db)
) -> Drive:
    company = db.get(Company, payload.company_id)
    if company is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Company not found")

    drive = Drive(
        company_id=payload.company_id,
        role=payload.role,
        jd_text=payload.jd_text,
        placement_type=payload.placement_type,
        student_instructions=payload.student_instructions,
        min_ctc=payload.min_ctc,
        max_ctc=payload.max_ctc,
        eligibility_criteria=payload.eligibility_criteria.model_dump(),
        bond_details=payload.bond_details,
        deadline=payload.deadline,
        created_by=current_user.id,
    )
    db.add(drive)
    db.commit()
    db.refresh(drive)
    return drive


@router.patch("/drives/{drive_id}", response_model=DriveResponse)
def update_drive(
    drive_id: int, payload: DriveUpdate, current_user: User = Depends(require_tpo), db: Session = Depends(get_db)
) -> Drive:
    drive = db.scalar(select(Drive).options(joinedload(Drive.company)).where(Drive.id == drive_id))
    if drive is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Drive not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "eligibility_criteria" in update_data and update_data["eligibility_criteria"] is not None:
        update_data["eligibility_criteria"] = payload.eligibility_criteria.model_dump()

    for field_name, value in update_data.items():
        setattr(drive, field_name, value)

    db.commit()
    db.refresh(drive)
    return db.scalar(select(Drive).options(joinedload(Drive.company)).where(Drive.id == drive_id))


@router.get("/drives", response_model=list[DriveResponse])
def list_my_drives(current_user: User = Depends(require_tpo), db: Session = Depends(get_db)) -> list[Drive]:
    return list(
        db.scalars(
            select(Drive).options(joinedload(Drive.company)).where(Drive.created_by == current_user.id).order_by(Drive.created_at.desc())
        ).all()
    )


@router.get("/drives/{drive_id}/eligible-students", response_model=list[ProfileResponse])
def get_eligible_students(
    drive_id: int, current_user: User = Depends(require_tpo), db: Session = Depends(get_db)
) -> list[Profile]:
    drive = db.get(Drive, drive_id)
    if drive is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Drive not found")

    profiles = db.scalars(select(Profile)).all()
    return [profile for profile in profiles if check_drive_eligibility(profile, drive)[0]]


from app.models.resume import Resume


class ApplicantEntry(ApplicationResponse):
    is_eligible: bool
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    student_branch: Optional[str] = None
    cgpa: Optional[float] = None
    active_backlogs: Optional[int] = None
    resume_url: Optional[str] = None


@router.get("/drives/{drive_id}/applicants", response_model=list[ApplicantEntry])
def get_drive_applicants(
    drive_id: int, current_user: User = Depends(require_tpo), db: Session = Depends(get_db)
) -> list[ApplicantEntry]:
    drive = db.get(Drive, drive_id)
    if drive is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Drive not found")

    applications = db.scalars(
        select(Application)
        .options(joinedload(Application.user).joinedload(User.profile))
        .where(Application.drive_id == drive_id)
    ).unique().all()

    entries: list[ApplicantEntry] = []
    for application in applications:
        user = application.user
        profile = user.profile if user else None
        
        resumes = db.scalars(
            select(Resume)
            .where(Resume.user_id == application.user_id)
            .order_by(Resume.is_active.desc(), Resume.id.desc())
        ).all()
        active_resume = resumes[0] if resumes else None

        resume_url = None
        if active_resume and active_resume.file_path:
            clean_path = active_resume.file_path.replace("uploads/", "").replace("uploads\\", "").replace("\\", "/")
            resume_url = f"/uploads/{clean_path}"

        is_eligible = check_drive_eligibility(profile, drive)[0] if profile else False
        entries.append(
            ApplicantEntry(
                **ApplicationResponse.model_validate(application).model_dump(),
                is_eligible=is_eligible,
                student_name=profile.full_name if (profile and profile.full_name) else (user.email.split("@")[0] if user else "Student"),
                student_email=user.email if user else None,
                student_branch=profile.branch if (profile and profile.branch) else "N/A",
                cgpa=profile.cgpa if profile else None,
                active_backlogs=profile.active_backlogs if profile else 0,
                resume_url=resume_url,
            )
        )
    return entries


@router.patch("/applications/{application_id}", response_model=ApplicationResponse)
def update_application_status(
    application_id: int,
    payload: ApplicationUpdate,
    current_user: User = Depends(require_tpo),
    db: Session = Depends(get_db),
) -> Application:
    application = db.get(Application, application_id)
    if application is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Application not found")

    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(application, field_name, value)

    if application.status == ApplicationStatus.SELECTED:
        profile = db.scalar(select(Profile).where(Profile.user_id == application.user_id))
        if profile is not None:
            profile.is_placed = True

    db.commit()
    db.refresh(application)

    db.add(
        Notification(
            recipient_id=application.user_id,
            sender_id=current_user.id,
            type=NotificationType.INFO,
            message=f"Your application status changed to '{application.status.value}'",
        )
    )
    db.commit()

    return application


@router.post("/drives/{drive_id}/close", response_model=DriveResponse)
def close_drive(drive_id: int, current_user: User = Depends(require_tpo), db: Session = Depends(get_db)) -> Drive:
    drive = db.get(Drive, drive_id)
    if drive is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Drive not found")

    drive.status = DriveStatus.CLOSED

    applications = db.scalars(select(Application).where(Application.drive_id == drive_id)).all()
    for application in applications:
        if application.status == ApplicationStatus.WITHDRAWN:
            continue
        profile = db.scalar(select(Profile).where(Profile.user_id == application.user_id))
        is_eligible = check_drive_eligibility(profile, drive)[0] if profile else False
        application.status = ApplicationStatus.ELIGIBLE if is_eligible else ApplicationStatus.NOT_ELIGIBLE

    db.commit()
    db.refresh(drive)
    return drive


@router.delete("/drives/{drive_id}/remove-student/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_student_from_drive(
    drive_id: int, user_id: int, current_user: User = Depends(require_tpo), db: Session = Depends(get_db)
) -> None:
    application = db.scalar(
        select(Application).where(Application.drive_id == drive_id, Application.user_id == user_id)
    )
    if application is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Application not found")

    db.delete(application)
    db.add(
        Notification(
            recipient_id=user_id,
            sender_id=current_user.id,
            type=NotificationType.NOTICE,
            message="You have been removed from a placement drive by the TPO",
        )
    )
    db.commit()


# --------------------------------------------------------------------------
@router.post("/instant-tests", response_model=InstantTestResponse, status_code=status.HTTP_201_CREATED)
def create_standalone_instant_test(
    payload: InstantTestCreate,
    current_user: User = Depends(require_tpo),
    db: Session = Depends(get_db),
) -> InstantTest:
    instant_test = InstantTest(
        title=payload.title,
        duration_minutes=payload.duration_minutes,
        is_practice=payload.is_practice,
        created_by=current_user.id,
        prompt_config=payload.prompt_config or {},
        questions=payload.questions,
        min_passing_marks=payload.min_passing_marks,
        use_top_n=payload.use_top_n,
        top_n_count=payload.top_n_count,
        status=InstantTestStatus.OPEN,
    )
    db.add(instant_test)
    db.commit()
    db.refresh(instant_test)
    return instant_test


@router.post("/drives/{drive_id}/instant-test", response_model=InstantTestResponse, status_code=status.HTTP_201_CREATED)
async def create_instant_test(
    drive_id: int,
    payload: InstantTestCreate,
    current_user: User = Depends(require_tpo),
    db: Session = Depends(get_db),
) -> InstantTest:
    drive = db.get(Drive, drive_id)
    if drive is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Drive not found")

    questions = payload.questions
    if not questions and payload.prompt_config:
        try:
            questions = await test_generator.generate_questions(payload.prompt_config)
            test_generator.validate_min_passing_marks(questions, payload.min_passing_marks)
        except InstantTestConfigError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=error.message) from error

    instant_test = InstantTest(
        title=payload.title or f"{drive.company.name if drive.company else 'Placement'} Placement Test",
        duration_minutes=payload.duration_minutes,
        is_practice=False,
        drive_id=drive_id,
        created_by=current_user.id,
        prompt_config=payload.prompt_config or {},
        questions=questions,
        min_passing_marks=payload.min_passing_marks,
        use_top_n=payload.use_top_n,
        top_n_count=payload.top_n_count,
        status=InstantTestStatus.OPEN,
    )
    db.add(instant_test)
    drive.test_status = DriveTestStatus.OPEN
    db.commit()
    db.refresh(instant_test)
    return instant_test


@router.get("/instant-tests/attempts/{attempt_id}/violations")
def get_attempt_violations(
    attempt_id: int,
    current_user: User = Depends(require_tpo),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    attempt = db.get(TestAttempt, attempt_id)
    if not attempt:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    student_user = db.get(User, attempt.user_id)
    student_profile = db.scalar(select(Profile).where(Profile.user_id == attempt.user_id))

    violations = db.scalars(
        select(TestViolation)
        .where(TestViolation.attempt_id == attempt_id)
        .order_by(TestViolation.detected_at.asc())
    ).all()

    return {
        "attempt_id": attempt.id,
        "student_name": student_profile.full_name if student_profile else "Student",
        "student_email": student_user.email if student_user else "N/A",
        "total_violations": attempt.total_violation_count,
        "ended_reason": attempt.ended_reason,
        "violations": [
            {
                "id": v.id,
                "violation_type": v.violation_type,
                "strike_number": v.strike_number,
                "detected_at": v.detected_at.isoformat(),
                "meta": v.meta,
            }
            for v in violations
        ],
    }


class InstantTestResultEntry(BaseModel):
    attempt_id: int
    user_id: int
    student_name: Optional[str] = None
    score: float
    is_eligible: bool
    submitted_at: datetime


@router.get("/instant-tests/{test_id}/results", response_model=list[InstantTestResultEntry])
def get_instant_test_results(
    test_id: int, current_user: User = Depends(require_tpo), db: Session = Depends(get_db)
) -> list[InstantTestResultEntry]:
    test = db.get(InstantTest, test_id)
    if test is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Test not found")

    attempts = db.scalars(
        select(TestAttempt).where(TestAttempt.test_id == test_id).order_by(TestAttempt.score.desc())
    ).all()

    ranked_user_ids: set[int] = set()
    if test.use_top_n and test.top_n_count:
        ranked_user_ids = {a.user_id for a in attempts[: test.top_n_count]}

    results: list[InstantTestResultEntry] = []
    for attempt in attempts:
        profile = db.scalar(select(Profile).where(Profile.user_id == attempt.user_id))
        passed = attempt.score >= test.min_passing_marks
        if test.use_top_n and test.top_n_count:
            passed = passed and attempt.user_id in ranked_user_ids

        results.append(
            InstantTestResultEntry(
                attempt_id=attempt.id,
                user_id=attempt.user_id,
                student_name=profile.full_name if profile else None,
                score=attempt.score,
                is_eligible=passed,
                submitted_at=attempt.submitted_at,
            )
        )
    return results


class DriveAnalyticsResponse(BaseModel):
    total_applicants: int
    shortlisted: int
    selected: int
    rejected: int
    eligible_count: int


@router.get("/analytics/{drive_id}", response_model=DriveAnalyticsResponse)
def get_drive_analytics(drive_id: int, current_user: User = Depends(require_tpo), db: Session = Depends(get_db)):
    drive = db.get(Drive, drive_id)
    if drive is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Drive not found")

    apps = db.scalars(select(Application).where(Application.drive_id == drive_id)).all()
    total_applicants = len(apps)
    shortlisted = sum(1 for a in apps if a.status == ApplicationStatus.SHORTLISTED)
    selected = sum(1 for a in apps if a.status == ApplicationStatus.SELECTED)
    rejected = sum(1 for a in apps if a.status == ApplicationStatus.REJECTED)

    return DriveAnalyticsResponse(
        total_applicants=total_applicants,
        shortlisted=shortlisted,
        selected=selected,
        rejected=rejected,
        eligible_count=total_applicants,
    )


class InstantTestAnalytics(BaseModel):
    total_attempts: int
    average_score: float
    pass_count: int
    fail_count: int
    score_distribution: dict[str, int]


@router.get("/instant-tests/{test_id}/analytics", response_model=InstantTestAnalytics)
def get_instant_test_analytics(
    test_id: int, current_user: User = Depends(require_tpo), db: Session = Depends(get_db)
) -> InstantTestAnalytics:
    test = db.get(InstantTest, test_id)
    if test is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Test not found")

    attempts = db.scalars(select(TestAttempt).where(TestAttempt.test_id == test_id)).all()
    total_attempts = len(attempts)
    average_score = round(sum(a.score for a in attempts) / total_attempts, 2) if total_attempts else 0.0
    pass_count = sum(1 for a in attempts if a.score >= test.min_passing_marks)
    fail_count = total_attempts - pass_count

    buckets = {"0-25%": 0, "26-50%": 0, "51-75%": 0, "76-100%": 0}
    max_marks = test_generator.total_possible_marks(test.questions) or 1
    for attempt in attempts:
        pct = (attempt.score / max_marks) * 100
        if pct <= 25:
            buckets["0-25%"] += 1
        elif pct <= 50:
            buckets["26-50%"] += 1
        elif pct <= 75:
            buckets["51-75%"] += 1
        else:
            buckets["76-100%"] += 1

    return InstantTestAnalytics(
        total_attempts=total_attempts,
        average_score=average_score,
        pass_count=pass_count,
        fail_count=fail_count,
        score_distribution=buckets,
    )


@router.post("/instant-tests/{test_id}/close", response_model=InstantTestResponse)
def close_instant_test(
    test_id: int, current_user: User = Depends(require_tpo), db: Session = Depends(get_db)
) -> InstantTest:
    test = db.get(InstantTest, test_id)
    if test is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Test not found")

    test.status = InstantTestStatus.CLOSED
    if test.drive_id is not None:
        drive = db.get(Drive, test.drive_id)
        if drive is not None:
            drive.test_status = DriveTestStatus.CLOSED

    db.commit()
    db.refresh(test)
    return test


class InstantTestHistoryEntry(BaseModel):
    id: int
    drive_id: Optional[int] = None
    status: InstantTestStatus
    attempted_count: int
    average_score: float


@router.get("/instant-tests/history", response_model=list[InstantTestHistoryEntry])
def get_instant_test_history(current_user: User = Depends(require_tpo), db: Session = Depends(get_db)) -> list[InstantTestHistoryEntry]:
    tests = db.scalars(
        select(InstantTest).where(InstantTest.created_by == current_user.id).order_by(InstantTest.id.desc())
    ).all()

    history: list[InstantTestHistoryEntry] = []
    for test in tests:
        attempts = db.scalars(select(TestAttempt).where(TestAttempt.test_id == test.id)).all()
        avg_score = round(sum(a.score for a in attempts) / len(attempts), 2) if attempts else 0.0
        history.append(
            InstantTestHistoryEntry(
                id=test.id, drive_id=test.drive_id, status=test.status,
                attempted_count=len(attempts), average_score=avg_score,
            )
        )
    return history


# --------------------------------------------------------------------------
# Students
# --------------------------------------------------------------------------
class StudentCard(BaseModel):
    user_id: int
    email: str
    full_name: str
    branch: str
    fee_verified: bool
    is_placed: bool


@router.get("/students/all", response_model=list[StudentCard])
def list_all_students(current_user: User = Depends(require_tpo), db: Session = Depends(get_db)) -> list[StudentCard]:
    users = db.scalars(select(User).where(User.user_type == UserType.STUDENT)).all()
    cards: list[StudentCard] = []
    for user in users:
        profile = user.profile
        cards.append(
            StudentCard(
                user_id=user.id, 
                email=user.email,
                full_name=profile.full_name if profile else "Profile Not Setup", 
                branch=profile.branch if profile else "N/A",
                fee_verified=user.fee_verified, 
                is_placed=profile.is_placed if profile else False,
            )
        )
    return cards


class WarnRequest(BaseModel):
    message: str


@router.post("/students/{user_id}/warn", status_code=status.HTTP_201_CREATED)
def warn_student(
    user_id: int, payload: WarnRequest, current_user: User = Depends(require_tpo), db: Session = Depends(get_db)
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
    user_id: int, current_user: User = Depends(require_tpo), db: Session = Depends(get_db)
) -> dict:
    student = db.get(User, user_id)
    if student is None or student.user_type != UserType.STUDENT:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Student not found")

    student.is_active = False
    db.add(
        Notification(
            recipient_id=user_id, sender_id=current_user.id, type=NotificationType.NOTICE,
            message="Your account has been deactivated by the placement office",
        )
    )
    db.commit()
    return {"message": "Student deactivated"}


@router.patch("/students/{user_id}/placement-override", response_model=ProfileResponse)
def toggle_placement_override(
    user_id: int,
    payload: ProfilePlacementOverrideUpdate,
    current_user: User = Depends(require_tpo),
    db: Session = Depends(get_db),
) -> Profile:
    profile = db.scalar(select(Profile).where(Profile.user_id == user_id))
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    profile.placement_lock_override = payload.placement_lock_override
    db.commit()
    db.refresh(profile)
    return profile
