from __future__ import annotations

from datetime import datetime, timedelta, timezone
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.models.company import Company
from app.models.drive import Drive, DriveStatus
from app.models.fee_gate_config import FeeGateConfig
from app.models.fee_receipt import FeeReceipt, FeeVerdict
from app.models.instant_test import InstantTest
from app.models.profile import Profile
from app.models.user import User, UserType
from app.services.fee_gate import check_fee_gate, get_or_create_fee_gate_config


def test_fee_gate_unit_rules(db_session) -> None:
    """Test unit rules of check_fee_gate service."""
    # 1. Unverified student is blocked for apply_to_drives
    unverified_student = User(
        college_id=1,
        email="unverified1@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.STUDENT,
        fee_verified=False,
    )
    db_session.add(unverified_student)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        check_fee_gate("apply_to_drives", unverified_student, db_session)
    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["code"] == "FEE_VERIFICATION_REQUIRED"

    # 2. Verified student passes fee gate
    verified_student = User(
        college_id=1,
        email="verified1@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.STUDENT,
        fee_verified=True,
    )
    db_session.add(verified_student)
    db_session.commit()

    # Should not raise
    check_fee_gate("apply_to_drives", verified_student, db_session)

    # 3. Non-student user passes regardless of fee_verified flag
    tpo_user = User(
        college_id=1,
        email="tpo_gate@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.TPO,
        fee_verified=False,
    )
    db_session.add(tpo_user)
    db_session.commit()

    # Should not raise
    check_fee_gate("apply_to_drives", tpo_user, db_session)


def test_fee_gate_configurable_toggles(db_session) -> None:
    """Test that toggles dynamically allow or block features for unverified students."""
    student = User(
        college_id=1,
        email="unverified2@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.STUDENT,
        fee_verified=False,
    )
    db_session.add(student)
    db_session.commit()

    config = get_or_create_fee_gate_config(db_session, 1)

    # Default resume_analyzer is True (open for unverified students)
    assert config.resume_analyzer is True
    # Student can use resume analyzer
    check_fee_gate("resume_analyzer", student, db_session)

    # Restrict resume_analyzer
    config.resume_analyzer = False
    db_session.commit()

    # Now unverified student is blocked
    with pytest.raises(HTTPException) as exc_info:
        check_fee_gate("resume_analyzer", student, db_session)
    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["code"] == "FEE_VERIFICATION_REQUIRED"


def test_fee_gate_deadline_expiration(db_session) -> None:
    """Test that passed verification deadline blocks students."""
    student = User(
        college_id=1,
        email="unverified_deadline@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.STUDENT,
        fee_verified=False,
    )
    db_session.add(student)
    db_session.commit()

    config = get_or_create_fee_gate_config(db_session, 1)

    # Set deadline in the past
    config.verification_deadline = datetime.now(timezone.utc) - timedelta(days=2)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        check_fee_gate("apply_to_drives", student, db_session)
    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["code"] == "FEE_VERIFICATION_DEADLINE_PASSED"


def test_applications_endpoint_fee_gate(client: TestClient, db_session) -> None:
    """Integration test: POST /applications rejects unverified students with 403."""
    tpo = User(
        college_id=1,
        email="tpo_app@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.TPO,
        is_active=True,
        is_email_verified=True,
    )
    db_session.add(tpo)
    db_session.commit()

    company = Company(name="HiringCo", website="https://hiring.example")
    db_session.add(company)
    db_session.commit()

    drive = Drive(
        college_id=1,
        company_id=company.id,
        created_by=tpo.id,
        role="Frontend Engineer",
        jd_text="Frontend role",
        deadline=datetime.now(timezone.utc) + timedelta(days=7),
        min_ctc=8.0,
        max_ctc=10.0,
        status=DriveStatus.OPEN,
        eligibility_criteria={"min_cgpa": 6.0},
    )
    db_session.add(drive)
    db_session.commit()

    # 1. Unverified student
    unverified_student = User(
        college_id=1,
        email="unverified_applicant@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.STUDENT,
        is_active=True,
        is_email_verified=True,
        fee_verified=False,
    )
    db_session.add(unverified_student)
    db_session.commit()

    profile1 = Profile(
        user_id=unverified_student.id,
        student_id="23IT101",
        full_name="Unverified Applicant",
        branch="IT",
        cgpa=8.0,
        active_backlogs=0,
        tenth_percentage=85.0,
        twelfth_percentage=85.0,
    )
    db_session.add(profile1)
    db_session.commit()

    login_res = client.post(
        "/auth/login",
        json={"email": "unverified_applicant@bvmengineering.ac.in", "password": "Password123"},
    )
    token = login_res.json()["access_token"]

    app_res = client.post(
        "/applications",
        json={"drive_id": drive.id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert app_res.status_code == 403
    assert app_res.json()["detail"]["code"] == "FEE_VERIFICATION_REQUIRED"


def test_instant_test_official_vs_practice_gate(client: TestClient, db_session) -> None:
    """Integration test: official tests are fee-gated while practice tests are permitted."""
    tpo = User(
        college_id=1,
        email="tpo_test_creator@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.TPO,
        is_active=True,
        is_email_verified=True,
    )
    db_session.add(tpo)
    db_session.commit()

    official_test = InstantTest(
        college_id=1,
        created_by=tpo.id,
        title="Official Campus Placement Test",
        is_practice=False,
        duration_minutes=60,
        prompt_config={},
        questions=[],
        min_passing_marks=20,
    )
    practice_test = InstantTest(
        college_id=1,
        created_by=tpo.id,
        title="Practice Aptitude Test",
        is_practice=True,
        duration_minutes=30,
        prompt_config={},
        questions=[],
        min_passing_marks=10,
    )
    db_session.add_all([official_test, practice_test])
    db_session.commit()

    unverified_student = User(
        college_id=1,
        email="unverified_tester@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.STUDENT,
        is_active=True,
        is_email_verified=True,
        fee_verified=False,
    )
    db_session.add(unverified_student)
    db_session.commit()

    login_res = client.post(
        "/auth/login",
        json={"email": "unverified_tester@bvmengineering.ac.in", "password": "Password123"},
    )
    token = login_res.json()["access_token"]

    # Official test start attempt -> 403
    off_res = client.post(
        f"/instant-tests/{official_test.id}/start",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert off_res.status_code == 403
    assert off_res.json()["detail"]["code"] == "FEE_VERIFICATION_REQUIRED"

    # Practice test start attempt -> allowed by fee gate (200 OK)
    prac_res = client.post(
        f"/instant-tests/{practice_test.id}/start",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert prac_res.status_code == 200


def test_admin_fee_gate_config_endpoints(client: TestClient, db_session) -> None:
    """Test GET and PATCH /admin/fee-gate-config and GET /admin/fee-gate-config/stats."""
    admin = User(
        college_id=1,
        email="admin_feegate@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.ADMIN,
        is_active=True,
        is_email_verified=True,
    )
    db_session.add(admin)
    db_session.commit()

    login_res = client.post(
        "/auth/login",
        json={"email": "admin_feegate@bvmengineering.ac.in", "password": "Password123"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. GET config
    get_res = client.get("/admin/fee-gate-config", headers=headers)
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["college_id"] == 1
    assert data["apply_to_drives"] is False
    assert data["browse_drives"] is True

    # 2. PATCH config
    patch_res = client.patch(
        "/admin/fee-gate-config",
        json={
            "mock_interview_gen": False,
            "resume_analyzer": False,
        },
        headers=headers,
    )
    assert patch_res.status_code == 200
    patched_data = patch_res.json()
    assert patched_data["mock_interview_gen"] is False
    assert patched_data["resume_analyzer"] is False

    # 3. GET stats
    stats_res = client.get("/admin/fee-gate-config/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "total_students" in stats
    assert "verified_count" in stats
    assert "pending_review_count" in stats
    assert "rejected_count" in stats
    assert "unsubmitted_count" in stats


def test_tpo_bulk_approve_fee_receipts(client: TestClient, db_session) -> None:
    """Test TPO POST /tpo/fee-receipts/bulk-approve verifies students."""
    tpo = User(
        college_id=1,
        email="tpo_bulk@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.TPO,
        is_active=True,
        is_email_verified=True,
    )
    student1 = User(
        college_id=1,
        email="student_bulk1@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.STUDENT,
        is_active=True,
        is_email_verified=True,
        fee_verified=False,
    )
    student2 = User(
        college_id=1,
        email="student_bulk2@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.STUDENT,
        is_active=True,
        is_email_verified=True,
        fee_verified=False,
    )
    db_session.add_all([tpo, student1, student2])
    db_session.commit()

    receipt1 = FeeReceipt(
        user_id=student1.id,
        file_path="uploads/fee_receipts/sample1.png",
        ai_confidence=0.75,
    )
    receipt2 = FeeReceipt(
        user_id=student2.id,
        file_path="uploads/fee_receipts/sample2.png",
        ai_confidence=0.82,
    )
    db_session.add_all([receipt1, receipt2])
    db_session.commit()

    login_res = client.post(
        "/auth/login",
        json={"email": "tpo_bulk@bvmengineering.ac.in", "password": "Password123"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Execute bulk approve
    bulk_res = client.post(
        "/tpo/fee-receipts/bulk-approve",
        json={"receipt_ids": [receipt1.id, receipt2.id]},
        headers=headers,
    )
    assert bulk_res.status_code == 200
    res_data = bulk_res.json()
    assert res_data["approved_count"] == 2

    # Refresh users from DB
    db_session.refresh(student1)
    db_session.refresh(student2)
    db_session.refresh(receipt1)
    db_session.refresh(receipt2)

    assert receipt1.verified_by == tpo.id
    assert receipt2.verified_by == tpo.id
    assert receipt1.verified_at is not None
    assert receipt2.verified_at is not None
    assert student1.fee_verified is True
    assert student2.fee_verified is True


def test_fee_receipt_upload_groq_unavailable_graceful_fallback(client: TestClient, db_session, monkeypatch) -> None:
    """Test that when Groq AI is temporarily unavailable, fee receipt upload still succeeds
    and routes to TPO manual review rather than crashing.
    """
    from app.utils.exceptions import GroqServiceError
    from io import BytesIO

    student = User(
        college_id=1,
        email="student_groq_down@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.STUDENT,
        fee_verified=False,
    )
    db_session.add(student)
    db_session.commit()

    login_res = client.post(
        "/auth/login",
        json={"email": "student_groq_down@bvmengineering.ac.in", "password": "Password123"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Simulate GroqServiceError during AI verification
    async def mock_groq_error(*args, **kwargs):
        raise GroqServiceError("The AI service is temporarily unavailable")

    monkeypatch.setattr("app.services.fee_receipt_service.get_ai_verdict", mock_groq_error)

    # Valid PNG 1x1 bytes
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc\xf8\xff\xff?\x00\x05\xfe\x02\xfe\xdc\xccY\xe7\x00\x00\x00\x00IEND\xaeB`\x82"

    upload_res = client.post(
        "/fee-verification/upload",
        files={"file": ("receipt.png", BytesIO(png_bytes), "image/png")},
        headers=headers,
    )
    # Upload must succeed with 201 Created instead of 400 error
    assert upload_res.status_code == 201
    data = upload_res.json()
    assert data["ai_verdict"] is None
    assert "temporarily unavailable" in data["ai_reason"]

    # Check status endpoint shows pending_review
    status_res = client.get("/fee-verification/status", headers=headers)
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["fee_verified"] is False
    assert status_data["upload_history"][0]["status"] == "pending_review"

