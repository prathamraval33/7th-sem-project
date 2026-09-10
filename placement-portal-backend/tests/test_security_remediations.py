"""Comprehensive test suite for security remediations and vulnerability fixes:
1. Exam answer key leak prevention (correct_option_index sanitized for students).
2. Proctoring disqualification cannot be overridden (AttemptStatus.ENDED blocks submit).
3. OTP brute-force throttling (max 5 failed attempts burns OTP).
4. Refresh token revocation on password change & reset (zombie session prevention).
5. Forgot-password email enumeration prevention (generic 200 response).
6. Application unique constraint prevents duplicate race conditions (409 Conflict).
7. Cross-tenant IDOR protection across all TPO drive management routes.
8. Razorpay webhook authentication bypass prevention.
9. Magic bytes validation & protected file serving with tenant isolation.
10. Duplicate AI subject resource curation prevention.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.models.college import College, CollegeStatus
from app.models.company import Company
from app.models.curated_subject_resource import CuratedSubjectResource
from app.models.curriculum_subject import CurriculumSubject
from app.models.drive import Drive, DriveStatus
from app.models.instant_test import InstantTest, InstantTestStatus
from app.models.test_attempt import AttemptStatus, TestAttempt
from app.models.otp_verification import OtpPurpose, OtpVerification
from app.models.profile import Profile
from app.models.refresh_token import RefreshToken
from app.models.user import User, UserType
from app.services import otp_service


def test_exam_answer_key_sanitized_for_students(client: TestClient, db_session) -> None:
    """Ensure correct_option_index is stripped from test questions when fetched by students."""
    student = User(
        email="student@bvmengineering.ac.in",
        hashed_password=hash_password("Pass123!"),
        user_type=UserType.STUDENT,
        is_active=True,
        is_email_verified=True,
        college_id=1,
    )
    db_session.add(student)
    db_session.commit()

    test = InstantTest(
        title="Python Assessment",
        created_by=student.id,
        duration_minutes=30,
        min_passing_marks=50,
        prompt_config={},
        questions=[
            {
                "id": 1,
                "question": "What is 2 + 2?",
                "options": ["2", "3", "4", "5"],
                "correct_option_index": 2,
            }
        ],
        status=InstantTestStatus.OPEN,
        college_id=1,
    )
    db_session.add(test)
    db_session.commit()

    token = create_access_token(str(student.id), student.user_type.value, college_id=student.college_id)
    headers = {"Authorization": f"Bearer {token}"}

    # Test list endpoint (GET /instant-tests)
    res_list = client.get("/instant-tests", headers=headers)
    assert res_list.status_code == 200
    tests_data = res_list.json()
    all_tests = tests_data.get("practice_tests", []) + tests_data.get("official_tests", [])
    assert len(all_tests) >= 1
    found = [t for t in all_tests if t["id"] == test.id][0]
    for q in found["questions"]:
        assert q.get("correct_option_index") is None

    # Test detail endpoint (GET /instant-tests/{id})
    res_detail = client.get(f"/instant-tests/{test.id}", headers=headers)
    assert res_detail.status_code == 200
    detail = res_detail.json()
    for q in detail["questions"]:
        assert q.get("correct_option_index") is None


def test_proctoring_disqualification_cannot_be_overridden(client: TestClient, db_session) -> None:
    """Ensure an attempt terminated by proctoring (ENDED) cannot be submitted for scoring."""
    student = User(
        email="proctored@bvmengineering.ac.in",
        hashed_password=hash_password("Pass123!"),
        user_type=UserType.STUDENT,
        is_active=True,
        is_email_verified=True,
        college_id=1,
    )
    db_session.add(student)
    db_session.commit()

    test = InstantTest(
        title="Proctored Test",
        created_by=student.id,
        duration_minutes=30,
        min_passing_marks=50,
        prompt_config={},
        questions=[
            {
                "id": 1,
                "question": "What is 2 + 2?",
                "options": ["2", "3", "4", "5"],
                "correct_option_index": 2,
            }
        ],
        status=InstantTestStatus.OPEN,
        college_id=1,
    )
    db_session.add(test)
    db_session.commit()

    attempt = TestAttempt(
        test_id=test.id,
        user_id=student.id,
        status=AttemptStatus.ENDED,
        started_at=datetime.now(timezone.utc),
    )
    db_session.add(attempt)
    db_session.commit()

    token = create_access_token(str(student.id), student.user_type.value, college_id=student.college_id)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        f"/instant-tests/attempts/{attempt.id}/submit",
        json={"answers": []},
        headers=headers,
    )
    assert res.status_code == 400
    assert "cannot be submitted" in res.json()["detail"].lower()


def test_otp_bruteforce_protection(client: TestClient, db_session) -> None:
    """Ensure OTP verification tracks failed attempts and burns the OTP after 5 failures."""
    email = "otp_victim@bvmengineering.ac.in"
    otp = otp_service.create_otp(db_session, email, OtpPurpose.SIGNUP)

    # 4 bad attempts
    for _ in range(4):
        with pytest.raises(otp_service.OtpInvalidError):
            otp_service.verify_otp(db_session, email, "000000", OtpPurpose.SIGNUP)

    record = db_session.query(OtpVerification).filter(OtpVerification.email == email).first()
    assert record.failed_attempts == 4
    assert not record.is_used

    # 5th bad attempt triggers rate limit & marks is_used
    with pytest.raises(otp_service.OtpRateLimitError) as exc_info:
        otp_service.verify_otp(db_session, email, "000000", OtpPurpose.SIGNUP)
    assert "Too many failed attempts" in str(exc_info.value.message)

    db_session.refresh(record)
    assert record.is_used

    # Correct OTP now fails because record was burned
    with pytest.raises(otp_service.OtpInvalidError):
        otp_service.verify_otp(db_session, email, otp, OtpPurpose.SIGNUP)


def test_zombie_jwt_sessions_revoked_on_password_change(client: TestClient, db_session) -> None:
    """Ensure changing password revokes existing refresh tokens."""
    user = User(
        email="password_change@bvmengineering.ac.in",
        hashed_password=hash_password("OldPassword123"),
        user_type=UserType.STUDENT,
        is_active=True,
        is_email_verified=True,
        college_id=1,
    )
    db_session.add(user)
    db_session.commit()

    refresh = RefreshToken(
        token_hash="dummyhash123",
        user_id=user.id,
        is_revoked=False,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db_session.add(refresh)
    db_session.commit()

    token = create_access_token(str(user.id), user.user_type.value, college_id=user.college_id)
    headers = {"Authorization": f"Bearer {token}"}

    c_otp = otp_service.create_otp(db_session, user.email, OtpPurpose.CHANGE_PASSWORD)
    v_res = client.post(
        "/auth/change-password/verify-otp",
        json={"email": user.email, "otp": c_otp},
        headers=headers,
    )
    assert v_res.status_code == 200
    change_token = v_res.json()["token"]

    res = client.post(
        "/auth/change-password/complete",
        json={
            "change_token": change_token,
            "current_password": "OldPassword123",
            "new_password": "NewPassword456",
        },
        headers=headers,
    )
    assert res.status_code == 200

    db_session.refresh(refresh)
    assert refresh.is_revoked is True


def test_forgot_password_stops_email_enumeration(client: TestClient, db_session) -> None:
    """Ensure requesting forgot-password OTP for non-existent email returns generic success message."""
    res = client.post(
        "/auth/forgot-password/request-otp",
        json={"email": "nonexistent_attacker_target@bvmengineering.ac.in"},
    )
    assert res.status_code == 200
    assert "If an account exists with this email, an OTP has been sent." in res.json()["message"]


def test_unique_application_prevents_duplicate_race_conditions(client: TestClient, db_session) -> None:
    """Ensure duplicate applications to the same drive are blocked with 409 Conflict."""
    student = User(
        email="applicant@bvmengineering.ac.in",
        hashed_password=hash_password("Pass123!"),
        user_type=UserType.STUDENT,
        is_active=True,
        is_email_verified=True,
        college_id=1,
    )
    db_session.add(student)
    db_session.commit()

    profile = Profile(
        user_id=student.id,
        student_id="23IT408",
        full_name="App Licant",
        branch="Information Technology",
        cgpa=8.5,
        tenth_percentage=90.0,
        twelfth_percentage=90.0,
        is_placed=False,
    )
    db_session.add(profile)

    company = Company(name="TechCorp", website="https://techcorp.com")
    db_session.add(company)
    db_session.commit()

    drive = Drive(
        college_id=1,
        company_id=company.id,
        created_by=student.id,
        role="Software Engineer",
        jd_text="Software engineer position",
        deadline=datetime.now(timezone.utc) + timedelta(days=14),
        min_ctc=10.0,
        max_ctc=15.0,
        status=DriveStatus.OPEN,
        eligibility_criteria={"min_cgpa": 6.0, "department_list": ["Information Technology"]},
    )
    db_session.add(drive)
    db_session.commit()

    token = create_access_token(str(student.id), student.user_type.value, college_id=student.college_id)
    headers = {"Authorization": f"Bearer {token}"}

    # First application succeeds
    res1 = client.post("/applications", json={"drive_id": drive.id}, headers=headers)
    assert res1.status_code == 201

    # Second application raises 409 Conflict
    res2 = client.post("/applications", json={"drive_id": drive.id}, headers=headers)
    assert res2.status_code == 409
    assert "already applied" in res2.json()["detail"].lower()


def test_tpo_cross_tenant_drive_access_blocked(client: TestClient, db_session) -> None:
    """Ensure TPO from College 1 cannot view or modify drives belonging to College 2."""
    college2 = College(name="College Two", domain="collegetwo.ac.in", status=CollegeStatus.ACTIVE)
    db_session.add(college2)
    db_session.commit()

    tpo1 = User(
        email="tpo1@bvmengineering.ac.in",
        hashed_password=hash_password("Pass123!"),
        user_type=UserType.TPO,
        is_active=True,
        is_email_verified=True,
        college_id=1,
    )
    tpo2 = User(
        email="tpo2@collegetwo.ac.in",
        hashed_password=hash_password("Pass123!"),
        user_type=UserType.TPO,
        is_active=True,
        is_email_verified=True,
        college_id=college2.id,
    )
    db_session.add_all([tpo1, tpo2])
    db_session.commit()

    company2 = Company(name="Firm Two", website="https://firmtwo.com")
    db_session.add(company2)
    db_session.commit()

    drive2 = Drive(
        college_id=college2.id,
        company_id=company2.id,
        created_by=tpo2.id,
        role="College 2 Drive",
        jd_text="JD for college 2 drive",
        deadline=datetime.now(timezone.utc) + timedelta(days=14),
        status=DriveStatus.OPEN,
        eligibility_criteria={"department_list": ["Computer Engineering"]},
    )
    db_session.add(drive2)
    db_session.commit()

    token1 = create_access_token(str(tpo1.id), tpo1.user_type.value, college_id=tpo1.college_id)
    headers1 = {"Authorization": f"Bearer {token1}"}

    # 1. TPO 1 cannot update drive 2
    res_update = client.patch(f"/tpo/drives/{drive2.id}", json={"role": "Hacked Title"}, headers=headers1)
    assert res_update.status_code == 403

    # 2. TPO 1 cannot view applicants of drive 2
    res_applicants = client.get(f"/tpo/drives/{drive2.id}/applicants", headers=headers1)
    assert res_applicants.status_code == 403

    # 3. TPO 1 cannot close drive 2
    res_close = client.post(f"/tpo/drives/{drive2.id}/close", headers=headers1)
    assert res_close.status_code == 403


def test_razorpay_webhook_signature_required(client: TestClient, monkeypatch) -> None:
    """Ensure webhook rejects requests when signature header is missing or mismatch."""
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", "super_secret_webhook_key")

    # Missing header
    res_missing = client.post("/payments/webhook", json={"event": "payment.captured"})
    assert res_missing.status_code == 400
    assert "Missing X-Razorpay-Signature header" in res_missing.json()["detail"]

    # Invalid signature
    res_invalid = client.post(
        "/payments/webhook",
        json={"event": "payment.captured"},
        headers={"X-Razorpay-Signature": "invalid_hex_signature"},
    )
    assert res_invalid.status_code == 400
    assert "Invalid webhook signature" in res_invalid.json()["detail"]


def test_file_upload_magic_bytes_and_protected_download(client: TestClient, db_session, monkeypatch) -> None:
    """Ensure magic bytes validation prevents fake PDFs, and files require authentication and tenant check."""
    monkeypatch.setattr("app.routers.resume.resume_parser.extract_resume_text", lambda path: "Sample parsed text")

    student1 = User(
        email="s1@bvmengineering.ac.in",
        hashed_password=hash_password("Pass123!"),
        user_type=UserType.STUDENT,
        is_active=True,
        is_email_verified=True,
        college_id=1,
    )
    student2 = User(
        email="s2@bvmengineering.ac.in",
        hashed_password=hash_password("Pass123!"),
        user_type=UserType.STUDENT,
        is_active=True,
        is_email_verified=True,
        college_id=1,
    )
    db_session.add_all([student1, student2])
    db_session.commit()

    token1 = create_access_token(str(student1.id), student1.user_type.value, college_id=student1.college_id)
    token2 = create_access_token(str(student2.id), student2.user_type.value, college_id=student2.college_id)
    headers1 = {"Authorization": f"Bearer {token1}"}

    # 1. Fake PDF (text file renamed to .pdf) fails magic bytes validation
    fake_pdf = b"Hello, this is just plain text, not a real PDF document!"
    res_fake = client.post(
        "/student/resume",
        files={"file": ("fake_resume.pdf", fake_pdf, "application/pdf")},
        headers=headers1,
    )
    assert res_fake.status_code == 400
    assert "File content does not match the expected format" in res_fake.json()["detail"]

    # 2. Valid PDF upload succeeds
    valid_pdf = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    res_valid = client.post(
        "/student/resume",
        files={"file": ("valid_resume.pdf", valid_pdf, "application/pdf")},
        headers=headers1,
    )
    assert res_valid.status_code == 201
    file_path = res_valid.json()["file_path"]
    filename = file_path.split("/")[-1]

    # 3. Unauthenticated request to /uploads is rejected with 401
    res_no_auth = client.get(f"/uploads/resumes/{filename}")
    assert res_no_auth.status_code == 401

    # 4. Path traversal attempt is rejected with 400
    res_traversal = client.get("/uploads/resumes/..%2f..%2fmain.py", headers=headers1)
    assert res_traversal.status_code in (400, 404)

    # 5. Student 2 cannot access Student 1's resume
    headers2 = {"Authorization": f"Bearer {token2}"}
    res_forbidden = client.get(f"/uploads/resumes/{filename}", headers=headers2)
    assert res_forbidden.status_code == 403

    # 6. Student 1 CAN access their own resume via token query param
    res_own = client.get(f"/uploads/resumes/{filename}?token={token1}")
    assert res_own.status_code == 200
    assert res_own.content == valid_pdf


def test_curate_subject_resources_duplicate_prevention(client: TestClient, db_session, monkeypatch) -> None:
    """Ensure repeated curation calls do not duplicate resources for the same subject."""
    tpo = User(
        email="curator_tpo@bvmengineering.ac.in",
        hashed_password=hash_password("Pass123!"),
        user_type=UserType.TPO,
        is_active=True,
        is_email_verified=True,
        college_id=1,
    )
    db_session.add(tpo)
    db_session.commit()

    subject = CurriculumSubject(
        college_id=1,
        branch_name="Information Technology",
        semester_number=7,
        subject_name="Cloud Computing",
    )
    db_session.add(subject)
    db_session.commit()

    mock_candidates = [
        {
            "resource_type": "book",
            "title": "Cloud Computing Concepts",
            "link": "https://example.com/books/cloud-computing",
            "ai_summary": "Intro to cloud architecture and distributed systems.",
        },
        {
            "resource_type": "video",
            "title": "Cloud Fundamentals Course",
            "link": "https://youtube.com/watch?v=cloud123",
            "ai_summary": "Comprehensive video course on cloud services.",
        },
    ]

    async def fake_curate(*args, **kwargs):
        return mock_candidates

    monkeypatch.setattr("app.routers.curriculum.curriculum_service.curate_resources_for_subject", fake_curate)

    token = create_access_token(str(tpo.id), tpo.user_type.value, college_id=tpo.college_id)
    headers = {"Authorization": f"Bearer {token}"}

    # First curation call adds 2 items
    res1 = client.post(f"/curriculum/subjects/{subject.id}/curate", headers=headers)
    assert res1.status_code == 200
    assert len(res1.json()) == 2

    # Second curation call does NOT duplicate the items
    res2 = client.post(f"/curriculum/subjects/{subject.id}/curate", headers=headers)
    assert res2.status_code == 200

    total_in_db = (
        db_session.query(CuratedSubjectResource)
        .filter(CuratedSubjectResource.subject_id == subject.id)
        .count()
    )
    assert total_in_db == 2
