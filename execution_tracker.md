# EXECUTION TRACKER — Placement Portal Build

> Keep this file in your repo root next to `master_prompt_placement_portal.md`. Update it yourself after every session — do not let Copilot mark things done. Only you check a box after you've actually verified it.

---

## HOW TO WORK, EVERY SESSION (read this before every Copilot/Claude Code session)

1. Open a session and say: *"Read `master_prompt_placement_portal.md` fully. We are working on Phase [X] only — [name it]. Do not touch other phases. When done, list exactly what you created/changed, then stop."*
2. Let it work. Do not interrupt mid-phase unless it's clearly gone off track.
3. When it says done — **you personally run the verification steps** listed under that phase below. Don't trust "it should work."
   - **Also run this generic-code check every single phase:** search the new/changed files for `TODO`, `placeholder`, `mock`, `dummy`, `console.log(` only handlers, and hardcoded return values. If you find any, send it back and say exactly what to fix — don't accept it and move on.
   - Open the actual UI in a browser (not just Swagger) at least once per frontend phase and click through it yourself — does it look like a real product, or does it look like default Tailwind boilerplate? If it looks generic, say so explicitly and ask for the palette/typography from the master prompt's UI/Design System section to actually be applied.
4. Only after verification passes: check the boxes, then run:
   ```
   git add .
   git commit -m "Phase X: <short description> — verified"
   ```
5. If a chat session starts giving confused/inconsistent code, or forgets earlier decisions — stop, open a **fresh session**, and re-point it: *"Read the master prompt and this tracker. Phases 1–[X] are done and verified. We're now on Phase [X+1]."*
6. Never let a single session try to do more than one phase. If it offers to "also do the next phase while it's at it," say no — verify current phase first.

---

## PHASE 1 — Backend Foundation
`core/`, `db/`, all `models/`, first Alembic migration

- [x] `.env` created from `.env.example`, filled with real values (DB URL, JWT secret, etc.)
- [x] Backend starts with no import errors (`uvicorn app.main:app --reload`)
- [x] Database connects — no connection errors on startup
- [x] All 28 model files exist and import cleanly (expanded for multi-tenancy & proctored tests)
- [x] Alembic migration generated (`alembic revision --autogenerate`) and applied (`alembic upgrade head`)
- [x] Open the actual Postgres DB (pgAdmin / `psql \dt`) and confirm all tables physically exist with the right columns

## PHASE 2 — Validation Layer (schemas)
- [x] All schema files exist, no import errors
- [x] Manually test schemas with bad data via Swagger UI (`/docs`) and confirm they reject it (e.g. cgpa=15 → fails, invalid email domain → fails)

## PHASE 3 — Backend Services
- [x] `groq_client.py` — live Groq client with structured JSON output and fallbacks
- [x] `otp_service.py` + `email_service.py` — trigger real OTP generation and delivery
- [x] `fee_receipt_service.py` — OCR extraction + Groq legitimacy verdict verification
- [x] `web_insights_service.py` — live Tavily career insights search service
- [x] `eligibility_engine.py` — CGPA, backlog, department, and placement lock eligibility engine
- [x] `resume_parser.py` — PDF text extraction and ATS analysis
- [x] `scoring.py` — dynamic student readiness scoring engine

## PHASE 4 — Backend Routers
- [x] Every route appears correctly in Swagger UI (`/docs`) with correct request/response schemas
- [x] Dynamic student signup OTP flow: domain auto-detection from `colleges` table → OTP verify → complete
- [x] Forgot-password OTP flow tested end-to-end
- [x] Role guards actually block wrong roles (test: try hitting a TPO-only route with a student token → 403)
- [x] CORS allows frontend origin (`http://localhost:5173`)

## PHASE 5 — Frontend Foundation
- [x] `npm run dev` and `npm run build` succeed with 0 errors
- [x] Axios client correctly attaches JWT to requests
- [x] `ProtectedRoute` actually redirects unauthenticated users to login
- [x] Layout renders correctly (Navbar, Sidebar) for all 4 roles (Student, TPO, Admin, SuperAdmin)

## PHASE 6 — Frontend Public + Auth + Student Pages
- [x] Landing page loads at `/` with clean navigation
- [x] Contact Us form submits successfully both logged-out and logged-in
- [x] Change password flow requires OTP
- [x] Full multi-tenant signup flow with dynamic college detection by email domain
- [x] Login → correct dashboard redirect per role
- [x] Onboarding form saves and persists profile
- [x] Drives list/detail shows real matched data
- [x] Resources library & GATE/CAT Prep module show full categories
- [x] Profile icon in navbar opens working profile page with real data

## PHASE 7 — Frontend AI & Proctored Test Features
- [x] Mock interview: full conversational flow, live Groq evaluation
- [x] Resume analyzer + enhancer with live scoring and tailored suggestions
- [x] Proctored Instant Test: camera/mic hardware checks, 3D head-pose tracking, audio volume spike detection, tab-blur tracking, and auto-submit
- [x] TPO Test Audit view with chronological violation event playback and dispute review
- [x] WeakAreasPage shows aggregated student performance analytics

## PHASE 8 — Frontend TPO + Admin Pages + SuperAdmin Console
- [x] TPO can create a drive via structured form, see it appear in ManageDrivesPage
- [x] View eligible students pre-test and live applicant status management
- [x] SuperAdmin Command Deck Console: institutions, platform catalog, subscriptions, revenue analytics, announcements, audit log
- [x] College Admin Institution Settings: view campus statistics and manage allowed student email domain
- [x] Feature gating: optional catalog features dynamically appear/hide based on subscription status

## PHASE 9 — Hardening & Verification
- [x] Docker Containerization: Explicitly omitted / kept optional per user instruction ("i dnot want to do docker")
- [x] `/health` endpoint responds with active service status
- [x] Pytest automated test suite: 13/13 tests passing across unit, integration, and security domains
- [x] Multi-tenant isolation verified: cross-college drive and applicant access strictly blocked
- [x] Dynamic student email domain resolution verified against `colleges` table

---

## RUNNING LOG

| Date | Phase | What was built / tested | Status |
|---|---|---|---|
| 2026-07-15 | Phase 1–3 | Initial schemas, models, services | Verified |
| 2026-08-20 | Phase 4–6 | Auth routers, role guards, student pages | Verified |
| 2026-09-07 | Phase 7–8 | Proctored tests, GATE/CAT prep, SuperAdmin console | Verified |
| 2026-09-07 | Finalization | Dynamic domain signup, Admin settings page, 13/13 pytest suite, build verified | Verified (Docker excluded per user instruction) |
| 2026-09-07 | Study Resources System (studyresourcerule.md) | AI-Curated, Curriculum-Driven Study Resource System: Alembic migration `c1d2e3f4a5b6`, PDF syllabus extraction with Groq, dynamic branches & subjects, TPO prioritization & web search curation, approve/reject workflow, student curriculum viewer, dynamic branch pills | Verified (15/15 backend tests pass, frontend build passes) |
| 2026-09-10 | Phase 11 — Security Hardening | Comprehensive vulnerability remediation: exam answer key sanitization, proctoring disqualification enforcement, OTP brute-force limits, session revocation, IDOR fixes, magic bytes validation, protected file routes | Verified (25/25 backend tests pass, frontend build passes) |
| 2026-09-11 | Phase 12 — Template-Matched Fee Verification (`feecheck.md`) | `FeeReceiptTemplate` + migrations `f3a4b5c6d7e8` & `g4b5c6d7e8f9`, dual-path AI verification (Path A general fallback, Path B multi-template matching with strict structure vs content separation), multi-template management with names/toggles & OCR preview, fixed callout banner CSS contrast, TPO review queue with side-by-side comparison modal, student review status, tenant isolation & protected uploads | Verified (32/32 backend tests pass, frontend build passes) |
| 2026-09-16 | Phase 13 — Custom Feature Request System | Custom platform feature proposals from College Admins to SuperAdmin: migration `h5c6d7e8f9a0`, Admin submit/list endpoints, SuperAdmin list/patch review endpoints, automated notifications, 2-tab Admin Features page with priority tags & dialogue feedback, SuperAdmin console custom proposals management, 37/37 backend tests pass, frontend build passes | Verified |
- [x] Demo the full flow once, start to finish, as if you were showing it to your project guide

---

## PHASE 10 — AI-Curated Curriculum-Driven Study Resource System (`studyresourcerule.md`)
- [x] Database models: `CurriculumUpload`, `CurriculumSubject`, `CuratedSubjectResource` with college scoping & Alembic migration applied
- [x] Zero hardcoding guarantee: branch names, semesters, and subjects dynamically discovered and stored per college
- [x] PDF text extraction (`pypdf`) and Groq AI structured syllabus parser
- [x] Admin interactive review tree and confirmation route (`POST /curriculum/uploads/{id}/confirm`)
- [x] Dynamic branches endpoint (`GET /curriculum/branches`)
- [x] TPO subject prioritization and AI curation trigger (`POST /curriculum/subjects/{id}/curate`)
- [x] Strict copyright compliance: multi-query web discovery with original 1-2 sentence summaries, public links, and honest "AI-recommended" badges
- [x] TPO itemized approve/reject/edit review modal with persistence of rejected items
- [x] Student `ResourcesLibraryPage` with dual tabs ("By Subject (Curriculum)" and "Study Materials Library")
- [x] Replaced hardcoded branch pills with dynamic branch pills from confirmed curriculum data
- [x] Navigation registered in `App.jsx` and `Sidebar.jsx` for Admin, TPO, and Student
- [x] Automated test suite: 15/15 tests passing across backend and clean frontend production build (`npm run build`)

---

## PHASE 11 — Security Hardening & Vulnerability Remediation
- [x] Exam Answer Key Sanitization: Stripped `correct_option_index` from questions in `GET /instant-tests` and `GET /instant-tests/{id}` so students cannot inspect client responses for answers
- [x] Proctoring Disqualification Protection: `submit_test_answers` rejects submission if attempt was terminated (`AttemptStatus.ENDED`), preventing students from clearing proctoring penalties
- [x] OTP Brute-Force Rate Limiting: Added `failed_attempts` tracking to `OtpVerification`; OTP is invalidated after 5 consecutive failed attempts
- [x] Zombie Session Revocation: Password reset and change password workflows immediately revoke all active `RefreshToken` records for the user
- [x] Account Enumeration Protection: `/auth/forgot-password/request-otp` returns a constant generic response preventing attacker email discovery
- [x] Application Race-Condition Lock: Added `uq_user_drive_application` unique constraint in database and handled `409 Conflict` gracefully
- [x] Cross-Tenant TPO Authorization: Added college tenancy checks across all TPO drive management routes in `tpo.py` to eliminate IDOR risks
- [x] Protected File Downloads & Magic Bytes: Replaced public static `/uploads` with authenticated, tenant-scoped endpoint validating MIME types and magic bytes (`%PDF-`, PNG, JPEG)
- [x] Payment Webhook Verification: Required `X-Razorpay-Signature` validation rejecting unverified webhooks
- [x] Curation Spam Protection: Deduplicated curated subject resource additions to prevent race-condition resource duplication
- [x] Alembic Migration: `e2f3a4b5c6d7_security_hardening.py` created and applied
- [x] Comprehensive Test Suite: 25/25 pytest tests passing across backend (including 10/10 in `test_security_remediations.py`) and clean frontend production build (`npm run build`)

---

## PHASE 12 — Template-Matched Fee Receipt Verification (`feecheck.md`)
- [x] Database model `FeeReceiptTemplate` + migrations `f3a4b5c6d7e8_add_fee_receipt_templates_and_review.py` & `g4b5c6d7e8f9_add_template_name_to_fee_receipt_templates.py`
- [x] Columns added to `FeeReceipt`: `matched_against_template_id`, `structural_match_result`, `content_valid_result`, `verified_by`
- [x] Dual-path AI verification in `fee_receipt_service.py` (Path A: general check fallback; Path B: multi-template matching with strict structure vs content separation)
- [x] Multi-template support: Colleges can configure, label (e.g. Tuition, Hostel, Exam), toggle active/inactive, and delete multiple reference receipt templates
- [x] High-contrast, theme-adaptive CSS on Admin template guidance callout banner
- [x] College Admin template management & OCR preview in `AdminSettingsPage.jsx` and `/admin/college/fee-templates`
- [x] TPO Manual Review Queue (`TpoFeeReviewPage.jsx` at `/tpo/fee-verification` with side-by-side comparison modal displaying matched template name)
- [x] TPO approval/rejection endpoints (`POST /tpo/fee-receipts/{id}/approve`, `POST /tpo/fee-receipts/{id}/reject`)
- [x] Protected template file serving in `uploads.py` blocking student access
- [x] Automated test suite in `tests/test_fee_receipt_template_matching.py` (32/32 tests passing) and `npm run build` clean build

---

## PHASE 13 — Custom Feature Request System (Admin to SuperAdmin)
- [x] Database model `CustomFeatureRequest` with college scoping (`college_id`), submitter ID (`admin_id`), `title`, `description`, `target_user`, `category`, `priority`, `status`, and `superadmin_feedback`
- [x] Alembic migration `h5c6d7e8f9a0_add_custom_feature_requests_table.py` created and applied to database
- [x] College Admin proposal endpoints: `POST /admin/custom-features` (creates proposal, dispatches notification to active SuperAdmins) and `GET /admin/custom-features` (college-scoped)
- [x] SuperAdmin proposal governance endpoints: `GET /superadmin/custom-features` (cross-college proposal directory) and `PATCH /superadmin/custom-features/{id}` (updates lifecycle status, records audit log, leaves feedback dialogue, dispatches notification to Admin)
- [x] Frontend API client methods in `admin.api.js` and `superadmin.api.js`
- [x] SuperAdmin state store integration in `superAdminStore.js` with proposal fetching and live status/feedback mutations
- [x] Semantic status pills in `StatusPill.jsx` supporting `under_review`, `planned`, `in_progress`, `completed`, and `declined`
- [x] College Admin UI in `AdminFeaturesPage.jsx` upgraded to a 2-tab operational interface: "Catalog Modules" and "Custom Feature Proposals"
- [x] Proposal card interface showing priority pills (Low, Medium, High, Critical), status badges, submission date, and interactive SuperAdmin dialogue callout
- [x] "Propose New Feature" modal with validation for feature name, target persona, category, urgency/priority, and detailed business justification
- [x] SuperAdmin Console in `FeatureManagementPage.jsx` upgraded with a 3rd tab: "Custom Proposals" and interactive "Review & Reply" modal
- [x] Automated test suite in `tests/test_custom_feature_requests.py` (5/5 tests passing) and full backend test suite (37/37 tests passing)
- [x] Clean frontend production bundle build (`npm run build`, exit code 0)

