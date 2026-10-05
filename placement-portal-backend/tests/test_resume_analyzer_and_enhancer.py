from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.models.profile import Profile
from app.models.resume import Resume, ResumeSource
from app.models.user import User, UserType


from app.models.college_feature import CollegeFeature, FeatureRequestStatus
from app.models.feature import Feature, FeatureStatus, BillingType


def _make_student(db_session, email: str = "student@bvmengineering.ac.in", branch: str = "Mechanical Engineering") -> tuple[User, Profile]:
    feature = db_session.query(Feature).filter(Feature.code == "resume_analyzer").first()
    if not feature:
        feature = Feature(
            code="resume_analyzer",
            name="AI Resume Analyzer",
            description="Resume analysis",
            category="AI Tools",
            target_role="student",
            price=0.0,
            billing_type=BillingType.ANNUAL,
            status=FeatureStatus.ACTIVE,
        )
        db_session.add(feature)
        db_session.commit()
        db_session.refresh(feature)

    cf = db_session.query(CollegeFeature).filter(CollegeFeature.college_id == 1, CollegeFeature.feature_id == feature.id).first()
    if not cf:
        cf = CollegeFeature(
            college_id=1,
            feature_id=feature.id,
            status=FeatureRequestStatus.ACTIVE,
        )
        db_session.add(cf)
        db_session.commit()

    user = User(
        email=email,
        hashed_password=hash_password("Secret123"),
        user_type=UserType.STUDENT,
        is_active=True,
        college_id=1,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    profile = Profile(
        user_id=user.id,
        student_id="23ME001",
        full_name="Test Student",
        branch=branch,
        cgpa=8.5,
        tenth_percentage=88.0,
        twelfth_percentage=85.0,
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(profile)

    return user, profile


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token(str(user.id), user.user_type.value, college_id=user.college_id)
    return {"Authorization": f"Bearer {token}"}


def test_resume_analyzer_department_calibration(client: TestClient, db_session, monkeypatch) -> None:
    user, profile = _make_student(db_session, "mech_student@bvmengineering.ac.in", "Mechanical Engineering")

    resume = Resume(
        user_id=user.id,
        file_path="uploads/resumes/mech_sample.pdf",
        parsed_text="Designed gearbox in SolidWorks. Conducted FEA stress analysis in ANSYS, reducing weight by 14%.",
        source=ResumeSource.UPLOADED,
        is_active=True,
    )
    db_session.add(resume)
    db_session.commit()
    db_session.refresh(resume)

    captured_prompt = []

    async def fake_generate_json(system_prompt: str, user_prompt: str) -> dict:
        captured_prompt.append(system_prompt)
        return {
            "overall_score": 86.0,
            "category_scores": {
                "impact_and_metrics": 21.0,
                "technical_depth": 23.0,
                "ats_formatting": 20.0,
                "placement_readiness": 22.0,
            },
            "strengths": [
                "Quantified weight reduction metric (14%) using FEA analysis.",
                "Demonstrated industry CAD/CAE tools (SolidWorks & ANSYS).",
            ],
            "missing_skills": ["GD&T Geometric Dimensioning", "DFM (Design for Manufacturing)"],
            "critical_improvements": [
                "Include standard tolerance limits and material specifications.",
                "Highlight fabrication and testing methods for the gearbox prototype.",
            ],
            "suggested_bullet_rewrites": [
                {
                    "original": "Designed gearbox in SolidWorks.",
                    "improved": "Designed a high-torque 3-stage helical gearbox in SolidWorks, achieving 14% mass reduction while withstanding 250 Nm load.",
                }
            ],
        }

    monkeypatch.setattr("app.services.groq_client.generate_json", fake_generate_json)

    # 1. Analyze using student profile default branch (Mechanical)
    res = client.post(f"/resume-analyzer/{resume.id}", headers=_auth_headers(user))
    assert res.status_code == 200
    data = res.json()

    assert data["resume_id"] == resume.id
    assert data["score"] == 86.0
    assert data["department"] == "Mechanical Engineering"
    assert data["category_scores"]["impact_and_metrics"] == 21.0
    assert data["category_scores"]["technical_depth"] == 23.0
    assert len(data["strengths"]) == 2
    assert len(data["suggested_bullet_rewrites"]) == 1
    assert "SolidWorks" in data["suggested_bullet_rewrites"][0]["improved"]
    assert "Mechanical Engineering" in captured_prompt[-1]

    # 2. Verify cached GET analysis endpoint
    get_res = client.get(f"/resume-analyzer/{resume.id}", headers=_auth_headers(user))
    assert get_res.status_code == 200
    cached = get_res.json()
    assert cached["score"] == 86.0
    assert cached["department"] == "Mechanical Engineering"
    assert len(cached["suggested_bullet_rewrites"]) == 1

    # 3. Analyze with explicit department override (e.g. Civil Engineering)
    res_civil = client.post(
        f"/resume-analyzer/{resume.id}",
        json={"department": "Civil Engineering"},
        headers=_auth_headers(user),
    )
    assert res_civil.status_code == 200
    assert res_civil.json()["department"] == "Civil Engineering"
    assert "Civil Engineering" in captured_prompt[-1]


def test_resume_enhancer_flow(client: TestClient, db_session, monkeypatch) -> None:
    user, profile = _make_student(db_session, "civil_student@bvmengineering.ac.in", "Civil Engineering")

    resume = Resume(
        user_id=user.id,
        file_path="uploads/resumes/civil_sample.pdf",
        parsed_text="Did surveying and structural analysis. Used AutoCAD and STAAD.Pro.",
        source=ResumeSource.UPLOADED,
        is_active=True,
    )
    db_session.add(resume)
    db_session.commit()
    db_session.refresh(resume)

    # Start enhancer
    start_res = client.post(f"/resume-enhancer/start?resume_id={resume.id}", headers=_auth_headers(user))
    assert start_res.status_code == 200
    assert len(start_res.json()["questions"]) == 3

    captured_prompt = []

    async def fake_generate_json(system_prompt: str, user_prompt: str) -> dict:
        captured_prompt.append(system_prompt)
        return {
            "enhanced_resume_text": "# Civil Engineer Candidate\n\n## PROJECTS\n- Analyzed G+5 residential building in STAAD.Pro, reducing structural steel tonnage by 11% under IS 456:2000.",
            "key_changes_made": [
                "Replaced vague drafting notes with codified IS 456:2000 structural load analyses.",
                "Quantified structural steel savings by 11% using STAAD.Pro optimization.",
            ],
            "tailored_keywords_added": ["STAAD.Pro", "IS 456:2000", "Revit BIM", "Structural Steel Design"],
        }

    monkeypatch.setattr("app.services.groq_client.generate_json", fake_generate_json)

    # Finalize enhancer
    finalize_res = client.post(
        "/resume-enhancer/finalize",
        json={
            "resume_id": resume.id,
            "target_company": "L&T Construction",
            "key_projects": "Analyzed multi-story building frames and reduced steel usage.",
            "achievements": "First in department structural competition.",
            "department": "Civil Engineering",
            "make_active": True,
        },
        headers=_auth_headers(user),
    )
    assert finalize_res.status_code == 201
    fin_data = finalize_res.json()

    assert fin_data["is_active"] is True
    assert fin_data["source"] == "enhanced"
    assert fin_data["department"] == "Civil Engineering"
    assert len(fin_data["key_changes_made"]) == 2
    assert "STAAD.Pro" in fin_data["tailored_keywords_added"]
    assert "STAAD.Pro" in fin_data["enhanced_resume_text"]
    assert "Civil Engineering" in captured_prompt[-1]
    assert "L&T Construction" in captured_prompt[-1]
