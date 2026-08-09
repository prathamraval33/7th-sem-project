# Test UI Design Specification — "Glass Focus" Instant Test Screen

**Project:** AI-Powered Smart Placement & Career Preparation Portal — Instant Test Attempt Page
**Design name:** Glass Focus
**Style family:** Glassmorphism (frosted glass / translucent layered surfaces)
**Version:** 1.0
**Purpose of this document:** A complete, implementation-ready specification of every visual decision in this design — every color, every pixel of spacing, every font weight, every border, every shadow, every state — so that a developer (or an AI coding assistant) can rebuild this screen exactly without needing to see the original file, and so that this exact visual language can be reused consistently across the rest of the Instant Test feature (and, if desired, the wider Student-facing app).

---

## 1. Design Philosophy & Rationale

### 1.1 Why glassmorphism for this screen specifically
An online proctored test is an inherently tense, high-stakes moment for the student. The design goal was to make the *proctoring machinery* (monitoring status, noise level, face-tracking warnings) feel present but not oppressive — visible enough to build trust that the system is working, quiet enough not to add to test anxiety. Glassmorphism was chosen deliberately for this reason: frosted, translucent surfaces read as "light" and "airy" rather than "locked down" or "surveilled," which is the opposite emotional register of a typical severe, red-heavy exam-proctoring UI. The soft color blobs behind the glass are intentionally organic and non-geometric — they avoid the cold, clinical feeling that a flat grey dashboard would create for an exam context.

### 1.2 Why this specific color logic
Every color in this screen carries meaning; nothing is decorative-only:
- **Blue** (`#2563EB` family) = the primary/focus/action color — used for the timer ring, the selected answer state, and the primary button. Blue was chosen over the placement portal's general brand colors because blue has a calming, "focus mode" association (used deliberately in productivity and study apps) rather than an urgent or playful one.
- **Green** (`#059669` family) = system status "everything is fine" — used identically for the monitoring pill dot and the "safe" segment of the noise meter, so the student learns one color language for "no problem" across every proctoring signal on the page.
- **Amber** (`#F59E0B` / `#92400E` family) = warning-but-not-failing — used only for the noise meter's middle zone and the violation alert banner. Amber was chosen instead of red for the *first* warning specifically to avoid triggering panic on a false positive (e.g., a chair creak or a cough) — the design reserves red exclusively for zones/states that represent an actual limit being crossed.
- **Red** (`#DC2626`) = the highest noise-meter zone only, at low opacity — deliberately not used anywhere else on this screen (no red border, no red button, no red text) so that when red *does* appear elsewhere in the product (e.g., a second-strike TPO-alert state, not shown in this mockup), it retains maximum visual weight and doesn't feel diluted by overuse.

### 1.3 Why this typography pairing
- **Outfit** (geometric sans, used only for the question headline) — chosen for its slightly distinctive geometric letterforms, which make the single most important piece of content on the screen (the question itself) feel intentional and designed rather than like default system text. Used sparingly — only the `<h1>` question text uses this face — so it retains its distinctiveness instead of becoming wallpaper.
- **Roboto** (humanist sans, used for everything else — body text, buttons, labels, meta info, ring label) — chosen for its neutral, highly legible, "gets out of the way" character, and its strong association with Google's Material Design system, which most students will subconsciously read as "productivity tool" / "official app" rather than "marketing site." This is the same design logic Android system UI and most Google Workspace products use: a distinctive display face reserved for one moment, and a neutral workhorse face for everything functional around it.

### 1.4 The signature element
Per standard design-critique practice, this design spends its "one bold risk" in a single place rather than spreading novelty across the whole screen: the **circular progress ring** replacing what would conventionally be a plain digital timer readout (e.g., "14:32"). Everything else on the page — pills, rows, buttons — uses conventional, well-understood glass-card patterns. The ring is the one element a student would actually remember and describe to someone else ("it has this little circle that fills up as you go").

---

## 2. Design Tokens

### 2.1 Color tokens

| Token name | Hex / RGBA value | Used for |
|---|---|---|
| `--glass-bg-page-1` | `#E8F1FF` | Page background gradient — start stop (top-left), pale blue |
| `--glass-bg-page-2` | `#EAFBF3` | Page background gradient — middle stop (55%), pale mint |
| `--glass-bg-page-3` | `#F1EEFF` | Page background gradient — end stop (bottom-right), pale lavender |
| `--blob-blue` | `#93C5FD` | Blob 1 fill (top-left ambient color) |
| `--blob-green` | `#6EE7B7` | Blob 2 fill (bottom-right ambient color) |
| `--blob-purple` | `#C4B5FD` | Blob 3 fill (mid-right ambient color, lower opacity) |
| `--card-bg` | `rgba(255,255,255,0.45)` | Main test card glass fill |
| `--card-border` | `rgba(255,255,255,0.6)` | Main test card 1px edge |
| `--card-shadow` | `rgba(31,41,55,0.08)` | Main test card drop shadow color (very low opacity, near-black at 8%) |
| `--pill-bg` | `rgba(255,255,255,0.55)` | Status pill glass fill (slightly more opaque than the card, so it reads as "on top of" the card) |
| `--pill-border` | `rgba(255,255,255,0.7)` | Status pill 1px edge |
| `--status-green` | `#059669` | Status dot fill, noise "safe" segment |
| `--status-green-text` | `#0F5132` | "Monitoring active" label text (darker than the dot itself for AA contrast on the light pill) |
| `--status-green-ring` | `rgba(5,150,105,0.15)` | Soft glow ring around the status dot (box-shadow spread) |
| `--focus-blue` | `#2563EB` | Timer ring active arc, selected-option border/text, primary button gradient start |
| `--focus-blue-dark` | `#1D4ED8` | Primary button gradient end, ring percentage label text |
| `--focus-blue-track` | `rgba(37,99,235,0.15)` | Timer ring background track (the "unfilled" portion) |
| `--focus-blue-selected-fill` | `rgba(37,99,235,0.14)` | Selected answer-option background fill |
| `--focus-blue-selected-border` | `rgba(37,99,235,0.4)` | Selected answer-option border |
| `--warn-amber` | `#F59E0B` | Noise meter "mid" segment fill (at 35% opacity) |
| `--warn-amber-bg` | `rgba(254,243,199,0.6)` | Alert banner glass fill |
| `--warn-amber-border` | `rgba(245,158,11,0.35)` | Alert banner border |
| `--warn-amber-icon` | `#92400E` | Alert banner icon color |
| `--warn-amber-text` | `#78350F` | Alert banner text color (darker than icon for hierarchy) |
| `--danger-red` | `#DC2626` | Noise meter "high" segment fill (at 25% opacity — the most muted of the three segments since it's a rare/edge state) |
| `--text-heading` | `#111827` | Question `<h1>` color — near-black, warm-neutral |
| `--text-body` | `#1F2937` | Answer option label text (unselected state) |
| `--text-meta` | `#4B5563` | "Question 3 of 10 · 14:32 left" line, noise label, noise icon |
| `--option-bg` | `rgba(255,255,255,0.4)` | Unselected answer-option glass fill |
| `--option-bg-hover` | `rgba(255,255,255,0.6)` | Unselected answer-option glass fill on hover |
| `--option-border` | `rgba(255,255,255,0.7)` | Unselected answer-option border |

### 2.2 Typography tokens

| Token | Value |
|---|---|
| `--font-display` | `'Outfit', sans-serif` — weights loaded: 400, 500, 600, 700. Only weight 600 is actually used in this screen. |
| `--font-body` | `'Roboto', sans-serif` — weights loaded: 400, 500. |
| Google Fonts import URL | `https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Roboto:wght@400;500&display=swap` |
| Question heading | Outfit, 600 weight, 24px, line-height 1.4 (≈33.6px), color `#111827` |
| Meta line | Roboto, 400 weight (implicit/default), 13px, color `#4B5563`, letter-spacing 0.2px |
| Status pill text | Roboto, 500 weight, 12.5px, color `#0F5132` |
| Ring percentage label | Roboto, 500 weight, 11px, color `#1D4ED8` |
| Noise label | Roboto, 400 weight, 12px, color `#4B5563` |
| Noise status word ("Safe") | Roboto, 500 weight, 11.5px, color `#047857` |
| Answer option text (default) | Roboto, 400 weight, 15px, color `#1F2937` |
| Answer option text (selected) | Roboto, 500 weight, 15px, color `#1D4ED8` |
| Primary button text | Roboto, 500 weight, 14.5px, color `#FFFFFF` |
| Alert banner text | Roboto, 400 weight (implicit), 12.5px, color `#78350F` |

### 2.3 Spacing, radius & effect tokens

| Token | Value | Applies to |
|---|---|---|
| `--radius-card` | `28px` | Main card outer corner radius |
| `--radius-row` | `16px` | Answer option rows |
| `--radius-pill-lg` | `14px` | Noise meter row, primary button, alert banner |
| `--radius-pill-full` | `20px` | Status pill (fully rounded ends) |
| `--radius-track` | `4px` | Noise meter track outer corner |
| `--radius-seg` | `3px` | Each of the 3 noise meter segments |
| `--blur-card` | `24px` | `backdrop-filter: blur()` on the main card |
| `--blur-pill` | `10px` | `backdrop-filter: blur()` on the status pill |
| `--blur-row` | `8px` | `backdrop-filter: blur()` on noise row, options, alert banner |
| `--blur-ambient` | `70px` | `filter: blur()` applied to the three background color blobs |
| `--card-padding` | `32px` (all sides) | Main card internal padding |
| `--page-padding` | `40px 20px` | Body padding (top/bottom 40px, left/right 20px) — keeps the card off-screen-edge on small viewports |
| `--card-max-width` | `560px` | Card's `max-width`, with `width: 100%` so it shrinks fluidly below that |
| Gap: top row items | space-between (no fixed gap; pill and ring sit at opposite ends) | `.top-row` |
| Gap: status pill internal | `7px` | between dot and label text |
| Gap: noise row internal | `10px` | between icon, label, track, and status word |
| Gap: options list | `12px` vertical | between each answer-option row |
| Gap: option internal | space-between | label text to right-aligned checkmark icon |
| Gap: primary button internal | `8px` | between "Next question" text and arrow icon |
| Gap: alert internal | `10px` | between icon and message text |
| Margin below top row | `28px` | `.top-row { margin-bottom: 28px }` |
| Margin below noise row | `20px` | `.noise-row { margin-bottom: 20px }` |
| Margin below meta line | `10px` | `.meta { margin-bottom: 10px }` |
| Margin below question heading | `32px` | `h1 { margin-bottom: 32px }` |
| Margin below options list | `36px` | `.options { margin-bottom: 36px }` |
| Margin below button row | `28px` | `.bottom-row { margin-bottom: 28px }` (space before the alert banner) |
| Answer option padding | `16px 20px` (vertical 16px, horizontal 20px) | `.option` |
| Noise row padding | `10px 14px` | `.noise-row` |
| Status pill padding | `7px 14px` | `.status-pill` |
| Primary button padding | `12px 26px` | `button.primary` |
| Alert banner padding | `12px 18px` | `.alert` |
| Card box-shadow | `0 8px 32px rgba(31,41,55,0.08)` | y-offset 8px, blur radius 32px, spread 0, color near-black at 8% opacity |
| Button box-shadow | `0 4px 14px rgba(37,99,235,0.3)` | y-offset 4px, blur radius 14px, spread 0, blue at 30% opacity — gives the button a soft "lifted" feel distinct from the flat glass rows around it |
| Status-dot glow | `box-shadow: 0 0 0 3px rgba(5,150,105,0.15)` | 0 offset, 0 blur, 3px spread — creates a soft halo ring exactly 3px wide around the 7px dot |
| Option hover transition | `all 0.15s ease` | applies to background-color change on hover |

---

## 3. Layer-by-Layer Breakdown

### 3.1 Layer 0 — Page background
- `body` element: `min-height: 100vh`, `display: flex`, `align-items: center`, `justify-content: center` — this centers the entire card both vertically and horizontally in the viewport regardless of screen size.
- Background: `linear-gradient(135deg, #E8F1FF 0%, #EAFBF3 55%, #F1EEFF 100%)` — a 135-degree (top-left to bottom-right) diagonal gradient through three stops: pale blue at 0%, pale mint at the 55% mark (slightly past center, so the mint dominates more of the visible area than the blue or lavender), pale lavender at 100%.
- `position: relative` and `overflow: hidden` on body — required so the absolutely-positioned blurred blobs (see 3.2) are clipped to the viewport and don't create scrollbars from their blur bleed.
- `padding: 40px 20px` on body — ensures the card never touches the viewport edge, even on narrow screens.

### 3.2 Layer 1 — Ambient color blobs (the "glass needs something to blur" layer)
Three `div.blob` elements, each `position: absolute`, `border-radius: 50%` (perfect circle), `filter: blur(70px)`, sitting behind the card (`z-index` unset / 0, while the card is `z-index: 1`).

| Blob | Size | Position | Fill color | Opacity |
|---|---|---|---|---|
| Blob 1 | 380px × 380px | `top: -120px; left: -100px` (bleeds off the top-left corner of the viewport) | `#93C5FD` (soft blue) | 0.55 |
| Blob 2 | 320px × 320px | `bottom: -100px; right: -80px` (bleeds off the bottom-right corner) | `#6EE7B7` (soft mint-green) | 0.55 |
| Blob 3 | 260px × 260px | `top: 40%; right: 5%` (floats mid-right, does not touch any edge) | `#C4B5FD` (soft lavender) | 0.4 (deliberately the dimmest of the three, so it reads as background depth rather than competing with Blob 1/2) |

These blobs exist for one purely functional reason: `backdrop-filter: blur()` on the glass card has nothing to visually blur if the layer behind it is a flat, unbroken color — the blur effect would be invisible. The blobs give the blur something to do, and their soft, organic, non-geometric shapes and pastel palette are what make the glass read as "airy" rather than "murky."

### 3.3 Layer 2 — The main glass card
- Element: `div.card`
- `position: relative; z-index: 1` — sits above the blob layer.
- `width: 100%` with `max-width: 560px` — fluid down to mobile, capped at 560px on larger screens so line-length for the question text stays readable.
- `background: rgba(255,255,255,0.45)` — white at 45% opacity. This specific opacity value was chosen as a midpoint: high enough that black text on top remains comfortably legible (the design's accessibility note in §6 confirms this), low enough that the blob colors are still clearly visible bleeding through.
- `backdrop-filter: blur(24px)` (plus `-webkit-backdrop-filter` for Safari) — this is the actual frosted-glass effect; everything visually behind the card (blobs + gradient) is blurred by a 24px radius as seen through the card's semi-transparent white fill.
- `border: 1px solid rgba(255,255,255,0.6)` — a bright, semi-opaque white hairline that catches the eye as a highlight edge, standard glassmorphism practice for simulating a light source catching the top edge of a glass pane.
- `border-radius: 28px` — a large, soft radius consistent with the "calm, non-clinical" design goal.
- `padding: 32px` on all four sides — generous internal breathing room.
- `box-shadow: 0 8px 32px rgba(31,41,55,0.08)` — a very soft, diffused drop shadow that lifts the card off the page without reading as a hard "material design elevation" shadow.

### 3.4 Layer 3 — Card contents (top to bottom, in exact document order)

#### 3.4.1 Top row (`div.top-row`)
`display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px`. Contains two children pinned to opposite ends:

**Left: Status pill (`div.status-pill`)**
- `display: flex; align-items: center; gap: 7px`
- Background `rgba(255,255,255,0.55)`, border `1px solid rgba(255,255,255,0.7)`, `backdrop-filter: blur(10px)` — a second, independent glass layer nested inside the first, slightly more opaque so it visually sits "above" the card surface rather than blending into it.
- `padding: 7px 14px; border-radius: 20px` — fully pill-shaped.
- Child 1: `span.status-dot` — 7px × 7px circle, `background: #059669`, with `box-shadow: 0 0 0 3px rgba(5,150,105,0.15)` creating a soft 3px halo — this halo is what makes the dot read as "live/active" rather than a flat static icon.
- Child 2: text "Monitoring active" — Roboto 500, 12.5px, color `#0F5132`.

**Right: Timer ring (`div.ring-wrap`)**
- Fixed size `56px × 56px`, `position: relative`.
- Contains an inline SVG, `56×56` viewBox `0 0 56 56`, rotated `-90deg` via CSS transform on the `<svg>` itself (so the arc starts at 12 o'clock instead of the SVG default of 3 o'clock).
- Two concentric `<circle>` elements, both centered at `cx=28, cy=28` with radius `r=24` (circumference = 2π×24 ≈ 150.8, rounded to `stroke-dasharray: 151` in the CSS):
  - `.ring-bg`: `stroke: rgba(37,99,235,0.15)`, `stroke-width: 5`, `fill: none` — the full, pale background track.
  - `.ring-fg`: `stroke: #2563EB`, `stroke-width: 5`, `stroke-linecap: round`, `fill: none`, `stroke-dasharray: 151`, `stroke-dashoffset: 45` — the dashoffset of 45 against a dasharray of 151 means roughly `(151-45)/151 ≈ 70%` of the ring is drawn as the solid blue arc, matching the "70%" label. **Implementation note:** in the live product, `stroke-dashoffset` should be calculated dynamically as `151 * (1 - timeElapsedFraction)` (or however progress is measured) rather than hardcoded.
- Centered label (`div.ring-label`, absolutely positioned via `inset: 0` + flex centering): "70%" in Roboto 500, 11px, color `#1D4ED8`.

#### 3.4.2 Noise meter row (`div.noise-row`)
- `display: flex; align-items: center; gap: 10px`
- Background `rgba(255,255,255,0.4)`, border `1px solid rgba(255,255,255,0.6)`, `backdrop-filter: blur(8px)`, `padding: 10px 14px`, `border-radius: 14px`, `margin-bottom: 20px`.
- Contents, left to right:
  1. Tabler icon `ti-microphone`, 15px, color `#4B5563`.
  2. Label text "Noise level", Roboto 400, 12px, color `#4B5563`, `min-width: 64px` (keeps the label column width-stable regardless of the status word length that follows the bar).
  3. The track (`div.noise-track`): `flex: 1` (fills remaining horizontal space), `height: 7px`, `border-radius: 4px`, `overflow: hidden`, `background: rgba(255,255,255,0.3)`, itself a flex container with `gap: 2px` holding exactly 3 child segments (`div.noise-seg`), each `flex: 1` (i.e., each occupies exactly one-third of the track width minus the 2px gaps), each with its own `border-radius: 3px`:
     - Segment 1 (`.safe`): `background: #059669` (solid, full opacity) — represents the currently-active "safe" zone.
     - Segment 2 (`.mid`): `background: #F59E0B; opacity: 0.35` — dimmed, representing the "not currently active" warning zone.
     - Segment 3 (`.high`): `background: #DC2626; opacity: 0.25` — dimmed even further, representing the rarely-active danger zone.
     - **Implementation note:** in the live product, whichever segment corresponds to the current live dB reading should be the one shown at full opacity (1.0), with the other two dimmed to their resting states as shown here — this static mockup depicts the "safe" state active.
  4. Status word "Safe" — Roboto 500, 11.5px, color `#047857`, `min-width: 36px`, right-aligned.

#### 3.4.3 Meta line
- `<p class="meta">` — plain text "Question 3 of 10 · 14:32 left" (the middle dot is a literal `&nbsp;·&nbsp;` — non-breaking spaces on either side of a middle-dot character, not a bullet list).
- Roboto, default 400 weight, 13px, color `#4B5563`, `letter-spacing: 0.2px`, `margin-bottom: 10px`.

#### 3.4.4 Question heading
- `<h1>` — "If a train travels 60 km in 45 minutes, what is its speed in km/h?" (the numeral-unit pairs "60 km" and "45 minutes" use `&nbsp;` between number and unit to prevent an awkward line-break splitting them).
- Outfit, 600 weight, 24px, `line-height: 1.4`, color `#111827`, `margin-bottom: 32px`.

#### 3.4.5 Answer options list (`div.options`)
- `display: flex; flex-direction: column; gap: 12px; margin-bottom: 36px`.
- Exactly 4 child `div.option` rows in this mockup (the real component should support a variable count).
- **Default (unselected) row state:**
  - `display: flex; align-items: center; justify-content: space-between`
  - `padding: 16px 20px; border-radius: 16px`
  - `background: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.7); backdrop-filter: blur(8px)`
  - `cursor: pointer`
  - Text: Roboto 400 (default weight), 15px, color `#1F2937`
  - `transition: all 0.15s ease` (governs the hover background change)
- **Hover state (`.option:hover`):** `background: rgba(255,255,255,0.6)` — the only property that changes on hover; opacity increases by 0.2 to give tactile feedback without any layout shift, border/radius/padding all remain identical.
- **Selected state (`.option.selected`):**
  - `background: rgba(37,99,235,0.14)` (a blue-tinted glass fill, distinct from the neutral white-tinted default)
  - `border: 1px solid rgba(37,99,235,0.4)`
  - Text color changes to `#1D4ED8`, `font-weight: 500` (up from the default 400)
  - A trailing Tabler `ti-check` icon appears at the row's right edge (via the row's `justify-content: space-between`), colored `#2563EB` (the icon is present in the DOM only for the selected row, not rendered-but-hidden for the others).

#### 3.4.6 Bottom row / primary action (`div.bottom-row`)
- `display: flex; justify-content: flex-end; margin-bottom: 28px` — right-aligns the single button.
- `button.primary`:
  - `display: flex; align-items: center; gap: 8px`
  - `padding: 12px 26px; border-radius: 14px; border: none`
  - `background: linear-gradient(135deg, #2563EB, #1D4ED8)` — a subtle diagonal gradient between two close blue shades (not a high-contrast gradient), giving the button a touch more depth than a flat fill without looking like a decorative rainbow gradient.
  - `color: #FFFFFF`
  - Roboto 500, 14.5px
  - `box-shadow: 0 4px 14px rgba(37,99,235,0.3)` — see §2.3, gives the button a "lifted" feel.
  - `cursor: pointer`
  - Contents: text "Next question" followed by a Tabler `ti-arrow-right` icon (inherits the button's white color and font-size).

#### 3.4.7 Alert banner (`div.alert`) — example violation state
- `display: flex; align-items: center; gap: 10px`
- `padding: 12px 18px; border-radius: 14px`
- `background: rgba(254,243,199,0.6)` (pale amber glass), `border: 1px solid rgba(245,158,11,0.35)`, `backdrop-filter: blur(8px)`
- Tabler icon `ti-eye-off`, 16px, color `#92400E`
- Text "Face not detected — warning 1 of 2. Stay centered in frame." — Roboto default weight, 12.5px, color `#78350F`
- **Note on placement:** in this mockup the alert sits below the primary button at the very bottom of the card, always present in the DOM. In the live product this element should almost certainly be conditionally rendered (only mounted when a violation is actively being warned) and should animate in (e.g., a brief slide/fade, respecting `prefers-reduced-motion`) rather than being permanently visible — a persistent warning banner even when no violation has occurred would undermine the calm tone the rest of the design is built around.

---

## 4. Iconography

All icons are from **Tabler Icons**, loaded via `https://cdnjs.cloudflare.com/ajax/libs/tabler-icons/2.44.0/iconfont/tabler-icons.min.css`, using the outline style exclusively (class prefix `ti ti-*`, never a `-filled` suffix).

| Icon class | Used in | Size | Color |
|---|---|---|---|
| `ti-microphone` | Noise meter row | 15px | `#4B5563` |
| `ti-check` | Selected answer option (trailing icon) | inherits row font-size (default browser icon-font sizing, effectively ~15-16px) | `#2563EB` |
| `ti-arrow-right` | Primary button (trailing icon) | inherits button font-size | `#FFFFFF` (inherited from button text color) |
| `ti-eye-off` | Alert banner (leading icon) | 16px | `#92400E` |

No icon in this design uses a filled/solid variant, a custom hand-drawn SVG path, or an emoji — consistent outline-icon treatment throughout.

---

## 5. Interaction States Summary

| Element | Default | Hover | Active/Selected | Notes |
|---|---|---|---|---|
| Answer option | white glass, 40% opacity bg, grey-900 text | white glass, 60% opacity bg (background-only change) | blue-tinted glass (14% opacity blue bg), blue border, blue 500-weight text, checkmark icon appears | Only one option should be selected at a time in the live component (radio-group behavior, even though no native radio input is used) |
| Primary button | blue gradient fill, white text | *(not specified in this mockup — recommend a subtle brightness/scale change, e.g. `filter: brightness(1.05)` or `transform: scale(1.02)`, consistent with the 0.15s ease timing used elsewhere)* | *(pressed state not specified — recommend `transform: scale(0.98)`)* | — |
| Status pill | static, always the "active/green" state shown here | non-interactive, no hover state needed (informational only) | — | If a "monitoring paused/error" state is ever needed, swap `--status-green` for `--danger-red` and update the label text — do not introduce a third color for this indicator |
| Noise track segments | one segment at full opacity per current dB zone, other two dimmed | non-interactive | — | See §3.4.2 implementation note |
| Timer ring | arc fills clockwise from 12 o'clock as time elapses (or counts down, depending on product decision) | non-interactive | — | — |

---

## 6. Accessibility Notes

- **Text contrast:** All text colors specified in §2.1 were chosen to sit at or above WCAG AA contrast against their respective translucent backgrounds at the stated opacity — but because the backgrounds are semi-transparent glass over a *variable* (gradient + blurred blob) backdrop, actual rendered contrast will shift slightly depending on which part of the background gradient is behind the card at a given viewport size. **Recommend a manual contrast audit with real rendered screenshots at common breakpoints before shipping**, particularly for the lightest text (`.meta` at `#4B5563` on `rgba(255,255,255,0.45)`).
- **Backdrop-filter fallback:** `backdrop-filter` is not supported in every browser/version. A solid fallback background color (e.g., `#F3F6FB` at full opacity) should be defined via `@supports not (backdrop-filter: blur(1px))` so the layout doesn't break (text-on-transparent-background becoming illegible) in unsupported browsers.
- **Reduced motion:** No animations are defined in this static mockup, but any motion added during implementation (hover transitions, alert banner entrance, ring arc animation) should respect `prefers-reduced-motion: reduce` per standard practice.
- **Icon-only meaning:** No icon in this design is the *sole* carrier of meaning — every icon (microphone, check, arrow, eye-off) is paired with adjacent text, so the design remains understandable with icons stripped or for screen-reader users navigating by text.
- **Click target size:** Answer-option rows (16px vertical padding + ~15px line-height text ≈ 47px total row height) comfortably exceed the 44×44px minimum touch target recommendation. The primary button (12px vertical padding + ~14.5px text + icon ≈ ~39px height) is slightly under that guideline and should be reviewed for touch contexts.

---

## 7. Implementation Notes for Developers

- **Font loading:** Both typefaces are loaded from Google Fonts via a single combined `<link>` request (see §2.2 for the exact URL). For production, consider self-hosting or using `next/font` (or equivalent framework font-optimization tooling) to avoid a render-blocking external request and to get automatic `font-display: swap` handling with better performance than a raw `<link>` tag.
- **Backdrop-filter performance:** Multiple stacked/nested `backdrop-filter` elements (the card, the status pill, the noise row, each option row, the button, the alert — all independently blurring) can be GPU-intensive, especially on lower-end laptops. Given this screen will run continuously for the duration of a timed, proctored test (where jank or dropped frames would be actively disruptive), **profile actual performance on mid-range hardware before shipping**, and consider reducing the number of independently-blurred layers if frame rate is an issue (e.g., removing `backdrop-filter` from the individual answer-option rows while keeping it on the main card).
- **Dynamic values to wire up:** question text, option list (variable length), selected-option state, "Question X of Y" counter, countdown timer value driving both the meta-line text and the ring's `stroke-dashoffset`, live noise-level driving which noise-track segment is at full opacity, and conditional mount/unmount of the alert banner tied to the violation-detection system described elsewhere in this project's design docs.
- **Component boundaries (suggested):** `<TestStatusBar>` (status pill + ring), `<NoiseMeter>`, `<QuestionCard>` (meta + heading + options), `<PrimaryActionButton>`, `<ViolationAlert>` — each independently reusable/testable, composed together inside the outer `<GlassCard>` wrapper that owns the background/blur/border/shadow/radius/padding treatment.

---

## 8. Full Reference: Complete CSS (as implemented in the reviewed mockup)

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Roboto', sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: linear-gradient(135deg, #E8F1FF 0%, #EAFBF3 55%, #F1EEFF 100%);
  position: relative;
  overflow: hidden;
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  opacity: 0.55;
  z-index: 0;
}
.blob-1 { width: 380px; height: 380px; background: #93C5FD; top: -120px; left: -100px; }
.blob-2 { width: 320px; height: 320px; background: #6EE7B7; bottom: -100px; right: -80px; }
.blob-3 { width: 260px; height: 260px; background: #C4B5FD; top: 40%; right: 5%; opacity: 0.4; }

.card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 560px;
  background: rgba(255,255,255,0.45);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.6);
  border-radius: 28px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(31, 41, 55, 0.08);
}

.top-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }

.ring-wrap { position: relative; width: 56px; height: 56px; }
.ring-wrap svg { transform: rotate(-90deg); }
.ring-bg { fill: none; stroke: rgba(37,99,235,0.15); stroke-width: 5; }
.ring-fg { fill: none; stroke: #2563EB; stroke-width: 5; stroke-linecap: round; stroke-dasharray: 151; stroke-dashoffset: 45; }
.ring-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 500; color: #1D4ED8; font-family: 'Roboto', sans-serif; }

.status-pill {
  display: flex; align-items: center; gap: 7px;
  background: rgba(255,255,255,0.55);
  border: 1px solid rgba(255,255,255,0.7);
  backdrop-filter: blur(10px);
  padding: 7px 14px;
  border-radius: 20px;
}
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: #059669; box-shadow: 0 0 0 3px rgba(5,150,105,0.15); }
.status-pill span { font-size: 12.5px; color: #0F5132; font-weight: 500; }

.meta { font-size: 13px; color: #4B5563; margin-bottom: 10px; letter-spacing: 0.2px; }

.noise-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(255,255,255,0.4);
  border: 1px solid rgba(255,255,255,0.6);
  backdrop-filter: blur(8px);
  margin-bottom: 20px;
}
.noise-row i { font-size: 15px; color: #4B5563; }
.noise-row .noise-label { font-size: 12px; color: #4B5563; min-width: 64px; }
.noise-track {
  flex: 1; height: 7px; border-radius: 4px; overflow: hidden;
  display: flex; gap: 2px;
  background: rgba(255,255,255,0.3);
}
.noise-seg { flex: 1; border-radius: 3px; }
.noise-seg.safe { background: #059669; }
.noise-seg.mid { background: #F59E0B; opacity: 0.35; }
.noise-seg.high { background: #DC2626; opacity: 0.25; }
.noise-status { font-size: 11.5px; font-weight: 500; color: #047857; min-width: 36px; text-align: right; }

h1 {
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
  font-size: 24px;
  line-height: 1.4;
  color: #111827;
  margin-bottom: 32px;
}

.options { display: flex; flex-direction: column; gap: 12px; margin-bottom: 36px; }
.option {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-radius: 16px;
  background: rgba(255,255,255,0.4);
  border: 1px solid rgba(255,255,255,0.7);
  backdrop-filter: blur(8px);
  cursor: pointer;
  font-size: 15px;
  color: #1F2937;
  transition: all 0.15s ease;
}
.option:hover { background: rgba(255,255,255,0.6); }
.option.selected {
  background: rgba(37,99,235,0.14);
  border: 1px solid rgba(37,99,235,0.4);
  color: #1D4ED8;
  font-weight: 500;
}
.option.selected i { color: #2563EB; }

.bottom-row { display: flex; justify-content: flex-end; margin-bottom: 28px; }
button.primary {
  font-family: 'Roboto', sans-serif;
  display: flex; align-items: center; gap: 8px;
  padding: 12px 26px;
  background: linear-gradient(135deg, #2563EB, #1D4ED8);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 14.5px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(37,99,235,0.3);
}

.alert {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 18px;
  border-radius: 14px;
  background: rgba(254,243,199,0.6);
  border: 1px solid rgba(245,158,11,0.35);
  backdrop-filter: blur(8px);
}
.alert i { color: #92400E; font-size: 16px; }
.alert span { font-size: 12.5px; color: #78350F; }
```

---

## 9. Design History / Iteration Notes

This "Glass Focus" design is the second visual pass on this screen. The first pass (not glassmorphic) used a flat, opaque white/light-grey card system with a collapsed single-pill proctoring status and an inline amber alert strip — that version prioritized raw minimalism and was built to test the *information architecture* of the page (what to show, what to hide by default, how to surface a violation without alarm). This second pass kept every one of those information-architecture decisions (collapsed status pill, quiet default state, non-modal alert treatment, checkmark-only selected state) and re-skinned them in glass, per explicit request, while also swapping the typeface pairing from a single neutral system font to the Outfit/Roboto pairing documented in §1.3-1.4 and §2.2. The underlying interaction model between the two passes is identical; only the surface rendering changed.
