"""Schemas for the `fee_receipts` table + the fee-verification status DTO."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.fee_receipt import FeeVerdict


class FeeReceiptCreate(BaseModel):
    """Internal, service-facing — the upload endpoint itself takes a
    multipart file, not this JSON body; the service constructs this after
    saving the file and running OCR.
    """

    user_id: int
    file_path: str


class FeeReceiptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    file_path: str
    extracted_text: Optional[str] = None
    ai_verdict: Optional[FeeVerdict] = None
    ai_confidence: Optional[float] = None
    ai_reason: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    matched_against_template_id: Optional[int] = None
    structural_match_result: Optional[dict] = None
    content_valid_result: Optional[dict] = None
    verified_by: Optional[int] = None


class FeeVerificationStatusResponse(BaseModel):
    """GET /fee-verification/status — current gate state + last AI feedback
    so a rejected student knows why, per the master prompt.
    """

    fee_verified: bool
    latest_receipt: Optional[FeeReceiptResponse] = None


class FeeReceiptTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    college_id: int
    template_name: Optional[str] = None
    file_path: str
    original_filename: Optional[str] = None
    extracted_text: Optional[str] = None
    uploaded_by: int
    is_active: bool
    created_at: datetime


class TpoFeeReviewItemResponse(BaseModel):
    id: int
    user_id: int
    student_name: str
    student_email: str
    roll_number: Optional[str] = None
    branch: Optional[str] = None
    file_path: str
    extracted_text: Optional[str] = None
    ai_verdict: Optional[FeeVerdict] = None
    ai_confidence: Optional[float] = None
    ai_reason: Optional[str] = None
    structural_match_result: Optional[dict] = None
    content_valid_result: Optional[dict] = None
    matched_against_template_id: Optional[int] = None
    template_name: Optional[str] = None
    template_file_path: Optional[str] = None
    created_at: datetime


class TpoFeeRejectRequest(BaseModel):
    reason: Optional[str] = "The uploaded receipt could not be verified. Please provide a clear, valid institution receipt."

