# MASTER PROMPT — AI-Powered Smart Placement & Career Preparation Portal (Full Stack: FastAPI + React)

> Copy everything below this line and paste into Claude Code / Copilot as one single project instruction.

---

## ROLE
You are a senior full-stack engineer. Build a **complete, production-grade, well-structured full-stack project** — FastAPI backend + React frontend — for a college placement portal with three user roles: **Student, Admin, TPO**.

**CRITICAL WORKING INSTRUCTIONS — follow strictly, do not deviate:**
1. Work **step by step, in phases** (phase list given at the very end of this document). Do NOT jump ahead or generate everything randomly out of order.
2. After each phase, briefly list what was created/completed before moving to the next phase.
3. Do **NOT skip, shorten, or silently drop any single feature, field, table, endpoint, or screen** listed in this document — every item below is mandatory, not optional/example.
4. If something is ambiguous, make the most sensible assumption, state the assumption in one line, and continue — do not stop and ask unless truly blocking.
5. At the **very end**, perform a **full self cross-check pass**: go through every section of this document one by one (tables, endpoints, pages, validations, security items) and explicitly confirm each one was implemented. Report any item that was missed or partially done, and then immediately fix it. Do not consider the project done until this final cross-check is complete and clean.
6. **No generic/placeholder logic, anywhere.** Never write a function that returns hardcoded/fake data, a `TODO`, `// implement later`, `pass  # placeholder`, or a mock response dressed up to look real. If a piece of logic genuinely can't be completed in this phase (e.g. depends on a later phase), say so explicitly out loud instead of faking it — do not silently stub it and move on.
7. **Mandatory end-of-phase self-test, before declaring a phase done:** re-read every file you just wrote in this phase, and check for (a) unused imports or dead code, (b) any hardcoded/mock return values, (c) any endpoint that isn't actually wired to the database, (d) any UI component with static/dummy data instead of a real API call, (e) any obvious runtime error (missing import, wrong variable name, mismatched schema field). Fix anything you find before reporting the phase complete. List what you checked, not just what you built.
8. This is a **real, demoable, production-style build**, not a prototype or a tutorial-quality skeleton. Every button should do the real thing it's supposed to do — no "coming soon", no dead links, no console.log-only handlers.

## TECH STACK (fixed — do not substitute)

**Backend:**
- **Framework:** FastAPI (Python 3.11+)
- **ORM:** SQLAlchemy 2.0 (declarative models)
- **DB:** PostgreSQL
- **Validation:** Pydantic v2 (separate schema files, request/response models split)
- **Auth:** JWT (access + refresh token), OAuth2PasswordBearer, bcrypt/passlib for password hashing
- **AI/LLM:** Groq API only — **strictly do NOT use Gemini or any other provider anywhere.** Use the best available Groq-hosted model for reasoning/quality (currently Groq's largest Llama 3.3/4 class or whichever is the current top general-purpose model on Groq — pick the most capable + cost-efficient option available at build time), and make the model name a config variable (`GROQ_MODEL`) so it can be swapped without code changes. Use **one single official `GROQ_API_KEY`** stored only in `.env` — never hardcode it, never expose it to frontend, all Groq calls happen server-side only.
- **Migrations:** Alembic
- **Env config:** pydantic-settings + `.env`
- **File storage:** local `/uploads` folder (resume PDFs, fee receipts), abstracted behind a storage service so it can be swapped for S3 later
- **Email/OTP:** `fastapi-mail` (or `smtplib` wrapper) for sending OTP emails; OTPs are 6-digit, hashed before storage, expire in 5–10 minutes, single-use
- **OCR:** `pytesseract` + `pdf2image`/`Pillow` to extract text from uploaded fee receipt (image or PDF), then Groq LLM validates the extracted text for legitimacy
- **Live Web Search:** a search API such as Tavily or Serper (pick one, keep it provider-agnostic behind a config var `SEARCH_PROVIDER`/`SEARCH_API_KEY`) used to fetch real-time external job openings and resume/industry trend snippets based on the student's profile; results are then summarized/personalized by Groq — Groq itself does not browse the web, the search API supplies the raw data

**Frontend:**
- **Framework:** React.js (Vite, not CRA)
- **Styling:** Tailwind CSS
- **Routing:** React Router v6, with protected routes per role
- **State/Data:** React Query (TanStack Query) for API calls + caching, plus lightweight context/zustand for auth state
- **HTTP client:** Axios with interceptor for JWT attach + auto-refresh on 401
- **Charts:** Recharts (for TPO/Admin analytics)
- **Forms:** react-hook-form + zod for client-side validation (mirrors backend Pydantic rules)

## UI / DESIGN SYSTEM (must follow — do not default to generic AI-generated UI)
This must look like a real, modern, thoughtfully-designed product — not a default Tailwind starter with purple-to-blue gradients, `indigo-600` buttons everywhere, and Inter font on a plain white background. Specifically:

- **Color palette:** pick one deliberate, cohesive palette and use it consistently — do NOT use loud/saturated primary colors as the dominant UI color. A good direction for this kind of product: a calm deep tone as the primary brand color (e.g. a muted slate-teal, deep forest green, or warm charcoal-navy — pick one, not multiple competing "primary" colors), a warm neutral background (off-white/soft cream, not pure `#FFFFFF`), and one restrained accent color used sparingly for key CTAs only (e.g. a muted amber or coral — never more than one accent). Status colors (success/warning/error) should be desaturated, not neon.
- **Typography:** pick a distinct pairing, not the Tailwind/Inter default everywhere — e.g. a slightly characterful sans for headings (Sora, Manrope, Lexend, or similar) paired with a clean readable body font (Inter or system-ui is fine for body text only). Establish a clear type scale (don't let every heading be the same size).
- **Depth and structure:** favor soft shadows, subtle borders, and generous whitespace over heavy borders or harsh drop-shadows. Rounded corners should be consistent (pick one radius scale, e.g. 8px/12px/16px, and stick to it).
- **Role-based visual identity:** give each of the 3 dashboards (student/TPO/admin) a subtly distinct accent within the same overall palette — e.g. same neutrals and typography everywhere, but a slightly different accent hue per role — so it's immediately visually clear which dashboard the user is in.
- **Consistency:** build a small shared component library first (buttons, inputs, cards, badges, modals) with the palette baked in via Tailwind config/CSS variables, then reuse those everywhere — never hand-roll one-off styled components per page.
- **No stock/generic icon soup:** use `lucide-react` icons consistently sized and weighted, not a mismatched icon set.
- Every screen should feel like part of the same product — if two pages look like they came from different design systems, that's a bug, fix it before moving on.

## PROJECT FOLDER STRUCTURE (generate exactly this)
```
placement-portal-backend/
├── alembic/
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py          # pydantic-settings, env vars
│   │   ├── security.py        # JWT create/verify, password hash
│   │   └── dependencies.py    # get_current_user, role-based guards
│   ├── db/
│   │   ├── base.py            # Base declarative class
│   │   └── session.py         # engine, SessionLocal, get_db
│   ├── models/                # SQLAlchemy models, one file per entity
│   │   ├── user.py
│   │   ├── profile.py
│   │   ├── resume.py
│   │   ├── company.py
│   │   ├── drive.py
│   │   ├── application.py
│   │   ├── interview_session.py
│   │   ├── question.py
│   │   ├── answer.py
│   │   ├── instant_test.py
│   │   ├── test_attempt.py
│   │   ├── resource.py        # OS/DBMS/CN videos, aptitude material
│   │   ├── notification.py
│   │   ├── analytics.py
│   │   ├── otp_verification.py    # signup + forgot-password OTPs
│   │   ├── fee_receipt.py         # placement fee receipt + AI verification result
│   │   ├── refresh_token.py       # backs real server-side logout
│   │   ├── dashboard_insight.py   # cached live web-search + AI suggestions per student
│   │   └── contact_message.py     # public Contact Us submissions
│   ├── schemas/                # Pydantic v2 — request/response DTOs, one file per entity (mirrors models/)
│   │   ├── user.py
│   │   ├── profile.py
│   │   ├── resume.py
│   │   ├── company.py
│   │   ├── drive.py
│   │   ├── application.py
│   │   ├── interview.py
│   │   ├── instant_test.py
│   │   ├── test_attempt.py
│   │   ├── resource.py
│   │   ├── notification.py
│   │   ├── analytics.py
│   │   ├── otp_verification.py
│   │   ├── fee_receipt.py
│   │   ├── dashboard_insight.py
│   │   └── contact_message.py
│   ├── routers/                # one router per feature/domain
│   │   ├── auth.py             # signup OTP flow, login, forgot-password OTP flow, OTP-verified change-password
│   │   ├── student_profile.py  # includes GET /student/weak-areas (aggregated tracking)
│   │   ├── resume.py
│   │   ├── fee_verification.py     # upload + check placement fee receipt
│   │   ├── drives.py
│   │   ├── applications.py
│   │   ├── mock_interview.py
│   │   ├── resume_analyzer.py
│   │   ├── resume_enhancer.py
│   │   ├── instant_test.py
│   │   ├── resources.py
│   │   ├── notifications.py    # list, mark-read, warn/notify endpoints
│   │   ├── insights.py         # GET dashboard insights, POST manual refresh
│   │   ├── contact.py          # public POST /contact/submit + role-guarded views for admin/tpo
│   │   ├── tpo.py
│   │   ├── admin.py
│   │   └── analytics.py
│   ├── services/               # business logic, keep routers thin
│   │   ├── groq_client.py      # single wrapper around Groq API calls
│   │   ├── eligibility_engine.py   # matches student profile vs drive criteria
│   │   ├── resume_parser.py    # extract text from PDF resume
│   │   ├── interview_engine.py # builds prompts, manages Q&A flow, scoring
│   │   ├── test_generator.py   # TPO instant test question generation
│   │   ├── scoring.py          # placement readiness score calc
│   │   ├── otp_service.py      # generate/hash/verify/expire OTPs
│   │   ├── email_service.py    # sends OTP + notification emails
│   │   ├── fee_receipt_service.py  # OCR extraction + Groq legitimacy check
│   │   └── web_insights_service.py # live search API calls + Groq summarization for dashboard insights
│   └── utils/
│       ├── file_storage.py
│       └── exceptions.py
├── uploads/
├── .env.example
├── alembic.ini
├── requirements.txt
└── README.md
```

## FRONTEND FOLDER STRUCTURE (generate exactly this)
```
placement-portal-frontend/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── api/
│   │   ├── axiosClient.js        # base axios instance, JWT interceptor, refresh logic
│   │   ├── auth.api.js
│   │   ├── student.api.js
│   │   ├── drives.api.js
│   │   ├── interview.api.js
│   │   ├── resume.api.js
│   │   ├── tpo.api.js
│   │   ├── admin.api.js
│   │   ├── resources.api.js
│   │   ├── notifications.api.js
│   │   ├── insights.api.js
│   │   └── contact.api.js
│   ├── auth/
│   │   ├── AuthContext.jsx       # stores user, token, role
│   │   ├── ProtectedRoute.jsx    # role-based route guard — wraps everything under /student, /tpo, /admin; `/`, `/contact`, `/login`, `/signup*`, `/forgot-password*` stay public/unwrapped
│   │   └── useAuth.js
│   ├── pages/
│   │   ├── public/
│   │   │   ├── LandingPage.jsx           # public homepage — hero, feature highlights, Sign In / Sign Up CTAs
│   │   │   └── ContactUsPage.jsx         # public form: name, email, message, category (general/placement) → POST /contact/submit
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx             # email + password, used by all 3 roles
│   │   │   ├── SignupEmailPage.jsx       # student only: enter BVM email, triggers OTP
│   │   │   ├── SignupOtpPage.jsx         # enter 6-digit OTP to verify email
│   │   │   ├── SignupPasswordPage.jsx    # set password after OTP verified → submit
│   │   │   ├── ForgotPasswordEmailPage.jsx
│   │   │   ├── ForgotPasswordOtpPage.jsx
│   │   │   ├── ResetPasswordPage.jsx
│   │   │   └── ChangePasswordPage.jsx    # logged-in, OTP-gated: request-otp → verify-otp → current+new password
│   │   ├── shared/
│   │   │   └── ProfilePage.jsx           # view/edit profile, reachable via navbar icon on all 3 dashboards; links to ChangePasswordPage
│   │   ├── student/
│   │   │   ├── OnboardingPage.jsx        # skills, cgpa, backlogs, 10th/12th, exam percentile
│   │   │   ├── ResumeUploadPage.jsx      # also shows full resume history (original + enhanced versions) with a "make active" toggle
│   │   │   ├── FeeReceiptUploadPage.jsx  # mandatory gate before applying to any drive
│   │   │   ├── StudentDashboard.jsx      # matched drives + readiness score summary + Live Career Insights widget; shows locked banner if fee not verified
│   │   │   ├── DrivesListPage.jsx
│   │   │   ├── DriveDetailPage.jsx       # Apply button disabled + tooltip until fee_verified
│   │   │   ├── ApplicationsTrackerPage.jsx
│   │   │   ├── ResourcesLibraryPage.jsx  # aptitude/comm/os/dbms/cn/java/python, filtered by video/blog/document
│   │   │   ├── MockInterviewSetupPage.jsx    # select company/stack OR from resume
│   │   │   ├── MockInterviewSessionPage.jsx  # one-by-one Q&A chat-style UI
│   │   │   ├── MockInterviewResultPage.jsx   # score + weak areas
│   │   │   ├── ResumeAnalyzerPage.jsx
│   │   │   ├── ResumeEnhancerPage.jsx        # step-by-step Q&A then final resume
│   │   │   ├── InstantTestAttemptPage.jsx
│   │   │   └── WeakAreasPage.jsx          # timeline of weak areas across all mock interviews + instant tests, recurring gaps highlighted
│   │   ├── tpo/
│   │   │   ├── TpoDashboard.jsx
│   │   │   ├── CreateDrivePage.jsx           # structured criteria form (cgpa, backlog, department, %s) → Create
│   │   │   ├── ManageDrivesPage.jsx
│   │   │   ├── DriveDetailPage.jsx           # 3 action buttons: Create/Open Test, View Eligible Students, Close Test
│   │   │   ├── DriveApplicantsPage.jsx       # eligible/not-eligible, approve/shortlist
│   │   │   ├── EligibleStudentsPage.jsx      # filter-only eligibility list, shown pre-test
│   │   │   ├── ManageStudentsPage.jsx        # remove from drive / deactivate
│   │   │   ├── AllStudentsCardPage.jsx       # every student as a plain card, no filters
│   │   │   ├── CreateInstantTestPage.jsx     # prompt/topics, min passing marks, optional top-N toggle
│   │   │   ├── InstantTestResultsPage.jsx    # marks + charts, Close Test action
│   │   │   ├── TpoAnalyticsPage.jsx          # department-wise applied/selected, package top/median/avg
│   │   │   └── ContactMessagesPage.jsx       # placement-related Contact Us submissions only
│   │   └── admin/
│   │       ├── AdminDashboard.jsx
│   │       ├── AllDrivesPage.jsx
│   │       ├── AllStudentsPage.jsx           # filterable, detailed
│   │       ├── AllStudentsCardPage.jsx       # every student as a plain card, no filters
│   │       ├── ManageResourcesPage.jsx       # upload/manage videos
│   │       ├── ContactMessagesPage.jsx       # all Contact Us submissions (general + placement)
│   │       └── AdminAnalyticsPage.jsx        # global charts incl. department + package stats
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx            # includes NotificationBell
│   │   │   ├── NotificationBell.jsx  # lives in Navbar on ALL 3 dashboards; polls GET /notifications every 15–20s via React Query's refetchInterval (true "live" feel without needing WebSockets for a college project), shows unread badge count + dropdown list, click-to-mark-read
│   │   │   ├── Sidebar.jsx           # role-specific nav items
│   │   │   └── DashboardLayout.jsx
│   │   ├── common/
│   │   │   ├── Loader.jsx
│   │   │   ├── ErrorBanner.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── Modal.jsx
│   │   │   └── StatCard.jsx
│   │   ├── forms/
│   │   │   ├── OnboardingForm.jsx
│   │   │   ├── DriveForm.jsx
│   │   │   └── FileUploadInput.jsx
│   │   ├── insights/
│   │   │   ├── InsightsWidget.jsx        # "Live Career Insights" card grid on StudentDashboard
│   │   │   ├── ExternalOpportunityCard.jsx  # external job/opening with source link
│   │   │   └── ResumeSuggestionCard.jsx     # AI-generated resume tip tied to a live trend
│   │   ├── interview/
│   │   │   ├── ChatBubble.jsx
│   │   │   ├── QuestionCard.jsx
│   │   │   └── ScoreBreakdown.jsx
│   │   └── charts/
│   │       ├── BarChartCard.jsx
│   │       ├── PieChartCard.jsx
│   │       └── LineTrendCard.jsx
│   ├── hooks/
│   │   ├── useDrives.js
│   │   ├── useInterviewSession.js
│   │   └── useAnalytics.js
│   ├── utils/
│   │   ├── validators.js         # zod schemas mirroring backend Pydantic rules
│   │   └── constants.js
│   └── styles/
│       └── index.css             # Tailwind base
├── index.html
├── vite.config.js
├── tailwind.config.js
├── package.json
└── .env.example                  # VITE_API_BASE_URL
```

## ROLES & AUTH
- `user_type` enum: `student`, `admin`, `tpo`
- **Student signup is strictly gated to the college email domain.** Email must match a strict regex enforcing the exact domain `@bvmengineering.ac.in` (case-insensitive, e.g. `23it408@bvmengineering.ac.in`). Reject anything else at the Pydantic schema level with a clear error — do not just check `.endswith()`, use a proper regex anchored to the full domain so subdomain tricks or lookalike domains can't slip through.
- **Admin and TPO accounts are NOT publicly self-signup.** They are created by a super-admin/seed script only (assumption — state this explicitly to the user). Only students use the public signup flow below. Admin/TPO simply log in with email + password.

### Student signup flow (OTP-based, no document upload at this stage)
1. `POST /auth/signup/request-otp` — body: college email only → validate domain regex → generate 6-digit OTP → hash it → store in `otp_verifications` table with `purpose=signup`, `expires_at` (5–10 min) → send via `email_service.py`
2. `POST /auth/signup/verify-otp` — body: email + otp → check hash match + not expired + not already used → mark OTP used → return a short-lived `signup_token` so the next step can't be skipped
3. `POST /auth/signup/complete` — body: email + `signup_token` + password → validate password rules → hash with bcrypt → create `users` row with `is_email_verified=true` → return JWT
- No resume, no documents, nothing else required at signup — exactly email → OTP → password → submit.

### Login (all roles)
- `POST /auth/login` — body: email + password → returns JWT access token (short-lived, e.g. 30 min) + refresh token (e.g. 7 days). Token payload includes `user_id`, `user_type`.
- **Brute-force protection:** every failed password attempt increments `users.failed_login_attempts`. After 5 consecutive failures, set `locked_until = now + 15 minutes` and reject further login attempts (even with the correct password) until that time passes, with a clear "too many attempts, try again in X minutes" message. A successful login resets `failed_login_attempts` to 0.
- `POST /auth/refresh`
- `POST /auth/logout` — revokes the refresh token server-side (store issued refresh tokens or a denylist so logout is real, not just a client-side token wipe)
- `GET /auth/me` — current user + role + `profile_complete` flag (student only) + `fee_verified` flag (student only)
- `PATCH /auth/profile` — update editable profile fields (name, skills, contact info, etc. depending on role). **Password changes are handled separately and require OTP, not bundled here.** Email is immutable for students (tied to their BVM identity) once verified.

### Change password (logged-in user, all roles — requires OTP, not just the old password)
1. `POST /auth/change-password/request-otp` — while logged in, triggers an OTP to the user's registered email (`purpose=change_password`)
2. `POST /auth/change-password/verify-otp` — email + otp → returns a short-lived `change_token`
3. `POST /auth/change-password/complete` — current password + new password + `change_token` → validates the current password AND the OTP token before updating → this double-check (something-you-know + something-you-were-just-sent) is deliberate for a security-sensitive action, not overkill

### Forgot password (OTP-based, same pattern as signup, all roles)
1. `POST /auth/forgot-password/request-otp` — email only → generate + hash + email OTP (`purpose=forgot_password`)
2. `POST /auth/forgot-password/verify-otp` — email + otp → returns short-lived `reset_token`
3. `POST /auth/forgot-password/reset` — email + `reset_token` + new password → update hashed password

- Role-based dependency guards: `require_role("student")`, `require_role("tpo")`, `require_role("admin")` used in routers.
- After first student login → if `profile` not completed, force redirect flag `profile_complete: false` in `/me` response so frontend knows to show onboarding form.

### Fee receipt gate (student only — mandatory before applying to any drive)
- After a student completes onboarding, the dashboard is otherwise fully **read-only**: they can view drives, resources, and their profile, but the "Apply" action on every drive is disabled until `fee_verified = true`.
- `POST /fee-verification/upload` — student uploads placement fee receipt (image or PDF) → `fee_receipt_service.py` runs OCR (`pytesseract`) to extract text → sends extracted text + expected criteria (amount, receipt/transaction ID present, valid date, recognizable payee) to Groq for a legitimacy check → Groq returns a structured verdict (`is_valid: true/false`, `confidence`, `reason`)
- Only if the AI verdict is unambiguous/high-confidence genuine does the backend set `users.fee_verified = true`. Anything less than fully confident → `fee_verified` stays `false` and the student sees the AI's reason, with an option to re-upload.
- `GET /fee-verification/status` — returns current `fee_verified` state + last AI feedback
- Every apply-to-drive endpoint (`POST /applications`) must check `fee_verified == true` server-side as well — never trust the frontend disabled-button state alone.

## DATABASE MODELS (core fields — expand sensibly)

**users**: id, email (unique, strictly `@bvmengineering.ac.in` for students), hashed_password, user_type, is_active, is_email_verified, fee_verified (student only, default false), failed_login_attempts (default 0), locked_until (nullable), created_at

**otp_verifications**: id, email, otp_hash, purpose (signup/forgot_password), expires_at, is_used, created_at

**fee_receipts**: id, user_id (FK), file_path, extracted_text, ai_verdict (valid/invalid), ai_confidence, ai_reason, verified_at, created_at

**profiles** (student only): id, user_id (FK), student_id (BVM roll number, auto-derived from the email prefix e.g. `23IT408` from `23it408@bvmengineering.ac.in`, shown read-only on profile), full_name, branch, cgpa, active_backlogs, tenth_percentage, twelfth_percentage, competitive_exam_name (JEE/GUJCET/etc — nullable), competitive_exam_percentile, skills (JSON/array), is_placed (boolean, default false — flips true on first `selected` application), placement_lock_override (boolean, default false — admin/TPO can grant this to let an already-placed student pursue a "dream company"), created_at, updated_at

**resumes**: id, user_id (FK), file_path, parsed_text, ai_score, ai_feedback, source (uploaded/enhanced), is_active (only one resume per student can be the active/default one used for applications and mock-interview-from-resume), created_at

**companies**: id, name, website, location, about, logo_url

**drives**: id, company_id (FK), role, jd_text, eligibility_criteria (JSON: min_cgpa, max_backlogs, department_list, min_tenth, min_twelfth, min_percentile), bond_details, deadline, status (open/closed), test_status (not_created/open/closed), created_by (tpo user_id), created_at

**applications**: id, user_id (FK), drive_id (FK), status (applied/eligible/not_eligible/shortlisted/rejected/selected/withdrawn), current_stage, package_offered (nullable, filled only when status=selected), applied_on

**interview_sessions**: id, user_id (FK), drive_id (nullable FK — null if generic mock), company_name, stack/skills, mode (aptitude/technical/coding/hr/full), overall_score, weak_areas (JSON), status, created_at

**questions**: id, session_id (FK), question_text, q_type (aptitude/technical/coding/hr), difficulty, order_index

**answers**: id, question_id (FK), answer_text, ai_feedback, score

**instant_tests**: id, drive_id (FK, nullable), created_by (tpo), prompt_config (JSON — topics/difficulty described by TPO), questions (JSON), min_passing_marks, use_top_n (boolean, default false), top_n_count (nullable — only meaningful if use_top_n is true), status (open/closed)

**test_attempts**: id, test_id (FK), user_id (FK), answers (JSON), score, weak_areas (JSON, nullable — populated when the test includes subjective/technical questions Groq can evaluate), submitted_at

**resources**: id, title, category (aptitude/communication/os/dbms/cn/interview_qna/java/python), content_type (video/blog/document), video_url (nullable), content (nullable — markdown/text body for blog or document type), created_by (admin)

**refresh_tokens**: id, user_id (FK), token_hash, is_revoked, expires_at, created_at — backs real logout (Phase 9 hardening can also add this earlier if preferred)

**notifications**: id, recipient_id (FK → users), sender_id (nullable FK → users, null for system-generated), type (info/warning/notice/system), message, is_read, created_at

**analytics**: id, user_id (FK, nullable for global), total_applications, interviews_taken, avg_score, readiness_score, updated_at

**dashboard_insights**: id, user_id (FK), external_opportunities (JSON — title, company, source_url, snippet), resume_suggestions (JSON — tip text, based_on_trend), trending_skills (JSON), generated_at, last_manual_refresh_at

**contact_messages**: id, name, email, message, category (general/placement — general routed to admin only, placement-related visible to both TPO and admin), submitted_by_user_id (nullable — filled if the sender was logged in), status (new/read/resolved), created_at

## FEATURE-BY-FEATURE REQUIREMENTS

### 1. Auth & Signup (strict BVM email + OTP)
- `POST /auth/signup/request-otp`, `POST /auth/signup/verify-otp`, `POST /auth/signup/complete` — see Roles & Auth section above for full flow
- `POST /auth/login` — returns access + refresh JWT
- `POST /auth/refresh`
- `GET /auth/me` — current user + profile_complete flag + fee_verified flag
- `POST /auth/forgot-password/request-otp`, `POST /auth/forgot-password/verify-otp`, `POST /auth/forgot-password/reset`

### 2. Student Onboarding (mandatory before dashboard access)
- `POST /student/profile` — skills, branch, cgpa, active_backlogs, 10th %, 12th %, competitive exam name + percentile
- `POST /student/resume` — upload resume PDF → parse with `resume_parser.py` → store parsed_text
- These fields are what `eligibility_engine.py` uses for drive matching/filtering later — enforce required fields at schema level (Pydantic validators for percentage ranges, cgpa 0-10, etc.)

### 2b. Placement Fee Receipt Verification (mandatory gate before applying to drives)
- `POST /fee-verification/upload` — student uploads receipt (image/PDF) → OCR extraction → Groq legitimacy check → sets `fee_verified` only on a confident genuine verdict
- `GET /fee-verification/status` — current status + AI feedback for re-upload guidance
- Until `fee_verified = true`, the student can view everything on the dashboard (drives, resources, profile) but every apply action is blocked, both on the frontend (disabled button + explanation) and the backend (403 if attempted anyway)

### 3. Student Dashboard
- `GET /drives/matched` — drives filtered by student's profile vs `eligibility_criteria` (uses eligibility_engine)
- `GET /resources` — filterable by category (aptitude, communication, os, dbms, cn, java, python, hr-questions) and `content_type` (video/blog/document) — shown to all students
- `GET /student/applications` — application status tracker
- `POST /student/applications/{id}/withdraw` — student can withdraw an application any time **before** it reaches `shortlisted`; once shortlisted, withdrawal is blocked (the drive process has moved too far — student should contact the TPO directly at that point) — sets `status = withdrawn`, excluded from the TPO's active applicant counts but kept in history for the student's own tracker
- The dashboard must **never feel empty**: it always surfaces something actionable — recommended resources (Java/Python revision, communication skills, generic placement Q&A, OS/DBMS/CN fast-revision), and after any mock interview or instant test, the result page directly links into the resources matching the student's weak areas rather than dead-ending
- Logout (`POST /auth/logout`) and profile edit (`PATCH /auth/profile`) are accessible from every screen via the persistent navbar, not buried in a sub-page

### 3b. Notifications (all roles)
- `GET /notifications` — recipient's notifications, newest first; frontend polls this on an interval (e.g. every 20–30s via React Query `refetchInterval`) so students/TPO/admin see near-live updates without needing a full WebSocket setup for a college project scope
- `PATCH /notifications/{id}/read` — mark as read
- A notification bell with unread count sits in the shared `Navbar` component across all three dashboards
- Notifications are generated both by system events (application status change, drive deadline approaching, test opened/closed) and by explicit TPO/Admin actions (see Warnings below)

### 4. AI Mock Interview (core feature — Groq powered)
- `POST /mock-interview/start` — body: `company_name`, `stack/skills` (or optionally `drive_id` to auto-fill), `mode` (full/aptitude-only/etc.)
- Flow: `interview_engine.py` builds a system prompt with company + stack context, generates questions **one at a time** in sequence: aptitude → technical → coding → HR
- `POST /mock-interview/{session_id}/answer` — submit answer to current question → Groq evaluates, stores score+feedback, returns next question
- `GET /mock-interview/{session_id}/result` — final score, weak areas, improvement suggestions
- **Resume-based shortcut:** `POST /mock-interview/from-resume` — takes resume_id + company_name → parses resume, auto-generates first question directly (skips manual stack selection)

### 5. Resume Analyzer
- `POST /resume-analyzer/{resume_id}` — Groq analyzes parsed resume text → score + missing skills + suggestions (this can feed directly into mock-interview/from-resume)

### 6. Resume Enhancer
- `POST /resume-enhancer/start` — upload/select resume → ask targeted follow-up questions (target company, key projects, achievements) one by one
- `POST /resume-enhancer/finalize` — combine answers + original resume + Groq → generate improved resume content, **saved as a new row in `resumes` with `source=enhanced`** (not just a one-off download) → the student then chooses whether to make it their `is_active` resume; downloadable as PDF/DOCX either way
- Since only one resume can be `is_active` at a time, `ResumeAnalyzerPage` and `MockInterviewSetupPage`'s "start from my resume" always operate on whichever resume is currently active, and `ResumeUploadPage` shows the student's full resume history (original + any enhanced versions) with a "make active" action on each

### 7. TPO Dashboard (exact layout)
- Top of the page: **graphical analysis** (charts) — active drives, total applicants trend, department-wise applied/selected snapshot — this is the first thing the TPO sees, not buried below
- Below the charts, **three summary cards**:
  1. **All students card** — total student count, and how many have `fee_verified = true` (fee-paid count) → click-through to `AllStudentsCardPage`
  2. **Drives card** — total drives, total applied, total selected across all drives → click-through to `ManageDrivesPage`
  3. **Past tests card** — count of all instant tests ever conducted (open + closed) → click-through to `PastTestsHistoryPage`
- Below the cards: a **"Create drive"** button
- Below that: **recent drives list** — the last 10 drives created, newest first, each showing status and test_status at a glance
- `GET /tpo/dashboard/summary` — single endpoint returning all the above counts so the dashboard loads in one call

### 8. TPO — Drive Management (structured form → 3 follow-up actions)
- `POST /tpo/drives` — create drive via a **predefined structured form**, not free text: company info, JD, and an eligibility_criteria block built from explicit fields — `min_cgpa`, `max_backlogs`, `department_list` (multi-select), `min_tenth`, `min_twelfth`, `min_percentile` — plus bond details and deadline. Returns the created drive with `test_status = not_created`.
- Once a drive exists, the TPO's drive detail page exposes exactly three actions:
  1. **View eligible students** — `GET /tpo/drives/{id}/eligible-students` — runs `eligibility_engine.py` against the structured criteria only (no test involved). This button is only meaningful/shown while `test_status = not_created`, since eligibility can later be refined by test results.
  2. **Create / open instant test** — see section 9 below; sets `test_status = open`
  3. **Close test** — `POST /tpo/drives/{id}/close-test` — sets `test_status = closed`; once closed, no student can view or attempt the test again (`instant_test.status` also flips to `closed`, and `InstantTestAttemptPage` blocks entry with a "test closed" message)
- `GET /tpo/drives/{id}/applicants` — list students applied, with eligibility flag computed live, plus per-drive applied/selected counts shown on the drive's own card
- `POST /tpo/drives/{id}/close` — on deadline: auto-run eligibility_engine over all applicants, mark `eligible`/`not_eligible`, TPO clicks "approve" to move eligible ones to shortlisted
- `DELETE /tpo/students/{id}` — remove student from a specific drive OR permanently deactivate (two distinct endpoints: `/tpo/drives/{drive_id}/remove-student/{user_id}` vs `/tpo/students/{user_id}/deactivate`)
- `GET /tpo/students/all` — every student as a plain unfiltered list (for the `AllStudentsCardPage`), including their `fee_verified` status — just id, name, branch, photo/initials, fee status, no criteria applied

### 9. TPO — Instant Tests (including past history)
- `POST /tpo/drives/{id}/instant-test` — TPO gives a prompt describing what to test (topics, difficulty, company need) **plus two required config fields**: `min_passing_marks` (the cutoff a student must clear), and an **optional** "limit to top N students" toggle (`use_top_n`) — off by default since not every company asks for a fixed headcount; when toggled on, TPO also enters `top_n_count`. `test_generator.py` calls Groq to generate the question set based on the prompt → stored, `test_status` set to `open`.
- `GET /tpo/instant-tests/{id}/results` — all attempts, marks, and final eligibility computed from `min_passing_marks` (and `top_n_count` ranking if `use_top_n` is on)
- `GET /tpo/instant-tests/{id}/analytics` — chart-ready aggregated data (avg score, score distribution, pass/fail split)
- `POST /tpo/instant-tests/{id}/close` — same as drive's close-test action; once closed, results remain viewable to the TPO but the test itself can no longer be attempted or viewed by students
- `GET /tpo/instant-tests/history` — every instant test this TPO has ever created (open and closed), with date, drive it belongs to, attempted count, and average score — powers the "past tests conducted" card and `PastTestsHistoryPage`

### 10. Warnings & Notices (TPO and Admin)
- `POST /tpo/students/{id}/warn` and `POST /admin/students/{id}/warn` — body: message → creates a `notifications` row with `type=warning`, `sender_id` set to the TPO/admin, visible to the student via the notification bell
- `POST /admin/tpo/{id}/notify` — admin can also send a notice to a TPO account (e.g. flagging an issue with a drive they created)
- Removing/deactivating a student should always be paired with a notification so the action isn't silent — the deactivation endpoints trigger an automatic `type=notice` notification explaining why, in addition to any custom warning already sent

### 11. Admin
- `GET /admin/drives` — all drives across TPOs, with eligible/not-eligible counts; admin can also `PATCH`/`DELETE` any drive directly (moderation power beyond what TPOs have on their own drives)
- `GET /admin/students` — all students, filters, remove/deactivate capability
- `GET /admin/students/all` — every student as a plain unfiltered card list (mirrors the TPO version), including fee-paid status
- `GET /admin/activity` — a chronological feed of platform activity across both students and TPOs (drives created, tests opened/closed, students applying, warnings issued, accounts deactivated) so admin has genuine oversight, not just isolated tables
- `GET /admin/analytics` — global charts: placement readiness distribution, applications per drive, mock interview performance trends, resource engagement, department-wise applied/selected counts, package top/median/average

### 12. Analytics/Charts (shared service)
- `scoring.py` computes a **Placement Readiness Score** per student from: resume ai_score + avg mock interview score + profile completeness + applications activity
- Expose aggregated data via `/analytics/*` endpoints in chart-friendly JSON (labels + values) so frontend (Recharts) can render directly
- **Department-wise and package analytics** (both `/tpo/analytics/{drive_id}` and `/admin/analytics`): applications count per department, selected count per department, top package offered, median package, average package — computed from `applications.package_offered` where `status = selected`, grouped by `profiles.branch`

### 13. Live Career Insights (student dashboard — internal drives + web search + Groq, high priority)
- **Goal:** the dashboard's insights widget should give the student **one combined view** — both (a) internal drives from our own TPOs that match their profile, and (b) real, currently-live external opportunities and resume guidance pulled from the open web. These are clearly labeled as two distinct sections in the same widget, never blended together as if both came from the same source.
- **Pipeline (`web_insights_service.py`):**
  1. **Internal side:** call `eligibility_engine.py` (the same logic used for `DrivesListPage`) to get the student's top matched open drives — no AI needed here, it's a direct DB query against `eligibility_criteria`
  2. **External side:** build a search query from the student's profile (branch + top skills + "fresher jobs"/"internship openings") and a separate query for resume/industry trend content → call the configured search API (Tavily/Serper) for live results (titles, snippets, source URLs) — real internet data, not something Groq invents
  3. Pass the external raw snippets to Groq with a prompt asking it to: (a) filter to genuinely relevant/recent items, (b) summarize each into a short card-friendly blurb, (c) generate 2–3 resume improvement suggestions tied to what's currently in demand for that student's stack
  4. Groq must return **structured JSON** for the external side only (external_opportunities list, resume_suggestions list, trending_skills list) — parsed and validated with Pydantic before storage. The internal drives list is plain structured data straight from the DB, not passed through Groq.
  5. Store the external/AI part in `dashboard_insights`; the internal drives part is fetched live each time (it's cheap, no caching needed) and merged into the same response at request time.
- **Caching/cost control:** the external+Groq part is not cheap to run on every page load. Auto-generate once per student per day, plus a manual **"Refresh insights"** button rate-limited to a small number of manual refreshes per day (e.g. 2). The internal drives part always reflects live data since it costs nothing extra.
- `GET /insights/dashboard` — returns `{ internal_drives: [...], external_opportunities: [...], resume_suggestions: [...], trending_skills: [...] }` — internal_drives fetched fresh, the rest from cache
- `POST /insights/refresh` — forces a fresh external+Groq pipeline run, subject to the rate limit above
- Widget shows the top 3–4 internal drives and top 3–4 external items, each section ending with a **"View all"** CTA — internal drives' CTA links to the full `DrivesListPage`, external items' CTA can simply link out since there's no internal "all external results" page
- **Always cite the source URL** on every external card so the student can click through and verify it themselves — never present AI-summarized web content as if Claude/Groq generated it independently
- This widget sits directly on `StudentDashboard`, near the top alongside the readiness score — it's one of the first things a student sees, which also solves the "dashboard feels empty for a new student" concern since even a student with zero applications still gets fresh, relevant content

### 14. Weak Area Tracking (across every drive, mock interview, and instant test)
- **Goal:** a student's weak areas shouldn't disappear after one result screen — they need to be tracked over time and tied back to the specific drive/test they came from, so the student can see recurring gaps and actually improve.
- `interview_sessions.weak_areas` (already tracked per mock interview, optionally tied to a `drive_id`) and `test_attempts` gain a new `weak_areas` JSON field (populated by Groq's evaluation the same way mock interviews are, when the instant test includes subjective/technical questions) — both are now first-class sources for tracking, not just a one-time result display
- `GET /student/weak-areas` — aggregates weak areas across all of that student's `interview_sessions` and `test_attempts`, returned as a timeline: each entry shows date, source (mock interview / instant test), related company/drive (if any), and the specific weak areas flagged that time
- The same endpoint also returns a **recurring weak areas** summary (weak areas that show up 2+ times across different sessions) so the student can immediately see their real, persistent gaps rather than one-off slip-ups
- Each weak area (recurring or not) links directly to the matching category in `ResourcesLibraryPage` (e.g. "DBMS — normalization" weak area links to the DBMS revision resources) so the loop from "found a gap" to "fix the gap" stays inside the product
- Frontend: `WeakAreasPage` (student) — timeline/history view + a "Most recurring" highlight section at the top, each item expandable to see the original session's full feedback

### 15. Public Landing Page + Contact Us
- **Landing page (`LandingPage.jsx`) is the actual root route (`/`), public, no auth required** — this was previously missing and is a real gap for a "complete" product since right now there's nowhere for a first-time visitor to land before choosing to sign in or sign up.
- Content: hero section explaining what the portal does, a short feature highlights section (drives, AI mock interview, resume tools, readiness tracking), and two clear CTAs: **Sign In** and **Sign Up** (sign up route only makes sense for students, per the BVM-email-gated flow above — TPO/admin accounts are provisioned separately, so the landing page's Sign Up CTA is student-focused, with a small note like "TPO/Admin? Use Sign In" rather than a confusing shared signup button).
- Footer includes a link to `ContactUsPage`.
- **Contact Us (`ContactUsPage`)** — a public form: name, email, message, and a `category` selector (General / Placement-related). No login required to submit (though if the user is logged in, `submitted_by_user_id` is captured automatically). `POST /contact/submit` stores it in `contact_messages`.
- **Who sees submissions — routed by category, both roles get visibility on what's relevant to them:** `category = placement` submissions are visible to **both TPO and Admin** (via `ContactMessagesPage` on each dashboard) since these are typically drive/eligibility/application questions the TPO is best placed to answer. `category = general` submissions go to **Admin only** (platform issues, account problems, etc.). This routing is a reasonable assumption — flag it to the person if their college wants a different split.
- Both `ContactMessagesPage` variants support marking a message `read`/`resolved` and support the standard filters (status, category, date) per the Filters Policy.

### 16. Shared Profile + Security-Sensitive Actions (all roles)
- Every dashboard (student/TPO/admin) has a **profile icon in the navbar** — clicking it opens `ProfilePage`, showing the user's own details and an edit option for whatever fields are role-appropriate (students: name/skills/contact info; TPO/admin: name/contact info). Email is not editable by students (tied to their verified BVM identity).
- `ProfilePage` also surfaces **Change Password** (OTP-gated, see the Change Password flow under Roles & Auth above — never allow a plain "old password + new password" change for something this sensitive without an OTP step) and **Logout** (calls `POST /auth/logout`, which must actually revoke the refresh token server-side, not just clear the token client-side).

### 17. One-Selection Placement Policy ("locked once placed", with a dream-company override)
- **Goal:** once a student is `selected` in a drive, they should not, by default, keep applying to and taking up slots in further drives — this mirrors how most college TPO cells actually run placements, and prevents one student blocking multiple company seats.
- The moment any `application.status` flips to `selected` for a student, `profiles.is_placed` is set to `true` automatically (a DB trigger or a check inside the same service call that handles selection — either is fine, just make it atomic with the status change).
- `eligibility_engine.py` treats `is_placed = true` as an automatic **not eligible** for any further drive, **unless** `profiles.placement_lock_override = true` for that student.
- **Dream-company override:** TPO or Admin can toggle `placement_lock_override` for a specific student from `ManageStudentsPage` (a clearly labeled action, e.g. "Allow dream company applications") — this is a manual, deliberate action per student, never a blanket setting, since it's meant for genuine exceptions (a much bigger/better offer showing up later) rather than the default path.
- The student's dashboard reflects this clearly: once placed, `DrivesListPage` shows a "You're already placed 🎉" banner instead of the normal apply flow, unless the override is active, in which case applying remains possible with a small note that this is an exception.
- This is a real behavioral policy, not just a display flag — the backend `POST /applications` endpoint must also enforce it server-side, same as the fee-verification gate.

### Public
- `LandingPage` — the app's root route (`/`), no auth required. Hero + feature highlights + Sign In / Sign Up CTAs, footer link to Contact Us.
- `ContactUsPage` — public form (name, email, message, category), works whether or not the user is logged in.

### Auth
- `LoginPage` — single page for all 3 roles: email + password only. No role selector needed — role comes from what the backend returns with the token.
- **Student signup is a 3-step flow, not a single form:**
  1. `SignupEmailPage` — only a BVM email input (`@bvmengineering.ac.in`), validated client-side with the same regex as backend, on submit triggers OTP send
  2. `SignupOtpPage` — 6-digit OTP input, resend-OTP option with cooldown timer, on success moves to step 3
  3. `SignupPasswordPage` — password + confirm password, on submit calls `/auth/signup/complete` and logs the student in
- **Forgot password is the same 3-step pattern:** `ForgotPasswordEmailPage` → `ForgotPasswordOtpPage` → `ResetPasswordPage`
- **Change password (from `ProfilePage`, logged in) is also OTP-gated:** request OTP → enter OTP → enter current + new password, all in one modal/page flow (`ChangePasswordPage`)
- After login, redirect by role: student → onboarding (if incomplete) or dashboard; tpo → TpoDashboard; admin → AdminDashboard

### Student
- `OnboardingPage` — single multi-step form: Step 1 basic info (branch, cgpa, backlogs), Step 2 academics (10th%, 12th%, competitive exam + percentile), Step 3 skills (tag input), Step 4 resume upload — progress stepper UI, cannot skip
- `FeeReceiptUploadPage` — upload placement fee receipt (image/PDF), shows AI verification status (pending/verified/rejected with reason), re-upload option if rejected. This is a **dashboard-level gate**, not part of onboarding — student can reach the dashboard without it, but every "Apply" action stays disabled with a clear prompt to complete this step until `fee_verified = true`.
- `StudentDashboard` — readiness score card, **Live Career Insights widget** (external opportunities + AI resume suggestions + trending skills, each with source links, plus a rate-limited "Refresh insights" button), quick stats (applications, interviews taken), matched internal drives preview, recent notifications, and a persistent banner linking to `FeeReceiptUploadPage` if not yet verified
- `DrivesListPage` / `DriveDetailPage` — filter/search, eligibility badge (eligible/not eligible shown clearly), apply button disabled (with tooltip explaining why) until fee receipt is verified; once `is_placed = true`, shows a "You're already placed 🎉" banner instead of the normal apply flow, unless `placement_lock_override` is active for that student
- `ApplicationsTrackerPage` — status timeline per application (applied → eligible → shortlisted → selected/rejected/withdrawn), with a **Withdraw** button available until the application reaches `shortlisted`
- `ResourcesLibraryPage` — category tabs (aptitude, communication, OS, DBMS, CN, Java, Python, HR/generic placement Q&A) × content-type filter (video/blog/document), video cards/embedded player for video, readable article view for blog/document
- `MockInterviewSetupPage` — two entry paths: (a) manual company+stack selection, (b) "start from my resume" — pick resume + company name only
- `MockInterviewSessionPage` — chat-style one-question-at-a-time UI, shows current question type (aptitude/technical/coding/hr) as a progress indicator, textarea/code-editor input depending on type, submit → shows brief feedback → next question auto-loads
- `MockInterviewResultPage` — overall score, category-wise breakdown chart, weak areas list, suggested resources link (ties back to ResourcesLibraryPage, pre-filtered to the weak-area categories)
- `ResumeAnalyzerPage` — upload/select resume → score + missing skills + suggestions, CTA to start mock interview directly from result
- `ResumeEnhancerPage` — step-by-step question flow (target company, key projects, achievements) one at a time, then final enhanced resume preview + download, with a "make this my active resume" option
- `InstantTestAttemptPage` — blocked entirely with a "test closed" message once the TPO closes the test; otherwise timed test UI, auto-submit on timeout, shows result after submission per TPO config
- `ProfilePage` — view/edit editable profile fields, change password, and the logout action; reachable from the navbar on every screen for every role (this same component pattern is reused for TPO/Admin profile pages)

### TPO
- `TpoDashboard` — **exact layout, top to bottom:** (1) graphical analysis charts at the very top, (2) three summary cards — all-students (with fee-paid count), drives (with total applied/selected), past tests conducted, (3) "Create drive" button, (4) recent drives list (last 10 created)
- `CreateDrivePage` — **structured predefined form**, not free text: company details, JD, min cgpa, max backlogs, department multi-select, min 10th/12th%, min percentile, bond details, deadline picker → single "Create" button
- `ManageDrivesPage` — list with status (open/closed) and test_status (not created/open/closed), edit actions
- `DriveDetailPage` — after creation, shows exactly three action buttons: **View eligible students** (only while no test created yet — based purely on the structured criteria), **Create/open instant test**, and **Close test** (only enabled once a test is open); also shows this drive's applied/selected counts
- `EligibleStudentsPage` — plain list of students who pass the structured criteria, no test involved
- `DriveApplicantsPage` — applicant table with live-computed eligibility flag, bulk approve/shortlist action after deadline, remove-student-from-drive action, and a "send warning" action per student
- `ManageStudentsPage` — search/filter students (including a placed/not-placed filter), deactivate account action (separate from drive removal), "send warning/notice" action, "Allow dream company applications" toggle for already-placed students
- `AllStudentsCardPage` — every student shown as a simple card (name, branch, photo/initials, fee-paid status) with **no filters at all** — a quick browse view, separate from the filtered `ManageStudentsPage`
- `CreateInstantTestPage` — prompt/topic input box (what to test, difficulty), a **required** "minimum passing marks" field, and an **optional** toggle "limit to top N students" — off by default, reveals a number input only when turned on → preview generated questions before publishing
- `InstantTestResultsPage` — table of attempts + marks, eligible/not-eligible per configured cutoff (and top-N ranking if enabled), with a "Close test" button
- `PastTestsHistoryPage` — every instant test this TPO has run, past and present, with date, linked drive, attempt count, and average score
- `TpoAnalyticsPage` — charts: applicants per drive, score distribution, student performance trends, **department-wise applied vs selected counts, and top/median/average package offered**
- `ContactMessagesPage` — placement-category Contact Us submissions, mark read/resolved, filters (status, date)
- `WarningModal` (shared component) — reusable message box used from `DriveApplicantsPage`, `ManageStudentsPage`, and the admin equivalents to send a warning/notice to a student

### Admin
- `AdminDashboard` — platform-wide overview stats + top graphical analysis
- `AllDrivesPage` — every drive across all TPOs, filters, eligibility counts, edit/delete actions (admin can moderate any TPO's drive)
- `AllStudentsPage` — every student, activity view, remove/deactivate capability, "send warning" action, placed/not-placed filter, "Allow dream company applications" toggle, filters available
- `AllStudentsCardPage` — every student as a simple card, no filters — mirrors the TPO version for a quick platform-wide browse
- `ActivityFeedPage` — chronological feed of platform-wide activity (drives created, tests opened/closed, applications, warnings issued, deactivations) across both students and TPOs
- `ManageResourcesPage` — CRUD for resource videos/blogs/documents (add/edit/delete by category and content type)
- `ContactMessagesPage` — all Contact Us submissions (general + placement), mark read/resolved, filters (status, category, date)
- `AdminAnalyticsPage` — global charts: readiness score distribution, applications per drive, mock interview trends, resource engagement, **department-wise applied/selected counts across all drives, and platform-wide top/median/average package**

## GROQ INTEGRATION RULES
- Single wrapper in `services/groq_client.py` — never call Groq SDK directly from routers, and **never** call Groq directly from the frontend
- Use environment variable `GROQ_API_KEY` (one key, backend `.env` only), model name also from env (`GROQ_MODEL`) so it's swappable without touching code
- Pick the strongest available Groq-hosted model for quality of questions/evaluation (favor accuracy over raw speed here since interview quality matters most), but keep the wrapper provider-agnostic enough that swapping models later is a one-line env change
- All prompts must request **structured JSON output** (question text, type, difficulty, or score+feedback) — parse and validate with Pydantic before saving to DB
- Wrap every Groq call in try/except with retry (max 2 retries) and graceful fallback error response returned to frontend (never a raw 500)

## VALIDATION RULES (Pydantic — enforce strictly)
- cgpa: 0–10
- percentages (10th/12th): 0–100
- percentile: 0–100
- password: min 8 chars, at least 1 number
- student email: strict regex anchored to `@bvmengineering.ac.in` only (case-insensitive) — reject everything else with a clear message
- otp: exactly 6 digits, numeric only
- min_passing_marks: must be within the test's actual max possible score
- top_n_count: required and must be a positive integer only when use_top_n is true; otherwise ignored/null
- deadline: must be a future date at drive creation
- separate `Create`, `Update`, `Response` schema classes per entity (never reuse one schema for input and output)

## SECURITY
- Passwords hashed with bcrypt via passlib, never stored/returned in plaintext
- JWT signed with secret from `.env`, algorithm HS256
- Role guards on every TPO/Admin route
- File upload validation: only PDF for resumes (max 5MB); images or PDF for fee receipts (max 5MB)
- Student email strictly validated against the `@bvmengineering.ac.in` domain via regex at signup — never trust client-side validation alone, re-validate server-side
- OTPs are hashed before storage (never store plaintext OTP), expire in 5–10 minutes, single-use, and rate-limited (e.g. max 3 OTP requests per email per 15 minutes) to prevent spam/abuse
- `fee_verified` and `is_eligible` style flags are always re-checked server-side on the action they gate (applying to a drive, viewing a closed test) — the frontend disabling a button is a UX nicety, not the actual security boundary

## FILTERS POLICY
- List-heavy pages (drives list, applications tracker, TPO's `ManageStudentsPage`, `DriveApplicantsPage`, instant test results, admin's `AllStudentsPage`/`AllDrivesPage`) should have search/filter controls appropriate to their data (by department, status, date, score range, etc.)
- The two `AllStudentsCardPage` views (TPO and Admin) are the deliberate exception — plain, unfiltered card grids for a quick full-roster browse. Don't add filters there; that's what `ManageStudentsPage`/`AllStudentsPage` are for.

## PRODUCTION READINESS
Since this is meant to be a genuinely deployable, senior-engineer-quality build, also include:
- **Dockerization:** `Dockerfile` for backend, `Dockerfile` for frontend, and a root `docker-compose.yml` wiring backend + frontend + PostgreSQL together for one-command local spin-up
- **Structured error handling:** a global FastAPI exception handler returning consistent JSON error shapes (`{"detail": "...", "code": "..."}`), never raw stack traces to the client
- **Logging:** structured request/error logging (e.g. Python `logging` module configured in `core/config.py`), not bare `print()` statements
- **Rate limiting:** on `auth` and OTP endpoints specifically (e.g. `slowapi`) to prevent brute-force and OTP-spam abuse
- **CORS:** locked to the actual frontend origin(s) via env var, not a wildcard `*`, in production config
- **Health check endpoint:** `GET /health` for uptime monitoring
- **Basic automated tests:** at least a `tests/` folder with pytest covering auth (signup OTP flow, login), eligibility engine, and the fee verification gate logic
- **`.env` files never committed** — only `.env.example` templates, with a clear README note about required secrets before running

## DELIVERABLES EXPECTED FROM YOU (the AI)
1. Full backend + frontend folder structure exactly as specified above, all files created
2. All SQLAlchemy models with relationships (ForeignKey, relationship())
3. All Pydantic schemas (Create/Update/Response variants)
4. All routers wired into `main.py` with proper prefixes, tags, and CORS enabled for the frontend origin
5. Alembic initial migration
6. `requirements.txt` (backend) with pinned versions, `package.json` (frontend) with all needed deps
7. `.env.example` for both backend (DATABASE_URL, JWT_SECRET, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS, GROQ_API_KEY, GROQ_MODEL, SMTP settings for OTP emails, SEARCH_PROVIDER, SEARCH_API_KEY) and frontend (VITE_API_BASE_URL)
8. Every page/component listed in the frontend section, actually wired to real API calls (not placeholder stubs)
9. A short README explaining how to run migrations, start the backend, start the frontend dev server, and run via Docker Compose
10. `Dockerfile`s + root `docker-compose.yml`, a basic `tests/` folder with pytest coverage for auth/eligibility/fee-verification as described under Production Readiness

## MANDATORY BUILD ORDER — PHASES (do not reorder, announce completion of each phase before continuing)

**Phase 1 — Backend Foundation**
`core/` (config, security, dependencies) → `db/` (base, session) → all `models/` → Alembic init + first migration

**Phase 2 — Backend Validation Layer**
All `schemas/` (Create/Update/Response per entity), matching every model field from Phase 1

**Phase 3 — Backend Services**
`groq_client.py`, `eligibility_engine.py`, `resume_parser.py`, `interview_engine.py`, `test_generator.py`, `scoring.py`, `file_storage.py`, `otp_service.py`, `email_service.py`, `fee_receipt_service.py`, `web_insights_service.py`

**Phase 4 — Backend Routers**
`auth.py` (signup OTP + login + logout + forgot-password OTP + OTP-gated change-password + profile update) → `student_profile.py` → `resume.py` → `fee_verification.py` → `drives.py` → `applications.py` → `mock_interview.py` → `resume_analyzer.py` → `resume_enhancer.py` → `resources.py` → `notifications.py` → `insights.py` → `contact.py` → `tpo.py` → `instant_test.py` → `admin.py` → `analytics.py`, then wire everything into `main.py` with CORS

**Phase 5 — Frontend Foundation**
Vite + Tailwind setup with the palette/typography from the UI/Design System section baked into `tailwind.config.js` and CSS variables first (not an afterthought) → `api/axiosClient.js` + all `*.api.js` files → `AuthContext` + `ProtectedRoute` → shared component library (buttons, inputs, cards, badges, modals) → base layout components (`Navbar` with `NotificationBell` + profile icon, `Sidebar`, `DashboardLayout`)

**Phase 6 — Frontend Public + Auth + Student Pages**
`LandingPage` → `ContactUsPage` → Login → Signup OTP flow (email → OTP → password) → Forgot-password OTP flow → `ChangePasswordPage` (OTP-gated) → Onboarding (multi-step) → Fee receipt upload → Student Dashboard (incl. `InsightsWidget`) → Drives list/detail → Applications tracker → Resources library → `ProfilePage`

**Phase 7 — Frontend AI Features**
Mock Interview (setup → session chat UI → result, linking weak areas to resources) → Resume Analyzer → Resume Enhancer → Instant Test attempt page → WeakAreasPage (aggregated tracking)

**Phase 8 — Frontend TPO + Admin Pages**
TPO dashboard (top charts → 3 summary cards → create-drive button → recent 10 drives), create drive (structured form), drive detail (eligible-students / create-test / close-test actions), applicants + approve flow + warning action, manage students, all-students card page, instant test creation (with min marks + optional top-N) / results / past-tests history, TPO analytics (incl. department + package charts), TPO contact-messages page → Admin dashboard (top charts + stats), all drives (with moderation), all students (filtered + card view), activity feed, manage resources, admin contact-messages page, admin analytics (all chart pages using Recharts)

**Phase 9 — Production Hardening**
Docker (`Dockerfile`s + `docker-compose.yml`) → global exception handler + structured logging → rate limiting on auth/OTP endpoints → CORS lockdown via env → `/health` endpoint → basic pytest suite for auth, eligibility, and fee-verification

**Phase 10 — FINAL MANDATORY CROSS-CHECK (do not skip)**
Go through this exact checklist, one line at a time, and explicitly mark each as Done / Missing / Partial. Fix anything not marked Done before finishing:

- [ ] All 19 backend tables created exactly as specified (users, otp_verifications, fee_receipts, refresh_tokens, profiles, resumes, companies, drives, applications, interview_sessions, questions, answers, instant_tests, test_attempts, resources, notifications, analytics, dashboard_insights, contact_messages)
- [ ] Student signup strictly enforces `@bvmengineering.ac.in` email via regex, both frontend and backend
- [ ] Student signup follows the 3-step OTP flow (request-otp → verify-otp → complete with password) with no document upload at signup
- [ ] Forgot password follows the same OTP pattern and actually resets the password
- [ ] Login works for all 3 roles with correct JWT payload and role guards; admin/TPO have no public signup route
- [ ] Logout actually revokes the refresh token server-side, not just a client-side token wipe
- [ ] Profile edit and change-password work for all 3 roles from a shared `ProfilePage`
- [ ] Student onboarding captures: skills, branch, cgpa, active backlogs, 10th%, 12th%, competitive exam name + percentile, resume upload — all required, all validated
- [ ] Fee receipt upload + AI (OCR + Groq) verification works, and `fee_verified` only flips true on a confident genuine verdict
- [ ] Every apply-to-drive action is blocked both in the UI and on the backend until `fee_verified = true`; everything else on the dashboard remains viewable regardless
- [ ] Drive matching/filtering logic actually uses every relevant profile field against `eligibility_criteria`
- [ ] Resources library has categories including Java/Python revision, communication skills, OS/DBMS/CN, generic placement Q&A, across video/blog/document content types
- [ ] Mock interview result page and instant test result page both link directly into resources matching the student's weak areas — dashboard never dead-ends
- [ ] Mock interview covers all 4 stages in order (aptitude → technical → coding → HR), one question at a time, final score + weak areas produced
- [ ] Mock-interview-from-resume shortcut works (resume + company name → auto first question)
- [ ] Resume analyzer gives score + missing skills + suggestions
- [ ] Resume enhancer does step-by-step Q&A then produces a final improved resume
- [ ] Notifications work across all 3 roles: bell icon with unread count, polling for near-live updates, mark-as-read
- [ ] TPO can send a warning/notice to a student, and student removal/deactivation always auto-generates an explanatory notification
- [ ] TPO dashboard matches the exact specified layout: top analytics charts → 3 summary cards (all-students w/ fee-paid count, drives w/ applied+selected totals, past tests) → create-drive button → last 10 drives
- [ ] TPO drive creation uses the structured predefined form (cgpa, backlog, department, etc.), not free text
- [ ] Drive detail page exposes exactly the 3 actions: view eligible students (pre-test), create/open instant test, close test — and closing actually blocks further student access
- [ ] Instant test creation requires `min_passing_marks` and has a genuinely optional top-N toggle (off by default) with `top_n_count` only when enabled
- [ ] TPO has a working past-tests history view (open and closed tests, with attempt counts and averages)
- [ ] TPO can view applicants with live eligibility flag, and separately view a plain unfiltered all-students card page (including fee-paid status)
- [ ] Deadline-based auto eligibility check + TPO approve/shortlist flow works
- [ ] TPO can remove a student from a specific drive AND separately deactivate a student account
- [ ] Department-wise applied/selected counts and top/median/average package charts exist on both TPO and Admin analytics
- [ ] Admin can view all drives, all students (filtered view and plain card view), remove/deactivate, warn, and see platform-wide analytics/charts
- [ ] Admin has a working activity feed showing platform-wide TPO and student actions
- [ ] Admin can modify or delete any TPO's drive directly (moderation power)
- [ ] Filters exist on all list-heavy pages except the two intentionally-unfiltered AllStudentsCardPage views
- [ ] Every Groq call goes through the single `groq_client.py` wrapper, uses `GROQ_API_KEY`/`GROQ_MODEL` from env, never called from frontend directly
- [ ] Live Career Insights works end-to-end and shows **both** internal matched drives (via eligibility_engine, no AI needed) **and** external web results (search API → Groq summarization), clearly separated into two labeled sections with a "View all" CTA on each, source links on every external card, and daily auto-refresh plus a rate-limited manual refresh button
- [ ] Weak area tracking works end-to-end: weak areas from every mock interview and applicable instant test are stored and aggregated on `WeakAreasPage`, recurring weak areas (2+ occurrences) are highlighted separately, and each weak area links to the matching `ResourcesLibraryPage` category
- [ ] Every Pydantic model enforces the validation rules listed (cgpa 0–10, percentages 0–100, percentile 0–100, password rules, strict BVM email regex, OTP format, future-dated deadlines, file type/size limits)
- [ ] Passwords hashed with bcrypt, OTPs hashed before storage, neither ever returned in any response
- [ ] Every backend route that should be role-guarded actually is
- [ ] Landing page exists at `/`, public, with working Sign In / Sign Up CTAs and a link to Contact Us
- [ ] Contact Us form works end-to-end (works logged-out and logged-in), submissions correctly routed by category (placement → TPO+Admin, general → Admin only), both `ContactMessagesPage` variants work
- [ ] Change password requires the full OTP flow (request-otp → verify-otp → current+new password), not a plain old-password-only change, and works from `ProfilePage` for all 3 roles
- [ ] Profile icon in the navbar is present and working on all 3 dashboards, opens `ProfilePage` with real editable data
- [ ] `NotificationBell` actually polls live (verify in the browser network tab that it refetches every 15–20s) and shows an accurate unread count on all 3 dashboards
- [ ] UI follows the defined design system consistently across all pages — one deliberate color palette (not default Tailwind purple/indigo), consistent typography scale, consistent spacing/radius, distinct-but-related accent per role — no page looks visually disconnected from the rest
- [ ] No generic/placeholder/mock logic remains anywhere — spot check by searching the codebase for `TODO`, `placeholder`, `mock`, `dummy`, and hardcoded fake return values; anything found must be either implemented for real or explicitly flagged, not left silently faked
- [ ] Every frontend page listed actually exists and is wired to a real backend call (no dummy/mock data left in final build)
- [ ] CORS configured correctly and locked to the frontend origin via env
- [ ] Login has brute-force protection: 5 failed attempts locks the account for 15 minutes, resets on successful login
- [ ] Students can withdraw an application before it reaches `shortlisted`; withdrawal is blocked after that point, both in UI and backend
- [ ] Resume Enhancer output is saved as a new `resumes` row (`source=enhanced`), student can choose which resume is `is_active`, and analyzer/mock-interview-from-resume always use the active one
- [ ] One-selection policy works: `is_placed` flips true automatically on first selection, further applications are blocked by `eligibility_engine.py` and the backend, dashboard shows the "already placed" state, and TPO/Admin can grant a `placement_lock_override` per student for dream-company exceptions
- [ ] `ResourcesLibraryPage` matches the actual resource categories (incl. Java/Python) and content types (video/blog/document) defined in the `resources` table — no stale/mismatched category list
- [ ] Docker Compose brings up backend + frontend + PostgreSQL successfully, `/health` responds, and the basic pytest suite passes

Only after every single checklist item is confirmed **Done** is the project considered complete. Report the final checklist status at the end of your output.
