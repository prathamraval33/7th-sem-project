from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.models.college import College, CollegeStatus
from app.models.custom_feature_request import CustomFeatureRequest, CustomFeatureStatus
from app.models.notification import Notification, NotificationType
from app.models.user import User, UserType


def _make_user(db_session, email: str, role: UserType, college_id: int | None = 1) -> User:
    user = User(
        email=email,
        hashed_password=hash_password("Secret123"),
        user_type=role,
        is_active=True,
        college_id=college_id,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token(str(user.id), user.user_type.value, college_id=user.college_id)
    return {"Authorization": f"Bearer {token}"}



def test_submit_custom_feature_request_success(client: TestClient, db_session) -> None:
    """College Admin can submit a custom feature proposal with valid payload."""
    admin = _make_user(db_session, "admin@bvmengineering.ac.in", UserType.ADMIN, college_id=1)
    superadmin = _make_user(db_session, "superadmin@platform.internal", UserType.SUPERADMIN, college_id=None)

    payload = {
        "title": "AI Coding Sandbox",
        "description": "An interactive in-browser compiler for Python, Java, and C++ screening rounds.",
        "target_user": "student",
        "category": "Assessments",
        "priority": "high",
    }

    res = client.post("/admin/custom-features", json=payload, headers=_auth_headers(admin))
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == payload["title"]
    assert data["description"] == payload["description"]
    assert data["target_user"] == "student"
    assert data["category"] == "Assessments"
    assert data["priority"] == "high"
    assert data["status"] == "pending"
    assert data["college_id"] == 1
    assert data["college_name"] == "Birla Vishvakarma Mahavidyalaya (BVM)"
    assert data["admin_email"] == admin.email

    # Verify notification dispatched to SuperAdmin
    notif = db_session.query(Notification).filter(Notification.recipient_id == superadmin.id).first()
    assert notif is not None
    assert notif.type == NotificationType.FEATURE_REQUEST_RECEIVED
    assert "submitted custom feature proposal" in notif.message


def test_submit_custom_feature_request_validation(client: TestClient, db_session) -> None:
    """Validation rejects short titles and descriptions."""
    admin = _make_user(db_session, "admin@bvmengineering.ac.in", UserType.ADMIN, college_id=1)

    # Title too short (< 3 chars)
    res1 = client.post(
        "/admin/custom-features",
        json={"title": "AI", "description": "This is a detailed description of the feature request."},
        headers=_auth_headers(admin),
    )
    assert res1.status_code == 422

    # Description too short (< 10 chars)
    res2 = client.post(
        "/admin/custom-features",
        json={"title": "Valid Title", "description": "Too short"},
        headers=_auth_headers(admin),
    )
    assert res2.status_code == 422


def test_custom_feature_requests_multi_tenant_isolation(client: TestClient, db_session) -> None:
    """College Admins can only see custom feature proposals from their own college."""
    # College 1
    admin1 = _make_user(db_session, "admin1@bvmengineering.ac.in", UserType.ADMIN, college_id=1)

    # College 2
    college2 = College(name="Dharmsinh Desai University", domain="ddu.ac.in", status=CollegeStatus.ACTIVE)
    db_session.add(college2)
    db_session.commit()
    db_session.refresh(college2)
    admin2 = _make_user(db_session, "admin2@ddu.ac.in", UserType.ADMIN, college_id=college2.id)

    # Submit proposal for College 1
    res1 = client.post(
        "/admin/custom-features",
        json={"title": "College 1 Unique Tool", "description": "Custom analytics dashboard for College 1."},
        headers=_auth_headers(admin1),
    )
    assert res1.status_code == 201

    # Submit proposal for College 2
    res2 = client.post(
        "/admin/custom-features",
        json={"title": "College 2 Unique Tool", "description": "Custom attendance tracking for College 2."},
        headers=_auth_headers(admin2),
    )
    assert res2.status_code == 201

    # Admin 1 sees only College 1 proposal
    list1 = client.get("/admin/custom-features", headers=_auth_headers(admin1))
    assert list1.status_code == 200
    data1 = list1.json()
    assert len(data1) == 1
    assert data1[0]["title"] == "College 1 Unique Tool"

    # Admin 2 sees only College 2 proposal
    list2 = client.get("/admin/custom-features", headers=_auth_headers(admin2))
    assert list2.status_code == 200
    data2 = list2.json()
    assert len(data2) == 1
    assert data2[0]["title"] == "College 2 Unique Tool"


def test_superadmin_list_and_update_custom_feature_request(client: TestClient, db_session) -> None:
    """SuperAdmin can view proposals across colleges and update status with feedback."""
    admin = _make_user(db_session, "admin@bvmengineering.ac.in", UserType.ADMIN, college_id=1)
    superadmin = _make_user(db_session, "superadmin@platform.internal", UserType.SUPERADMIN, college_id=None)

    # Admin creates proposal
    p_res = client.post(
        "/admin/custom-features",
        json={"title": "Resume Video Pitch", "description": "Allow students to attach 60-second video introductions."},
        headers=_auth_headers(admin),
    )
    assert p_res.status_code == 201
    prop_id = p_res.json()["id"]

    # SuperAdmin lists all proposals
    list_res = client.get("/superadmin/custom-features", headers=_auth_headers(superadmin))
    assert list_res.status_code == 200
    props = list_res.json()
    assert any(p["id"] == prop_id for p in props)

    # SuperAdmin updates status and provides feedback
    patch_payload = {
        "status": "planned",
        "superadmin_feedback": "Scheduled for implementation in Q4 sprint. Thanks for the suggestion!",
    }
    patch_res = client.patch(
        f"/superadmin/custom-features/{prop_id}",
        json=patch_payload,
        headers=_auth_headers(superadmin),
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["status"] == "planned"
    assert updated["superadmin_feedback"] == patch_payload["superadmin_feedback"]

    # Verify notification sent to College Admin
    notif = (
        db_session.query(Notification)
        .filter(
            Notification.recipient_id == admin.id,
            Notification.type == NotificationType.FEATURE_REQUEST_DECIDED,
        )
        .first()
    )
    assert notif is not None
    assert "updated to 'planned'" in notif.message
    assert "Scheduled for implementation in Q4 sprint" in notif.message


def test_role_guards_block_unauthorized_users(client: TestClient, db_session) -> None:
    """Students and TPOs cannot access custom feature request endpoints."""
    student = _make_user(db_session, "student@bvmengineering.ac.in", UserType.STUDENT, college_id=1)
    tpo = _make_user(db_session, "tpo@bvmengineering.ac.in", UserType.TPO, college_id=1)

    # Student blocked from admin endpoint
    s_res = client.post(
        "/admin/custom-features",
        json={"title": "Student Tool", "description": "Description of the student tool proposal."},
        headers=_auth_headers(student),
    )
    assert s_res.status_code == 403

    # TPO blocked from superadmin endpoint
    t_res = client.get("/superadmin/custom-features", headers=_auth_headers(tpo))
    assert t_res.status_code == 403
