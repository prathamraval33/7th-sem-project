"""Placement fee receipt upload + AI legitimacy verification — mandatory
gate before applying to any drive.
"""
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import require_student
from app.db.session import get_db
from app.models.fee_receipt import FeeReceipt
from app.models.user import User
from app.schemas.fee_receipt import (
    FeeReceiptHistoryItem,
    FeeReceiptResponse,
    FeeVerificationStatusResponse,
)
from app.services import fee_receipt_service
from app.utils.exceptions import FileValidationError
from app.utils.file_storage import (
    FEE_RECEIPT_EXTENSIONS,
    read_upload_file_limited,
    save_upload,
    validate_file,
)
from sqlalchemy.orm import joinedload

router = APIRouter(prefix="/fee-verification", tags=["fee-verification"])


@router.post("/upload", response_model=FeeReceiptResponse, status_code=status.HTTP_201_CREATED)
async def upload_fee_receipt(
    file: UploadFile = File(...),
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> FeeReceipt:
    try:
        file_bytes = await read_upload_file_limited(file)
        validate_file(file.filename or "", len(file_bytes), FEE_RECEIPT_EXTENSIONS, content_bytes=file_bytes)
    except FileValidationError as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=error.message) from error

    relative_path = save_upload(file_bytes, file.filename, subfolder="fee_receipts")
    receipt = await fee_receipt_service.process_fee_receipt(db, current_user, relative_path)

    return receipt


@router.get("/status", response_model=FeeVerificationStatusResponse)
def get_fee_verification_status(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> FeeVerificationStatusResponse:
    receipts = list(
        db.scalars(
            select(FeeReceipt)
            .options(joinedload(FeeReceipt.verifier))
            .where(FeeReceipt.user_id == current_user.id)
            .order_by(FeeReceipt.created_at.desc())
        ).all()
    )
    latest = receipts[0] if receipts else None

    history: list[FeeReceiptHistoryItem] = []
    for r in receipts:
        if r.verified_at is not None:
            if r.verified_by is not None:
                st = "tpo_approved"
            else:
                st = "auto_verified"
        elif (r.ai_reason or "").startswith("Manual TPO rejection"):
            st = "tpo_rejected"
        elif r.ai_verdict and r.ai_verdict.value == "invalid":
            st = "tpo_rejected"
        else:
            st = "pending_review"

        reviewed_by_name = None
        if r.verified_by is not None and r.verifier:
            reviewed_by_name = r.verifier.email.split("@")[0].upper()
        elif r.verified_at is not None:
            reviewed_by_name = "Auto-verified"

        rej_reason = None
        if st == "tpo_rejected":
            if (r.ai_reason or "").startswith("Manual TPO rejection: "):
                rej_reason = r.ai_reason.replace("Manual TPO rejection: ", "")
            else:
                rej_reason = r.ai_reason

        history.append(
            FeeReceiptHistoryItem(
                id=r.id,
                uploaded_at=r.created_at,
                status=st,
                file_path=r.file_path,
                reviewed_by_name=reviewed_by_name,
                rejection_reason=rej_reason,
                ai_confidence=r.ai_confidence,
            )
        )

    return FeeVerificationStatusResponse(
        fee_verified=current_user.fee_verified,
        latest_receipt=latest,
        upload_history=history,
    )
