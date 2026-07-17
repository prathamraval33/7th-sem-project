"""Resume Enhancer — step-by-step Q&A (target company, key projects,
achievements) then a Groq-generated improved resume, saved as a new
`source=enhanced` resume row (never a one-off download only).

ASSUMPTION: no dedicated `resume_enhancer` service/table exists in Phase 1-3
(the enhancer's Q&A state is small and fixed — 3 targeted questions — so the
frontend simply collects all 3 answers and posts them together to
`/finalize`; no server-side session state is needed between questions).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.dependencies import require_student
from app.db.session import get_db
from app.models.resume import Resume, ResumeSource
from app.models.user import User
from app.schemas.resume import ResumeResponse
from app.services import groq_client
from app.utils.file_storage import save_upload

router = APIRouter(prefix="/resume-enhancer", tags=["resume-enhancer"])

_ENHANCER_QUESTIONS = [
    {"key": "target_company", "question": "Which company/role are you targeting with this resume?"},
    {"key": "key_projects", "question": "Describe your key projects and the impact/results of each."},
    {"key": "achievements", "question": "List any notable achievements, certifications, or awards."},
]

_ENHANCER_SYSTEM_PROMPT = """You are a resume writer improving a student's resume for a specific
target company/role. Given the original resume text and the student's answers about target
company, key projects, and achievements, respond ONLY with a JSON object of the exact shape:
{"enhanced_resume_text": string} containing the full improved resume content in plain text."""


class ResumeEnhancerStartResponse(BaseModel):
    resume_id: int
    questions: list[dict]


class ResumeEnhancerFinalizeRequest(BaseModel):
    resume_id: int
    target_company: str = Field(min_length=1)
    key_projects: str = Field(min_length=1)
    achievements: str = ""
    make_active: bool = False


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


@router.post("/finalize", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def finalize_resume_enhancer(
    payload: ResumeEnhancerFinalizeRequest,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> Resume:
    original = db.get(Resume, payload.resume_id)
    if original is None or original.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Resume not found")

    user_prompt = (
        f"Original resume text:\n{original.parsed_text or '(none available)'}\n\n"
        f"Target company/role: {payload.target_company}\n"
        f"Key projects: {payload.key_projects}\n"
        f"Achievements: {payload.achievements}"
    )
    result = await groq_client.generate_json(_ENHANCER_SYSTEM_PROMPT, user_prompt)
    enhanced_text = result.get("enhanced_resume_text", "")
    if not enhanced_text:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail="The AI did not return an enhanced resume")

    relative_path = save_upload(enhanced_text.encode("utf-8"), "enhanced_resume.txt", subfolder="resumes")

    if payload.make_active:
        for existing in db.query(Resume).filter(Resume.user_id == current_user.id).all():
            existing.is_active = False

    enhanced_resume = Resume(
        user_id=current_user.id,
        file_path=relative_path,
        parsed_text=enhanced_text,
        source=ResumeSource.ENHANCED,
        is_active=payload.make_active,
    )
    db.add(enhanced_resume)
    db.commit()
    db.refresh(enhanced_resume)

    return enhanced_resume
