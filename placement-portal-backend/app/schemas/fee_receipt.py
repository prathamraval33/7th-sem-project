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


class FeeVerificationStatusResponse(BaseModel):
    """GET /fee-verification/status — current gate state + last AI feedback
    so a rejected student knows why, per the master prompt.
    """

    fee_verified: bool
    latest_receipt: Optional[FeeReceiptResponse] = None
