# SuperAdmin Console Design Specification — "Command Deck"

**Project:** AI-Powered Smart Placement & Career Preparation Portal — SuperAdmin (Platform Operator) Console
**Design name:** Command Deck
**Style family:** Data-dense operational dashboard with executive-summary elements (not glassmorphic — see §1.2 for why this deliberately differs from the student-facing "Glass Focus" test screen)
**Version:** 1.0
**Purpose of this document:** A complete, pixel-level, implementation-ready specification for every SuperAdmin-facing screen (Phase 1 of the multi-tenant migration plan), so a developer or AI coding assistant can build the entire console consistently — one shared design language across nine screens — without guessing at spacing, color, or hierarchy on any individual page.

---

## 1. Design Philosophy & Rationale

### 1.1 Who this is for and what that means for the design
Every other role in this product — Student, TPO, College Admin — is a person managing one college's worth of work. SuperAdmin is a fundamentally different kind of user: an operator managing an entire platform of colleges, whose job is mostly scanning, comparing, and deciding (approve/reject a request, suspend/reactivate a college) rather than filling in long forms or reading long-form content. The design has to prioritize **information density and fast scanning** over the calmer, more spacious feel appropriate for a student. This is why Command Deck reads as a classic "ops console" — dense tables, compact KPI cards, a persistent sidebar — rather than a soft, breathing, content-first layout.

### 1.2 Why NOT glassmorphism, and why that's the correct call, not an inconsistency
The existing "Glass Focus" design (used for the student proctored-test screen) was deliberately chosen there because a student takes a test in one sitting and the goal was to lower anxiety with a soft, airy surface. SuperAdmin's job is the opposite: repeated, frequent, high-throughput administrative work across potentially dozens of colleges. Frosted, blurred surfaces reduce text contrast and add rendering cost — both are actively bad for a screen someone might have open for an hour reviewing feature requests. **Reusing glass here would be applying a mood to a context it doesn't fit, which is a worse "consistency" than the alternative.** What Command Deck reuses from the rest of the product instead is the **color language and the underlying brand identity** (see §1.3) — that's what makes it recognizably the same product, not the surface treatment.

### 1.3 Why this specific color logic
This design deliberately reuses the exact same semantic colors already established elsewhere in the product (the same blue/green/amber/red logic used in the "Glass Focus" test screen and the general app's status badges), rather than inventing a new palette for SuperAdmin. This is the actual mechanism of "matching our web design" — a shared color vocabulary across every surface of the product, so a person who uses both the student app and (hypothetically) sees the SuperAdmin console recognizes it as the same system:
- **Blue** (`#2563EB`) = primary/brand/action color — every primary button, every active nav item, every focus ring.
- **Green** (`#059669`) = positive/active/approved status — an active college, an approved feature request, a healthy metric trend.
- **Amber** (`#F59E0B`) = pending/attention-needed status — a feature request awaiting decision, a college nearing some threshold worth watching.
- **Red** (`#DC2626`) = negative/suspended/rejected status — a suspended college, a rejected request. Used sparingly and only for true negative states, never decoratively, for the same reason established in the earlier design doc: overuse dilutes its urgency.

### 1.4 Why this typography pairing (deliberately different from the student-facing pairing, on purpose)
- **Fira Sans** — the workhorse face for all UI text, labels, table content, navigation, buttons. Chosen specifically (instead of reusing Roboto from the student design) because Fira Sans has a slightly more technical, engineered character that suits an operations console — it's part of the same typeface family used in code editors and developer tools, which subconsciously signals "this is a control panel," appropriate for this specific audience of one (you, the platform operator) in a way that would be wrong for student-facing screens.
- **Fira Code** — used in exactly one place: the large numeric KPI values on the Dashboard and Analytics screens (e.g., "42" colleges, "1,204" students). A monospaced, tabular-figure face makes columns of numbers align predictably and gives statistics a precise, "this is real data" feel — this is Command Deck's one signature typographic choice, deliberately narrow in scope so it stays a deliberate accent rather than becoming the whole interface's voice.
- Google Fonts import: `https://fonts.googleapis.com/css2?family=Fira+Code:wght@500;600&family=Fira+Sans:wght@400;500;600;700&display=swap`

### 1.5 The signature structural element
Where "Glass Focus" spent its one bold risk on a circular timer ring, Command Deck spends its one signature moment on the **persistent left sidebar with a live-updating "Pending Actions" badge** — a small red-or-amber numbered pill on the Feature Requests nav item that's visible from every single screen in the console, not just the requests page itself. This is the one element specifically designed to pull the operator back to the thing that actually needs a decision, no matter where else in the console they're currently working — everything else in the shell is conventional, well-understood admin-console furniture.

---

## 2. Design Tokens

### 2.1 Color tokens

| Token | Value | Used for |
|---|---|---|
| `--cd-bg` | `#F8FAFC` | Page background (behind the sidebar and content area) |
| `--cd-surface` | `#FFFFFF` | Card, table, and panel backgrounds |
| `--cd-surface-sunken` | `#F1F5FD` | Table header row background, sidebar background |
| `--cd-border` | `#E4ECFC` | Default hairline borders on cards, tables, dividers |
| `--cd-text-primary` | `#0F172A` | Headings, primary body text |
| `--cd-text-secondary` | `#475569` | Secondary/meta text, table body text |
| `--cd-text-muted` | `#94A3B8` | Placeholder text, disabled state text, timestamps |
| `--cd-primary` | `#2563EB` | Primary buttons, active nav item, links, focus rings |
| `--cd-primary-hover` | `#1D4ED8` | Primary button hover state |
| `--cd-primary-bg` | `#EFF6FF` | Active nav item background, selected-row background |
| `--cd-success` | `#059669` | Active status, approved status, positive trend arrows |
| `--cd-success-bg` | `#ECFDF5` | Success badge background |
| `--cd-warning` | `#F59E0B` | Pending status, "needs attention" badge |
| `--cd-warning-bg` | `#FFFBEB` | Warning badge background |
| `--cd-danger` | `#DC2626` | Suspended/rejected status, destructive button, error text |
| `--cd-danger-bg` | `#FEF2F2` | Danger badge background |
| `--cd-shadow-card` | `rgba(15,23,42,0.06)` | Card and dropdown drop shadow |

### 2.2 Typography tokens

| Token | Value |
|---|---|
| `--cd-font-body` | `'Fira Sans', sans-serif` |
| `--cd-font-mono` | `'Fira Code', monospace` |
| Page title (H1) | Fira Sans 700, 24px, `--cd-text-primary`, line-height 1.3 |
| Section heading (H2) | Fira Sans 600, 18px, `--cd-text-primary`, line-height 1.3 |
| Card label | Fira Sans 500, 13px, `--cd-text-secondary`, letter-spacing 0.3px, uppercase |
| KPI number | Fira Code 600, 32px, `--cd-text-primary` |
| KPI number, secondary/small variant | Fira Code 500, 20px |
| Table header | Fira Sans 600, 12px, `--cd-text-secondary`, uppercase, letter-spacing 0.4px |
| Table cell | Fira Sans 400, 14px, `--cd-text-primary` |
| Table cell, secondary | Fira Sans 400, 13px, `--cd-text-secondary` |
| Nav item | Fira Sans 500, 14px |
| Button label | Fira Sans 600, 14px |
| Badge/pill text | Fira Sans 600, 12px |
| Body/paragraph text | Fira Sans 400, 14px, `--cd-text-secondary`, line-height 1.6 |
| Timestamp/meta | Fira Sans 400, 12px, `--cd-text-muted` |

### 2.3 Spacing, radius & shadow tokens

| Token | Value | Notes |
|---|---|---|
| `--cd-radius-card` | `12px` | Cards, panels, modals |
| `--cd-radius-control` | `8px` | Buttons, inputs, badges |
| `--cd-radius-pill` | `999px` | Status pills, the sidebar notification badge |
| `--cd-sidebar-width` | `240px` | Fixed left sidebar |
| `--cd-header-height` | `64px` | Top bar height within the content area |
| `--cd-content-padding` | `28px` | Padding around main content area |
| `--cd-card-padding` | `20px` | Internal padding for KPI cards and panels |
| `--cd-table-row-height` | `52px` | Each data row in a table |
| `--cd-gap-sm` | `8px` | Tight internal gaps (icon-to-label, badge internals) |
| `--cd-gap-md` | `16px` | Standard gap between related elements |
| `--cd-gap-lg` | `24px` | Gap between distinct sections/cards |
| Card shadow | `0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.06)` | Subtle two-layer shadow — a tight contact shadow plus a soft ambient one, standard practice for cards that need to read as "raised" without looking heavy |

---

## 3. Global Shell (present on every screen)

### 3.1 Layout structure
`display: grid; grid-template-columns: 240px 1fr;` filling the full viewport. Left column is the fixed sidebar (§3.2); right column is the scrollable content area (§3.3), which itself contains a top bar (§3.3.1) and the page content below it.

### 3.2 Sidebar
- Width: fixed `240px`, full viewport height, `background: var(--cd-surface-sunken)`, `border-right: 1px solid var(--cd-border)`.
- Top: platform wordmark/logo area, `padding: 20px`, height matches `--cd-header-height` for visual alignment with the top bar.
- Nav items, one per screen from Phase 1 (Dashboard, Colleges, Feature Catalog, Feature Requests, Analytics, Announcements, Audit Log): each is `padding: 10px 16px`, `border-radius: var(--cd-radius-control)`, `margin: 2px 12px`, `display: flex; align-items: center; gap: 12px`, containing a 18px outline icon + label text (Nav item token, §2.2).
  - **Default state:** `color: var(--cd-text-secondary)`, transparent background, icon same color as text.
  - **Hover state:** `background: rgba(37,99,235,0.06)`.
  - **Active/current-page state:** `background: var(--cd-primary-bg)`, `color: var(--cd-primary)`, icon also `var(--cd-primary)`, `font-weight: 600`.
- **The signature Pending Actions badge (§1.5):** on the "Feature Requests" nav item specifically, a small circular pill sits at the right edge of that nav row — `width/height: auto, min-width: 20px, height: 20px, border-radius: var(--cd-radius-pill)`, `background: var(--cd-warning)` (or `var(--cd-danger)` if the pending count exceeds a threshold worth escalating visually, e.g. more than 5 waiting — implementation should decide and document this threshold), white Fira Sans 600 11px number centered inside, showing the live count of pending requests. This badge should update in near-real-time (e.g., on a short polling interval or a push event) since it's the one thing in the whole shell designed to pull attention.
- Bottom of sidebar: a compact account area showing "SuperAdmin" label and a sign-out affordance, `padding: 16px`, `border-top: 1px solid var(--cd-border)`.

### 3.3 Content area
- `padding: var(--cd-content-padding)` on all sides, `background: var(--cd-bg)`.

#### 3.3.1 Top bar (within the content column, not the sidebar)
- `height: var(--cd-header-height)`, `display: flex; align-items: center; justify-content: space-between`.
- Left: the current page's H1 title (§2.2).
- Right: contextual primary action for that page where relevant (e.g., "+ Add College" button on the Colleges screen) — see each screen section below for which pages have one.

---

## 4. Shared Components (used across multiple screens — defined once here, referenced by name below)

### 4.1 KPI Card
- `background: var(--cd-surface)`, `border: 1px solid var(--cd-border)`, `border-radius: var(--cd-radius-card)`, `padding: var(--cd-card-padding)`, shadow per §2.3.
- Structure top to bottom: Card label (§2.2 token) → `margin-bottom: 8px` → KPI number (Fira Code, §2.2) → optional trend row below (`margin-top: 8px`, small arrow icon + percentage, `color: var(--cd-success)` for positive/up or `var(--cd-danger)` for negative/down, 12px Fira Sans 500).
- Grid of these: `display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--cd-gap-lg);`

### 4.2 Status Pill/Badge
- `display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: var(--cd-radius-pill);`
- Active/Approved variant: `background: var(--cd-success-bg); color: var(--cd-success);` with a small filled dot or check icon.
- Pending variant: `background: var(--cd-warning-bg); color: var(--cd-warning);` (or its darker text-safe equivalent `#92400E` if `#F59E0B` fails contrast on `--cd-warning-bg` — verify at implementation time per the accessibility note in §7).
- Suspended/Rejected variant: `background: var(--cd-danger-bg); color: var(--cd-danger);`

### 4.3 Data Table
- Container: `background: var(--cd-surface); border: 1px solid var(--cd-border); border-radius: var(--cd-radius-card); overflow: hidden;`
- Header row: `background: var(--cd-surface-sunken); height: 44px;` cells use Table header token (§2.2), `padding: 0 16px`.
- Body rows: `height: var(--cd-table-row-height); border-bottom: 1px solid var(--cd-border);` (last row: no border). Cells `padding: 0 16px`, Table cell token.
- Row hover: `background: var(--cd-primary-bg)` at low opacity (e.g. mix with `rgba(37,99,235,0.04)`), `cursor: pointer` if the row is clickable (navigates to a detail view).
- Action buttons/icons within a row are right-aligned in the final column.

### 4.4 Primary Button
- `padding: 10px 18px; border-radius: var(--cd-radius-control); background: var(--cd-primary); color: #FFFFFF; border: none;` Button label token (§2.2). Hover: `background: var(--cd-primary-hover)`.

### 4.5 Secondary/Outline Button
- Same padding/radius as §4.4, `background: transparent; border: 1px solid var(--cd-border); color: var(--cd-text-primary);` Hover: `border-color: var(--cd-primary); color: var(--cd-primary);`

### 4.6 Destructive Button (e.g., "Suspend College")
- Same shape as §4.4, `background: transparent; border: 1px solid var(--cd-danger); color: var(--cd-danger);` Hover: `background: var(--cd-danger-bg)`.

### 4.7 Empty State
- Centered within its container, `padding: 48px 24px`, a muted 40px outline icon (`color: var(--cd-text-muted)`), an H2-weight but smaller (16px) headline below it (`margin-top: 16px`), a single line of secondary-token body text below that, and where relevant a primary button below the text (`margin-top: 20px`).

---

## 5. Per-Screen Specifications

### 5.1 Dashboard (home screen)
- Top bar: title "Dashboard", no primary action button.
- Row 1: 5 KPI Cards (§4.1) in the responsive grid — Total Colleges, Total Students, Total TPOs, Total Drives, Pending Feature Requests (this last card's number uses `color: var(--cd-warning)` instead of the default text-primary, and is clickable — clicking it navigates to the Feature Requests screen — since it's actionable, not just informational).
- `margin-top: var(--cd-gap-lg)` below the KPI row.
- Row 2: "Recent Activity" panel — `background: var(--cd-surface)`, card container per §4.1's outer styling (border/radius/shadow, no KPI-specific inner layout), H2 "Recent Activity" as the panel header (`padding: 16px 20px`, `border-bottom: 1px solid var(--cd-border)`), followed by a simple vertical list of activity entries, each row `padding: 12px 20px`, `display: flex; align-items: center; gap: 12px`, containing a small 32px circular icon (colored per event type — green for "college added," amber for "feature requested," blue for "feature approved"), the event description in Table cell token, and a right-aligned timestamp in the meta token. Rows separated by `border-bottom: 1px solid var(--cd-border)` except the last.

### 5.2 Colleges List
- Top bar: title "Colleges", primary action button "+ Add College" (§4.4) on the right.
- Below top bar: a search input (`max-width: 320px`, standard text input styled per §6's input spec) and, optionally, a status filter dropdown (All / Active / Suspended), `display: flex; gap: var(--cd-gap-md); margin-bottom: var(--cd-gap-lg);`.
- Main content: a Data Table (§4.3) with columns: College Name (bold, Fira Sans 500), Domain (secondary token, monospace-ish feel is optional but not required here), Students (count), TPOs (count), Status (Status Pill, §4.2), Joined Date (meta token), Actions (a small overflow "⋯" menu or inline Suspend/Reactivate text-button depending on current status).
- Row click (anywhere except the Actions cell) navigates to College Detail (§5.3).
- Empty state (§4.7): icon suggestion — a building/institution outline icon, headline "No colleges yet", body "Add your first college to start onboarding students and TPOs.", button "+ Add College".

### 5.3 Add New College (multi-step flow — modal or dedicated route, recommend a modal overlay for a flow this short)
- Modal container: `max-width: 480px`, `background: var(--cd-surface)`, `border-radius: var(--cd-radius-card)`, `padding: 28px`, centered overlay with a `rgba(15,23,42,0.4)` backdrop (a plain dark scrim — no blur, consistent with §1.2's no-glass rule).
- Step indicator at top: two small labeled dots/segments ("1. College Details" / "2. Admin Account"), current step in `var(--cd-primary)`, completed step in `var(--cd-success)`, upcoming step in `var(--cd-text-muted)`.
- **Step 1 fields:** College Name (text input), Allowed Email Domain (text input with helper text below it in meta token explaining what it's for, per the plain-language explanation established in the migration plan). Footer: Cancel (§4.5) and Next (§4.4) buttons, right-aligned, `gap: 12px`.
- **Step 2 fields:** Admin Full Name, Admin Email, and an access-setup control (e.g., a radio choice between "Send invite email" and "Generate temporary password" — exact mechanism per whatever pattern the rest of the app already uses for issuing first-time access). Footer: Back (§4.5) and Create College (§4.4).
- On success: modal closes, a success toast appears (`background: var(--cd-success-bg)`, `color: var(--cd-success)`, `border-radius: var(--cd-radius-control)`, `padding: 12px 16px`, top-right corner, auto-dismiss after ~4s), and the Colleges List refreshes with the new row visible at the top.

### 5.4 College Detail
- Top bar: title is the college's name, with its Status Pill (§4.2) immediately beside it. Primary action on the right is Suspend or Reactivate (§4.6 for suspend, §4.4-styled but using `var(--cd-success)` in place of primary blue for reactivate).
- Below top bar: a two-column layout, `display: grid; grid-template-columns: 1fr 1fr; gap: var(--cd-gap-lg);` on wide viewports, stacking to one column below ~900px.
  - **Left card:** "College Info" — domain, joined date, Admin name + email, laid out as label/value pairs (`display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--cd-border)` per row, last row no border).
  - **Right card:** "Usage" — 4 small stat rows (Students, TPOs, Drives, Applications) in the same label/value pattern as the left card, values in Fira Code 600 18px for the same "real data" precision feeling as the Dashboard KPIs, just smaller.
- Below the two-column row, full-width: "Enabled Features" panel — same panel-header pattern as §5.1's Recent Activity, containing a simple list of Status Pills (§4.2) each labeled with a feature name, one per enabled/pending feature for this college.

### 5.5 Feature Catalog
- Top bar: title "Feature Catalog", primary action "+ Add Feature" (§4.4).
- Main content: a card-grid (not a table this time, since each feature benefits from a slightly richer card) — `display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--cd-gap-md);`. Each feature card: `background: var(--cd-surface); border: 1px solid var(--cd-border); border-radius: var(--cd-radius-card); padding: 16px;`, containing the feature name (Fira Sans 600, 15px), an optional category Status-Pill-styled tag in a neutral grey variant (`background: var(--cd-surface-sunken); color: var(--cd-text-secondary)`), the description (body token, `margin-top: 8px`), and a small Edit/Delete icon pair top-right of the card (16px icons, `color: var(--cd-text-muted)`, hover `color: var(--cd-text-primary)`).
- Empty state (§4.7): icon suggestion — a puzzle-piece or toggle outline icon, headline "No features defined yet", body "Add a feature to make it available for colleges to request.", button "+ Add Feature".

### 5.6 Feature Requests (Queue)
- Top bar: title "Feature Requests" — this is the screen the sidebar badge (§3.2) points to.
- Two sections stacked vertically, `gap: var(--cd-gap-lg)`:
  - **"Pending" section** (shown first, since it's the actionable part): H2 header, then a Data Table (§4.3) with columns: College, Feature Requested, Requested On (meta token), Actions (containing two inline buttons per row: a small Approve button using `var(--cd-success)` in place of primary blue on the §4.4 shape, and a small Reject button per §4.6's destructive shape — both compact, `padding: 6px 14px`, smaller than the standard button size since there are two per row).
  - **"History" section** below it: H2 header "Decision History", then a Data Table with columns: College, Feature, Decision (Status Pill — Approved/Rejected), Decided On.
- Empty state for the Pending section specifically (§4.7, but smaller/inline rather than full panel treatment): a simple centered message "No pending requests right now" with a checkmark icon in `var(--cd-success)`, since an empty pending queue is a *good* state here, not a "nothing to see" state — its empty-state icon and tone should read as positive/reassuring, not neutral, which is a deliberate deviation from the standard empty-state pattern in §4.7.

### 5.7 Analytics
- Top bar: title "Platform Analytics".
- Row 1: same 4 top-line KPI Cards as the Dashboard (Colleges/Students/TPOs/Drives) — reused for consistency, but this page adds more below.
- Row 2, `margin-top: var(--cd-gap-lg)`: two chart panels side by side (`grid-template-columns: 1fr 1fr`, stacking below ~900px), each in a card matching §5.1's panel style: "Colleges Over Time" (a simple line/area chart) and "Feature Adoption" (a horizontal bar chart, one bar per feature showing how many colleges have it enabled — bars in `var(--cd-primary)`).
- Charts should use the existing chart library already in the project's dependency list (Recharts, per the established tech stack) styled with this document's color tokens rather than that library's default palette.

### 5.8 Announcements
- Top bar: title "Announcements".
- Compose panel at top: card container, containing a text label "New Announcement", a multi-line textarea (`min-height: 100px`, styled per §6's input spec), and a Send button (§4.4) right-aligned below it.
- Below, `margin-top: var(--cd-gap-lg)`: "Sent Announcements" list — same list-row pattern as Dashboard's Recent Activity (§5.1), each row showing the announcement text (truncated to 1-2 lines if long) and its sent date in meta token.

### 5.9 Audit Log
- Top bar: title "Audit Log".
- Main content: a Data Table (§4.3) with columns: Action (e.g. "College added", "Feature approved" — Fira Sans 500), Details (secondary token — e.g. college name / feature name involved), Timestamp (meta token). This is the simplest screen in the console structurally — a straightforward reverse-chronological table, no actions column needed since it's read-only history.

---

## 6. Form Input Spec (used in Add College modal, Announcements textarea, search boxes)
- `height: 40px` for single-line inputs (textarea per §5.8's min-height instead), `padding: 0 14px`, `border: 1px solid var(--cd-border)`, `border-radius: var(--cd-radius-control)`, `background: var(--cd-surface)`, Fira Sans 400 14px text.
- Focus state: `border-color: var(--cd-primary)`, plus a focus ring `box-shadow: 0 0 0 3px rgba(37,99,235,0.12)`.
- Label above each input: Fira Sans 500, 13px, `color: var(--cd-text-primary)`, `margin-bottom: 6px`.
- Helper text below (where used, e.g. the domain field): meta token, `margin-top: 6px`.

---

## 7. Accessibility Notes
- Verify `--cd-warning` (`#F59E0B`) text-on-`--cd-warning-bg` combination against WCAG AA before shipping — amber-on-pale-amber is a common contrast failure point; the fallback darker amber `#92400E` referenced in §4.2 should be used for the actual text/icon color if the lighter value fails, keeping `#F59E0B` only for non-text elements like the sidebar badge dot.
- The sidebar's icon-only collapsed state (if ever added for smaller viewports) must retain text labels via `aria-label`, since icon-only nav is not self-explanatory for screen reader users.
- All table rows that are clickable (Colleges List navigating to College Detail) should be reachable and activatable via keyboard (`tabindex`, `Enter` key handling), not mouse-only.
- The Feature Requests queue's Approve/Reject buttons are destructive-adjacent, irreversible-feeling actions — consider a lightweight confirmation (not a full modal, perhaps an inline "Are you sure?" state swap on the button itself) especially for Reject, so a misclick doesn't silently deny a college's request.

## 8. Implementation Notes
- This design intentionally shares zero CSS with the "Glass Focus" student test screen (different fonts, no blur, different structural pattern — sidebar+content vs. centered single card) — do not attempt to merge them into one shared stylesheet/theme file; keep them as separate design systems that happen to share color tokens and general product polish level, consistent with the rationale in §1.2.
- Because this console will be used repeatedly for real operational work (unlike the one-time-per-test student screen), prioritize real, working keyboard navigation and fast perceived performance (skeleton loading states on the Data Table and KPI Cards while real data loads) over any additional visual flourish — this is a tool the operator will live in, not a moment they pass through once.
- Recommended component boundaries: `<ConsoleShell>` (owns the sidebar + top bar), `<KpiCard>`, `<StatusPill>`, `<DataTable>` (generic, columns passed as props, reused across Colleges List, Feature Requests, and Audit Log), `<EmptyState>`, `<AddCollegeModal>` — each independently reusable across the 9 screens described above rather than rebuilt per page.
