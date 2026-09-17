# collegeonboarding.md — Self-Service College Registration & Progressive Onboarding

## How to use this document

You are an AI coding assistant implementing a new feature on a multi-tenant placement portal (FastAPI + SQLAlchemy 2.0 + PostgreSQL + Alembic backend, React + Vite + Tailwind frontend). This document specifies a complete replacement for how new colleges join the platform.

**What exists today (the thing being replaced):** a college contacts the platform operator (SuperAdmin) offline — by email, phone, or in person — and the SuperAdmin manually creates the college record and manually creates that college's first Admin account by hand, then manually communicates the credentials back to them. This works when there are two or three colleges. It does not scale, it is slow, it puts all the data-entry burden on the platform operator, and it is not how any real software platform onboards customers.

**What this document specifies instead:** a self-service registration flow where the college's own representative enters their details themselves, verifies their identity via OTP sent to their official college email address, logs in immediately, and then fills in the remaining setup details gradually at their own pace — guided by a small, unobtrusive, always-visible progress indicator rather than a forced multi-step wizard that must be completed before they can do anything. Critically, this is self-service **registration and setup**, but it is NOT self-service **activation** — the platform operator still reviews and approves every college before that college goes fully live and real students can sign up. The reasoning for this distinction is explained in detail in Part 3.

Read this entire document before writing any code. Several parts of this flow depend on existing systems in this project that must be reused rather than rebuilt: the existing OTP generation/verification/rate-limiting infrastructure already built for student signup, the existing JWT authentication with role guards, the existing college-scoping (`college_id`) data isolation rules, the existing notification system, and the existing SuperAdmin console ("Command Deck" design system). Do not build parallel versions of any of these.

---

## PART 1 — Design Philosophy: Why This Flow Is Shaped The Way It Is

### 1.1 Why not a forced onboarding wizard
A common and tempting approach for onboarding a new tenant is a mandatory multi-step wizard: the new user cannot reach their dashboard at all until they have filled in every required field across five or six sequential screens. This approach is deliberately rejected here. The reason is that a college administrator registering for a platform like this is very often doing so in a short window of available attention — they may not have their college's curriculum PDF, their fee receipt template, or their TPO staff list immediately at hand at the exact moment they are registering. Forcing them to gather all of that before they can even see what they signed up for produces abandoned registrations. The correct approach is to get them registered and logged in with the absolute minimum information necessary, then let them fill in the rest gradually, with clear, persistent, non-nagging guidance about what remains.

### 1.2 Why a progressive checklist instead
Instead of a wizard, this flow uses a small, collapsed progress indicator that lives persistently on the Admin's dashboard. In its default collapsed state, it is a very small element — showing only a completion percentage, taking up almost no visual space and creating no pressure. When clicked or expanded, it opens into a notification-style panel listing exactly which setup items remain, each as a directly clickable link that takes the Admin straight to the specific screen and field where that item is completed. This respects the Admin's time and attention: the information is always available when they want it, and invisible-but-present when they do not.

### 1.3 Why self-service registration still needs a human approval gate
This is the single most important design decision in this document, and it must not be removed in the name of automation. This platform hosts real student data — academic records, resumes, fee receipts, placement outcomes — for real educational institutions, and it charges real money for features. Allowing any person who fills in a web form to instantly create a fully-live tenant on that platform, with no human ever reviewing it, is the wrong default for this kind of system. The flow below therefore separates two things that are easy to accidentally conflate:
- **Registration and setup** (fully self-service, no human involvement, happens immediately): the college representative registers, verifies their email, logs in, and configures their college's details themselves.
- **Activation** (requires explicit SuperAdmin approval): the point at which the college goes fully live and real students can actually sign up and use the platform.

The user experience of the first is fast and frictionless. The second is a deliberate gate. Both are necessary.

---

## PART 2 — Registration Flow, Step By Step

### 2.1 Entry point
Add a publicly accessible "Register your college" page, linked from the platform's landing page alongside the existing login link. This page is reachable by anyone, with no authentication — it is the front door for new institutions.

### 2.2 The registration form — what is collected and why each field exists
Keep this form deliberately minimal. Every additional field on this form reduces completion rate, so only genuinely necessary information belongs here — everything else is deferred to the progressive checklist in Part 4. Collect:

- **College name** (text). The institution's full official name.
- **Your name** (text). The registering person's own full name — this becomes the College Admin account's name.
- **Your college email address** (email). This is the most important field on the form and has a strict validation rule described in 2.3 below.
- **Mobile number** (text/phone). See 2.6 for an important caveat about this field.

Do NOT collect on this form: the student email domain configuration, expected student count, TPO details, curriculum, fee structure, logo, or anything else. All of that belongs in the post-login checklist, not in the barrier standing between a person and getting registered.

### 2.3 CRITICAL VALIDATION: the registering email must be at the college's own domain
This is the primary defense against a serious abuse scenario, and it must be implemented, not treated as optional. Without it, any person with any free email address (gmail, yahoo, outlook, etc.) could register any college's name on this platform — including a college they have no association with whatsoever — and thereby become the controlling Admin for that institution's tenant. Because colleges on this platform are identified by their student email domain, and because that domain determines which students can sign up and where their data lands, whoever controls a college's tenant controls a meaningful amount of real institutional infrastructure. This cannot be open to anyone who fills in a form.

Therefore: **reject registration attempts using free/public email providers**. Maintain a blocklist of common free email domains (gmail.com, yahoo.com, outlook.com, hotmail.com, protonmail.com, and similar — keep this list in configuration, not hardcoded inline, so it can be extended without a code change) and reject any registration email matching one. Show a clear, specific error explaining why: something like "Please register using your official college email address. Personal email addresses (Gmail, Yahoo, etc.) can't be used to register an institution." The practical effect of this rule is that only a person who actually has a working mailbox at that institution's own domain can register that institution — which is a meaningful, if not absolute, proof of association.

Be honest in your implementation notes about what this rule does and does not guarantee: it proves the registering person controls an email address at that domain, which is strong evidence of association with the institution. It does not prove they are authorized by the institution to make decisions on its behalf (a student at that college would also have an address at that domain, for instance). This is precisely why the SuperAdmin approval gate in Part 3 remains necessary as a second layer — the email rule and the approval gate are complementary defenses, and neither alone is sufficient.

### 2.4 CRITICAL VALIDATION: duplicate college / domain collision check
Before doing anything else with a registration attempt, extract the domain portion of the submitted email address and check it against every college already registered on the platform. If that domain is already associated with an existing college, **do not create a second college record**. This scenario — two people from the same institution independently registering it, or a second registration attempt after a college is already onboarded — is genuinely common and, if unhandled, produces a badly broken state: two separate tenants for one real institution, with that institution's students split unpredictably between them depending on which tenant claimed the domain, and no clean way to merge them afterward.

When a collision is detected, show a clear message explaining the situation without leaking unnecessary detail about the existing college: something like "This college is already registered on the platform. Please contact your institution's existing administrator for access, or get in touch with us if you believe this is an error." Additionally, send a notification (reusing the existing notification system) to that existing college's current Admin, informing them that someone attempted to register using their institution's domain — this is genuinely useful information for them, since it might be a legitimate colleague who should be added as a second Admin, or it might be something they want to know about.

### 2.5 OTP verification
Once the email passes both validations in 2.3 and 2.4, generate and send a one-time password to that email address, and present the OTP entry screen. **Reuse the platform's existing OTP infrastructure entirely** — the same generation logic, the same secure hashing of stored OTPs, the same expiry window, and critically the same rate limiting that already protects student signup (the existing limit of a small number of OTP requests per email address per time window). Do not build a fresh, separate OTP endpoint for college registration; an unprotected new endpoint would be an obvious abuse vector, and the existing infrastructure already solves this problem correctly.

The OTP being sent to the college-domain email address, and requiring successful entry of that OTP to proceed, is what actually enforces the rule in 2.3 — without OTP verification, a person could simply type any college-domain address they did not control.

### 2.6 A note on the mobile number field
The registration form collects a mobile number, but this document does not specify sending an SMS OTP to verify it, since that would require SMS gateway integration that may not exist in this project. This creates a specific situation worth handling honestly rather than ignoring: an unverified piece of contact data is being stored. Choose one of two approaches and implement it deliberately:

- **Option A (recommended if no SMS capability exists):** keep collecting it, but clearly mark it as unverified wherever it is displayed (for instance, in the SuperAdmin's college detail view, show it with a small "unverified" indicator), so nobody downstream mistakes it for confirmed contact information.
- **Option B:** remove the field from the registration form entirely and collect it later as a checklist item, where the Admin adds it as part of their college profile.

What should not happen is collecting it, displaying it as if it were verified, and having someone later rely on it as confirmed contact information when nothing has ever validated it.

### 2.7 What OTP success actually creates — and what it deliberately does not
This is where the design decision from 1.3 becomes concrete in the data model. On successful OTP verification, create:
- A new `colleges` row, with the submitted college name, the registering email's domain recorded, and a status of **`pending_setup`** (see Part 5 for the full status lifecycle) — explicitly NOT an active/live status.
- A new user account for the registering person, with the College Admin role, associated with that new `college_id`, and able to log in immediately.

Do NOT at this point: activate the college for student signups, make it visible as a live tenant anywhere it shouldn't be, or bypass the approval gate in any way. The college exists and its Admin can log in and work, but students cannot yet sign up against its domain (see Part 5.3 for exactly what `pending_setup` blocks).

### 2.8 Redirect to login
Per the intended flow, after successful OTP verification the person is directed to the standard login page (not automatically logged in) and logs in with their newly created credentials. Note that this requires the account to have a password — decide and implement how the password is set: either the registration form in 2.2 includes a password field (adding one field, but keeping the flow to a single screen), or after OTP verification the person is prompted to set their password before being sent to login. The second is marginally more secure in that a password is never submitted before email ownership is proven, and is the recommended approach; implement whichever is chosen consistently and document the choice.

### 2.9 Abandoned registration cleanup
A meaningful percentage of registration attempts will start and never complete OTP verification — the person gets distracted, the email goes to spam, they change their mind. Handle this explicitly rather than leaving orphaned records accumulating: any registration that has not completed OTP verification within a reasonable window (48 hours is a sensible default, kept in configuration rather than hardcoded) should be expired and cleaned up, importantly including releasing any domain reservation so that a genuine subsequent attempt by the same institution is not permanently blocked by an earlier abandoned one. Implement this via the same scheduled/background task mechanism used elsewhere in this project for time-based state transitions (such as the subscription expiry checks), rather than introducing a new scheduling approach.

---

## PART 3 — The SuperAdmin Approval Gate

### 3.1 Two distinct states, not one queue
A naive implementation would put every registered college into a single "pending approval" queue the moment it registers. This is wrong and would make the SuperAdmin's queue nearly useless, because it would be full of colleges that are still halfway through entering their own details and are not actually ready for any decision to be made about them. Instead, distinguish:

- **`pending_setup`**: the college has registered, the Admin can log in and is working through the checklist, but blocking setup items (Part 4.3) remain incomplete. This college is NOT in the SuperAdmin's action queue — there is nothing for the SuperAdmin to decide yet. It should still be *visible* to the SuperAdmin in the full colleges list (with its setup progress shown, per 3.4), but it is not an item awaiting action.
- **`ready_for_review`**: every blocking checklist item is complete. The college has done everything it needs to do, and is now genuinely waiting on the SuperAdmin. This is what belongs in the action queue.

The transition from `pending_setup` to `ready_for_review` happens automatically, the moment the last blocking checklist item is completed — not via any manual "submit for review" button the Admin has to find and click, which would be an easy step to miss and would leave fully-configured colleges sitting in limbo indefinitely.

### 3.2 What the SuperAdmin sees and does
When a college enters `ready_for_review`, send a notification to the SuperAdmin (reusing the existing notification system and the existing "Pending Actions" badge mechanism already specified in the SuperAdmin console design). In the SuperAdmin's colleges view, show these as a distinct, actionable group with the college's submitted details (name, Admin's name and email, domain, mobile number with its verification status per 2.6) and the completed setup information, with clear Approve and Reject actions.

On **Approve**: the college's status moves to `active`. This is the point at which the platform genuinely goes live for that institution — student signups against its domain begin working. Send a notification to the College Admin informing them their college is now live.

On **Reject**: the college's status moves to a `rejected` state. Send a notification to the College Admin. Consider (recommended) allowing the SuperAdmin to include a short reason with a rejection, since a rejection with no explanation is a poor experience for a legitimate institution that may simply have submitted something incorrectly and could easily fix it. Decide and document whether a rejected college can re-apply or correct and resubmit, or whether rejection is terminal and requires contacting the platform operator directly — the former is more forgiving and probably correct, but either is defensible as long as the behavior is deliberate and the rejection message tells the person what their options are.

### 3.3 Why the Admin can log in and work before approval
Worth stating explicitly so this is not "fixed" later by someone who assumes it is a bug: allowing the Admin to log in and complete setup during `pending_setup`, before any approval has happened, is intentional. It front-loads all of the college's own data entry work into the period before the SuperAdmin ever looks at it, which means that when the SuperAdmin does review it, they are reviewing a complete, fully-configured college rather than a bare name and email — making the approval decision better-informed and faster. It also means the college experiences the platform as immediately responsive rather than sitting idle waiting on a human.

### 3.4 Setup progress visibility on the SuperAdmin side
Show each `pending_setup` college's checklist completion percentage in the SuperAdmin's colleges list. This is cheap to implement (the percentage is already being computed for the Admin's own dashboard) and is genuinely valuable operationally: a college that registered three weeks ago and has been stuck at 30% completion is a clear signal that someone should reach out and help them, and that signal is otherwise completely invisible until the college either finishes or gives up entirely. This is real customer-success tooling, obtained almost for free from data the system already has.

---

## PART 4 — The Progressive Setup Checklist

### 4.1 The collapsed indicator
On the College Admin's dashboard, display a small, low-prominence progress element — showing only the completion percentage (for example, "Setup 60% complete") in a compact pill or small card. It should be genuinely small and non-intrusive, consistent with the intent described in 1.2: present and findable, but not dominating the dashboard or creating a sense of nagging. Style it consistently with the existing Admin-side design language already used elsewhere in this application (note: the Admin side has its own visual style, distinct from the SuperAdmin console's "Command Deck" system — match the Admin side's existing style here, do not import Command Deck styling into Admin pages).

### 4.2 The expanded panel
Clicking or expanding the collapsed indicator opens a notification-style panel listing the outstanding setup items. Each item shows: a short label describing what is needed, a one-line explanation of why it matters or what it enables, and — critically — a direct link. That link must navigate the Admin to the specific screen with the relevant field ready to fill in, not merely to a general settings page where they then have to hunt for the right section. This specificity is the difference between a checklist people actually complete and one they ignore; a link that lands someone on a generic settings page and leaves them to find the field themselves adds friction at exactly the moment they had decided to act.

Completed items should either disappear from the list or show as visibly completed (a checked state) — showing them as completed for a period is generally better, since it gives a sense of progress rather than an apparently-never-shrinking list of demands.

### 4.3 Blocking versus optional items — this distinction is essential
Do not present the checklist as one flat, undifferentiated list. Some setup items genuinely must exist before the platform can function at all for that college; others genuinely can wait indefinitely with no ill effect. Conflating them either creates false urgency about optional things, or — much worse — lets a college believe everything is optional and then wonder why nothing works.

**Blocking items (must be complete before the college can move to `ready_for_review` and therefore before it can ever be approved and go live):**
- **Student email domain configuration.** This is the single most important item. Without it, no student can sign up at all, because student signup works by matching a student's email domain to a college. A college without this configured is not a functioning tenant in any sense. Note that the registering Admin's own email domain (from Part 2) is a strong default suggestion for this field — pre-fill it, but let them confirm or change it, since some institutions use a different domain for students than for staff.
- **At least one TPO account added.** A placement portal with no placement officer has nobody to create drives or manage applicants; the student-facing side would be empty.
- **Basic college profile completion** (whatever minimal fields the college record needs beyond its name).

**Optional/recommended items (genuinely deferrable, the college works fine without them, they simply unlock or improve specific things):**
- **Fee receipt template upload** — enables the template-matching enhancement to fee verification; without it, fee verification falls back to its baseline behavior, which still works.
- **Curriculum/syllabus document upload** — enables the curriculum-driven study resources feature; without it, that feature simply has no data to work with, and the rest of the platform is unaffected.
- **A second Admin account** — see 4.4 below, this is strongly recommended but should not block going live.
- **Circulars, college logo, and similar presentational or supplementary content.**

Present these two groups as visually distinct within the expanded panel — not merely ordered differently within one list, but clearly separated with their own headings, so the difference between "this must be done" and "this is worth doing when you get a chance" is immediately obvious at a glance.

### 4.4 The second-Admin recommendation, and why it matters
Include "Add a second administrator" as a prominent recommended (non-blocking) checklist item, with a one-line explanation of why. The reason: as designed, a college has exactly one Admin account created at registration. If that single person leaves the institution, loses access to their email, or forgets their password with no working recovery path, that entire college is locked out of their own tenant with no way back in except contacting the platform operator for manual intervention. This is a genuine single point of failure affecting a paying institution's access to their own data. It is not appropriate to make this blocking (it would add friction to going live for a risk that is not immediate), but it should be visible and explained rather than left for the institution to discover the hard way.

---

## PART 5 — Data Model and Status Lifecycle

### 5.1 College status values
The `colleges` table's status field must support the full lifecycle:
- **`pending_setup`** — registered and OTP-verified, Admin can log in, blocking checklist items incomplete, student signups blocked, not in SuperAdmin's action queue.
- **`ready_for_review`** — all blocking items complete, awaiting SuperAdmin decision, student signups still blocked, appears in SuperAdmin's action queue.
- **`active`** — approved by SuperAdmin, fully live, student signups against this college's domain work normally. This is the state every existing college in the system (including the original college this platform was first built for) should already be in after migration.
- **`rejected`** — SuperAdmin declined the registration.
- **`suspended`** — an already-active college whose access has been paused (this status may already exist from prior work on the SuperAdmin console; reuse it rather than introducing a duplicate concept).

### 5.2 Additional fields needed
On the `colleges` table: `registered_at`, `activated_at` (nullable, set on approval), `rejection_reason` (nullable text), and whatever field stores the student email domain (which may already exist from prior work — reuse it, since the domain-uniqueness constraint described in 2.4 depends on it and there must be exactly one authoritative place that value lives).

Consider a separate small table or a JSON field tracking per-item checklist completion state, rather than deriving every checklist item's status by querying several different tables each time the dashboard loads — though deriving it is also acceptable and avoids state-synchronization bugs; choose based on how many items there are and how expensive the derivation is, and document the choice.

### 5.3 What `pending_setup` and `ready_for_review` actually block, concretely
It is not sufficient to store a status value; it must actually be enforced. Specifically, student signup must check the target college's status and refuse signup for any college not in `active` status, with a clear message (something like "This college is not yet active on the platform — please contact your placement office"). Verify this is enforced at the backend endpoint level, not merely by hiding a link in the frontend, since a signup endpoint that accepts requests for a non-active college would completely defeat the approval gate described in Part 3.

Equally, verify that the College Admin *can* still log in and use their setup screens during `pending_setup` — it would be an easy mistake to implement the status check too broadly and accidentally lock the Admin out of the very account they need in order to complete setup.

---

## PART 6 — Migration Concern: Existing Colleges

Any college already on the platform before this feature is built — including the original institution the platform was first developed for — must be correctly handled when this status lifecycle is introduced. As part of the migration that adds these new status values, explicitly set every pre-existing college to `active` status, since they are already live, already have students using them, and must not suddenly find their students unable to sign up because a newly-introduced status field defaulted to something restrictive. This is exactly the kind of migration detail that is easy to overlook and that produces a serious, confusing outage if missed — verify it explicitly rather than assuming a sensible default.

---

## PART 7 — Full End-to-End Sequence (restated plainly for verification)

1. A college representative opens the public "Register your college" page.
2. They submit college name, their name, their official college email address, and mobile number.
3. The system rejects the attempt if the email is at a free/public email provider.
4. The system rejects the attempt (with a clear, non-leaky message, plus a notification to the existing Admin) if that email's domain already belongs to a registered college.
5. An OTP is sent to that college email address, using the platform's existing OTP infrastructure and its existing rate limits.
6. The representative enters the OTP successfully, proving they control that mailbox at that institution's domain.
7. A college record is created with status `pending_setup`, and a College Admin account is created for the representative. Neither the college nor its students are live yet.
8. The representative is directed to the login page and logs in.
9. On their dashboard, a small collapsed progress indicator shows their setup completion percentage.
10. Expanding it reveals the outstanding setup items, clearly separated into blocking items and optional/recommended items, each with a direct link to the exact screen where it is completed.
11. They complete items at their own pace, across as many sessions as they like.
12. The moment the final blocking item is completed, the college's status automatically becomes `ready_for_review`, and the SuperAdmin is notified.
13. The SuperAdmin reviews the fully-configured college and approves or rejects it.
14. On approval, the college becomes `active`, the Admin is notified, and students at that college's configured domain can now sign up and use the platform for real.

---

## PART 8 — Explicit Non-Goals For This Version

Stated clearly to prevent scope drift: this version does not need SMS/mobile number verification (see 2.6's honest handling of the unverified field instead); does not need a self-service "merge my duplicate college" flow (the collision check in 2.4 prevents duplicates from being created in the first place, which is sufficient); does not need automated document verification of the institution's legitimacy (accreditation certificates, government registration documents, and similar — the email-domain rule plus the human approval gate is the intended level of verification for now); and does not need a public directory or listing of colleges on the platform.
