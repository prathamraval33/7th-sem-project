"""TPO accreditation reports: summary metrics + CSV + printable HTML exports."""
from __future__ import annotations

import csv
import io
from collections import defaultdict
from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse, StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.dependencies import require_tpo
from app.db.session import get_db
from app.models.application import Application, ApplicationStatus
from app.models.company import Company
from app.models.drive import Drive
from app.models.instant_test import InstantTest
from app.models.profile import Profile
from app.models.test_attempt import TestAttempt
from app.models.test_violation import TestViolation, ViolationType
from app.models.user import User, UserType

router = APIRouter(prefix="/tpo/reports", tags=["tpo-reports"])

ReportType = Literal["company_selections", "branch_ctc", "unplaced_students", "proctoring_audits"]


def _format_dt(value: datetime | None) -> str:
    if value is None:
        return "-"
    return value.strftime("%Y-%m-%d %H:%M")


def _company_selections_rows(db: Session) -> list[dict[str, Any]]:
    rows = db.execute(
        select(Application, Drive, Company, User, Profile)
        .join(Drive, Application.drive_id == Drive.id)
        .join(Company, Drive.company_id == Company.id)
        .join(User, Application.user_id == User.id)
        .outerjoin(Profile, Profile.user_id == User.id)
        .where(Application.status == ApplicationStatus.SELECTED)
        .order_by(Application.applied_on.desc())
    ).all()

    result: list[dict[str, Any]] = []
    for application, drive, company, user, profile in rows:
        result.append(
            {
                "company_name": company.name,
                "student_name": profile.full_name if profile and profile.full_name else user.email.split("@")[0],
                "roll_no": profile.student_id if profile else "-",
                "branch": profile.branch if profile else "-",
                "cgpa": profile.cgpa if profile else None,
                "package_offered": application.package_offered,
                "selected_date": _format_dt(application.applied_on),
                "role": drive.role,
            }
        )

    return result


def _branch_ctc_rows(db: Session) -> list[dict[str, Any]]:
    profiles = db.scalars(select(Profile)).all()
    total_by_branch: dict[str, int] = defaultdict(int)
    for profile in profiles:
        total_by_branch[profile.branch] += 1

    selected_rows = db.execute(
        select(Application, Profile)
        .join(Profile, Profile.user_id == Application.user_id)
        .where(Application.status == ApplicationStatus.SELECTED)
    ).all()

    placed_ids_by_branch: dict[str, set[int]] = defaultdict(set)
    ctc_by_branch: dict[str, list[float]] = defaultdict(list)

    for application, profile in selected_rows:
        branch = profile.branch
        placed_ids_by_branch[branch].add(profile.user_id)
        if application.package_offered is not None:
            ctc_by_branch[branch].append(float(application.package_offered))

    all_branches = sorted(set(total_by_branch.keys()) | set(placed_ids_by_branch.keys()))

    result: list[dict[str, Any]] = []
    for branch in all_branches:
        total = total_by_branch.get(branch, 0)
        placed = len(placed_ids_by_branch.get(branch, set()))
        ctc_values = ctc_by_branch.get(branch, [])
        highest_ctc = max(ctc_values) if ctc_values else 0.0
        avg_ctc = sum(ctc_values) / len(ctc_values) if ctc_values else 0.0
        placement_pct = (placed / total * 100.0) if total else 0.0

        result.append(
            {
                "branch": branch,
                "total_students": total,
                "placed_count": placed,
                "placement_percentage": round(placement_pct, 2),
                "highest_ctc": round(highest_ctc, 2),
                "average_ctc": round(avg_ctc, 2),
            }
        )

    return result


def _unplaced_students_rows(db: Session) -> list[dict[str, Any]]:
    rows = db.execute(
        select(Profile, User)
        .join(User, User.id == Profile.user_id)
        .where(User.user_type == UserType.STUDENT, Profile.is_placed.is_(False))
        .order_by(Profile.branch.asc(), Profile.full_name.asc())
    ).all()

    result: list[dict[str, Any]] = []
    for profile, user in rows:
        result.append(
            {
                "student_name": profile.full_name,
                "roll_no": profile.student_id,
                "branch": profile.branch,
                "cgpa": profile.cgpa,
                "contact_email": user.email,
                "backlogs_count": profile.active_backlogs,
            }
        )

    return result


def _proctoring_audit_rows(db: Session) -> list[dict[str, Any]]:
    attempts = db.execute(
        select(TestAttempt, InstantTest, User, Profile)
        .join(InstantTest, InstantTest.id == TestAttempt.test_id)
        .join(User, User.id == TestAttempt.user_id)
        .outerjoin(Profile, Profile.user_id == User.id)
        .order_by(TestAttempt.submitted_at.desc())
    ).all()

    attempt_ids = [attempt.id for attempt, _, _, _ in attempts]
    violations_by_attempt: dict[int, list[TestViolation]] = defaultdict(list)

    if attempt_ids:
        violations = db.scalars(
            select(TestViolation).where(TestViolation.attempt_id.in_(attempt_ids))
        ).all()
        for violation in violations:
            violations_by_attempt[violation.attempt_id].append(violation)

    result: list[dict[str, Any]] = []
    face_flags = {ViolationType.FACE_AWAY.value, ViolationType.NO_FACE.value, ViolationType.MULTI_FACE.value}

    for attempt, test, user, profile in attempts:
        violations = violations_by_attempt.get(attempt.id, [])
        noise_warnings = sum(1 for v in violations if v.violation_type.value == ViolationType.NOISE.value)
        face_headpose_flags = sum(1 for v in violations if v.violation_type.value in face_flags)

        result.append(
            {
                "test_title": test.title,
                "student_name": profile.full_name if profile and profile.full_name else user.email.split("@")[0],
                "total_strikes": attempt.total_violation_count,
                "noise_warnings": noise_warnings,
                "face_headpose_flags": face_headpose_flags,
                "status": attempt.status.value,
                "timestamp": _format_dt(attempt.submitted_at or attempt.started_at),
            }
        )

    return result


def _get_report_rows(report_type: ReportType, db: Session) -> list[dict[str, Any]]:
    if report_type == "company_selections":
        return _company_selections_rows(db)
    if report_type == "branch_ctc":
        return _branch_ctc_rows(db)
    if report_type == "unplaced_students":
        return _unplaced_students_rows(db)
    return _proctoring_audit_rows(db)


@router.get("/summary")
def get_reports_summary(current_user: User = Depends(require_tpo), db: Session = Depends(get_db)) -> dict[str, Any]:
    placed_count = db.scalar(
        select(func.count()).select_from(Profile).join(User).where(User.user_type == UserType.STUDENT, Profile.is_placed.is_(True))
    )
    unplaced_count = db.scalar(
        select(func.count()).select_from(Profile).join(User).where(User.user_type == UserType.STUDENT, Profile.is_placed.is_(False))
    )
    highest_ctc = db.scalar(select(func.max(Application.package_offered)).where(Application.status == ApplicationStatus.SELECTED))

    branch_ctc_rows = _branch_ctc_rows(db)
    flagged_proctoring_count = 0
    for row in _proctoring_audit_rows(db):
        if row["total_strikes"] >= 3:
            flagged_proctoring_count += 1

    return {
        "placed_count": placed_count or 0,
        "unplaced_count": unplaced_count or 0,
        "highest_ctc": round(float(highest_ctc), 2) if highest_ctc else 0.0,
        "avg_ctc_by_branch": [
            {
                "branch": row["branch"],
                "average_ctc": row["average_ctc"],
                "placed_count": row["placed_count"],
            }
            for row in branch_ctc_rows
        ],
        "flagged_proctoring_audits": flagged_proctoring_count,
    }


@router.get("/data")
def get_report_data(
    report_type: ReportType,
    current_user: User = Depends(require_tpo),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    rows = _get_report_rows(report_type, db)
    return {"report_type": report_type, "rows": rows}


@router.get("/export/csv")
def export_report_csv(
    report_type: ReportType,
    current_user: User = Depends(require_tpo),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    rows = _get_report_rows(report_type, db)

    columns: dict[ReportType, list[tuple[str, str]]] = {
        "company_selections": [
            ("company_name", "Company Name"),
            ("student_name", "Student Name"),
            ("roll_no", "Roll No"),
            ("branch", "Branch"),
            ("cgpa", "CGPA"),
            ("package_offered", "Package Offered"),
            ("selected_date", "Selected Date"),
        ],
        "branch_ctc": [
            ("branch", "Branch"),
            ("total_students", "Total Students"),
            ("placed_count", "Placed Count"),
            ("placement_percentage", "Placement %"),
            ("highest_ctc", "Highest CTC"),
            ("average_ctc", "Average CTC"),
        ],
        "unplaced_students": [
            ("student_name", "Student Name"),
            ("roll_no", "Roll No"),
            ("branch", "Branch"),
            ("cgpa", "CGPA"),
            ("contact_email", "Contact Email"),
            ("backlogs_count", "Backlogs Count"),
        ],
        "proctoring_audits": [
            ("test_title", "Test Title"),
            ("student_name", "Student Name"),
            ("total_strikes", "Total Strikes"),
            ("noise_warnings", "Noise Warnings"),
            ("face_headpose_flags", "Face/Headpose Flags"),
            ("status", "Status"),
            ("timestamp", "Timestamp"),
        ],
    }

    selected_columns = columns[report_type]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([header for _, header in selected_columns])
    for row in rows:
        writer.writerow([row.get(key, "") for key, _ in selected_columns])

    output.seek(0)
    filename = f"{report_type}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export/pdf", response_class=HTMLResponse)
def export_report_printable_pdf(
    report_type: ReportType,
    current_user: User = Depends(require_tpo),
    db: Session = Depends(get_db),
) -> HTMLResponse:
    rows = _get_report_rows(report_type, db)

    report_titles = {
        "company_selections": "Company Selections Report",
        "branch_ctc": "Branch CTC Distribution Report",
        "unplaced_students": "Unplaced Students Report",
        "proctoring_audits": "Proctoring Audit Log",
    }

    columns: dict[ReportType, list[tuple[str, str]]] = {
        "company_selections": [
            ("company_name", "Company"),
            ("student_name", "Student"),
            ("roll_no", "Roll No"),
            ("branch", "Branch"),
            ("package_offered", "Package"),
            ("selected_date", "Selected Date"),
        ],
        "branch_ctc": [
            ("branch", "Branch"),
            ("total_students", "Total"),
            ("placed_count", "Placed"),
            ("placement_percentage", "Placement %"),
            ("highest_ctc", "Highest CTC"),
            ("average_ctc", "Average CTC"),
        ],
        "unplaced_students": [
            ("student_name", "Student"),
            ("roll_no", "Roll No"),
            ("branch", "Branch"),
            ("cgpa", "CGPA"),
            ("contact_email", "Email"),
            ("backlogs_count", "Backlogs"),
        ],
        "proctoring_audits": [
            ("test_title", "Test"),
            ("student_name", "Student"),
            ("total_strikes", "Strikes"),
            ("noise_warnings", "Noise"),
            ("face_headpose_flags", "Face Flags"),
            ("status", "Status"),
            ("timestamp", "Timestamp"),
        ],
    }

    selected_columns = columns[report_type]

    table_head = "".join(f"<th>{label}</th>" for _, label in selected_columns)
    body_rows = []
    for row in rows:
        cells = "".join(f"<td>{row.get(key, '-')}</td>" for key, _ in selected_columns)
        body_rows.append(f"<tr>{cells}</tr>")

    if not body_rows:
        body_rows.append(f"<tr><td colspan='{len(selected_columns)}'>No data available for this report.</td></tr>")

    generated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    html = f"""
    <html>
      <head>
        <title>{report_titles[report_type]}</title>
        <style>
          body {{ font-family: Arial, sans-serif; color: #111827; margin: 24px; }}
          .header {{ border-bottom: 2px solid #d1d5db; padding-bottom: 12px; margin-bottom: 16px; }}
          .cell-title {{ font-size: 22px; font-weight: 700; margin: 0; }}
          .sub {{ margin: 4px 0 0; color: #4b5563; font-size: 13px; }}
          table {{ width: 100%; border-collapse: collapse; margin-top: 16px; }}
          th, td {{ border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; font-size: 12px; }}
          th {{ background: #f3f4f6; font-weight: 700; }}
          @media print {{
            body {{ margin: 0.5in; }}
          }}
        </style>
      </head>
      <body>
        <div class='header'>
          <p class='cell-title'>BVM Engineering College Placement Cell</p>
          <p class='sub'>{report_titles[report_type]}</p>
          <p class='sub'>Generated at: {generated_at}</p>
        </div>

        <table>
          <thead>
            <tr>{table_head}</tr>
          </thead>
          <tbody>
            {''.join(body_rows)}
          </tbody>
        </table>
      </body>
    </html>
    """

    return HTMLResponse(content=html)

