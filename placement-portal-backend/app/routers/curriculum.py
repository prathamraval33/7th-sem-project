"""Curriculum and AI study resources router.

Endpoints for:
- College Admin: Upload syllabus PDF, view extracted draft, confirm curriculum structure.
- TPO & Admin: Prioritize market-trend subjects, trigger AI curation, review/approve/reject resources.
- Student: Access curated, approved books, articles, and videos by subject and semester.
- Global: Dynamic branch list for that college.
"""
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin, require_tpo
from app.db.session import get_db
from app.models.college import College
from app.models.curated_subject_resource import (
    CuratedSubjectResource,
    CurationApprovalStatus,
    SubjectResourceType,
)
from app.models.curriculum_subject import CurriculumSubject
from app.models.curriculum_upload import CurriculumExtractionStatus, CurriculumUpload
from app.models.user import User, UserType
from app.schemas.curriculum import (
    CuratedResourceReviewRequest,
    CuratedSubjectResourceResponse,
    CurriculumBranchesResponse,
    CurriculumConfirmRequest,
    CurriculumSubjectResponse,
    CurriculumUploadResponse,
)
from app.services import curriculum_service
from app.utils.exceptions import FileValidationError
from app.utils.file_storage import (
    UPLOAD_ROOT,
    read_upload_file_limited,
    save_upload,
    validate_file,
)

router = APIRouter(prefix="/curriculum", tags=["curriculum"])

MAX_CURRICULUM_BYTES = 15 * 1024 * 1024  # 15MB limit for syllabus PDFs


@router.post("/upload", response_model=CurriculumUploadResponse)
async def upload_curriculum_document(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> CurriculumUpload:
    """College Admin uploads the college syllabus PDF; AI extracts branch/semester/subject structure."""
    cid = current_user.college_id
    if cid is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Admin account is not associated with an institution.")

    try:
        file_bytes = await read_upload_file_limited(file, max_bytes=MAX_CURRICULUM_BYTES)
        validate_file(filename, len(file_bytes), {".pdf"}, content_bytes=file_bytes)
    except FileValidationError as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=error.message) from error

    relative_path = save_upload(file_bytes, filename, subfolder="curriculum")
    absolute_path = UPLOAD_ROOT / relative_path

    # Extract text and run Groq AI extraction
    try:
        raw_text = curriculum_service.extract_text_from_pdf(absolute_path)
        extracted_data = await curriculum_service.extract_curriculum_structure(raw_text)
        extraction_status = CurriculumExtractionStatus.READY_FOR_REVIEW
    except Exception as err:
        extracted_data = None
        extraction_status = CurriculumExtractionStatus.FAILED

    upload_record = CurriculumUpload(
        college_id=cid,
        uploaded_by=current_user.id,
        original_filename=filename,
        file_path=relative_path,
        extraction_status=extraction_status,
        raw_extracted_data=extracted_data,
    )
    db.add(upload_record)
    db.commit()
    db.refresh(upload_record)

    return upload_record


@router.get("/latest", response_model=Optional[CurriculumUploadResponse])
def get_latest_upload(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Optional[CurriculumUpload]:
    """Fetch the latest curriculum upload and draft structure for this admin's college."""
    cid = current_user.college_id
    if cid is None:
        return None

    upload = db.scalar(
        select(CurriculumUpload)
        .where(CurriculumUpload.college_id == cid)
        .order_by(CurriculumUpload.uploaded_at.desc())
    )
    return upload


@router.post("/uploads/{upload_id}/confirm")
def confirm_curriculum_structure(
    upload_id: int,
    payload: CurriculumConfirmRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """College Admin confirms the reviewed branch/semester/subject structure, replacing previous curriculum data."""
    cid = current_user.college_id
    if cid is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No college associated with this account.")

    upload = db.get(CurriculumUpload, upload_id)
    if upload is None or upload.college_id != cid:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Curriculum upload not found.")

    # Remove previous curriculum subjects for this college (replaces curriculum data)
    old_subjects = db.scalars(select(CurriculumSubject).where(CurriculumSubject.college_id == cid)).all()
    for s in old_subjects:
        db.delete(s)
    db.flush()

    # Insert confirmed subjects
    total_subjects = 0
    for b in payload.branches:
        branch_name = b.name.strip()
        for sem in b.semesters:
            sem_num = sem.number
            for subj_name in sem.subjects:
                clean_subj = subj_name.strip()
                if clean_subj:
                    subject_record = CurriculumSubject(
                        college_id=cid,
                        source_upload_id=upload.id,
                        branch_name=branch_name,
                        semester_number=sem_num,
                        subject_name=clean_subj,
                        is_prioritized=False,
                    )
                    db.add(subject_record)
                    total_subjects += 1

    upload.extraction_status = CurriculumExtractionStatus.CONFIRMED
    upload.confirmed_at = datetime.now(timezone.utc)
    upload.raw_extracted_data = payload.model_dump()

    db.commit()

    return {
        "message": f"Successfully confirmed curriculum with {total_subjects} subjects across {len(payload.branches)} branches.",
        "total_subjects": total_subjects,
        "branches": [b.name for b in payload.branches],
    }


@router.get("/branches", response_model=CurriculumBranchesResponse)
def get_curriculum_branches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CurriculumBranchesResponse:
    """Returns distinct academic branches present in this college's confirmed curriculum."""
    cid = current_user.college_id
    if cid is None:
        return CurriculumBranchesResponse(branches=[])

    branches = db.scalars(
        select(CurriculumSubject.branch_name)
        .where(CurriculumSubject.college_id == cid)
        .distinct()
        .order_by(CurriculumSubject.branch_name)
    ).all()

    return CurriculumBranchesResponse(branches=list(branches))


@router.get("/subjects", response_model=list[CurriculumSubjectResponse])
def list_curriculum_subjects(
    branch: Optional[str] = None,
    semester: Optional[int] = None,
    prioritized_only: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CurriculumSubjectResponse]:
    """List curriculum subjects for the user's institution with resource count stats."""
    cid = current_user.college_id
    if cid is None:
        return []

    query = select(CurriculumSubject).where(CurriculumSubject.college_id == cid)
    if branch:
        query = query.where(func.lower(CurriculumSubject.branch_name) == branch.strip().lower())
    if semester:
        query = query.where(CurriculumSubject.semester_number == semester)
    if prioritized_only is not None:
        query = query.where(CurriculumSubject.is_prioritized == prioritized_only)

    subjects = db.scalars(
        query.order_by(CurriculumSubject.branch_name, CurriculumSubject.semester_number, CurriculumSubject.subject_name)
    ).all()

    # Pre-fetch resource count stats
    results: list[CurriculumSubjectResponse] = []
    for s in subjects:
        total = db.scalar(select(func.count(CuratedSubjectResource.id)).where(CuratedSubjectResource.subject_id == s.id)) or 0
        approved = db.scalar(
            select(func.count(CuratedSubjectResource.id)).where(
                CuratedSubjectResource.subject_id == s.id,
                CuratedSubjectResource.approval_status == CurationApprovalStatus.APPROVED,
            )
        ) or 0
        pending = db.scalar(
            select(func.count(CuratedSubjectResource.id)).where(
                CuratedSubjectResource.subject_id == s.id,
                CuratedSubjectResource.approval_status == CurationApprovalStatus.PENDING_REVIEW,
            )
        ) or 0

        # For student view: if a subject has zero approved resources, student can still see the subject,
        # but approved_count reflects whether content is ready.
        results.append(
            CurriculumSubjectResponse(
                id=s.id,
                college_id=s.college_id,
                source_upload_id=s.source_upload_id,
                branch_name=s.branch_name,
                semester_number=s.semester_number,
                subject_name=s.subject_name,
                is_prioritized=s.is_prioritized,
                created_at=s.created_at,
                resources_count=total,
                approved_count=approved,
                pending_count=pending,
            )
        )

    return results


@router.post("/subjects/{subject_id}/prioritize", response_model=CurriculumSubjectResponse)
def toggle_subject_prioritization(
    subject_id: int,
    current_user: User = Depends(require_tpo),
    db: Session = Depends(get_db),
) -> CurriculumSubjectResponse:
    """TPO toggles a subject for market-trend prioritization and resource curation."""
    subject = db.get(CurriculumSubject, subject_id)
    if subject is None or subject.college_id != current_user.college_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Subject not found.")

    subject.is_prioritized = not subject.is_prioritized
    db.commit()
    db.refresh(subject)

    total = db.scalar(select(func.count(CuratedSubjectResource.id)).where(CuratedSubjectResource.subject_id == subject.id)) or 0
    approved = db.scalar(
        select(func.count(CuratedSubjectResource.id)).where(
            CuratedSubjectResource.subject_id == subject.id,
            CuratedSubjectResource.approval_status == CurationApprovalStatus.APPROVED,
        )
    ) or 0
    pending = db.scalar(
        select(func.count(CuratedSubjectResource.id)).where(
            CuratedSubjectResource.subject_id == subject.id,
            CuratedSubjectResource.approval_status == CurationApprovalStatus.PENDING_REVIEW,
        )
    ) or 0

    return CurriculumSubjectResponse(
        id=subject.id,
        college_id=subject.college_id,
        source_upload_id=subject.source_upload_id,
        branch_name=subject.branch_name,
        semester_number=subject.semester_number,
        subject_name=subject.subject_name,
        is_prioritized=subject.is_prioritized,
        created_at=subject.created_at,
        resources_count=total,
        approved_count=approved,
        pending_count=pending,
    )


@router.post("/subjects/{subject_id}/curate", response_model=list[CuratedSubjectResourceResponse])
async def curate_subject_resources(
    subject_id: int,
    current_user: User = Depends(require_tpo),
    db: Session = Depends(get_db),
) -> list[CuratedSubjectResource]:
    """Runs web search + Groq curation for books, articles, and educational videos for a subject."""
    subject = db.get(CurriculumSubject, subject_id)
    if subject is None or subject.college_id != current_user.college_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Subject not found.")

    # Curate recommendations
    candidates = await curriculum_service.curate_resources_for_subject(subject.subject_name, subject.branch_name)

    # Fetch existing resource links for this subject to prevent duplicate curation spam
    existing_links = set(
        db.scalars(
            select(CuratedSubjectResource.link).where(CuratedSubjectResource.subject_id == subject.id)
        ).all()
    )

    created_records: list[CuratedSubjectResource] = []
    for item in candidates:
        if item.get("link") in existing_links:
            continue
        resource = CuratedSubjectResource(
            subject_id=subject.id,
            college_id=subject.college_id,
            resource_type=SubjectResourceType(item["resource_type"]),
            title=item["title"],
            link=item["link"],
            ai_summary=item["ai_summary"],
            approval_status=CurationApprovalStatus.PENDING_REVIEW,
        )
        db.add(resource)
        created_records.append(resource)
        existing_links.add(item.get("link"))

    subject.is_prioritized = True
    db.commit()
    for r in created_records:
        db.refresh(r)

    if not created_records:
        return list(
            db.scalars(
                select(CuratedSubjectResource).where(CuratedSubjectResource.subject_id == subject.id)
            ).all()
        )

    return created_records


@router.get("/subjects/{subject_id}/resources", response_model=list[CuratedSubjectResourceResponse])
def get_subject_resources(
    subject_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CuratedSubjectResource]:
    """Fetch resources for a subject. Students only see approved items; TPOs/Admins see all."""
    subject = db.get(CurriculumSubject, subject_id)
    if subject is None or subject.college_id != current_user.college_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Subject not found.")

    query = select(CuratedSubjectResource).where(CuratedSubjectResource.subject_id == subject_id)
    if current_user.user_type == UserType.STUDENT:
        query = query.where(CuratedSubjectResource.approval_status == CurationApprovalStatus.APPROVED)

    resources = db.scalars(query.order_by(CuratedSubjectResource.resource_type, CuratedSubjectResource.id)).all()
    return list(resources)


@router.patch("/resources/{resource_id}/review", response_model=CuratedSubjectResourceResponse)
def review_curated_resource(
    resource_id: int,
    payload: CuratedResourceReviewRequest,
    current_user: User = Depends(require_tpo),
    db: Session = Depends(get_db),
) -> CuratedSubjectResource:
    """TPO approves or rejects a candidate resource, optionally editing the title or AI summary."""
    resource = db.get(CuratedSubjectResource, resource_id)
    if resource is None or resource.college_id != current_user.college_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Resource not found.")

    resource.approval_status = CurationApprovalStatus(payload.approval_status)
    resource.reviewed_by = current_user.id
    resource.reviewed_at = datetime.now(timezone.utc)

    if payload.title is not None and payload.title.strip():
        resource.title = payload.title.strip()
    if payload.ai_summary is not None and payload.ai_summary.strip():
        resource.ai_summary = payload.ai_summary.strip()

    db.commit()
    db.refresh(resource)

    return resource
