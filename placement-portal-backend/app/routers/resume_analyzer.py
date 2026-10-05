"""Resume Analyzer — Groq analyzes parsed resume text using a calibrated,
department-aware 4-pillar 100-point rubric (Impact, Technical Depth, ATS Formatting,
and Placement Readiness), solving mode collapse and generating actionable before/after rewrites.
"""
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_student
from app.core.feature_gating import require_feature
from app.db.session import get_db
from app.models.profile import Profile
from app.models.resume import Resume
from app.models.user import User
from app.services import groq_client, scoring

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/resume-analyzer",
    tags=["resume-analyzer"],
    dependencies=[Depends(require_feature("resume_analyzer"))],
)

_ANALYZER_SYSTEM_PROMPT = """You are an elite campus placement resume evaluator and technical recruiter specializing in {department} engineering placements.

Evaluate the candidate's resume strictly against the following 100-point rubric across four 25-point categories, calibrated specifically for {department}:

1. IMPACT & METRICS (0-25 pts):
   - 20-25: Bullet points consistently use Google's X-Y-Z formula ("Accomplished [X], measured by [Y], by doing [Z]") with concrete numbers, percentages, efficiency gains, user counts, latency reductions, or measurable deliverables.
   - 12-19: Projects have results described, but few quantifiable metrics or scale indicators.
   - 0-11: Passive descriptions ("worked on", "responsible for", "assisted with") with zero numbers or measurable outcomes.

2. TECHNICAL DEPTH & DOMAIN SKILLS (0-25 pts) — Calibrated for {department}:
   - For Computer/IT: Modern software stack (e.g. React, FastAPI, PostgreSQL, Docker, Redis, DSA, Cloud) demonstrated in project architecture.
   - For Mechanical: Core design/analysis tools (e.g. SolidWorks, AutoCAD, ANSYS, MATLAB), manufacturing, thermodynamics, FEA, or prototype fabrication.
   - For Electrical/Electronics: Embedded C/C++, microcontrollers (STM32/ESP32/Arduino), IoT, PCB design, MATLAB/Simulink, VLSI, or power systems.
   - For Civil: Structural analysis & drafting tools (e.g. AutoCAD, Revit, STAAD.Pro, ETABS), surveying, project estimation, or concrete testing.
   - For Other/General: Industry-standard engineering tools, methodologies, and technical complexity relevant to the field.
   - 20-25: Deep, hands-on application of advanced domain tools and design concepts.
   - 12-19: Basic academic tools or coursework-level exposure with limited practical complexity.
   - 0-11: Vague keyword lists with no evidence of actual application in projects.

3. ATS & STRUCTURAL FORMATTING (0-25 pts):
   - 20-25: Clean standard headings, active strong verbs, consistent bullet formatting, contact info, GitHub/LinkedIn/portfolio links present, single-column ATS readable.
   - 12-19: Readable but has inconsistencies in tense, bullet lengths, or missing professional links.
   - 0-11: Cluttered, spelling mistakes, walls of text instead of bullets, missing essential contact details.

4. PLACEMENT & RELEVANCE (0-25 pts):
   - 20-25: Stands out for top campus placement drives (hackathons/competitions, genuine internships, complex capstone projects, leadership/certifications).
   - 12-19: Standard college resume suitable for mass recruitment drives.
   - 0-11: Generic starter templates with no distinguishing achievements or depth.

SCORING RULES:
- Be strict, realistic, and objective. Do NOT default to a median score of 75-80. Resumes must earn their score based on actual evidence.
- The overall_score MUST be the exact sum of the four category scores: overall_score = impact_and_metrics + technical_depth + ats_formatting + placement_readiness.

Respond ONLY with a valid JSON object of this exact shape:
{{
  "overall_score": number between 0 and 100,
  "category_scores": {{
    "impact_and_metrics": number between 0 and 25,
    "technical_depth": number between 0 and 25,
    "ats_formatting": number between 0 and 25,
    "placement_readiness": number between 0 and 25
  }},
  "strengths": [string, string],
  "missing_skills": [string, ...],
  "critical_improvements": [string, ...],
  "suggested_bullet_rewrites": [
    {{
      "original": string,
      "improved": string
    }}
  ]
}}"""


class CategoryScores(BaseModel):
    impact_and_metrics: float = 0.0
    technical_depth: float = 0.0
    ats_formatting: float = 0.0
    placement_readiness: float = 0.0


class BulletRewrite(BaseModel):
    original: str
    improved: str


class ResumeAnalysisRequest(BaseModel):
    department: Optional[str] = None


class ResumeAnalysisResponse(BaseModel):
    resume_id: int
    score: float
    department: str = "General Engineering"
    category_scores: CategoryScores
    strengths: list[str] = []
    missing_skills: list[str] = []
    critical_improvements: list[str] = []
    suggested_bullet_rewrites: list[BulletRewrite] = []
    suggestions: list[str] = []


@router.post("/{resume_id}", response_model=ResumeAnalysisResponse)
async def analyze_resume(
    resume_id: int,
    payload: Optional[ResumeAnalysisRequest] = None,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> ResumeAnalysisResponse:
    resume = db.get(Resume, resume_id)
    if resume is None or resume.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Resume not found")
    if not resume.parsed_text:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="This resume has no extracted text to analyze")

    profile = db.scalar(select(Profile).where(Profile.user_id == current_user.id))
    department = (
        (payload.department if payload and payload.department else None)
        or (profile.branch if profile and profile.branch else "Computer Engineering")
    )

    system_prompt = _ANALYZER_SYSTEM_PROMPT.format(department=department)
    result = await groq_client.generate_json(system_prompt, resume.parsed_text[:4000])

    raw_cat = result.get("category_scores") or {}
    impact = min(25.0, max(0.0, float(raw_cat.get("impact_and_metrics", 0))))
    tech = min(25.0, max(0.0, float(raw_cat.get("technical_depth", 0))))
    ats = min(25.0, max(0.0, float(raw_cat.get("ats_formatting", 0))))
    placement = min(25.0, max(0.0, float(raw_cat.get("placement_readiness", 0))))

    calculated_score = round(impact + tech + ats + placement, 1)
    overall_score = calculated_score if calculated_score > 0 else float(result.get("overall_score", 0))
    overall_score = round(min(100.0, max(0.0, overall_score)), 1)

    strengths = result.get("strengths") or []
    missing_skills = result.get("missing_skills") or []
    critical_improvements = result.get("critical_improvements") or []
    raw_rewrites = result.get("suggested_bullet_rewrites") or []
    bullet_rewrites = []
    for rw in raw_rewrites:
        if isinstance(rw, dict) and rw.get("original") and rw.get("improved"):
            bullet_rewrites.append(BulletRewrite(original=rw["original"], improved=rw["improved"]))

    category_scores = CategoryScores(
        impact_and_metrics=impact,
        technical_depth=tech,
        ats_formatting=ats,
        placement_readiness=placement,
    )

    resume.ai_score = overall_score
    feedback_payload = {
        "department": department,
        "category_scores": category_scores.model_dump(),
        "strengths": strengths,
        "missing_skills": missing_skills,
        "critical_improvements": critical_improvements,
        "suggested_bullet_rewrites": [rw.model_dump() for rw in bullet_rewrites],
    }
    resume.ai_feedback = json.dumps(feedback_payload)
    db.commit()

    scoring.update_analytics(db, current_user.id)

    return ResumeAnalysisResponse(
        resume_id=resume.id,
        score=overall_score,
        department=department,
        category_scores=category_scores,
        strengths=strengths,
        missing_skills=missing_skills,
        critical_improvements=critical_improvements,
        suggested_bullet_rewrites=bullet_rewrites,
        suggestions=critical_improvements,
    )


@router.get("/{resume_id}", response_model=Optional[ResumeAnalysisResponse])
def get_resume_analysis(
    resume_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> Optional[ResumeAnalysisResponse]:
    resume = db.get(Resume, resume_id)
    if resume is None or resume.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Resume not found")
    if not resume.ai_score or not resume.ai_feedback:
        return None

    try:
        data = json.loads(resume.ai_feedback)
        cat_data = data.get("category_scores", {})
        category_scores = CategoryScores(
            impact_and_metrics=float(cat_data.get("impact_and_metrics", 0)),
            technical_depth=float(cat_data.get("technical_depth", 0)),
            ats_formatting=float(cat_data.get("ats_formatting", 0)),
            placement_readiness=float(cat_data.get("placement_readiness", 0)),
        )
        bullet_rewrites = [
            BulletRewrite(original=rw.get("original", ""), improved=rw.get("improved", ""))
            for rw in data.get("suggested_bullet_rewrites", [])
            if isinstance(rw, dict)
        ]
        return ResumeAnalysisResponse(
            resume_id=resume.id,
            score=resume.ai_score,
            department=data.get("department", "General Engineering"),
            category_scores=category_scores,
            strengths=data.get("strengths", []),
            missing_skills=data.get("missing_skills", []),
            critical_improvements=data.get("critical_improvements", []),
            suggested_bullet_rewrites=bullet_rewrites,
            suggestions=data.get("critical_improvements", []),
        )
    except Exception:
        lines = [line.strip() for line in resume.ai_feedback.split("\n") if line.strip()]
        return ResumeAnalysisResponse(
            resume_id=resume.id,
            score=resume.ai_score,
            department="General Engineering",
            category_scores=CategoryScores(
                impact_and_metrics=round(resume.ai_score * 0.25, 1),
                technical_depth=round(resume.ai_score * 0.25, 1),
                ats_formatting=round(resume.ai_score * 0.25, 1),
                placement_readiness=round(resume.ai_score * 0.25, 1),
            ),
            strengths=["Established college candidate profile."],
            missing_skills=[],
            critical_improvements=lines,
            suggested_bullet_rewrites=[],
            suggestions=lines,
        )
