"""Resume Analyzer — Groq analyzes the parsed resume text for a score,
missing skills, and improvement suggestions. No dedicated service module
exists for this (Phase 3's service list doesn't include one); it's thin
enough to call `groq_client` directly here, per the master prompt's
router/service split for exactly this feature.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.dependencies import require_student
from app.db.session import get_db
from app.models.resume import Resume
from app.models.user import User
from app.services import groq_client, scoring
from sqlalchemy.orm import Session

router = APIRouter(prefix="/resume-analyzer", tags=["resume-analyzer"])

_ANALYZER_SYSTEM_PROMPT = """You are a resume reviewer for college placements. Given the parsed
text of a student's resume, respond ONLY with a JSON object of the exact shape:
{"score": number between 0 and 100, "missing_skills": [string, ...], "suggestions": [string, ...]}."""


class ResumeAnalysisResponse(BaseModel):
    resume_id: int
    score: float
    missing_skills: list[str]
    suggestions: list[str]


@router.post("/{resume_id}", response_model=ResumeAnalysisResponse)
async def analyze_resume(
    resume_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> ResumeAnalysisResponse:
    resume = db.get(Resume, resume_id)
    if resume is None or resume.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Resume not found")
    if not resume.parsed_text:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="This resume has no extracted text to analyze")

    result = await groq_client.generate_json(_ANALYZER_SYSTEM_PROMPT, resume.parsed_text)

    score = float(result.get("score", 0))
    missing_skills = result.get("missing_skills", [])
    suggestions = result.get("suggestions", [])

    resume.ai_score = score
    resume.ai_feedback = "\n".join(suggestions)
    db.commit()

    scoring.update_analytics(db, current_user.id)

    return ResumeAnalysisResponse(
        resume_id=resume.id, score=score, missing_skills=missing_skills, suggestions=suggestions
    )
