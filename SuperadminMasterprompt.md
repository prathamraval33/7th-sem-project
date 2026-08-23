# Multi-Tenant Platform Migration — Full Phased Implementation Plan

## How to use this document

This document breaks the entire multi-tenant conversion (turning this single-college app into a platform that can host many colleges) into separate phases, so you can hand one phase at a time to an AI coding session and have it fully finished and verified before starting the next one — the same "one phase per session" discipline already used for the rest of this project. Each phase below is written in full plain-language detail, explaining not just what to build but why it's needed and exactly how it should work, so an AI assistant (or a teammate) can pick up any single phase on its own and understand it completely without needing the surrounding phases explained again.

Do not skip ahead. Phase 1 is UI/UX only — no real data, no backend — because it lets you and your faculty guide see and agree on what the SuperAdmin experience should look and feel like before a single line of backend/database code is written for it. Every phase after that builds the real, working system underneath that design, in an order chosen so that nothing is built on top of something that doesn't exist yet (for example, you cannot build the "approve a feature request" backend endpoint in Phase 5 before the database tables that store feature requests exist, which is why that comes in Phase 3).

---

## PHASE 1 — SuperAdmin UI/UX Design (design only, no backend, no real data)

### Purpose of this phase
Before writing any backend code for the SuperAdmin role, build every SuperAdmin-facing screen as a working, clickable frontend using fake/placeholder data hardcoded directly in the frontend code — no real API calls yet. The entire point of doing this first is that it is much cheaper to change a screen's layout or flow before it's wired up to a real database and real business logic than after. This phase should feel like reviewing a set of mockups that you can actually click through in a browser, not a finished product.

### What to build, screen by screen, explained in full

**1. SuperAdmin login and access**
The SuperAdmin does not need a brand-new, separate login page — reuse the existing login screen the rest of the app already has. What's different is what happens after a successful login: if the account logging in is a SuperAdmin account, it should land on a completely different set of screens than a Student, TPO, or Admin would see — described below — rather than the regular dashboard. For this phase, since there's no real backend yet, just build a way to preview these screens directly (for example, a temporary route you can visit directly in the browser during development) without needing a real login to check.

**2. SuperAdmin Dashboard (the home screen)**
This is the first screen a SuperAdmin sees after logging in. Explain it like a control room overview: it should show, at a glance, the overall health of the whole platform, using a handful of summary cards or tiles near the top — for example, one card showing the total number of colleges currently on the platform, one showing total students across all colleges combined, one showing total TPOs, one showing total drives created platform-wide, and one showing how many feature requests are currently waiting for a decision (this last one is especially important, since it's an action SuperAdmin needs to take, not just a number to look at). Below these summary cards, show a short list of the most recent platform-level activity — for example "XYZ College was added 2 days ago," "ABC College requested the Study Resources feature," "DEF College's request for Career Insights was approved" — so the SuperAdmin can see what's been happening without having to go dig through separate pages. Use placeholder/fake numbers and fake activity entries for this phase.

**3. Colleges list page**
This page shows every college currently on the platform as a list or table. Each row/entry should show: the college's name, its allowed email domain, how many students and TPOs it currently has, its current status (active or suspended), and the date it joined the platform. Each row should have a way to click into it to see that college's full detail page (described next), and should also have quick actions available directly from the list — most importantly a way to suspend an active college or reactivate a suspended one, without necessarily having to open the full detail page first, since this might be something SuperAdmin wants to do quickly. Include a search or filter box at the top so a SuperAdmin managing many colleges can quickly find one by name. Also design what this page looks like when there are zero colleges yet (a friendly empty state, since this will genuinely be the very first thing you see when the feature is brand new), and a clear, prominent button to add a new college.

**4. Add New College flow**
This is one of the most important screens, since it's how the whole system grows. Design this as a short, guided, step-by-step flow rather than one giant form, because it actually involves two separate things happening (creating the college itself, and creating that college's first Admin account) and separating them into clear steps avoids confusion. Step one: a form asking for the college's name and its allowed student email domain (explain in the UI, in plain words, what this domain is for — something like "Students with an email ending in this domain will automatically be recognized as belonging to this college when they sign up"). Step two, shown immediately after step one is submitted: a form asking for the details of that college's first Admin account — their name, their email, and how their initial password/access will be set up (for example, sending them an invite email, or generating a temporary password to share manually — decide which approach fits the rest of the app's existing patterns and design the screen accordingly). After both steps are done, show a clear success confirmation, and land back on the Colleges list page with the newly added college visible at the top.

**5. College Detail page**
Reached by clicking into a specific college from the Colleges list. This page should show everything about one specific college in one place: its name and domain (with a way for SuperAdmin to view these, though remember SuperAdmin editing the domain after the fact is something Admin does for their own college in a later phase, not something SuperAdmin needs to micromanage here — so keep this mostly read-only except for the suspend/reactivate action and possibly re-sending the Admin's invite if needed), its current status, when it joined, its Admin's name and email, and its usage stats (number of students, TPOs, drives, applications — purely as counts, never as a way to click into and see individual students or drives, since that would break the "SuperAdmin cannot see personal data" rule). Also show, on this same page, which features from the platform's feature menu are currently turned on for this specific college, and which ones are pending a decision — this gives SuperAdmin full context about one college in a single screen.

**6. Feature Catalog management page**
This is where SuperAdmin manages the master menu of optional features the whole platform offers (explained fully in Phase 3 below, once the backend exists — for this phase, just build the screen). Show a list of every feature currently defined, each with its name, a short description, and maybe a category tag. Include a way to add a brand-new feature to the menu (a simple form: name, description, category), and a way to edit or remove an existing one. Design an empty state for when no features have been defined yet.

**7. Feature Requests queue page**
This is arguably the single most important operational screen for SuperAdmin on a day-to-day basis, since it's where action is actually required regularly, not just information reviewed. Show a list of every feature request currently waiting for a decision, with the college's name, which feature they're asking for, and when they asked. Each entry needs a clear Approve button and a clear Reject button right there in the list, so SuperAdmin doesn't need to click into a separate detail page just to make a simple yes/no decision. Below or alongside the pending list, also show a history of past decisions (approved/rejected, with when and by implication that it's done), so SuperAdmin has a record of what's already been decided and doesn't accidentally lose track of it.

**8. Platform Analytics page**
A page dedicated to the aggregate, platform-wide numbers mentioned in the dashboard, but in more depth — for example a simple chart showing how many colleges have joined over time, a chart showing how many colleges have each feature enabled (so SuperAdmin can see which features are popular versus which ones nobody's asked for), and overall totals for students/TPOs/drives/applications across the whole platform. Everything on this page must remain purely aggregate/counted — never break any of these numbers down in a way that reveals one specific college's internal performance next to another's in a way that could feel like comparing or ranking colleges against each other, unless that is something you specifically decide you want (worth a conscious decision, not an accident).

**9. Announcements page**
A simple page where SuperAdmin can write and send a short broadcast message that every College Admin will see (for example, a maintenance notice). Show a simple form to compose and send a new announcement, and a list below it of previously sent announcements with their date.

**10. Audit Log page**
A simple chronological list of platform-level actions SuperAdmin has taken — colleges added, colleges suspended/reactivated, features approved/rejected — each with a timestamp. This is mostly a read-only historical record, and can be a fairly simple table-style page.

### What this phase deliberately does NOT include
No real backend calls, no real authentication check beyond whatever lets you preview the pages, no real database. Every number, list, and piece of data shown on every screen above should be realistic-looking placeholder data written directly into the frontend code for now. The visual styling (colors, spacing, fonts) should follow whatever design system/theme is already established elsewhere in this application, so the SuperAdmin section feels like part of the same product, not a bolted-on separate tool.

---

## PHASE 2 — Database Schema: Colleges, College-Scoping, and the Feature System

### Purpose of this phase
Now that Phase 1 has settled what the SuperAdmin experience should look like, build the actual database structure everything else depends on. This phase is backend-only, database-only — no API endpoints yet, just getting the tables and relationships correctly in place, along with the one-time migration of existing data.

### What to build, explained fully

**1. The `colleges` table.** As described earlier: a unique ID for each college, the college's name, its allowed email domain (or domains — decide up front here whether one college can have more than one valid domain, and build the column/table shape accordingly: a single text column if only one domain is allowed, or a small separate table of domains linked to a college if more than one should be allowed), a status field (active or suspended), and a joined-date timestamp.

**2. Add a `college_id` column to every table that holds college-specific data.** This includes, at minimum: the users table (which covers Admin, TPO, and Student accounts, since colleges and their data flow down from the account itself), and by natural extension, anything that references a specific user (profiles, resumes, applications, interview sessions, test attempts, fee receipts, notifications), plus the drives table and the resources table. Each of these new columns must be a proper foreign key pointing back to the `colleges` table's ID column, so the database itself enforces that every row genuinely points at a real, existing college.

**3. Decide and implement the companies-table approach.** As discussed: recommend keeping `companies` as a shared, platform-wide table without a college_id, since a real company might recruit at multiple colleges and company name/website isn't private information — but make sure `drives` (which connects a company to a specific college's placement process) is properly college-scoped.

**4. Build the two feature-system tables.** First, a table listing every feature that exists on the platform (name, description, category) — this is the master menu SuperAdmin manages in Phase 1's "Feature Catalog" screen. Second, a connecting table recording, for every college and every feature, what state that combination is in — not yet requested, requested and pending, approved, or rejected — along with timestamps for when the request was made and when it was decided. This second table is what the whole rest of the system will check, over and over, every time it needs to answer "is this specific feature turned on for this specific college right now."

**5. Migrate the existing data.** The application already has real students, a real Admin, and real TPOs in it today, none of which currently have a college_id, because the concept didn't exist before now. As part of this same phase: create one row in the new `colleges` table representing the college that's already using the system (using its real name and its current hardcoded email domain as the starting values for that row), and then update every existing row in every newly-college-scoped table so its college_id points at that one college's new ID. Do this as a careful, tested migration step — not something run casually — since it's rewriting every existing row in the database.

---

## PHASE 3 — Authentication, Authorization, and Data-Isolation Enforcement

### Purpose of this phase
This is the phase that actually makes the isolation between colleges real and unbreakable, rather than just a database column that nothing checks yet. This is arguably the most safety-critical phase in the whole migration, since getting it wrong means one college could accidentally see another college's data.

### What to build, explained fully

**1. Put college_id into the login token.** When any user logs in, the token (JWT) issued to them must include their college_id alongside their existing role and identity information, so every future request they make already carries this information without needing an extra database lookup every time.

**2. Add a "college guard" check everywhere a "role guard" check already exists.** The application already has logic that checks "is this person allowed to access this endpoint based on their role" (Student-only, TPO-only, Admin-only endpoints). Every single one of those existing checks, for every endpoint that touches college-scoped data, must now also check "does the college_id on the data being requested match the college_id in this person's login token" — and reject the request if it doesn't match, even if the role check alone would have allowed it. This has to be added consistently across every single existing endpoint that touches college-scoped tables — go through the whole list of existing API routes methodically, one at a time, rather than trying to remember them from memory, to make sure none are missed.

**3. Update every existing database query that lists or searches college-scoped data to automatically filter by college_id**, using the requesting user's own college_id from their token — not something the frontend sends and the backend just trusts, since a modified frontend request could lie about which college it wants; the backend must always determine the correct college_id itself from the authenticated user's token.

**4. Build the SuperAdmin-specific authorization rules.** SuperAdmin's own login token won't have a normal college_id the way other users do (since SuperAdmin doesn't belong to any single college) — make sure every endpoint that's meant only for SuperAdmin explicitly checks for the SuperAdmin role and nothing else, and make sure none of the regular college-scoped endpoints accidentally allow a SuperAdmin token through in a way that would let them see one specific college's operational data, since that would break the "SuperAdmin cannot see personal/operational data" rule established earlier.

---

## PHASE 4 — SuperAdmin Backend: Making Phase 1's Screens Actually Work

### Purpose of this phase
With the database (Phase 2) and the isolation rules (Phase 3) in place, build the real backend logic behind every screen designed in Phase 1, and connect that frontend to real data for the first time.

### What to build, explained fully, matching each Phase 1 screen to its real backend behavior

**1. College management endpoints:** create a new college (which, behind the scenes, creates the new row in `colleges` from Phase 2, and, as its own connected step, creates that college's first Admin account tagged with the new college_id), list all colleges with their live stats, get one college's full detail, and suspend/reactivate a college (flipping its status field, and making sure Phase 3's login checks actually block logins for suspended colleges).

**2. Feature catalog endpoints:** create/edit/remove a feature from the master menu, and list all features — powering the "Feature Catalog management" screen from Phase 1 with real, saved data instead of placeholders.

**3. Feature request review endpoints:** list all pending requests (across every college), and approve or reject a specific request — which updates that row in the connecting table from Phase 2, and, on approval, is what finally makes that feature visible to that college's actual students/TPOs (this visibility check itself is built properly in Phase 6 below).

**4. Platform analytics endpoints:** aggregate counting queries across every college's data — total colleges, total users, total drives, feature adoption breakdown — built carefully to only ever return summed/counted numbers, never a query that could leak an individual record.

**5. Announcements and audit log endpoints:** saving and listing SuperAdmin's broadcast messages, and automatically recording an audit log entry every time SuperAdmin performs one of the actions above (adding a college, approving a request, etc.), so the Phase 1 Audit Log screen has real, accurate history to show.

Once every endpoint above exists, go back to every Phase 1 screen and replace its placeholder/fake data with real calls to these new endpoints, so the SuperAdmin experience designed in Phase 1 is now fully real and working end to end.

---

## PHASE 5 — College Admin: New Capabilities

### Purpose of this phase
Give the existing Admin role (now understood as "College Admin," scoped to their own college by Phase 3's isolation rules) the new abilities described earlier — setting their own email domain, adding their own TPOs, and browsing/requesting features — building both the small new UI screens for these and the backend endpoints behind them together, since these are smaller, more self-contained additions than the full SuperAdmin build.

### What to build, explained fully

**1. A settings area where Admin can view and change their college's allowed email domain(s)**, replacing whatever hardcoded value exists in the code today. Explain clearly in this screen's UI what changing this value actually does, since it directly affects who can sign up.

**2. A screen where Admin can add a new TPO account for their own college** — a simple form (name, email, initial access setup, following the same pattern decided in Phase 1/4 for how new accounts get their first access), which creates a new user row automatically tagged with that Admin's own college_id.

**3. A "Available Features" screen for Admin**, listing every feature from the platform-wide catalog (Phase 4), showing clearly which ones are already turned on for their own college, which ones are currently pending a decision, and which ones haven't been requested yet — with a "Request this feature" button on the not-yet-requested ones, which creates a new pending row in the connecting table from Phase 2 for SuperAdmin to eventually review in Phase 4's request queue.

---

## PHASE 6 — Student Signup: Automatic College Detection by Email Domain

### Purpose of this phase
Replace the current hardcoded single-domain check with the dynamic, multi-college version described earlier, now that the underlying data (Phase 2's colleges and their domains) and backend patterns (Phase 3, Phase 5) already exist to support it.

### What to build, explained fully

When a student submits their email at signup, the backend takes the portion after the @ symbol and looks it up against every college's stored allowed domain(s) from Phase 2. If a match is found, the new student account is automatically created with that college's college_id attached — no manual college selection needed from the student. If no match is found anywhere on the platform, reject the signup with a clear, specific error message explaining that this email's domain isn't recognized as belonging to any college on the platform, rather than a generic/confusing failure. Also make sure, at the point where a college's domain is set or changed (in Phase 1/4's Add College flow and Phase 5's Admin settings screen), that the system checks and prevents two different colleges from ever registering the exact same domain, since that would make this lookup ambiguous.

---

## PHASE 7 — Feature Gating: Making Optional Features Actually Turn On and Off

### Purpose of this phase
Connect the feature-approval system (Phases 2 and 4) to the actual Student- and TPO-facing parts of the application that those optional features control (for example, the Study Resources pages), so that approving a feature for a college in Phase 4 genuinely makes it appear for that college's users, and it stays completely invisible for every college that hasn't been approved for it.

### What to build, explained fully

For every part of the application that is considered an optional, catalog-listed feature (as opposed to core functionality every college gets automatically), add a check — both on the backend (so the API itself refuses to serve that data if the feature isn't approved for the requesting user's college) and on the frontend (so the relevant navigation link, menu item, or page simply doesn't render at all for users whose college doesn't have it enabled, rather than showing a broken or "access denied" page). This check should look up the current user's college_id, then check the connecting table from Phase 2 to see if that college's row for that specific feature says "approved" — if not, the feature is treated as if it doesn't exist for that user at all.

---

## PHASE 8 — Full Regression Check: TPO and Student Experience Unchanged

### Purpose of this phase
A dedicated verification phase, not a phase that adds new functionality — its entire job is to confirm that everything TPOs and Students could already do before this whole migration still works exactly the same way from their point of view, now that every part of the system underneath them has been rebuilt around college-scoping.

### What to verify, explained fully

Go through every existing Student and TPO feature — signup, login, onboarding, resume upload/analysis, fee verification, browsing and applying to drives, mock interviews, instant tests, TPO drive/applicant management — and confirm each one still works correctly for a single college, and additionally, once you have two test colleges seeded on the platform (which Phase 1/4's Add College flow now makes possible), confirm that a user from College A genuinely cannot see, query, or affect any of College B's data, by actually testing it directly rather than assuming Phase 3's isolation rules were implemented correctly everywhere. This phase's checklist should specifically try to "break" the isolation on purpose — attempting to access another college's drive by guessing its ID directly, for example — to confirm the college guard checks from Phase 3 genuinely block it.

---

## PHASE 9 — Keep `master_prompt_placement_portal.md` in Sync (do this after every phase above, not just once at the end)

### Purpose of this phase
The file `master_prompt_placement_portal.md` is this project's single source of truth, read fully by every AI session before doing any work. If the phases above change the real system but this file isn't updated to match, every future session will be working from an outdated, inaccurate description of the system, which causes confusion and mistakes.

### What to do, explained fully

After completing each phase above (not just once at the very end of everything), open `master_prompt_placement_portal.md`, read it fully, and update whichever sections that specific phase affected — the role descriptions, the database schema/table list, the authentication/signup flow, the Admin module's described capabilities — so the file always accurately reflects the current, real state of the system as it exists after that phase, not the plan for some future phase not yet built. Where a phase introduces a genuinely new concept that has no existing section in the file (for example, the SuperAdmin role and the feature-catalog system, after Phase 1/2/4), write a new section for it with the same level of completeness, detail, and "the system shall..." requirement-style phrasing as the rest of the existing document, rather than a short summary note. Where a phase changes the meaning of something that already had a section (for example, the Admin module's scope, after Phase 5), rewrite that section in place to describe the new reality clearly, rather than appending a contradictory note that leaves both the old and new descriptions confusingly present at the same time. Treat the size of these updates as roughly proportional to the size of the real change made in that phase — a phase that adds a substantial, detailed new capability should result in a similarly substantial, detailed addition to this file, not a one-line mention, so that the file's usefulness as strong context for future sessions never degrades as the system grows more complex. After updating the file following each phase, state clearly which sections were added and which were modified, so it can be reviewed before moving on to the next phase.
