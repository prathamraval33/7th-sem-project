"""OCR extraction (fee receipt image/PDF) + Groq legitimacy verdict.
Sets `users.fee_verified = True` only on a confident, genuine verdict —
anything less leaves it false with the AI's reason surfaced to the student.
"""
from datetime import datetime, timezone

import pytesseract
from PIL import Image
from pdf2image import convert_from_path

from app.models.fee_receipt import FeeReceipt, FeeVerdict
from app.models.user import User
from app.services import groq_client
from app.utils.file_storage import get_absolute_path

# Only an unambiguous, high-confidence "valid" verdict flips fee_verified.
CONFIDENCE_THRESHOLD = 0.85

_VERIFICATION_SYSTEM_PROMPT = """You are verifying a college placement-fee payment receipt.
Given the OCR-extracted text of a receipt, decide whether it looks like a genuine payment
receipt: it should mention a payment amount, a transaction/receipt reference number, a valid
date, and a recognizable payee/institution. Respond ONLY with a JSON object of the exact shape:
{"is_valid": boolean, "confidence": number between 0 and 1, "reason": short string explaining the verdict}.
If the text is empty, garbled, or clearly not a receipt, is_valid must be false with a low confidence."""


import os
import shutil

def extract_receipt_text(relative_file_path: str) -> str:
    try:
        # Check standard Windows Tesseract path if not in system PATH
        if shutil.which("tesseract") is None:
            tesseract_win_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
            if os.path.exists(tesseract_win_path):
                pytesseract.pytesseract.tesseract_cmd = tesseract_win_path

        absolute_path = get_absolute_path(relative_file_path)
        extension = absolute_path.suffix.lower()

        if extension == ".pdf":
            try:
                images = convert_from_path(str(absolute_path))
            except Exception:
                # Fallback to pdf text extraction if poppler is missing
                from pypdf import PdfReader
                reader = PdfReader(str(absolute_path))
                text_parts = [page.extract_text() or "" for page in reader.pages]
                return "\n".join(text_parts).strip()
        else:
            images = [Image.open(absolute_path)]

        pages_text = [pytesseract.image_to_string(image) for image in images]
        return "\n".join(pages_text).strip()
    except Exception as e:
        return ""


async def get_ai_verdict(extracted_text: str) -> dict:
    """Calls Groq (via the single groq_client wrapper) for a structured
    verdict. Returns {"is_valid": bool, "confidence": float, "reason": str}.
    """
    user_prompt = f"Receipt text:\n\n{extracted_text or '(no text could be extracted)'}"
    return await groq_client.generate_json(_VERIFICATION_SYSTEM_PROMPT, user_prompt)


async def process_fee_receipt(db, user: User, relative_file_path: str) -> FeeReceipt:
    """Full pipeline: OCR -> Groq verdict -> persist FeeReceipt -> flip
    `user.fee_verified` only when confident and genuine.
    """
    extracted_text = extract_receipt_text(relative_file_path)
    verdict = await get_ai_verdict(extracted_text)

    is_valid = bool(verdict.get("is_valid"))
    confidence = float(verdict.get("confidence", 0.0))
    reason = str(verdict.get("reason", ""))

    receipt = FeeReceipt(
        user_id=user.id,
        file_path=relative_file_path,
        extracted_text=extracted_text,
        ai_verdict=FeeVerdict.VALID if is_valid else FeeVerdict.INVALID,
        ai_confidence=confidence,
        ai_reason=reason,
    )

    confident_and_genuine = is_valid and confidence >= CONFIDENCE_THRESHOLD
    if confident_and_genuine:
        receipt.verified_at = datetime.now(timezone.utc)
        user.fee_verified = True

    db.add(receipt)
    db.commit()
    db.refresh(receipt)

    return receipt
