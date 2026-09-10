from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from datetime import datetime, timedelta, timezone

from app.core.security import create_access_token, hash_password
from app.models.college import College, CollegeStatus
from app.models.company import Company
from app.models.drive import Drive, DriveStatus
from app.models.otp_verification import OtpPurpose
from app.models.profile import Profile
from app.models.user import User, UserType


def test_dynamic_domain_resolution_on_signup(client: TestClient, db_session, monkeypatch) -> None:
    """Test student signup detects college automatically from email domain, and rejects unknown domains."""
    # Seed a second active college
    college2 = College(
        name="Nirma University",
        domain="nirmauni.ac.in",
        status=CollegeStatus.ACTIVE,
    )
    db_session.add(college2)
    db_session.commit()

    captured_otps: dict[str, str] = {}

    async def fake_send_otp_email(to_email: str, otp: str, purpose: OtpPurpose) -> None:
        captured_otps[to_email] = otp

    monkeypatch.setattr("app.routers.auth.email_service.send_otp_email", fake_send_otp_email)

    # 1. Unregistered domain must be rejected
    res_bad = client.post("/auth/signup/request-otp", json={"email": "student@unknown-college.com"})
    assert res_bad.status_code == 400
    assert "not registered with any active institution" in res_bad.json()["detail"]

    # 2. Registered domain for College 2 succeeds
    email2 = "23it050@nirmauni.ac.in"
    res_good = client.post("/auth/signup/request-otp", json={"email": email2})
    assert res_good.status_code == 200
    assert email2 in captured_otps

    # Verify OTP
    otp = captured_otps[email2]
    v_res = client.post("/auth/signup/verify-otp", json={"email": email2, "otp": otp})
    assert v_res.status_code == 200
    signup_token = v_res.json()["token"]

    # Complete signup
    c_res = client.post(
        "/auth/signup/complete",
        json={"email": email2, "password": "Password123", "signup_token": signup_token},
    )
    assert c_res.status_code == 200

    # Confirm user row has college_id assigned to College 2
    created_user = db_session.query(User).filter(User.email == email2).first()
    assert created_user is not None
    assert created_user.college_id == college2.id


def test_cross_tenant_drive_and_application_isolation(client: TestClient, db_session) -> None:
    """Verify College A student cannot apply to College B placement drive."""
    # College 1 is default (id=1, BVM)
    college2 = College(
        name="SVIT Vasad",
        domain="svitvasad.ac.in",
        status=CollegeStatus.ACTIVE,
    )
    db_session.add(college2)
    db_session.commit()

    company = Company(name="Global Systems", website="https://globalsys.example")
    db_session.add(company)
    db_session.commit()

    tpo_col2 = User(
        college_id=college2.id,
        email="tpo@svitvasad.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.TPO,
        is_active=True,
        is_email_verified=True,
    )
    db_session.add(tpo_col2)
    db_session.commit()

    # Drive for College 2
    drive_col2 = Drive(
        college_id=college2.id,
        company_id=company.id,
        created_by=tpo_col2.id,
        role="Cloud Architect",
        jd_text="Cloud architect position",
        deadline=datetime.now(timezone.utc) + timedelta(days=14),
        min_ctc=18.0,
        max_ctc=20.0,
        status=DriveStatus.OPEN,
        eligibility_criteria={"min_cgpa": 6.0},
    )
    db_session.add(drive_col2)
    db_session.commit()

    # Student for College 1
    student1 = User(
        college_id=1,
        email="col1student@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.STUDENT,
        is_active=True,
        is_email_verified=True,
    )
    db_session.add(student1)
    db_session.commit()

    profile1 = Profile(
        user_id=student1.id,
        student_id="23IT101",
        full_name="College 1 Student",
        branch="IT",
        cgpa=8.0,
        tenth_percentage=85.0,
        twelfth_percentage=85.0,
        is_placed=False,
    )
    db_session.add(profile1)
    db_session.commit()

    token1 = create_access_token(str(student1.id), student1.user_type.value, college_id=1)

    # Student 1 attempts to apply to Drive of College 2 -> must be 403 Forbidden
    res = client.post(
        "/applications",
        json={"drive_id": drive_col2.id},
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert res.status_code == 403
    assert "another institution" in res.json()["detail"].lower()


def test_college_admin_domain_management_and_collision_prevention(client: TestClient, db_session) -> None:
    """Test College Admin can view/update domain, and domain collisions are blocked."""
    college2 = College(
        name="Charusat",
        domain="charusat.ac.in",
        status=CollegeStatus.ACTIVE,
    )
    db_session.add(college2)

    # Create Admin for College 1
    admin1 = User(
        college_id=1,
        email="admin@bvmengineering.ac.in",
        hashed_password=hash_password("AdminPass123"),
        user_type=UserType.ADMIN,
        is_active=True,
        is_email_verified=True,
    )
    db_session.add(admin1)
    db_session.commit()

    admin_token = create_access_token(str(admin1.id), UserType.ADMIN.value, college_id=1)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. GET /admin/college
    info_res = client.get("/admin/college", headers=headers)
    assert info_res.status_code == 200
    info = info_res.json()
    assert info["domain"] == "bvmengineering.ac.in"
    assert info["id"] == 1

    # 2. Collision test: try updating to charusat.ac.in (College 2's domain)
    col_res = client.patch("/admin/college/domain", json={"domain": "charusat.ac.in"}, headers=headers)
    assert col_res.status_code == 409
    assert "already assigned to another institution" in col_res.json()["detail"].lower()

    # 3. Successful domain update
    up_res = client.patch("/admin/college/domain", json={"domain": "bvmengineering.edu.in"}, headers=headers)
    assert up_res.status_code == 200
    assert up_res.json()["domain"] == "bvmengineering.edu.in"
