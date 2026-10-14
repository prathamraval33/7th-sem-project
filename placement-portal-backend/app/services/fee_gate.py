"""Fee Gate Service — centralized, tenant-scoped feature gate enforcement for unverified students."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.fee_gate_config import FeeGateConfig
from app.models.user import User, UserType

VALID_GATED_FEATURES = {
    "browse_drives",
    "apply_to_drives",
    "official_tests",
    "practice_tests",
    "mock_interview_gen",
    "mock_interview_drive",
    "resume_analyzer",
    "resume_enhancer",
    "career_insights",
}


def get_or_create_fee_gate_config(db: Session, college_id: int) -> FeeGateConfig:
    """Retrieves the FeeGateConfig for the college, or auto-seeds one with standard defaults."""
    config = db.scalar(select(FeeGateConfig).where(FeeGateConfig.college_id == college_id))
    if config is None:
        config = FeeGateConfig(
            college_id=college_id,
            browse_drives=True,
            apply_to_drives=False,
            official_tests=False,
            practice_tests=True,
            mock_interview_gen=True,
            mock_interview_drive=False,
            resume_analyzer=True,
            resume_enhancer=True,
            career_insights=True,
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


def check_fee_gate(feature: str, user: User, db: Session) -> None:
    """
    Enforces tenant fee gate policies for students.
    Raises HTTP 403 Forbidden if the given feature is gated for an unverified student.
    - If user is not a STUDENT, returns immediately without restriction.
    - If user.fee_verified is True, returns immediately without restriction.
    """
    # 1. Non-students are never blocked by fee verification gates
    if user.user_type != UserType.STUDENT:
        return

    # 2. Fee-verified students have full access
    if user.fee_verified is True:
        return

    # 3. If student has no college associated, skip
    if user.college_id is None:
        return

    config = get_or_create_fee_gate_config(db, user.college_id)

    # 4. Check seasonal verification deadline
    if config.verification_deadline is not None:
        now = datetime.now(timezone.utc)
        deadline = config.verification_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)

        if now > deadline:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "FEE_VERIFICATION_DEADLINE_PASSED",
                    "feature": feature,
                    "message": "The fee verification deadline for this placement season has passed. Contact your TPO.",
                },
            )

    # 5. Check specific feature toggle
    is_allowed = getattr(config, feature, True)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "FEE_VERIFICATION_REQUIRED",
                "feature": feature,
                "message": "Your placement fee receipt must be verified before accessing this feature. Please upload your receipt at /student/fee-verification.",
            },
        )
