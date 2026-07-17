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
from app.schemas.fee_receipt import FeeReceiptResponse, FeeVerificationStatusResponse
from app.services import fee_receipt_service
from app.utils.exceptions import FileValidationError
from app.utils.file_storage import FEE_RECEIPT_EXTENSIONS, save_upload, validate_file

router = APIRouter(prefix="/fee-verification", tags=["fee-verification"])


@router.post("/upload", response_model=FeeReceiptResponse, status_code=status.HTTP_201_CREATED)
async def upload_fee_receipt(
    file: UploadFile = File(...),
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> FeeReceipt:
    file_bytes = await file.read()
    try:
        validate_file(file.filename, len(file_bytes), FEE_RECEIPT_EXTENSIONS)
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
    latest = db.scalar(
        select(FeeReceipt)
        .where(FeeReceipt.user_id == current_user.id)
        .order_by(FeeReceipt.created_at.desc())
    )
    return FeeVerificationStatusResponse(fee_verified=current_user.fee_verified, latest_receipt=latest)
