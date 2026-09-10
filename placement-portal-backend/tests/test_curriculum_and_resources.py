from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.models.college import College, CollegeStatus
from app.models.curated_subject_resource import (
    CuratedSubjectResource,
    CurationApprovalStatus,
    SubjectResourceType,
)
from app.models.curriculum_subject import CurriculumSubject
from app.models.curriculum_upload import CurriculumExtractionStatus, CurriculumUpload
from app.models.user import User, UserType


def test_curriculum_confirm_and_dynamic_branch_listing(client: TestClient, db_session) -> None:
    """Test College Admin confirms reviewed curriculum, and dynamic branches are exposed."""
    admin = User(
        college_id=1,
        email="admin_curriculum@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.ADMIN,
        is_active=True,
        is_email_verified=True,
    )
    db_session.add(admin)
    db_session.commit()

    upload = CurriculumUpload(
        college_id=1,
        uploaded_by=admin.id,
        original_filename="syllabus_2026.pdf",
        file_path="curriculum/test.pdf",
        extraction_status=CurriculumExtractionStatus.READY_FOR_REVIEW,
    )
    db_session.add(upload)
    db_session.commit()

    admin_token = create_access_token(str(admin.id), UserType.ADMIN.value, college_id=1)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Confirm curriculum with 2 branches and 3 subjects
    confirm_payload = {
        "branches": [
            {
                "name": "Artificial Intelligence & Data Science",
                "semesters": [
                    {"number": 3, "subjects": ["Linear Algebra", "Data Structures"]},
                    {"number": 4, "subjects": ["Machine Learning"]},
                ],
            },
            {
                "name": "Robotics Engineering",
                "semesters": [
                    {"number": 3, "subjects": ["Kinematics & Dynamics"]},
                ],
            },
        ]
    }

    res = client.post(f"/curriculum/uploads/{upload.id}/confirm", json=confirm_payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["total_subjects"] == 4

    # Verify branches endpoint returns the exact branches dynamically
    branches_res = client.get("/curriculum/branches", headers=headers)
    assert branches_res.status_code == 200
    branch_names = branches_res.json()["branches"]
    assert "Artificial Intelligence & Data Science" in branch_names
    assert "Robotics Engineering" in branch_names


def test_tpo_subject_prioritization_curation_and_approval(client: TestClient, db_session) -> None:
    """Test TPO prioritizes a subject, triggers curation, approves an item, and student visibility."""
    # Seed subject
    subject = CurriculumSubject(
        college_id=1,
        branch_name="Information Technology",
        semester_number=4,
        subject_name="Database Management Systems",
        is_prioritized=False,
    )
    db_session.add(subject)
    db_session.commit()

    # TPO user
    tpo = User(
        college_id=1,
        email="tpo_curr@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.TPO,
        is_active=True,
        is_email_verified=True,
    )
    db_session.add(tpo)

    # Student user
    student = User(
        college_id=1,
        email="student_curr@bvmengineering.ac.in",
        hashed_password=hash_password("Password123"),
        user_type=UserType.STUDENT,
        is_active=True,
        is_email_verified=True,
    )
    db_session.add(student)
    db_session.commit()

    tpo_token = create_access_token(str(tpo.id), UserType.TPO.value, college_id=1)
    student_token = create_access_token(str(student.id), UserType.STUDENT.value, college_id=1)

    # 1. TPO prioritizes subject
    p_res = client.post(f"/curriculum/subjects/{subject.id}/prioritize", headers={"Authorization": f"Bearer {tpo_token}"})
    assert p_res.status_code == 200
    assert p_res.json()["is_prioritized"] is True

    # 2. TPO triggers AI curation
    curate_res = client.post(f"/curriculum/subjects/{subject.id}/curate", headers={"Authorization": f"Bearer {tpo_token}"})
    assert curate_res.status_code == 200
    candidates = curate_res.json()
    assert len(candidates) >= 1
    resource_id = candidates[0]["id"]
    assert candidates[0]["approval_status"] == "pending_review"

    # 3. Student views resources -> should be EMPTY because none are approved yet
    s_view_1 = client.get(f"/curriculum/subjects/{subject.id}/resources", headers={"Authorization": f"Bearer {student_token}"})
    assert s_view_1.status_code == 200
    assert len(s_view_1.json()) == 0

    # 4. TPO reviews & approves the resource with custom summary
    rev_payload = {
        "approval_status": "approved",
        "title": "Database System Concepts (Silberschatz)",
        "ai_summary": "Standard textbook covering relational models, indexing, and ACID transactions thoroughly.",
    }
    rev_res = client.patch(f"/curriculum/resources/{resource_id}/review", json=rev_payload, headers={"Authorization": f"Bearer {tpo_token}"})
    assert rev_res.status_code == 200
    assert rev_res.json()["approval_status"] == "approved"
    assert rev_res.json()["title"] == "Database System Concepts (Silberschatz)"

    # 5. Student views resources again -> now sees the 1 approved resource!
    s_view_2 = client.get(f"/curriculum/subjects/{subject.id}/resources", headers={"Authorization": f"Bearer {student_token}"})
    assert s_view_2.status_code == 200
    assert len(s_view_2.json()) == 1
    assert s_view_2.json()[0]["title"] == "Database System Concepts (Silberschatz)"
