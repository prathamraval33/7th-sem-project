import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_student
from app.core.feature_gating import require_feature
from app.db.session import get_db
from app.models.profile import Profile
from app.models.resume import Resume, ResumeSource
from app.models.user import User
from app.schemas.resume import ResumeResponse
from app.services import groq_client
from app.utils.file_storage import save_upload

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/resume-enhancer",
    tags=["resume-enhancer"],
    dependencies=[Depends(require_feature("resume_analyzer"))],
)

_ENHANCER_QUESTIONS = [
    {"key": "target_company", "question": "Which company/role are you targeting with this resume?"},
    {"key": "key_projects", "question": "Describe your key projects and the impact/results of each."},
    {"key": "achievements", "question": "List any notable achievements, certifications, or awards."},
]

_ENHANCER_SYSTEM_PROMPT = """You are a world-class campus recruitment resume editor and ATS optimization specialist for {department} engineering students.

Your task is to re-write and elevate the student's resume for their target company/role: "{target_company}".
The student has provided their core project outcomes:
"{key_projects}"
and achievements/certifications:
"{achievements}".

CALIBRATION & ATS RULES:
1. Google's X-Y-Z Formula:
   Every single bullet point under Projects and Experience MUST strictly follow: "Accomplished [X], measured by [Y], by doing [Z]" with quantifiable metrics, scale, latency/efficiency gains, or deliverables.
2. Domain Relevance for {department}:
   - For Computer/IT: Highlight software architecture, tech stack (frameworks, databases, cloud, APIs), algorithms, and engineering metrics.
   - For Mechanical: Highlight CAD/FEA simulation, SolidWorks/ANSYS/AutoCAD, GD&T, manufacturing processes, thermal/structural testing, and prototyping metrics.
   - For Electrical/Electronics: Highlight microcontrollers (STM32/ESP32/Arduino), RTOS, embedded C/C++, IoT, circuit simulation, PCB design, MATLAB/Simulink.
   - For Civil: Highlight structural analysis (STAAD.Pro, ETABS), BIM/Revit/AutoCAD, surveying, IS codes, project estimation, and construction metrics.
   - For Other/General: Emphasize core engineering methodologies, safety compliance, quality assurance, and quantified impact.
3. Clean Single-Column ATS Markdown Structure:
   Generate full Markdown with standard section headings:
   - # [Candidate Name or "CANDIDATE NAME"]
   - Contact line: Email | Phone | LinkedIn | GitHub/Portfolio | Location
   - ## PROFESSIONAL SUMMARY (2-3 concise lines aligned with {target_company})
   - ## TECHNICAL SKILLS (categorized into domain-specific categories)
   - ## PROJECTS (Project Title | Tech/Tools Used, followed by strong X-Y-Z bullet points)
   - ## WORK EXPERIENCE / INTERNSHIPS (if mentioned, otherwise capstone/academic projects)
   - ## EDUCATION (Degree, Institute, Graduation Year, CGPA/Percentage)
   - ## CERTIFICATIONS & ACHIEVEMENTS

Respond ONLY with a valid JSON object of this exact shape:
{{
  "enhanced_resume_text": "Full ATS-compliant Markdown string with all sections and X-Y-Z bullets",
  "key_changes_made": [
    "Transformed passive project bullet points into Google X-Y-Z format with quantified impact metrics.",
    "Restructured technical skills into ATS-friendly categories tailored for {department}.",
    "Added targeted keywords matching recruiter search terms for {target_company}."
  ],
  "tailored_keywords_added": ["Keyword1", "Keyword2", "Keyword3", "Keyword4", "Keyword5"]
}}"""


class ResumeEnhancerStartResponse(BaseModel):
    resume_id: int
    questions: list[dict]


class ResumeEnhancerFinalizeRequest(BaseModel):
    resume_id: int
    target_company: str = Field(min_length=1)
    key_projects: str = Field(min_length=1)
    achievements: str = ""
    department: Optional[str] = None
    make_active: bool = False


class ResumeEnhancerFinalizeResponse(ResumeResponse):
    enhanced_resume_text: str = ""
    key_changes_made: list[str] = []
    tailored_keywords_added: list[str] = []
    department: str = ""


@router.post("/start", response_model=ResumeEnhancerStartResponse)
def start_resume_enhancer(
    resume_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> ResumeEnhancerStartResponse:
    resume = db.get(Resume, resume_id)
    if resume is None or resume.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Resume not found")

    return ResumeEnhancerStartResponse(resume_id=resume.id, questions=_ENHANCER_QUESTIONS)


@router.post("/finalize", response_model=ResumeEnhancerFinalizeResponse, status_code=status.HTTP_201_CREATED)
async def finalize_resume_enhancer(
    payload: ResumeEnhancerFinalizeRequest,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> ResumeEnhancerFinalizeResponse:
    original = db.get(Resume, payload.resume_id)
    if original is None or original.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Resume not found")

    profile = db.scalar(select(Profile).where(Profile.user_id == current_user.id))
    department = (
        (payload.department if payload.department else None)
        or (profile.branch if profile and profile.branch else "Computer Engineering")
    )

    system_prompt = _ENHANCER_SYSTEM_PROMPT.format(
        department=department,
        target_company=payload.target_company,
        key_projects=payload.key_projects,
        achievements=payload.achievements or "None specified",
    )

    user_prompt = f"Original resume text to enhance:\n{original.parsed_text or '(none available)'}"
    result = await groq_client.generate_json(system_prompt, user_prompt[:4000])

    enhanced_text = result.get("enhanced_resume_text", "")
    if not enhanced_text:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail="The AI did not return an enhanced resume")

    key_changes = result.get("key_changes_made") or [
        f"Optimized resume structure for {department} campus placement drives.",
        f"Aligned project descriptions with {payload.target_company} expectations using X-Y-Z bullet points.",
        "Formatted technical skills into clean, ATS-scannable categories.",
    ]
    keywords = result.get("tailored_keywords_added") or []

    relative_path = save_upload(enhanced_text.encode("utf-8"), "enhanced_resume.txt", subfolder="resumes")

    if payload.make_active:
        for existing in db.query(Resume).filter(Resume.user_id == current_user.id).all():
            existing.is_active = False

    feedback_meta = {
        "department": department,
        "target_company": payload.target_company,
        "key_changes_made": key_changes,
        "tailored_keywords_added": keywords,
    }

    enhanced_resume = Resume(
        user_id=current_user.id,
        file_path=relative_path,
        parsed_text=enhanced_text,
        source=ResumeSource.ENHANCED,
        is_active=payload.make_active,
        ai_feedback=json.dumps(feedback_meta),
    )
    db.add(enhanced_resume)
    db.commit()
    db.refresh(enhanced_resume)

    return ResumeEnhancerFinalizeResponse(
        id=enhanced_resume.id,
        user_id=enhanced_resume.user_id,
        file_path=enhanced_resume.file_path,
        parsed_text=enhanced_resume.parsed_text,
        ai_score=enhanced_resume.ai_score,
        ai_feedback=enhanced_resume.ai_feedback,
        source=enhanced_resume.source,
        is_active=enhanced_resume.is_active,
        created_at=enhanced_resume.created_at,
        enhanced_resume_text=enhanced_text,
        key_changes_made=key_changes,
        tailored_keywords_added=keywords,
        department=department,
    )

