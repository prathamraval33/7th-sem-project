"""Matches a student's profile against a drive's structured eligibility
criteria — the only feature-level service that never needs AI, per the
master prompt's insights-widget "internal drives" note (a straight DB/logic
comparison).
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.drive import Drive, DriveStatus
from app.models.profile import Profile


def check_eligibility(profile: Profile, criteria: dict | None) -> tuple[bool, list[str]]:
    """Returns (is_eligible, reasons_if_not). `criteria` matches the
    `eligibility_criteria` JSON shape: min_cgpa, max_backlogs,
    department_list, min_tenth, min_twelfth, min_percentile (optional).
    """
    reasons: list[str] = []
    criteria = criteria or {}

    student_cgpa = float(profile.cgpa or 0.0)
    min_cgpa = float(criteria.get("min_cgpa") or 0.0)
    if student_cgpa < min_cgpa:
        reasons.append(f"CGPA {student_cgpa} is below the required {min_cgpa}")

    student_backlogs = int(profile.active_backlogs or 0)
    max_backlogs = int(criteria.get("max_backlogs") or 0)
    if student_backlogs > max_backlogs:
        reasons.append(f"{student_backlogs} active backlog(s) exceed the allowed {max_backlogs}")

    department_list = criteria.get("department_list") or []
    if department_list:
        normalized_depts = {str(d).strip().upper() for d in department_list if d}
        student_branch = (profile.branch or "").strip().upper()
        if student_branch not in normalized_depts:
            reasons.append(f"Branch '{profile.branch or 'N/A'}' is not in the eligible department list")

    student_tenth = float(profile.tenth_percentage or 0.0)
    min_tenth = float(criteria.get("min_tenth") or 0.0)
    if student_tenth < min_tenth:
        reasons.append(f"10th percentage {student_tenth}% is below the required {min_tenth}%")

    student_twelfth = float(profile.twelfth_percentage or 0.0)
    min_twelfth = float(criteria.get("min_twelfth") or 0.0)
    if student_twelfth < min_twelfth:
        reasons.append(f"12th percentage {student_twelfth}% is below the required {min_twelfth}%")

    raw_min_percentile = criteria.get("min_percentile")
    if raw_min_percentile is not None and str(raw_min_percentile).strip() != "":
        min_percentile = float(raw_min_percentile)
        if profile.competitive_exam_percentile is None:
            reasons.append("No competitive exam percentile on record")
        elif float(profile.competitive_exam_percentile) < min_percentile:
            reasons.append(
                f"Competitive exam percentile {profile.competitive_exam_percentile} is below the required {min_percentile}"
            )

    return (len(reasons) == 0, reasons)


def check_drive_eligibility(profile: Profile, drive: Drive) -> tuple[bool, list[str]]:
    """Wraps `check_eligibility` with the one-selection placement policy:
    once placed, a student is automatically ineligible for further drives
    unless a TPO/Admin has granted `placement_lock_override`.
    """
    if profile.is_placed and not profile.placement_lock_override:
        return False, ["Student is already placed and has no dream-company override"]

    return check_eligibility(profile, drive.eligibility_criteria)


def get_matched_drives(db: Session, profile: Profile) -> list[Drive]:
    """Open drives the student is currently eligible for — powers
    `GET /drives/matched` and the internal half of Live Career Insights.
    """
    open_drives = db.scalars(select(Drive).where(Drive.status == DriveStatus.OPEN)).all()

    return [drive for drive in open_drives if check_drive_eligibility(profile, drive)[0]]
