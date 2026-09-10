# Implementation Plan — Template-Matched Fee Receipt Verification (`feecheck.md`)

This document is the implementation plan for **template-matched fee receipt verification**, saved for future execution.

---

## Executive Summary
Today, student fee receipts are evaluated by Groq using general heuristics without an institutional reference point. This enhancement introduces an active **reference sample receipt per college** uploaded once by the College Admin. Student receipts are compared against this reference template's structural elements (letterhead, layout, fee purpose wording) while explicitly ignoring normal variations in content elements (receipt number, student name, amount, date), with a fallback for colleges without templates and a dedicated manual review queue for TPOs.

---

## Core Components to Build

### 1. Database Schema & Alembic Migration
- **New Table `fee_receipt_templates`**:
  - `id`: Integer PK
  - `college_id`: ForeignKey("colleges.id", ondelete="CASCADE"), index=True, nullable=False
  - `file_path`: String(500), nullable=False
  - `original_filename`: String(255), nullable=True
  - `extracted_text`: Text, nullable=True (cached OCR output)
  - `uploaded_by`: ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
  - `is_active`: Boolean, default=True, nullable=False (only 1 active per college at a time)
  - `created_at`: DateTime(timezone=True), server_default=func.now(), nullable=False
- **Update Table `fee_receipts`**:
  - `matched_against_template_id`: Mapped[int | None] = mapped_column(ForeignKey("fee_receipt_templates.id", ondelete="SET NULL"), nullable=True)
  - `structural_match_result`: Mapped[dict | None] = mapped_column(JSON, nullable=True)
  - `content_valid_result`: Mapped[dict | None] = mapped_column(JSON, nullable=True)
  - `verified_by`: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
- **Alembic Migration**: `f3a4b5c6d7e8_add_fee_receipt_templates_and_review.py`

### 2. Backend Services & Groq AI Pipeline
- **`app/services/fee_receipt_service.py`**:
  - `get_ai_template_verdict(student_text: str, template_text: str) -> dict`:
    - Structured prompt strictly enforcing **Structure vs. Content** distinction:
      - **Structural comparison**: Letterhead, institution name, layout format, fee purpose wording.
      - **Content validation**: Presence of plausible receipt number, date, amount.
      - **Explicit rule**: Differing receipt numbers, student names, amounts, and dates are normal and expected and must NOT lower confidence or be flagged as mismatches.
    - JSON return shape: `{ confidence, is_valid, structural_match, content_valid, reason }`
  - `process_fee_receipt`:
    - **Path A** (No template): Run existing `get_ai_verdict(extracted_text)`.
    - **Path B** (Template exists): Run `get_ai_template_verdict(extracted_text, template.extracted_text)`.
    - Auto-verify if `confidence >= 0.85 and is_valid`; otherwise leave unverified for TPO review.

### 3. Backend Routers & Schemas
- **`app/routers/admin.py`**:
  - `POST /admin/college/fee-template`: Upload reference sample (PDF/PNG/JPG <= 5MB), runs OCR, deactivates prior templates, sets new active template.
  - `GET /admin/college/fee-template`: Returns active template metadata + OCR text preview.
- **`app/routers/tpo.py`**:
  - `GET /tpo/fee-receipts/pending`: Fetch unverified fee receipts for the TPO's college with student and template info.
  - `POST /tpo/fee-receipts/{receipt_id}/approve`: Manually approve receipt (`fee_verified = True`, `verified_by = tpo.id`, notification sent).
  - `POST /tpo/fee-receipts/{receipt_id}/reject`: Manually reject receipt (`fee_verified = False`, optional feedback, notification sent).
- **`app/routers/uploads.py`**:
  - Add `"fee_receipt_templates"` to `ALLOWED_SUBFOLDERS`.
  - Enforce strict college access control: only Admin and TPO of that college can view the template; students are forbidden.
- **`app/schemas/fee_receipt.py`**:
  - `FeeReceiptTemplateResponse`, `TpoFeeReviewItemResponse`, `TpoFeeRejectRequest`, and extended `FeeReceiptResponse`.

### 4. Frontend UI/UX
- **College Admin Settings (`AdminSettingsPage.jsx`)**:
  - "Fee Receipt Template" section.
  - Displays current active template card + extracted OCR text viewer.
  - Upload widget with clear on-screen privacy guidance (personal student details can be redacted or dummy).
- **TPO Manual Review Queue (`TpoFeeReviewPage.jsx`)**:
  - New page registered at `/tpo/fee-verification` and added to `Sidebar.jsx`.
  - Pending review list/table with status badges.
  - Side-by-side comparison modal (student receipt vs. college reference sample).
  - AI Assessment breakdown card (Confidence score, Structural Match details, Content Validity details, Stated reason).
  - One-click Approve and Reject actions.
- **Student Upload Page (`FeeReceiptUploadPage.jsx`)**:
  - Displays "Under Manual Review by Placement Officer" state when confidence < 0.85.

---

## Verification Strategy
- Test suite: `tests/test_fee_receipt_template_matching.py` (admin template upload/replacement, Path A fallback, Path B template matching, TPO approve/reject, multi-tenant isolation, template file privacy).
- Full backend pytest suite verification.
- Frontend `npm run build` verification.
