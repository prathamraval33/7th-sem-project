from __future__ import annotations

from typing import Any

from app.core.security import hash_password
from app.models.otp_verification import OtpPurpose
from app.models.user import User, UserType


def _create_user(db, email: str, password: str, user_type: UserType) -> User:
    user = User(
        email=email,
        hashed_password=hash_password(password),
        user_type=user_type,
        is_active=True,
        is_email_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_openapi_includes_phase4_routes_and_schema_contracts(client) -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200
    spec = response.json()

    paths: dict[str, Any] = spec["paths"]
    assert "/auth/signup/request-otp" in paths
    assert "/auth/signup/verify-otp" in paths
    assert "/auth/signup/complete" in paths
    assert "/auth/forgot-password/request-otp" in paths
    assert "/auth/forgot-password/verify-otp" in paths
    assert "/auth/forgot-password/reset" in paths

    college_status_schema = paths["/superadmin/colleges/{college_id}/status"]["patch"]["responses"]["200"]["content"]["application/json"]["schema"]
    approve_schema = paths["/superadmin/feature-requests/{request_id}/approve"]["post"]["responses"]["200"]["content"]["application/json"]["schema"]
    analytics_schema = paths["/superadmin/analytics"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]

    assert "$ref" in college_status_schema
    assert "$ref" in approve_schema
    assert "$ref" in analytics_schema


def test_signup_otp_flow_end_to_end(client, db_session, monkeypatch) -> None:
    captured: list[dict[str, str]] = []

    async def fake_send_otp_email(to_email: str, otp: str, purpose: OtpPurpose) -> None:
        captured.append({"email": to_email, "otp": otp, "purpose": purpose.value})

    monkeypatch.setattr("app.routers.auth.email_service.send_otp_email", fake_send_otp_email)

    email = "phase4student@bvmengineering.ac.in"

    req = client.post("/auth/signup/request-otp", json={"email": email})
    assert req.status_code == 200
    assert captured and captured[-1]["email"] == email

    otp_code = captured[-1]["otp"]
    verify = client.post("/auth/signup/verify-otp", json={"email": email, "otp": otp_code})
    assert verify.status_code == 200
    signup_token = verify.json()["token"]

    complete = client.post(
        "/auth/signup/complete",
        json={
            "email": email,
            "password": "Password123",
            "signup_token": signup_token,
        },
    )
    assert complete.status_code == 200
    assert "access_token" in complete.json()
    assert "refresh_token" in complete.json()

    login = client.post("/auth/login", json={"email": email, "password": "Password123"})
    assert login.status_code == 200
    assert "access_token" in login.json()


def test_forgot_password_flow_end_to_end(client, db_session, monkeypatch) -> None:
    email = "phase4reset@example.com"
    _create_user(db_session, email=email, password="OldPassword123", user_type=UserType.STUDENT)

    captured: list[str] = []

    async def fake_send_otp_email(to_email: str, otp: str, purpose: OtpPurpose) -> None:
        captured.append(otp)

    monkeypatch.setattr("app.routers.auth.email_service.send_otp_email", fake_send_otp_email)

    request_otp = client.post("/auth/forgot-password/request-otp", json={"email": email})
    assert request_otp.status_code == 200
    assert captured

    verify = client.post("/auth/forgot-password/verify-otp", json={"email": email, "otp": captured[-1]})
    assert verify.status_code == 200
    reset_token = verify.json()["token"]

    reset = client.post(
        "/auth/forgot-password/reset",
        json={"email": email, "new_password": "NewPassword123", "reset_token": reset_token},
    )
    assert reset.status_code == 200

    login_old = client.post("/auth/login", json={"email": email, "password": "OldPassword123"})
    assert login_old.status_code == 401

    login_new = client.post("/auth/login", json={"email": email, "password": "NewPassword123"})
    assert login_new.status_code == 200


def test_role_guard_blocks_student_from_tpo_route(client, db_session) -> None:
    _create_user(
        db_session,
        email="phase4guardstudent@example.com",
        password="Password123",
        user_type=UserType.STUDENT,
    )

    login = client.post(
        "/auth/login",
        json={"email": "phase4guardstudent@example.com", "password": "Password123"},
    )
    assert login.status_code == 200

    token = login.json()["access_token"]
    denied = client.get("/tpo/dashboard/summary", headers={"Authorization": f"Bearer {token}"})
    assert denied.status_code == 403


def test_cors_allows_frontend_origin(client) -> None:
    preflight = client.options(
        "/auth/login",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert preflight.status_code == 200
    assert preflight.headers.get("access-control-allow-origin") == "http://localhost:5173"
