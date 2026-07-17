"""Resume upload (parsed via resume_parser.py), history listing, and the
"make active" toggle. Only one resume per student may be `is_active`.
"""
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_student
from app.db.session import get_db
from app.models.resume import Resume, ResumeSource
from app.models.user import User
from app.schemas.resume import ResumeResponse
from app.services import resume_parser, scoring
from app.utils.exceptions import FileValidationError
from app.utils.file_storage import RESUME_EXTENSIONS, save_upload, validate_file

router = APIRouter(prefix="/student", tags=["resume"])


@router.post("/resume", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> Resume:
    file_bytes = await file.read()
    try:
        validate_file(file.filename, len(file_bytes), RESUME_EXTENSIONS)
    except FileValidationError as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=error.message) from error

    relative_path = save_upload(file_bytes, file.filename, subfolder="resumes")
    parsed_text = resume_parser.extract_resume_text(relative_path)

    # First resume for a student becomes active automatically.
    has_existing = db.scalar(select(Resume).where(Resume.user_id == current_user.id)) is not None

    resume = Resume(
        user_id=current_user.id,
        file_path=relative_path,
        parsed_text=parsed_text or None,
        source=ResumeSource.UPLOADED,
        is_active=not has_existing,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    scoring.update_analytics(db, current_user.id)

    return resume


@router.get("/resumes", response_model=list[ResumeResponse])
def list_resumes(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> list[Resume]:
    return list(
        db.scalars(
            select(Resume).where(Resume.user_id == current_user.id).order_by(Resume.created_at.desc())
        ).all()
    )


@router.patch("/resumes/{resume_id}/activate", response_model=ResumeResponse)
def activate_resume(
    resume_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> Resume:
    resume = db.get(Resume, resume_id)
    if resume is None or resume.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Resume not found")

    other_resumes = db.scalars(
        select(Resume).where(Resume.user_id == current_user.id, Resume.id != resume_id)
    ).all()
    for other in other_resumes:
        other.is_active = False

    resume.is_active = True
    db.commit()
    db.refresh(resume)

    return resume
