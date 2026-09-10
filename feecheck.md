# feecheck.md — Template-Matched Fee Receipt Verification

## How to use this document

You are an AI coding assistant extending the existing fee receipt verification feature on a multi-tenant placement portal (FastAPI + SQLAlchemy 2.0 + PostgreSQL + Alembic backend, React + Vite + Tailwind frontend, Groq API as the AI provider, pytesseract + pdf2image already used for OCR). This document specifies an enhancement to a feature that already partly exists: today, when a student uploads a fee receipt, OCR extracts its text and Groq judges whether it looks like a genuine receipt, purely from general knowledge, with no reference point to compare against. This document adds a **reference sample receipt per college**, uploaded once by that college's Admin, which every future student receipt for that college is compared against — giving Groq something concrete to check structure/layout against, in addition to its existing content-plausibility check, rather than replacing that check.

Read this entire document before writing any code. This feature must remain fully backward-compatible and fully multi-tenant: a college that has not uploaded a reference sample must continue to work exactly as the feature does today, and every piece of data introduced here (the sample receipt itself, its extracted structure) is scoped to one specific college and must never be visible to or compared against another college's students.

---

## PART 1 — Why this exists, and the one critical distinction to get right

### 1.1 The problem being solved
Today's verification asks Groq, in effect, "does this look like a real fee receipt?" with no example of what THIS college's real receipts actually look like. Groq is working from general knowledge of what receipts tend to look like, not from anything specific to this institution. A reference sample gives it a concrete, college-specific structural baseline to compare against — same letterhead, same fee-category wording, same layout of stamp/signature, same general document structure — which should catch obviously-wrong submissions (wrong college's receipt, a fabricated document with no resemblance to the real template, a receipt for the wrong fee type) more reliably than judgment from general knowledge alone.

### 1.2 The critical distinction that must not be gotten wrong: STRUCTURE vs. CONTENT
This is the single most important thing to understand before building anything here. A fee receipt has two categories of information on it:
- **Structural/template elements** — these should be the SAME across every student's receipt at a given college: the letterhead, the college name and logo, the general layout, the fee-category/purpose wording, the stamp or signature block's position and appearance, the overall visual template.
- **Variable/content elements** — these are SUPPOSED to be different for every single student: the receipt number, the student's name, the amount paid (if fee amounts can vary, e.g. by branch or category), the date of payment.

The comparison against the reference sample must ONLY apply to the structural/template elements. It must never flag or penalize a student's receipt for having a different receipt number, different name, different date, or different amount than the sample — those differences are expected and correct, not a sign of a problem. Getting this wrong would actively break the feature: if the AI is instructed to check "does this match the sample" too literally, it will reject every single legitimate receipt, since none of them are supposed to be identical to the sample. Every part of this specification that follows is built around keeping these two kinds of checking cleanly separate.

---

## PART 2 — College Admin: Uploading the Reference Sample

### 2.1 Where this lives
Add a new settings section to the College Admin's dashboard — something like "Fee Receipt Template," alongside the other per-college settings this Admin role already manages (their email domain configuration, per earlier work in this project). This is a one-time (or occasionally-updated) setup action per college, not something done per student.

### 2.2 What the Admin actually uploads
The Admin uploads one real fee receipt from their own college as the reference sample — accepting the same file types and size limit already enforced for student receipt uploads (PDF/JPG/PNG, 5MB cap), for consistency. Before uploading, the Admin should be clearly instructed (via on-screen help text) that personally identifying details on this sample (a specific student's name, a specific receipt number) do not need to be real or need to be redacted/blacked out beforehand if the Admin is concerned about using a real student's document for this purpose — since, per Part 1.2, none of those variable fields are ever compared against anyway, only the structural template matters. Recommend the UI explicitly say something like: "Upload a receipt showing your college's standard layout and letterhead. Student-specific details like name and receipt number don't need to be visible or accurate — only the format matters."

### 2.3 What happens on upload, mechanically
1. Store the uploaded file, associated with that college's `college_id`.
2. Run it through the same OCR pipeline (pytesseract + pdf2image) already used for student receipts, to extract its raw text content.
3. Store both the raw file (or a secure reference/path to it) and its extracted OCR text in a new table (see Part 5 for schema) — this stored extracted text is what will actually be sent to Groq for comparison on every future student upload, so this college's sample only needs to be OCR'd once, not re-processed every time a student uploads.
4. Show the Admin a confirmation, ideally displaying back the extracted text so they can sanity-check that OCR actually read their sample correctly before relying on it (if OCR badly garbled the sample itself, every future comparison built on it would be unreliable — catching this early, at setup time, is much better than discovering it later through a stream of confusing verification results).

### 2.4 Updating or replacing the sample later
A college's receipt format may change over time (new academic year, new letterhead, revised fee structure). Support the Admin uploading a new sample that replaces the previous one — keep this simple: the new upload becomes the active reference sample going forward, and the previous one can either be discarded or retained as inactive history (retaining it as inactive history is preferable and low-cost, since it provides useful context if anyone later needs to understand why receipts from a particular time period were being checked against a particular template).

---

## PART 3 — What Happens When a Student Uploads a Receipt (the extended flow)

### 3.1 Steps that are unchanged from the existing feature
Student uploads their fee receipt (same file type/size rules as today). Backend runs OCR on it exactly as it does today, extracting its raw text.

### 3.2 The new branching step
Before calling Groq, check whether this student's college has an active reference sample on file (Part 2's data). This determines which of two paths is taken:

**Path A — no reference sample exists for this college.** Fall back exactly to the existing, current behavior: send only the student's extracted receipt text to Groq, with the existing legitimacy-judgment prompt, unchanged. This ensures a college that hasn't set up a sample yet is never blocked or degraded by this feature's existence — the feature is purely additive where a sample is available, and invisible where it isn't.

**Path B — a reference sample exists for this college.** Send Groq BOTH the student's extracted receipt text AND the college's stored reference sample text (Part 2.3's stored extraction) in a single call, with a prompt that explicitly separates two distinct instructions:
1. **Structural comparison**: compare the student's receipt's general format, letterhead/institution name, fee-category or purpose wording, and overall layout pattern against the reference sample's corresponding elements. Judge whether they appear to come from the same institution's standard receipt template.
2. **Content validation**: independently of the structural comparison, check that the student's receipt contains a plausible, internally consistent receipt number, a plausible payment amount, and a plausible date — this check does NOT reference the sample's own receipt number/amount/date at all, since (per Part 1.2) those are expected to differ.

The prompt must explicitly instruct Groq that a different receipt number, different student name, different amount, or different date between the student's receipt and the sample is normal and expected, and must never by itself be treated as a mismatch or lower the confidence score — only genuine structural/template differences (wrong letterhead, completely different layout, missing or different fee-category wording, no resemblance to the institution's standard format) should affect the structural-match portion of the assessment.

### 3.3 Combining into one confidence score
Groq should return one overall confidence score (continuing to use the existing 0.85 threshold already established in this feature) that reflects both the structural-match assessment and the content-validation assessment together, along with a brief stated reason for its judgment (useful both for debugging this feature during development and for showing context to a TPO during manual review, per Part 4). Design the exact prompt so Groq returns this as strict structured output (a defined JSON shape with, at minimum, an overall confidence number, a structural_match sub-assessment, a content_valid sub-assessment, and a short reasoning string) rather than freeform prose, consistent with how structured AI outputs are already handled elsewhere in this project.

### 3.4 The decision point — unchanged mechanism
Exactly as today: confidence ≥ 0.85 auto-sets `fee_verified = true` on the student's account, no human involved. Confidence < 0.85 does not auto-reject — it flags the receipt for manual TPO review instead.

---

## PART 4 — TPO Manual Review Queue

### 4.1 Confirm whether this already exists — this is a prerequisite, not optional
Before building anything new here, check whether a working, real (not placeholder) screen already exists for a TPO to see and act on fee receipts that were flagged for manual review by the existing (pre-sample) version of this feature. If this screen does not yet exist as real, functioning frontend code, it must be built as part of this task — a verification feature whose "flagged for review" outcome has nowhere real to go is not actually complete, regardless of how good the AI judgment feeding into it is.

### 4.2 What the review screen must show, given the new sample-comparison capability
For each flagged receipt, show the TPO: the student's uploaded receipt (rendered/viewable, not just its extracted text), the college's reference sample side by side for visual comparison (only where Path B applied — if Path A applied because no sample exists yet, simply don't show a comparison panel), and Groq's returned structured assessment from Part 3.3 (the overall confidence score, the structural-match sub-assessment, the content-validation sub-assessment, and its stated reasoning) so the TPO understands WHY it was flagged, not just that it was. Give the TPO a simple Approve/Reject action, which sets `fee_verified` accordingly on manual override.

### 4.3 What approving or rejecting should do beyond the fee_verified flag
On approval, in addition to setting `fee_verified = true`, consider (optional but recommended) storing that this particular approval was a manual TPO override rather than an AI auto-pass, distinct from step in Part 3.4 — this distinction is useful later if anyone ever wants to audit how many verifications were fully automated versus how many needed a human, which is a reasonable thing for a college's Admin or TPO to want visibility into over time.

---

## PART 5 — Database Schema Changes

### 5.1 New table: reference sample storage
Create a table, something like `fee_receipt_templates`: `id`, `college_id` (foreign key, exactly like every other college-scoped table in this project), `file_path` (or however uploaded files are already referenced elsewhere in this project's existing fee-receipt storage), `extracted_text` (the OCR output from Part 2.3, stored once and reused for every future comparison), `uploaded_by` (the Admin user), `uploaded_at`, `is_active` (boolean — supports Part 2.4's replace-and-retain-history behavior, only one row per college should ever be `is_active = true` at a time).

### 5.2 Changes to the existing fee receipt / verification table
Add columns to whichever existing table already stores a student's fee receipt verification result: `matched_against_template_id` (nullable foreign key to `fee_receipt_templates`, populated only when Path B was used, null when Path A's fallback applied — this lets you always know afterward whether a given verification benefited from template comparison or not), `structural_match_result` and `content_valid_result` (the two sub-assessments from Part 3.3, stored separately even though they're combined into one overall confidence score, since retaining them separately is useful for later debugging or for display in the TPO review screen from Part 4.2), and `verified_by` (nullable — populated with a TPO's user id if verification happened via manual approval per Part 4.3, left null if it was a fully automatic AI pass).

---

## PART 6 — Edge Cases and Things to Get Right

### 6.1 A college with a sample that later stops making sense (format genuinely changed but Admin hasn't updated it)
If a college's actual receipt format changes (new academic year, new fee structure) but the Admin hasn't uploaded a new sample yet, every student's receipt will now genuinely and correctly differ structurally from the outdated sample, which will correctly lower confidence scores and route more receipts to manual review than usual. This is arguably correct behavior, not a bug — but consider whether the TPO review screen (Part 4.2) should surface a hint like "structural match failing unusually often for this college — the reference sample may be outdated" if a noticeable spike in flagged-for-review receipts happens for one specific college in a short time window, since this is a realistic scenario that could otherwise cause confusion about why verification suddenly got stricter. This surfaced hint is a reasonable enhancement, not a strict requirement for this first version — but at minimum, make sure the Admin's "Fee Receipt Template" settings screen from Part 2.1 is easy to find and re-visit, so updating a stale sample is not a buried, hard-to-discover action.

### 6.2 Privacy of the sample receipt itself
Per Part 2.2's guidance to the Admin, the sample may or may not contain real personal information. Regardless of what the Admin actually uploads, treat the stored sample file and its extracted text with the same access-control care as any other uploaded document in this system — it should never be exposed to students, and should only be visible to that specific college's own Admin/TPO (for the comparison display in Part 4.2) and to the backend process performing the Groq comparison, never to any other college.

### 6.3 Multiple, genuinely different valid receipt formats at one college
Some colleges might legitimately issue different receipt formats for different purposes (e.g., one for placement/registration fees, a different one for other fee types) or different branches. If this project's fee verification only ever concerns the specific placement-related fee receipt (which appears to be the case based on the feature's existing purpose), scope this first version to a single reference sample per college, representing that one specific receipt type — do not build support for multiple named sample "categories" unless it becomes clear this is actually needed, since it adds real complexity (the student would need to somehow indicate which category their upload belongs to) for a scenario that may not actually apply here.

---

## PART 7 — Full End-to-End Sequence (restated plainly, for verification)

1. College Admin uploads one reference fee receipt for their college, once, via a new "Fee Receipt Template" settings screen.
2. Backend OCRs the sample and stores both the file and its extracted text, scoped to that college.
3. A student uploads their own fee receipt, same as today.
4. Backend OCRs the student's receipt, same as today.
5. Backend checks whether an active reference sample exists for that student's college.
6. If no sample exists: Groq judges the student's receipt alone, exactly as the feature works today (Path A).
7. If a sample exists: Groq receives both the student's receipt and the college's sample, explicitly instructed to separately assess structural/template similarity and content validity, and explicitly instructed that differing receipt numbers/names/amounts/dates between the two are expected and not a mismatch (Path B).
8. Groq returns one combined confidence score plus its two sub-assessments and reasoning.
9. Confidence ≥ 0.85 auto-verifies the student, no human involved.
10. Confidence < 0.85 flags the receipt for manual TPO review, shown with the sample side by side and Groq's full reasoning.
11. TPO approves or rejects manually, which sets the final `fee_verified` outcome.
12. Once `fee_verified = true` (by either path), the student is unblocked from applying to placement drives, exactly as today.

---

## PART 8 — Explicit Non-Goals for This First Version

This first version does not need to: support multiple named receipt-format categories per college (Part 6.3); automatically detect and alert on a stale/outdated sample (the hint described in 6.1 is a nice-to-have, not required); or build any student-facing visibility into the sample receipt (students should never see another document's content as part of this feature — the comparison happens entirely behind the scenes on the backend and, when review is needed, in front of the TPO only).
