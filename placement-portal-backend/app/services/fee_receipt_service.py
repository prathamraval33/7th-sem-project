"""OCR extraction (fee receipt image/PDF) + Groq legitimacy verdict.
Sets `users.fee_verified = True` only on a confident, genuine verdict —
anything less leaves it false with the AI's reason surfaced to the student.
"""
from datetime import datetime, timezone
import os
import shutil

from PIL import Image
from pdf2image import convert_from_path
import pytesseract
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.fee_receipt import FeeReceipt, FeeVerdict
from app.models.fee_receipt_template import FeeReceiptTemplate
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

_TEMPLATE_MATCH_SYSTEM_PROMPT = """You are verifying a college placement-fee receipt against an official college reference template.
You must perform TWO separate evaluations:

1. STRUCTURAL & TEMPLATE COMPARISON:
Compare the student receipt against the official college reference template. Check if both documents share:
- The same institution / college name and letterhead.
- Similar fee purpose or category terminology (e.g. placement fee, training and placement, registration).
- Similar structural layout, section headers, or institutional phrasing.
Judge whether the student receipt comes from the same institution's standard receipt template.

CRITICAL RULE — STRUCTURE VS. CONTENT:
Variable details (student name, enrollment/roll number, receipt number, transaction ID, date, and payment amount) are SUPPOSED and EXPECTED to be different for every student. You must NEVER treat differing student names, different receipt numbers, different dates, or different amounts between the student receipt and the reference template as a mismatch. Differing variable details must NEVER lower the confidence score or fail the structural match! Only genuine structural deviations (different college name, completely wrong document layout, entirely unrelated purpose) constitute a structural mismatch.

2. CONTENT VALIDATION:
Independently of the reference template, verify that the student receipt itself is a coherent, plausible payment document:
- Contains a plausible receipt/transaction number.
- Contains a plausible payment date.
- Contains a plausible fee amount.
Do NOT compare these values to the reference template's values.

Respond ONLY with a JSON object of this exact schema:
{
  "is_valid": boolean,
  "confidence": float between 0.0 and 1.0,
  "structural_match": {
    "matched": boolean,
    "institution_match": boolean,
    "layout_match": boolean,
    "details": "short explanation of structural alignment or deviation"
  },
  "content_valid": {
    "valid": boolean,
    "receipt_number_present": boolean,
    "amount_present": boolean,
    "date_present": boolean,
    "details": "short explanation of content plausibility"
  },
  "reason": "concise summary explaining the overall assessment"
}
If the text is completely blank or nonsensical, is_valid must be false with confidence < 0.2."""


_MULTI_TEMPLATE_MATCH_SYSTEM_PROMPT = """You are verifying a college placement-fee receipt against the college's official reference templates.
The college has provided multiple official reference templates representing accepted payment receipt formats (e.g. Tuition Fee Receipt, Hostel & Mess Receipt, Exam Fee, Bank/Portal Challan).

You must perform TWO separate evaluations:

1. STRUCTURAL & TEMPLATE COMPARISON:
Determine if the student receipt matches ANY of the provided official reference templates.
Compare against each candidate template to check if both share:
- The same institution / college name and letterhead.
- Similar fee purpose or category terminology (e.g. placement fee, training and placement, tuition, registration).
- Similar structural layout, section headers, or institutional phrasing.
Identify the single candidate template that best matches the student receipt. If it matches one of the templates, set "best_matched_template_id" to that template's integer ID. If it clearly matches none of the templates, set "best_matched_template_id" to null and set structural_match.matched to false.

CRITICAL RULE — STRUCTURE VS. CONTENT:
Variable details (student name, enrollment/roll number, receipt number, transaction ID, date, and payment amount) are SUPPOSED and EXPECTED to be different for every student. You must NEVER treat differing student names, different receipt numbers, different dates, or different amounts between the student receipt and any reference template as a mismatch. Differing variable details must NEVER lower the confidence score or fail the structural match! Only genuine structural deviations (different college name, completely wrong document layout, entirely unrelated purpose) constitute a structural mismatch.

2. CONTENT VALIDATION:
Independently of the reference templates, verify that the student receipt itself is a coherent, plausible payment document:
- Contains a plausible receipt/transaction number.
- Contains a plausible payment date.
- Contains a plausible fee amount.
Do NOT compare these values to any reference template's values.

Respond ONLY with a JSON object of this exact schema:
{
  "is_valid": boolean,
  "confidence": float between 0.0 and 1.0,
  "best_matched_template_id": integer or null,
  "structural_match": {
    "matched": boolean,
    "institution_match": boolean,
    "layout_match": boolean,
    "details": "short explanation of which template it matches and structural alignment or deviation"
  },
  "content_valid": {
    "valid": boolean,
    "receipt_number_present": boolean,
    "amount_present": boolean,
    "date_present": boolean,
    "details": "short explanation of content plausibility"
  },
  "reason": "concise summary explaining the overall assessment"
}
If the text is completely blank or nonsensical, is_valid must be false with confidence < 0.2."""


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
    """Path A: Calls Groq for general heuristics when no college template exists.
    Returns {"is_valid": bool, "confidence": float, "reason": str}.
    """
    user_prompt = f"Receipt text:\n\n{extracted_text or '(no text could be extracted)'}"
    return await groq_client.generate_json(_VERIFICATION_SYSTEM_PROMPT, user_prompt)


async def get_ai_template_verdict(student_text: str, template_text: str) -> dict:
    """Path B: Calls Groq with strict structure vs content separation against
    a single official college reference template.
    """
    user_prompt = (
        f"--- OFFICIAL COLLEGE REFERENCE TEMPLATE ---\n{template_text or '(no reference text available)'}\n\n"
        f"--- STUDENT SUBMITTED RECEIPT ---\n{student_text or '(no text could be extracted)'}"
    )
    return await groq_client.generate_json(_TEMPLATE_MATCH_SYSTEM_PROMPT, user_prompt)


async def get_ai_multi_template_verdict(student_text: str, candidate_templates: list[FeeReceiptTemplate]) -> dict:
    """Path B (Multi-Template): Calls Groq to evaluate student receipt against
    all active college candidate templates, identifying the best match.
    """
    templates_block = []
    for t in candidate_templates:
        label = t.template_name or t.original_filename or f"Template #{t.id}"
        templates_block.append(
            f"--- CANDIDATE TEMPLATE ID: {t.id} (Name: {label}) ---\n"
            f"{t.extracted_text or '(no reference text available)'}\n"
        )

    user_prompt = (
        "=== OFFICIAL COLLEGE REFERENCE TEMPLATES ===\n"
        + "\n".join(templates_block)
        + "\n=== STUDENT SUBMITTED RECEIPT ===\n"
        + (student_text or "(no text could be extracted)")
    )
    return await groq_client.generate_json(_MULTI_TEMPLATE_MATCH_SYSTEM_PROMPT, user_prompt)


async def process_fee_receipt(db: Session, user: User, relative_file_path: str) -> FeeReceipt:
    """Full pipeline: OCR -> Check for College Templates -> Groq verdict (Path A or Path B)
    -> persist FeeReceipt with audit metadata -> auto-verify if confidence >= 0.85.
    """
    extracted_text = extract_receipt_text(relative_file_path)

    # Check if student's college has active reference templates
    active_templates: list[FeeReceiptTemplate] = []
    if user.college_id is not None:
        active_templates = list(
            db.scalars(
                select(FeeReceiptTemplate).where(
                    FeeReceiptTemplate.college_id == user.college_id,
                    FeeReceiptTemplate.is_active == True,
                ).order_by(FeeReceiptTemplate.created_at.desc())
            ).all()
        )

    matched_template_id = None
    structural_match = None
    content_valid = None

    if len(active_templates) == 1:
        # Single template Path B
        active_template = active_templates[0]
        verdict = await get_ai_template_verdict(extracted_text, active_template.extracted_text or "")
        matched_template_id = active_template.id
        structural_match = verdict.get("structural_match")
        content_valid = verdict.get("content_valid")
    elif len(active_templates) > 1:
        # Multi-template Path B: evaluate against all active candidate templates
        verdict = await get_ai_multi_template_verdict(extracted_text, active_templates)
        cand_id = verdict.get("best_matched_template_id")
        active_ids = {t.id for t in active_templates}
        if cand_id in active_ids:
            matched_template_id = cand_id
        else:
            matched_template_id = active_templates[0].id
        structural_match = verdict.get("structural_match")
        content_valid = verdict.get("content_valid")
    else:
        # Path A: General legitimacy fallback (no active templates)
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
        matched_against_template_id=matched_template_id,
        structural_match_result=structural_match,
        content_valid_result=content_valid,
    )

    confident_and_genuine = is_valid and confidence >= CONFIDENCE_THRESHOLD
    if confident_and_genuine:
        receipt.verified_at = datetime.now(timezone.utc)
        user.fee_verified = True

    db.add(receipt)
    db.commit()
    db.refresh(receipt)

    return receipt

