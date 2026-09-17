"""Comprehensive tests for Self-Service College Registration & Progressive Onboarding.

Covers:
- Spec 2.3: Free / personal email blocklist
- Spec 2.4: Domain collision check & admin notification
- Spec 2.5: OTP generation & verification
- Spec 2.7 & 2.8: Creation in pending_setup status and password completion
- Spec 5.3: Student signup gate blocking inactive institutions
- Spec 3.3: Admin login allowed during pending_setup
- Spec 4.3 & 3.1: Progressive setup checklist & auto-transition to ready_for_review
- Spec 3.2: SuperAdmin approval to active status unblocking student signups
- Spec 3.2: SuperAdmin rejection with recorded reason
- Spec 2.9: 48-hour abandoned registration cleanup releasing domain reservations
"""
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.security import hash_password
from app.models.college import College, CollegeStatus
from app.models.college_registration import CollegeRegistration
from app.models.notification import Notification, NotificationType
from app.models.otp_verification import OtpPurpose
from app.models.user import User, UserType
from app.services.college_onboarding_service import cleanup_expired_registrations


def _create_superadmin(db_session) -> User:
    sa = User(
        email="superadmin@placementportal.internal",
        hashed_password=hash_password("SuperAdmin@123"),
        user_type=UserType.SUPERADMIN,
        is_active=True,
        is_email_verified=True,
    )
    db_session.add(sa)
    db_session.commit()
    db_session.refresh(sa)
    return sa


def _create_default_admin(db_session, college: College) -> User:
    admin = User(
        college_id=college.id,
        email="admin@bvmengineering.ac.in",
        hashed_password=hash_password("Admin@123"),
        user_type=UserType.ADMIN,
        is_active=True,
        is_email_verified=True,
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


def test_free_email_domain_rejection(client: TestClient, db_session) -> None:
    """Spec 2.3: Rejects attempts using personal/free email domains with helpful message."""
    blocked_emails = [
        "dean@gmail.com",
        "principal@yahoo.com",
        "tpo@outlook.com",
        "admin@hotmail.com",
        "contact@protonmail.com",
    ]
    for email in blocked_emails:
        res = client.post(
            "/auth/college-registration/request-otp",
            json={
                "college_name": "Test Engineering College",
                "admin_name": "Dr. Test Dean",
                "email": email,
                "mobile_number": "+91 9876543210",
            },
        )
        assert res.status_code == 400
        assert "Personal email addresses (Gmail, Yahoo, etc.) can't be used" in res.json()["detail"]


def test_domain_collision_rejection_and_alert_notification(client: TestClient, db_session) -> None:
    """Spec 2.4: Reject registration if domain already exists, and notify existing college admin."""
    # BVM is seeded with domain 'bvmengineering.ac.in'
    bvm = db_session.scalar(select(College).where(College.domain == "bvmengineering.ac.in"))
    assert bvm is not None
    bvm_admin = _create_default_admin(db_session, bvm)

    res = client.post(
        "/auth/college-registration/request-otp",
        json={
            "college_name": "Duplicate BVM Attempt",
            "admin_name": "Prof. Imposter",
            "email": "imposter@bvmengineering.ac.in",
            "mobile_number": "+91 9123456780",
        },
    )
    assert res.status_code == 409
    assert "already registered on the platform" in res.json()["detail"]

    # Verify notification sent to existing BVM admin
    notif = db_session.scalar(
        select(Notification).where(
            Notification.recipient_id == bvm_admin.id,
            Notification.type == NotificationType.COLLEGE_COLLISION_ALERT,
        )
    )
    assert notif is not None
    assert "Registration attempt alert" in notif.message
    assert "imposter@bvmengineering.ac.in" in notif.message


def test_college_registration_full_flow_end_to_end(client: TestClient, db_session, monkeypatch) -> None:
    """Test full registration: request-otp -> verify-otp -> complete -> login -> checklist -> approval -> active."""
    captured_otps: dict[str, str] = {}

    async def fake_send_otp_email(to_email: str, otp: str, purpose: OtpPurpose) -> None:
        captured_otps[to_email] = otp

    monkeypatch.setattr("app.routers.auth.email_service.send_otp_email", fake_send_otp_email)

    superadmin = _create_superadmin(db_session)

    # 1. Submit Registration Details
    reg_email = "dean@svitvasad.ac.in"
    res_req = client.post(
        "/auth/college-registration/request-otp",
        json={
            "college_name": "Sardar Vallabhbhai Patel Institute of Technology",
            "admin_name": "Dr. SVIT Principal",
            "email": reg_email,
            "mobile_number": "+91 9876501234",
        },
    )
    assert res_req.status_code == 200
    assert reg_email in captured_otps
    otp = captured_otps[reg_email]

    # 2. Verify OTP
    res_verify = client.post(
        "/auth/college-registration/verify-otp",
        json={"email": reg_email, "otp": otp},
    )
    assert res_verify.status_code == 200
    assert "token" in res_verify.json()
    assert "verification_token" in res_verify.json()
    reg_token = res_verify.json()["token"]
    assert reg_token is not None
    assert res_verify.json()["verification_token"] == reg_token

    # 2b. Retry verify with same OTP (resilience against client re-submission)
    res_retry = client.post(
        "/auth/college-registration/verify-otp",
        json={"email": reg_email, "otp": otp},
    )
    assert res_retry.status_code == 200
    assert res_retry.json()["verification_token"] is not None

    # 3. Complete Registration with Password
    res_complete = client.post(
        "/auth/college-registration/complete",
        json={
            "email": reg_email,
            "registration_token": reg_token,
            "password": "SecurePassword@123",
        },
    )
    assert res_complete.status_code == 200
    assert res_complete.json()["redirect"] == "/login"
    new_college_id = res_complete.json()["college_id"]

    # Verify DB state: college is in PENDING_SETUP status (Spec 2.7)
    svit = db_session.get(College, new_college_id)
    assert svit is not None
    assert svit.status == CollegeStatus.PENDING_SETUP
    assert svit.domain == "svitvasad.ac.in"
    assert svit.contact_name == "Dr. SVIT Principal"
    assert svit.contact_mobile == "+91 9876501234"
    assert svit.contact_mobile_verified is False

    # 4. Student signup is blocked for PENDING_SETUP college (Spec 5.3)
    student_email = "student@svitvasad.ac.in"
    res_student_blocked = client.post(
        "/auth/signup/request-otp",
        json={"email": student_email},
    )
    assert res_student_blocked.status_code == 400
    assert "This college is not yet active on the platform" in res_student_blocked.json()["detail"]

    # 5. College Admin CAN log in during pending_setup (Spec 3.3)
    login_res = client.post(
        "/auth/login",
        json={"email": reg_email, "password": "SecurePassword@123"},
    )
    assert login_res.status_code == 200
    admin_token = login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 6. Check Progressive Setup Checklist (Spec 4.3 & 3.1)
    chk_res = client.get("/admin/college/setup-checklist", headers=admin_headers)
    assert chk_res.status_code == 200
    checklist = chk_res.json()
    assert checklist["college_id"] == new_college_id
    assert checklist["status"] == "pending_setup"
    assert checklist["all_blocking_complete"] is False

    # Blocking item 1 (domain) is completed, item 3 (profile) is completed, but TPO is not
    tpo_item = next(i for i in checklist["items"] if i["id"] == "tpo_account")
    assert tpo_item["is_completed"] is False

    # 7. Admin adds a TPO account
    add_tpo_res = client.post(
        "/admin/users",
        headers=admin_headers,
        json={
            "email": "tpo@svitvasad.ac.in",
            "password": "TpoPassword@123",
            "user_type": "tpo",
            "full_name": "SVIT Head TPO",
        },
    )
    assert add_tpo_res.status_code == 201

    # 7b. Admin completes subscription payment (₹10,000 / month)
    order_res = client.post("/payments/subscription/create-order", headers=admin_headers, json={})
    assert order_res.status_code == 200
    order_id = order_res.json()["order_id"]
    assert order_res.json()["amount"] == 1000000

    import hashlib
    import hmac
    from app.core.config import settings

    mock_payment_id = "pay_mock_sub_12345"
    mock_signature = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        f"{order_id}|{mock_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    verify_res = client.post(
        "/payments/verify",
        headers=admin_headers,
        json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": mock_payment_id,
            "razorpay_signature": mock_signature,
        },
    )
    assert verify_res.status_code == 200

    # 8. Re-evaluate checklist: should auto-transition to READY_FOR_REVIEW (Spec 3.1)
    chk_res_2 = client.get("/admin/college/setup-checklist", headers=admin_headers)
    assert chk_res_2.status_code == 200
    checklist_2 = chk_res_2.json()
    assert checklist_2["all_blocking_complete"] is True
    assert checklist_2["status"] == "ready_for_review"

    # Verify SuperAdmin received notification
    sa_notif = db_session.scalar(
        select(Notification).where(
            Notification.recipient_id == superadmin.id,
            Notification.type == NotificationType.COLLEGE_READY_FOR_REVIEW,
        )
    )
    assert sa_notif is not None
    assert "ready for your review" in sa_notif.message

    # 9. SuperAdmin reviews and approves college (Spec 3.2)
    sa_login = client.post(
        "/auth/login",
        json={"email": "superadmin@placementportal.internal", "password": "SuperAdmin@123"},
    )
    assert sa_login.status_code == 200
    sa_token = sa_login.json()["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}

    # Verify college detail shows in SuperAdmin API with setup progress % and unverified mobile
    col_detail_res = client.get(f"/superadmin/colleges/{new_college_id}", headers=sa_headers)
    assert col_detail_res.status_code == 200
    col_detail = col_detail_res.json()
    assert col_detail["status"] == "ready_for_review"
    assert col_detail["contact_mobile_verified"] is False
    assert col_detail["blocking_items_complete"] is True

    # Approve
    approve_res = client.patch(f"/superadmin/colleges/{new_college_id}/approve", headers=sa_headers)
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "active"

    # Verify SVIT is now ACTIVE in DB
    db_session.refresh(svit)
    assert svit.status == CollegeStatus.ACTIVE
    assert svit.activated_at is not None

    # 10. Student signup now works! (Spec 3.2 & 5.3)
    res_student_ok = client.post(
        "/auth/signup/request-otp",
        json={"email": student_email},
    )
    assert res_student_ok.status_code == 200
    assert student_email in captured_otps


def test_superadmin_rejection_flow(client: TestClient, db_session) -> None:
    """Spec 3.2: SuperAdmin can reject a registration with a recorded reason, notifying the admin."""
    sa = _create_superadmin(db_session)
    sa_login = client.post(
        "/auth/login",
        json={"email": "superadmin@placementportal.internal", "password": "SuperAdmin@123"},
    )
    sa_headers = {"Authorization": f"Bearer {sa_login.json()['access_token']}"}

    # Seed a college in ready_for_review
    college = College(
        name="Questionable Academy",
        domain="questionable.ac.in",
        status=CollegeStatus.READY_FOR_REVIEW,
        contact_name="Mr. Unknown",
        contact_mobile="+91 9999999999",
    )
    db_session.add(college)
    db_session.commit()
    db_session.refresh(college)

    admin = User(
        college_id=college.id,
        email="admin@questionable.ac.in",
        hashed_password=hash_password("Password@123"),
        user_type=UserType.ADMIN,
        is_active=True,
        is_email_verified=True,
    )
    db_session.add(admin)
    db_session.commit()

    reject_res = client.patch(
        f"/superadmin/colleges/{college.id}/reject",
        headers=sa_headers,
        json={"rejection_reason": "Could not verify accreditation with university commission."},
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "rejected"

    db_session.refresh(college)
    assert college.status == CollegeStatus.REJECTED
    assert college.rejection_reason == "Could not verify accreditation with university commission."

    # Verify notification sent to admin
    notif = db_session.scalar(
        select(Notification).where(
            Notification.recipient_id == admin.id,
            Notification.type == NotificationType.COLLEGE_REJECTED,
        )
    )
    assert notif is not None
    assert "declined" in notif.message
    assert "accreditation" in notif.message


def test_abandoned_registration_cleanup(db_session) -> None:
    """Spec 2.9: Registrations older than 48 hours without verification are expired, releasing the domain."""
    now = datetime.now(timezone.utc)
    old_expired = CollegeRegistration(
        college_name="Abandoned Institute",
        admin_name="Dr. Abandoned",
        email="reg@abandoned.edu",
        domain="abandoned.edu",
        status="pending_otp",
        created_at=now - timedelta(hours=50),
        expires_at=now - timedelta(hours=2),
    )
    fresh_active = CollegeRegistration(
        college_name="Active Institute",
        admin_name="Dr. Active",
        email="reg@active.edu",
        domain="active.edu",
        status="pending_otp",
        created_at=now - timedelta(hours=1),
        expires_at=now + timedelta(hours=47),
    )
    db_session.add_all([old_expired, fresh_active])
    db_session.commit()

    count = cleanup_expired_registrations(db_session)
    assert count >= 1

    db_session.refresh(old_expired)
    db_session.refresh(fresh_active)
    assert old_expired.status == "expired"
    assert fresh_active.status == "pending_otp"


def test_enrolled_college_subscription_cycle_and_renewal(client: TestClient, db_session) -> None:
    """Test subscription 30-day lifecycle for live/enrolled colleges:
    - 30-day window enables Pay button ONLY after subscription ends.
    - Paying renews the subscription for another 30 days and disables Pay button.
    """
    now = datetime.now(timezone.utc)

    # 1. Simulate an old enrolled college registered 40 days ago (expired subscription)
    old_college = College(
        name="Heritage Engineering College",
        domain="heritage.edu.in",
        status=CollegeStatus.ACTIVE,
        created_at=now - timedelta(days=40),
        subscription_status="active",
        subscription_amount=10000.00,
    )
    db_session.add(old_college)
    db_session.commit()
    db_session.refresh(old_college)

    admin = User(
        college_id=old_college.id,
        email="admin@heritage.edu.in",
        hashed_password=hash_password("Password@123"),
        user_type=UserType.ADMIN,
        is_active=True,
        is_email_verified=True,
    )
    db_session.add(admin)
    db_session.commit()

    admin_login = client.post(
        "/auth/login",
        json={"email": "admin@heritage.edu.in", "password": "Password@123"},
    )
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    # Query college info — should auto-heal dates and detect expiration
    info_res = client.get("/admin/college", headers=admin_headers)
    assert info_res.status_code == 200
    info_data = info_res.json()

    assert info_data["subscription_status"] == "expired"
    assert info_data["is_subscription_expired"] is True
    assert info_data["can_renew"] is True
    assert info_data["days_remaining"] == 0
    assert info_data["subscription_amount"] == 10000.00

    # 2. Renew subscription via payment order & verification
    order_res = client.post("/payments/subscription/create-order", headers=admin_headers, json={})
    assert order_res.status_code == 200
    order_id = order_res.json()["order_id"]

    import hmac, hashlib
    from app.core.config import settings
    sig = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        f"{order_id}|pay_test_renewal123".encode(),
        hashlib.sha256,
    ).hexdigest()

    verify_res = client.post(
        "/payments/verify",
        headers=admin_headers,
        json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": "pay_test_renewal123",
            "razorpay_signature": sig,
        },
    )
    assert verify_res.status_code == 200

    # 3. Query college info again — should now be active with can_renew disabled
    renewed_res = client.get("/admin/college", headers=admin_headers)
    assert renewed_res.status_code == 200
    renewed_data = renewed_res.json()

    assert renewed_data["subscription_status"] == "active"
    assert renewed_data["is_subscription_expired"] is False
    assert renewed_data["can_renew"] is False  # Pay button is now locked during active 30-day window!
    assert renewed_data["days_remaining"] >= 29

