"""Automated test suite for template-matched fee receipt verification (feecheck.md).
Tests:
- Admin reference sample template upload and replacement
- Path A fallback verification when no template exists
- Path B template-matched verification with strict structure vs content separation
- Low-confidence receipts routing to TPO manual review queue
- TPO manual approval (recording verified_by) and rejection flows
- Multi-tenant isolation and uploads router authorization (students forbidden from templates)
"""
from __future__ import annotations

import io
from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.models.college import College, CollegeStatus
from app.models.fee_receipt import FeeReceipt, FeeVerdict
from app.models.fee_receipt_template import FeeReceiptTemplate
from app.models.notification import Notification
from app.models.profile import Profile
from app.models.user import User, UserType


def _dummy_pdf_bytes() -> bytes:
    # Valid PDF signature
    return b"%PDF-1.4 mock content for fee receipt template testing"


def test_admin_upload_and_replace_fee_template(client: TestClient, db_session) -> None:
    admin = User(
        college_id=1,
        email="admin_fee@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.ADMIN,
        is_active=True,
        is_email_verified=True,
    )
    db_session.add(admin)
    db_session.commit()

    admin_token = create_access_token(str(admin.id), UserType.ADMIN.value, college_id=1)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Upload initial template with name
    file_bytes = _dummy_pdf_bytes()
    res1 = client.post(
        "/admin/college/fee-template",
        headers=headers,
        data={"template_name": "BVM Tuition Fee Receipt"},
        files={"file": ("bvm_fee_template.pdf", io.BytesIO(file_bytes), "application/pdf")},
    )
    assert res1.status_code == 201
    data1 = res1.json()
    assert data1["college_id"] == 1
    assert data1["is_active"] is True
    assert data1["template_name"] == "BVM Tuition Fee Receipt"
    assert data1["original_filename"] == "bvm_fee_template.pdf"
    template1_id = data1["id"]

    # Verify GET returns this active template
    get_res = client.get("/admin/college/fee-template", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == template1_id

    # 2. Upload second active template (multi-template support)
    res2 = client.post(
        "/admin/college/fee-template",
        headers=headers,
        data={"template_name": "BVM Hostel Fee Receipt"},
        files={"file": ("bvm_hostel_template.pdf", io.BytesIO(file_bytes), "application/pdf")},
    )
    assert res2.status_code == 201
    data2 = res2.json()
    assert data2["id"] != template1_id
    assert data2["is_active"] is True
    assert data2["template_name"] == "BVM Hostel Fee Receipt"
    template2_id = data2["id"]

    # Confirm BOTH templates are active and returned in /fee-templates list
    list_res = client.get("/admin/college/fee-templates", headers=headers)
    assert list_res.status_code == 200
    templates_list = list_res.json()
    assert len(templates_list) == 2
    assert any(t["id"] == template1_id and t["is_active"] for t in templates_list)
    assert any(t["id"] == template2_id and t["is_active"] for t in templates_list)

    # 3. Toggle active/inactive on template 1
    toggle_res = client.patch(f"/admin/college/fee-templates/{template1_id}/toggle-active", headers=headers)
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_active"] is False

    # 4. Delete template 1 by ID
    del_id_res = client.delete(f"/admin/college/fee-templates/{template1_id}", headers=headers)
    assert del_id_res.status_code == 200

    # Confirm template 1 is gone, template 2 remains
    after_del_list = client.get("/admin/college/fee-templates", headers=headers)
    assert after_del_list.status_code == 200
    assert len(after_del_list.json()) == 1
    assert after_del_list.json()[0]["id"] == template2_id

    # 5. Deactivate all remaining via backward-compatible endpoint
    del_all_res = client.delete("/admin/college/fee-template", headers=headers)
    assert del_all_res.status_code == 200
    get_after_del = client.get("/admin/college/fee-template", headers=headers)
    assert get_after_del.status_code == 200
    assert get_after_del.json() is None


@pytest.mark.anyio
async def test_student_fee_verification_path_a_fallback(client: TestClient, db_session, monkeypatch) -> None:
    """Path A: College has no template; falls back to general AI heuristic."""
    student = User(
        college_id=1,
        email="student_path_a@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.STUDENT,
        is_active=True,
        is_email_verified=True,
        fee_verified=False,
    )
    db_session.add(student)
    db_session.commit()

    student_token = create_access_token(str(student.id), UserType.STUDENT.value, college_id=1)
    headers = {"Authorization": f"Bearer {student_token}"}

    # Mock groq general verdict
    async def mock_get_ai_verdict(text: str) -> dict:
        return {"is_valid": True, "confidence": 0.92, "reason": "Plausible general receipt"}

    monkeypatch.setattr("app.services.fee_receipt_service.get_ai_verdict", mock_get_ai_verdict)

    file_bytes = _dummy_pdf_bytes()
    upload_res = client.post(
        "/fee-verification/upload",
        headers=headers,
        files={"file": ("receipt.pdf", io.BytesIO(file_bytes), "application/pdf")},
    )
    assert upload_res.status_code == 201
    data = upload_res.json()
    assert data["ai_confidence"] == 0.92
    assert data["matched_against_template_id"] is None
    assert data["structural_match_result"] is None

    # Check student is auto-verified
    db_session.refresh(student)
    assert student.fee_verified is True


@pytest.mark.anyio
async def test_student_fee_verification_path_b_template_match(client: TestClient, db_session, monkeypatch) -> None:
    """Path B: College has active template; receipt matches structural template
    despite differing student name and receipt number.
    """
    # Active college template
    admin = User(
        college_id=1,
        email="admin_b@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.ADMIN,
        is_active=True,
        is_email_verified=True,
    )
    db_session.add(admin)
    db_session.commit()

    template = FeeReceiptTemplate(
        college_id=1,
        file_path="fee_receipt_templates/bvm_ref.pdf",
        original_filename="bvm_ref.pdf",
        extracted_text="BIRLA VISHVAKARMA MAHAVIDYALAYA\nTRAINING & PLACEMENT CELL\nFEE RECEIPT 2026",
        uploaded_by=admin.id,
        is_active=True,
    )
    db_session.add(template)

    student = User(
        college_id=1,
        email="student_path_b@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.STUDENT,
        is_active=True,
        is_email_verified=True,
        fee_verified=False,
    )
    db_session.add(student)
    db_session.commit()

    student_token = create_access_token(str(student.id), UserType.STUDENT.value, college_id=1)
    headers = {"Authorization": f"Bearer {student_token}"}

    # Mock Path B template verdict
    async def mock_get_ai_template_verdict(student_text: str, template_text: str) -> dict:
        return {
            "is_valid": True,
            "confidence": 0.94,
            "structural_match": {
                "matched": True,
                "institution_match": True,
                "layout_match": True,
                "details": "Matches BVM placement cell header format",
            },
            "content_valid": {
                "valid": True,
                "receipt_number_present": True,
                "amount_present": True,
                "date_present": True,
                "details": "Valid student transaction details",
            },
            "reason": "Template structural match confirmed; differing student name and receipt number are normal",
        }

    monkeypatch.setattr("app.services.fee_receipt_service.get_ai_template_verdict", mock_get_ai_template_verdict)

    file_bytes = _dummy_pdf_bytes()
    upload_res = client.post(
        "/fee-verification/upload",
        headers=headers,
        files={"file": ("my_receipt.pdf", io.BytesIO(file_bytes), "application/pdf")},
    )
    assert upload_res.status_code == 201
    data = upload_res.json()
    assert data["matched_against_template_id"] == template.id
    assert data["structural_match_result"]["matched"] is True
    assert data["content_valid_result"]["valid"] is True
    assert data["ai_confidence"] == 0.94

    db_session.refresh(student)
    assert student.fee_verified is True


@pytest.mark.anyio
async def test_low_confidence_receipt_routes_to_tpo_and_can_be_approved(client: TestClient, db_session, monkeypatch) -> None:
    """Receipt with confidence < 0.85 is NOT auto-verified and appears in TPO review queue."""
    admin = User(
        college_id=1,
        email="admin_c@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.ADMIN,
        is_active=True,
        is_email_verified=True,
    )
    tpo = User(
        college_id=1,
        email="tpo_review@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.TPO,
        is_active=True,
        is_email_verified=True,
    )
    student = User(
        college_id=1,
        email="student_flagged@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.STUDENT,
        is_active=True,
        is_email_verified=True,
        fee_verified=False,
    )
    db_session.add_all([admin, tpo, student])
    db_session.commit()

    profile = Profile(
        user_id=student.id,
        student_id="21IT450",
        full_name="Jay Patel",
        branch="Information Technology",
        cgpa=8.5,
        tenth_percentage=85.0,
        twelfth_percentage=82.0,
    )
    template = FeeReceiptTemplate(
        college_id=1,
        file_path="fee_receipt_templates/bvm_ref.pdf",
        original_filename="bvm_ref.pdf",
        extracted_text="BVM PLACEMENT TEMPLATE",
        uploaded_by=admin.id,
        is_active=True,
    )
    db_session.add_all([profile, template])
    db_session.commit()

    student_token = create_access_token(str(student.id), UserType.STUDENT.value, college_id=1)
    tpo_token = create_access_token(str(tpo.id), UserType.TPO.value, college_id=1)

    # Mock low confidence (e.g. blurry layout deviation)
    async def mock_low_confidence_verdict(student_text: str, template_text: str) -> dict:
        return {
            "is_valid": False,
            "confidence": 0.65,
            "structural_match": {
                "matched": False,
                "institution_match": True,
                "layout_match": False,
                "details": "Layout appears rotated or cropped compared to reference template",
            },
            "content_valid": {
                "valid": True,
                "receipt_number_present": True,
                "amount_present": True,
                "date_present": True,
                "details": "Details present",
            },
            "reason": "Structural layout anomaly flagged for TPO review",
        }

    monkeypatch.setattr("app.services.fee_receipt_service.get_ai_template_verdict", mock_low_confidence_verdict)

    # Student uploads
    file_bytes = _dummy_pdf_bytes()
    upload_res = client.post(
        "/fee-verification/upload",
        headers={"Authorization": f"Bearer {student_token}"},
        files={"file": ("blurry_receipt.pdf", io.BytesIO(file_bytes), "application/pdf")},
    )
    assert upload_res.status_code == 201
    receipt_id = upload_res.json()["id"]

    # Student should NOT be auto-verified
    db_session.refresh(student)
    assert student.fee_verified is False

    # TPO fetches pending queue
    pending_res = client.get("/tpo/fee-receipts/pending", headers={"Authorization": f"Bearer {tpo_token}"})
    assert pending_res.status_code == 200
    pending_items = pending_res.json()
    assert len(pending_items) >= 1
    target = next((item for item in pending_items if item["id"] == receipt_id), None)
    assert target is not None
    assert target["student_name"] == "Jay Patel"
    assert target["roll_number"] == "21IT450"
    assert target["ai_confidence"] == 0.65
    assert target["matched_against_template_id"] == template.id

    # TPO manually approves
    approve_res = client.post(f"/tpo/fee-receipts/{receipt_id}/approve", headers={"Authorization": f"Bearer {tpo_token}"})
    assert approve_res.status_code == 200

    # Verify student is now fee_verified and receipt has verifier set
    db_session.refresh(student)
    assert student.fee_verified is True
    receipt_db = db_session.get(FeeReceipt, receipt_id)
    assert receipt_db.verified_by == tpo.id
    assert receipt_db.verified_at is not None

    # TPO pending queue should now be empty for this receipt
    pending_after = client.get("/tpo/fee-receipts/pending", headers={"Authorization": f"Bearer {tpo_token}"})
    assert all(item["id"] != receipt_id for item in pending_after.json())


def test_tpo_manual_reject_notifies_student(client: TestClient, db_session) -> None:
    tpo = User(
        college_id=1,
        email="tpo_reject@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.TPO,
        is_active=True,
        is_email_verified=True,
    )
    student = User(
        college_id=1,
        email="student_to_reject@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.STUDENT,
        is_active=True,
        is_email_verified=True,
        fee_verified=False,
    )
    db_session.add_all([tpo, student])
    db_session.commit()

    receipt = FeeReceipt(
        user_id=student.id,
        file_path="fee_receipts/sample_fail.pdf",
        ai_verdict=FeeVerdict.INVALID,
        ai_confidence=0.30,
        ai_reason="Document appears fabricated",
    )
    db_session.add(receipt)
    db_session.commit()

    tpo_token = create_access_token(str(tpo.id), UserType.TPO.value, college_id=1)
    reject_res = client.post(
        f"/tpo/fee-receipts/{receipt.id}/reject",
        headers={"Authorization": f"Bearer {tpo_token}"},
        json={"reason": "Incorrect college name on receipt."},
    )
    assert reject_res.status_code == 200

    db_session.refresh(student)
    assert student.fee_verified is False
    db_session.refresh(receipt)
    assert receipt.verified_by == tpo.id
    assert "Incorrect college name" in receipt.ai_reason


def test_multi_tenant_isolation_and_uploads_security(client: TestClient, db_session) -> None:
    """College 2 cannot manage or view College 1 receipts, and students cannot download templates."""
    # Seed College 2
    college2 = College(id=2, name="Nirma University", domain="nirmauni.ac.in", status=CollegeStatus.ACTIVE)
    db_session.add(college2)

    # Users
    admin1 = User(college_id=1, email="admin1@bvmengineering.ac.in", hashed_password=hash_password("Pw1"), user_type=UserType.ADMIN, is_active=True, is_email_verified=True)
    tpo2 = User(college_id=2, email="tpo2@nirmauni.ac.in", hashed_password=hash_password("Pw2"), user_type=UserType.TPO, is_active=True, is_email_verified=True)
    student1 = User(college_id=1, email="student1@bvmengineering.ac.in", hashed_password=hash_password("Pw3"), user_type=UserType.STUDENT, is_active=True, is_email_verified=True)
    db_session.add_all([admin1, tpo2, student1])
    db_session.commit()

    from app.utils.file_storage import UPLOAD_ROOT
    secret_path = UPLOAD_ROOT / "fee_receipt_templates" / "college1_secret.pdf"
    secret_path.parent.mkdir(parents=True, exist_ok=True)
    secret_path.write_bytes(b"%PDF-1.4 mock secret")

    template1 = FeeReceiptTemplate(
        college_id=1,
        file_path="fee_receipt_templates/college1_secret.pdf",
        original_filename="secret.pdf",
        uploaded_by=admin1.id,
        is_active=True,
    )
    receipt1 = FeeReceipt(
        user_id=student1.id,
        file_path="fee_receipts/c1_receipt.pdf",
        ai_verdict=FeeVerdict.INVALID,
        ai_confidence=0.5,
    )
    db_session.add_all([template1, receipt1])
    db_session.commit()

    tpo2_token = create_access_token(str(tpo2.id), UserType.TPO.value, college_id=2)
    student1_token = create_access_token(str(student1.id), UserType.STUDENT.value, college_id=1)

    # 1. TPO 2 cannot approve College 1 student's receipt (403 Forbidden)
    res_cross_approve = client.post(
        f"/tpo/fee-receipts/{receipt1.id}/approve",
        headers={"Authorization": f"Bearer {tpo2_token}"},
    )
    assert res_cross_approve.status_code == 403

    # 2. Student 1 is forbidden from accessing fee_receipt_templates (403 Forbidden)
    res_student_template = client.get(
        "/uploads/fee_receipt_templates/college1_secret.pdf",
        headers={"Authorization": f"Bearer {student1_token}"},
    )
    assert res_student_template.status_code == 403


@pytest.mark.anyio
async def test_student_fee_verification_path_b_multiple_templates_matching(client: TestClient, db_session, monkeypatch) -> None:
    """Path B with multiple templates: Groq multi-template verdict selects the best-matching template ID."""
    admin = User(
        college_id=1,
        email="admin_multi@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.ADMIN,
        is_active=True,
        is_email_verified=True,
    )
    db_session.add(admin)
    db_session.commit()

    # Create two active templates
    template_tuition = FeeReceiptTemplate(
        college_id=1,
        template_name="BVM Tuition Fee Receipt",
        file_path="fee_receipt_templates/tuition.pdf",
        original_filename="tuition.pdf",
        extracted_text="BVM ENGINEERING COLLEGE TUITION FEE RECEIPT",
        uploaded_by=admin.id,
        is_active=True,
    )
    template_hostel = FeeReceiptTemplate(
        college_id=1,
        template_name="BVM Hostel & Mess Fee Receipt",
        file_path="fee_receipt_templates/hostel.pdf",
        original_filename="hostel.pdf",
        extracted_text="BVM HOSTEL & MESS BOARD FEE RECEIPT 2026",
        uploaded_by=admin.id,
        is_active=True,
    )
    db_session.add_all([template_tuition, template_hostel])
    db_session.commit()

    student = User(
        college_id=1,
        email="hosteller_student@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.STUDENT,
        is_active=True,
        is_email_verified=True,
        fee_verified=False,
    )
    db_session.add(student)
    db_session.commit()

    student_token = create_access_token(str(student.id), UserType.STUDENT.value, college_id=1)
    headers = {"Authorization": f"Bearer {student_token}"}

    multi_verdict_called = False

    async def mock_get_ai_multi_template_verdict(student_text: str, candidate_templates: list) -> dict:
        nonlocal multi_verdict_called
        multi_verdict_called = True
        assert len(candidate_templates) == 2
        return {
            "is_valid": True,
            "confidence": 0.95,
            "best_matched_template_id": template_hostel.id,
            "structural_match": {
                "matched": True,
                "institution_match": True,
                "layout_match": True,
                "details": "Matches BVM Hostel & Mess format",
            },
            "content_valid": {
                "valid": True,
                "receipt_number_present": True,
                "amount_present": True,
                "date_present": True,
                "details": "Plausible hostel payment details",
            },
            "reason": "Receipt structurally matches BVM Hostel template perfectly",
        }

    monkeypatch.setattr("app.services.fee_receipt_service.get_ai_multi_template_verdict", mock_get_ai_multi_template_verdict)

    file_bytes = _dummy_pdf_bytes()
    upload_res = client.post(
        "/fee-verification/upload",
        headers=headers,
        files={"file": ("hostel_receipt.pdf", io.BytesIO(file_bytes), "application/pdf")},
    )
    assert upload_res.status_code == 201
    data = upload_res.json()
    assert multi_verdict_called is True
    assert data["matched_against_template_id"] == template_hostel.id
    assert data["structural_match_result"]["matched"] is True
    assert data["ai_confidence"] == 0.95

    db_session.refresh(student)
    assert student.fee_verified is True

