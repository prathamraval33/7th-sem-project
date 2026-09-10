from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.models.college import College, CollegeStatus
from app.models.company import Company
from app.models.drive import Drive, DriveStatus
from app.models.profile import Profile
from app.models.user import User, UserType
from app.services.eligibility_engine import check_drive_eligibility, check_eligibility


def test_eligibility_engine_criteria_checks() -> None:
    """Test CGPA, backlog, department, and 10th/12th percentages evaluation."""
    profile = Profile(
        student_id="23IT001",
        full_name="Test Student",
        branch="IT",
        cgpa=7.5,
        active_backlogs=1,
        tenth_percentage=85.0,
        twelfth_percentage=82.0,
        is_placed=False,
        placement_lock_override=False,
    )

    # 1. Meets all criteria
    pass_criteria = {
        "min_cgpa": 7.0,
        "max_backlogs": 2,
        "department_list": ["IT", "CP"],
        "min_tenth": 70.0,
        "min_twelfth": 70.0,
    }
    is_ok, reasons = check_eligibility(profile, pass_criteria)
    assert is_ok is True
    assert reasons == []

    # 2. Fails CGPA threshold
    fail_cgpa = {"min_cgpa": 8.0}
    is_ok, reasons = check_eligibility(profile, fail_cgpa)
    assert is_ok is False
    assert any("CGPA" in r for r in reasons)

    # 3. Fails backlogs limit
    fail_backlog = {"max_backlogs": 0}
    is_ok, reasons = check_eligibility(profile, fail_backlog)
    assert is_ok is False
    assert any("backlog" in r for r in reasons)

    # 4. Fails branch matching
    fail_dept = {"department_list": ["ME", "CE"]}
    is_ok, reasons = check_eligibility(profile, fail_dept)
    assert is_ok is False
    assert any("Branch" in r for r in reasons)


from datetime import datetime, timedelta, timezone

def test_one_selection_placement_lock_and_override() -> None:
    """Test that placed students are locked unless granted placement_lock_override."""
    profile = Profile(
        student_id="23IT002",
        full_name="Placed Student",
        branch="IT",
        cgpa=8.5,
        active_backlogs=0,
        tenth_percentage=90.0,
        twelfth_percentage=88.0,
        is_placed=True,
        placement_lock_override=False,
    )

    drive = Drive(
        college_id=1,
        company_id=1,
        created_by=1,
        role="Software Engineer",
        jd_text="Engineering role",
        deadline=datetime.now(timezone.utc) + timedelta(days=7),
        min_ctc=10.0,
        max_ctc=12.0,
        status=DriveStatus.OPEN,
        eligibility_criteria={"min_cgpa": 7.0},
    )

    # Locked out by default when placed
    is_eligible, reasons = check_drive_eligibility(profile, drive)
    assert is_eligible is False
    assert any("already placed" in r for r in reasons)

    # TPO/Admin grants dream company override
    profile.placement_lock_override = True
    is_eligible, reasons = check_drive_eligibility(profile, drive)
    assert is_eligible is True
    assert reasons == []


def test_application_submission_placement_lock(client: TestClient, db_session) -> None:
    """Test that application endpoint rejects already placed students without override."""
    # Ensure TPO, company and drive exist
    tpo = User(
        college_id=1,
        email="tpo_test@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.TPO,
        is_active=True,
        is_email_verified=True,
    )
    db_session.add(tpo)
    db_session.commit()

    company = Company(name="TechCorp", website="https://techcorp.example")
    db_session.add(company)
    db_session.commit()

    drive = Drive(
        college_id=1,
        company_id=company.id,
        created_by=tpo.id,
        role="Backend Engineer",
        jd_text="Backend engineer role",
        deadline=datetime.now(timezone.utc) + timedelta(days=7),
        min_ctc=12.0,
        max_ctc=15.0,
        status=DriveStatus.OPEN,
        eligibility_criteria={"min_cgpa": 6.0},
    )
    db_session.add(drive)
    db_session.commit()

    # Create placed student
    student = User(
        college_id=1,
        email="lockedstudent@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.STUDENT,
        is_active=True,
        is_email_verified=True,
        fee_verified=True,
    )
    db_session.add(student)
    db_session.commit()

    profile = Profile(
        user_id=student.id,
        student_id="23IT999",
        full_name="Locked Student",
        branch="IT",
        cgpa=9.0,
        active_backlogs=0,
        tenth_percentage=85.0,
        twelfth_percentage=85.0,
        is_placed=True,
        placement_lock_override=False,
    )
    db_session.add(profile)
    db_session.commit()

    # Login student
    login_res = client.post(
        "/auth/login",
        json={"email": "lockedstudent@bvmengineering.ac.in", "password": "Password123"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Attempt to apply to drive -> should fail with 403 Forbidden
    apply_res = client.post(
        "/applications",
        json={"drive_id": drive.id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert apply_res.status_code == 403
    assert "already placed" in apply_res.json()["detail"].lower()
