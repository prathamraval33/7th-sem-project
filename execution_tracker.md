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

- [ ] `.env` created from `.env.example`, filled with real values (DB URL, JWT secret, etc.)
- [ ] Backend starts with no import errors (`uvicorn app.main:app --reload`)
- [ ] Database connects — no connection errors on startup
- [ ] All 18 model files exist and import cleanly
- [ ] Alembic migration generated (`alembic revision --autogenerate`) and applied (`alembic upgrade head`)
- [ ] Open the actual Postgres DB (pgAdmin / `psql \dt`) and confirm all 18 tables physically exist with the right columns

## PHASE 2 — Validation Layer (schemas)
- [ ] All schema files exist, no import errors
- [ ] Manually test at least 3 schemas with bad data via Swagger UI (`/docs`) and confirm they reject it (e.g. cgpa=15 → should fail, invalid email domain → should fail)

## PHASE 3 — Backend Services
- [ ] `groq_client.py` — make one real test call, confirm you get a real response back (not a mock)
- [ ] `otp_service.py` + `email_service.py` — trigger a real OTP email to yourself, confirm it arrives
- [ ] `fee_receipt_service.py` — upload one real sample receipt image, confirm OCR extracts readable text and Groq returns a verdict
- [ ] `web_insights_service.py` — trigger one call, confirm real search results come back (not hallucinated)
- [ ] `eligibility_engine.py` — manually create one test student + one test drive, confirm eligibility calculates correctly
- [ ] `resume_parser.py` — upload one real resume PDF, confirm text extraction works
- [ ] `scoring.py` — confirm readiness score changes after simulating profile/resume/interview updates

## PHASE 4 — Backend Routers
- [ ] Every route appears correctly in Swagger UI (`/docs`) with correct request/response schemas
- [ ] Signup OTP flow tested end-to-end via Swagger: request-otp → verify-otp → complete → login works
- [ ] Forgot-password OTP flow tested end-to-end
- [ ] Role guards actually block wrong roles (test: try hitting a TPO-only route with a student token → should 403)
- [ ] CORS allows your frontend origin (test once frontend exists)

## PHASE 5 — Frontend Foundation
- [ ] `npm run dev` starts with no errors
- [ ] Axios client correctly attaches JWT to requests (check network tab)
- [ ] `ProtectedRoute` actually redirects unauthenticated users to login
- [ ] Layout renders correctly (Navbar, Sidebar) for all 3 roles

## PHASE 6 — Frontend Public + Auth + Student Pages
- [ ] Landing page loads at `/` with no login, Sign In / Sign Up buttons actually navigate correctly
- [ ] Contact Us form submits successfully both logged-out and logged-in, message appears in TPO/Admin contact-messages pages correctly routed by category
- [ ] Change password flow requires OTP (test: try to change without the OTP step, confirm it's blocked)
- [ ] Full signup flow works end-to-end from the actual browser (not just Swagger)
- [ ] Login → correct dashboard redirect per role
- [ ] Onboarding form saves and blocks skipping
- [ ] Fee receipt upload works, status shows correctly, apply buttons are disabled until verified
- [ ] Drives list/detail shows real matched data
- [ ] Resources library shows all categories
- [ ] Profile icon in navbar opens working profile page with real data, on all 3 roles

## PHASE 7 — Frontend AI Features
- [ ] Mock interview: full flow works, one question at a time, real Groq responses, final score+weak areas shown
- [ ] Resume analyzer gives a real score + suggestions
- [ ] Resume enhancer Q&A flow produces a final resume
- [ ] Instant test attempt page works (test with one TPO-created test)
- [ ] WeakAreasPage shows real aggregated data after 2+ test attempts

## PHASE 8 — Frontend TPO + Admin Pages
- [ ] TPO can create a drive via the structured form, see it appear in ManageDrivesPage
- [ ] View eligible students button works pre-test
- [ ] Create/open instant test → student can see and attempt it → close test → student can no longer access it
- [ ] Applicants page shows live eligibility, approve/shortlist works
- [ ] AllStudentsCardPage (TPO + Admin) shows unfiltered cards correctly
- [ ] TPO + Admin analytics charts render with real data (not placeholder numbers)
- [ ] Admin can modify/delete/warn students and TPOs, activity feed reflects it
- [ ] Contact Us submissions show correctly on both TPO and Admin contact-messages pages, routed by category
- [ ] NotificationBell actually updates within ~20 seconds of a real event (test: trigger a notification-worthy action in one browser tab, watch the badge update in another tab logged in as the affected user, without refreshing)

## PHASE 9 — Production Hardening
- [ ] `docker-compose up` brings up backend + frontend + Postgres successfully from a clean clone
- [ ] `/health` endpoint responds
- [ ] Rate limiting confirmed on auth/OTP endpoints (test: spam requests, confirm you get blocked)
- [ ] Logs are structured, not raw prints
- [ ] `pytest` suite runs and passes
- [ ] `.env` is in `.gitignore`, only `.env.example` is committed

## PHASE 10 — Final Cross-Check
- [ ] Go through the full checklist at the bottom of `master_prompt_placement_portal.md` yourself, one line at a time
- [ ] Fresh clone + Docker Compose test — does the whole thing actually boot from zero on a clean machine?
- [ ] Demo the full flow once, start to finish, as if you were showing it to your project guide

---

## RUNNING LOG (add a line every session so you always know where you left off)

| Date | Phase worked on | Status | Notes |
|------|-----------------|--------|-------|
|      |                 |        |       |
