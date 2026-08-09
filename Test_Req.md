# Test_Req.md — Proctored Instant Test Feature: Full Implementation Context for AI Coding Assistants

## How to use this document

You are an AI coding assistant (Claude Code, Copilot, Antigravity, Cursor, or similar) about to implement the **proctored Instant Test attempt feature** for a full-stack placement portal (FastAPI + PostgreSQL + SQLAlchemy 2.0 + Alembic backend, React + Vite + Tailwind + React Query + Zustand frontend). This document is your complete functional and technical specification. Read it fully before writing any code. Where this document gives exact field names, event names, thresholds, or state values, use them exactly — consistency across the frontend, backend, and database matters more here than anywhere else in the app, because violation data has to reconcile correctly between a live browser session and a TPO reviewing it afterward.

This document assumes the following is already true of the codebase, because it has already been built:
- A `test_attempts` table exists, tied to `instant_tests` and `users`.
- A `notifications` table exists with a `type` field/enum that can be extended.
- JWT authentication with role guards (Student/TPO/Admin) is working.
- The base Instant Test creation and question-generation flow (TPO side) already exists and is out of scope for this document — this document is scoped entirely to the **student-facing test-taking experience and its proctoring layer**.

Do not implement anything described in the "Explicit Non-Goals" section (§13) as if it were a real capability — that section exists specifically to stop an AI assistant from over-promising (e.g., claiming to "detect" true eye-gaze or "block" screenshots, which are not reliably achievable in a browser).

---

## 1. Feature Overview & Design Philosophy

The Instant Test attempt page is a timed, single-attempt online test taken by a Student, created by a TPO. Because it may be used for shortlisting decisions in real placement drives, it needs a reasonable layer of integrity protection — not because we assume students are dishonest, but because an unproctored test result carries no evidentiary weight to a recruiter. At the same time, over-aggressive proctoring creates false positives that punish honest students for coughing, glancing at a second monitor, or a laptop fan spike. Every threshold and tolerance value in this document was chosen with that tension in mind, and is written to be **tunable**, not hardcoded as a magic number buried in logic — see §8.5 for the configuration object every violation type should read from.

The feature has two halves that must be built together but are conceptually separable:

1. **The student-side proctoring layer**: a set of independent browser-side detectors, each watching for one category of rule violation, each reporting into a single shared violation-tracking system.
2. **The violation escalation & notification system**: a backend-enforced (not just frontend-enforced) system of per-category 2-strike counters and a global 5-strike auto-end, which writes an audit trail and notifies the TPO.

**Golden rule for implementation**: any check that determines pass/fail, strike counting, or test-ending MUST be enforced or at minimum re-validated server-side. The frontend detectors are the *sensors*; the backend is the *judge*. A student with browser devtools open could otherwise trivially disable a frontend-only enforcement layer. Every violation event the frontend detects should be sent to the backend via an API call, and the backend — not the frontend — is the source of truth for strike counts, whether a category has hit 2 strikes, and whether the test should auto-end. The frontend reacts to what the backend tells it (e.g., "this attempt has been auto-ended, redirect to results"), it does not decide it locally and then just stop rendering.

---

## 2. Environment Precheck

### 2.1 Purpose
Before a student can start the timer on a test, the system must confirm three things are true: the browser tab can enter fullscreen, the webcam is accessible and granted, and the microphone is accessible and granted. Doing this *before* the test starts (not discovering a missing permission mid-test) avoids the worst possible failure mode: a test that starts, burns the student's time, and then can't actually proctor them because a permission was denied — which would either force an unfair restart or leave a proctoring gap.

### 2.2 User Flow
1. Student clicks "Start Test" on the Instant Test detail/landing view (not yet the question view).
2. Student is routed to a dedicated **Precheck screen** — a distinct route/page, e.g. `/tests/:testId/precheck`, NOT the same view as the question interface.
3. Precheck screen shows three status rows, each starting in a "not yet checked" neutral state:
   - Fullscreen capability
   - Camera access
   - Microphone access
4. A single "Run checks" button triggers all three permission requests. (Do not auto-request permissions on page mount without a user gesture — browsers will block or degrade the prompt UX if `getUserMedia` isn't called from a direct user interaction, and auto-prompting on load is also a poor pattern that surprises users.)
5. For each row, on click of "Run checks":
   - **Camera**: call `navigator.mediaDevices.getUserMedia({ video: true })`. On success, show a live camera preview thumbnail in that row (proves to the student it's actually working, not just permission-granted) and mark the row green/checked. On rejection (`NotAllowedError`) or no device (`NotFoundError`), mark the row red with a specific message per error type (see §2.4).
   - **Microphone**: call `navigator.mediaDevices.getUserMedia({ audio: true })` (can be combined into a single `getUserMedia({ video: true, audio: true })` call — recommended, since it's one permission prompt instead of two, better UX). On success, show a tiny live level indicator (reuse the noise-meter component from §6, in a "test mode" that doesn't yet log violations). On rejection, mark red with specific message.
   - **Fullscreen**: call `document.documentElement.requestFullscreen()` (with vendor-prefixed fallbacks — see §3.4 for the full cross-browser fullscreen handling code, reuse it here). On success, immediately mark this row green. Note: unlike camera/mic, fullscreen doesn't have a persistent "granted" permission state to check in advance — it can only be attempted. If the browser blocks fullscreen entirely (rare, e.g. some locked-down enterprise browser policies), catch the promise rejection and mark red.
6. The "Start Test" button on this precheck screen is **disabled** until all three rows are green. Do not allow proceeding with 2 out of 3 — all three are mandatory, since the test cannot be considered proctored otherwise.
7. Once all three are green, "Start Test" becomes enabled. Clicking it:
   - Calls the backend to officially start the attempt (creates/activates the `test_attempts` row, records `started_at`, generates the randomized question/option order — see §4 — and returns it).
   - Transitions the UI into the actual test-taking view, which the browser lockdown and detector systems (§3, §5, §6) attach to on mount.
8. **Do not let the student exit the precheck screen's camera/mic streams and re-enter the test view separately** — the same `MediaStream` objects obtained during precheck should be reused (kept alive, passed via React context/state or a ref) for the face-detection and noise-detection systems once the test view mounts, rather than re-requesting permission. Re-requesting on the next screen risks a second permission prompt if the browser doesn't remember consent within the session, which would break the flow.

### 2.3 What "checked" state means technically
Store precheck completion as local component/store state only (e.g., Zustand slice `{ cameraOk: boolean, micOk: boolean, fullscreenOk: boolean, mediaStream: MediaStream | null }`) — this does NOT need a backend round-trip per checkbox. The backend only needs to know the test officially started once all three are satisfied and "Start Test" is clicked (§2.2 step 7). Do not create a `test_attempts` row or start the timer any earlier than that click — a student who opens the precheck screen and abandons it should not have consumed an attempt.

### 2.4 Error States & Messaging
Each permission type can fail for different underlying reasons; surface a specific message, not a generic "permission denied," so the student knows what to actually do:

| Error | When it happens | Message to show |
|---|---|---|
| `NotAllowedError` (camera/mic) | User clicked "block" on the browser prompt, or the site was previously blocked | "Camera access was blocked. Click the camera icon in your browser's address bar to allow it, then try again." |
| `NotFoundError` (camera/mic) | No camera/mic device exists on the machine | "No camera was detected on this device. A working camera is required to take this test." |
| `NotReadableError` (camera/mic) | Device exists but is in use by another application (e.g., a video call app already has it locked) | "Your camera appears to be in use by another application. Close other apps using your camera (e.g., Zoom, Teams) and try again." |
| Fullscreen request rejected/unsupported | Browser policy blocks it, or `document.fullscreenEnabled` is false | "Fullscreen mode couldn't be enabled. Please try a different browser (Chrome or Firefox recommended) or check your browser's site settings." |

Each row should have a "Retry" affordance rather than requiring a full page reload.

### 2.5 Backend endpoint needed
`POST /student/instant-tests/{test_id}/start` — this is the single endpoint that transitions an attempt from "not started" to "in progress." It should:
- Verify the student is eligible for this test (drive eligibility already established elsewhere in the system — do not re-implement that here, just check the existing `test_status`/eligibility gate).
- Verify no existing `in_progress` attempt exists for this student+test (see §5, single active session — this is the first enforcement point for that rule).
- Create the `test_attempts` row with `status = 'in_progress'`, `started_at = now()`, and a server-generated randomized question/option order (§4.3 — this must happen server-side, not client-side, so a student can't manipulate the order or see unrandomized data by inspecting a network request before JS reorders it).
- Return the randomized question set (without correct answers, obviously) and the attempt's server-authoritative `ends_at` timestamp (`started_at + duration`), which the frontend timer should sync against (see §9.2 — never trust a client-side-only countdown for the authoritative deadline).

---

## 3. Browser Lockdown (Tab-Switch, Copy Block, Devtools Deterrent, Fullscreen Exit)

### 3.1 Purpose
This category groups the four most common ways a student might casually try to get outside help or leave the test context: switching to another tab/window, copying test content out, opening devtools to inspect the page, or exiting fullscreen. These are grouped here because they're all detected via similar browser event APIs and share the same UX pattern (a warning toast, escalating on the 2nd occurrence of that specific sub-type).

**Important schema note**: even though these four checks are grouped in this section conceptually, they are tracked as **separate violation categories** per the earlier design decision (§8) — `tab_switch`, `copy_attempt`, `devtools`, and a fullscreen-exit event should be folded into the `tab_switch` category (both represent "left the intended test context") unless you prefer a fifth category `fullscreen_exit` — **recommend keeping fullscreen-exit as part of `tab_switch`**, since from the student's perspective both are "I left the locked test view," and splitting them adds a category without adding meaningfully different information for the TPO. Document whichever choice is made in code comments so it's not ambiguous later.

### 3.2 Tab-Switch / Visibility Detection
Use the **Page Visibility API**:
```js
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // student switched tabs, minimized, or switched apps
    reportViolation('tab_switch', { hidden_at: Date.now() });
  }
});
```
Also listen for `window.addEventListener('blur', ...)` as a supplementary signal (fires when focus leaves the window entirely, e.g. alt-tabbing to another application) — `visibilitychange` alone can miss some multi-monitor/OS-level focus changes depending on browser. Debounce: if both `blur` and `visibilitychange` fire within ~200ms of each other for the same event, only report once (they often fire together for the same underlying action) — track this with a short-lived flag, not a fixed setTimeout that could double-count on retry.

**Do not** try to detect tab-switching via `window.onbeforeunload` — that fires on navigation/close, not on switching to another tab, and is a different concern (see §3.6 for unload handling).

### 3.3 Copy-Attempt Detection
```js
document.addEventListener('copy', (e) => {
  e.preventDefault(); // best-effort block
  reportViolation('copy_attempt', { selection_length: window.getSelection()?.toString().length ?? 0 });
});
```
Also disable text selection via CSS as a first line of defense (reduces the number of copy attempts that even get this far):
```css
.test-content { user-select: none; -webkit-user-select: none; }
```
Note in code comments: `preventDefault()` on the `copy` event stops the clipboard write in most browsers but is not airtight (some browsers/extensions can bypass it) — this is a deterrent-plus-detection layer, not a guarantee, consistent with §13.

### 3.4 Devtools & Right-Click Deterrent
```js
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  reportViolation('devtools', { trigger: 'right_click' });
});

document.addEventListener('keydown', (e) => {
  const blocked =
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) || // Chrome/Firefox devtools shortcuts
    (e.metaKey && e.altKey && ['I', 'J', 'C'].includes(e.key)); // Mac equivalents
  if (blocked) {
    e.preventDefault();
    reportViolation('devtools', { trigger: e.key });
  }
});
```
**Honest limitation to document in-code and in the TPO-facing help text**: this blocks the *common keyboard shortcuts and the right-click menu entry point* for opening devtools. It does not and cannot prevent devtools being opened via the browser's top menu bar, nor prevent a student from having devtools already open in a detached window before the test starts. A true "devtools open" detector (e.g., checking `window.outerWidth - window.innerWidth` thresholds, a common but unreliable hack) is explicitly **not** included in this spec — see §13. Ship the deterrent, don't oversell it as detection.

### 3.5 Fullscreen Exit Detection
```js
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    reportViolation('tab_switch', { trigger: 'fullscreen_exit' }); // folded into tab_switch per §3.1
    // Optionally: attempt to immediately re-request fullscreen so the student
    // isn't stuck outside it, e.g. document.documentElement.requestFullscreen()
    // wrapped in a user-gesture-triggered "Return to fullscreen" button/modal,
    // since browsers require a user gesture to re-enter fullscreen programmatically —
    // you cannot silently force it back on without an interaction.
  }
});
```
Also handle vendor-prefixed variants for older Safari support if needed: `webkitfullscreenchange`, `mozfullscreenchange`, `MSFullscreenChange`.

### 3.6 Unload / Navigation-Away Handling
Separately from tab-switch detection, handle the case of a student trying to close the tab or navigate away entirely mid-test:
```js
window.addEventListener('beforeunload', (e) => {
  if (testInProgress) {
    e.preventDefault();
    e.returnValue = ''; // triggers the browser's native "Leave site?" confirmation
  }
});
```
This is a soft speed bump (the student can still confirm and leave), not a violation-reporting event by itself — but if the student does leave and the tab is later reopened or the backend's `ends_at` deadline passes without a submission, the backend should treat that as `ended_reason = 'timeout'` (see §9), not silently leave the attempt in limbo.

### 3.7 UI Feedback Pattern (applies to all of §3)
On the **1st** violation in a given category (per session, not per event — see §8.2 for exact strike-counting semantics): show a toast/inline warning using the amber alert-banner component already specified in `Test_ui_design.md` (§3.4.7 of that document) — reuse that exact component, don't design a new one. On the **2nd** violation in that category: show the same component but with slightly firmer copy (e.g., "This is your second warning for this. Your placement coordinator has been notified.") — do not change the color to red at the 2nd strike; per the design rationale in `Test_ui_design.md` §1.2, red is reserved exclusively for the noise-meter's highest zone, keep the alert banner amber at every stage so the visual language stays consistent, and let the *text* carry the escalation, not the color.

---

## 4. Question & Option Randomization

### 4.1 Purpose
Reduces the effectiveness of two students comparing screens (in person or via screen-share) during a live test, since their question order and option order won't match.

### 4.2 What gets randomized
- **Question order**: the sequence in which questions are presented to this specific student for this specific attempt.
- **Option order**: within each multiple-choice question, the order the options are displayed in (the correct answer's position should not be predictable/fixed, e.g., always option A).

### 4.3 Where randomization happens (server-side, not client-side)
Do this at attempt-start time (§2.5's `POST .../start` endpoint), not at question-fetch time and not on the client:
1. Fetch the full ordered question set for the `instant_test`.
2. Generate a per-attempt random permutation of question order (e.g., Fisher-Yates shuffle using a seeded RNG where the seed is derived from `attempt_id` — using a seeded RNG rather than pure randomness means the same order can be deterministically reconstructed later if needed for debugging/review, without having to store the full shuffled order redundantly, though storing it explicitly, see below, is still recommended for simplicity).
3. Independently shuffle each question's option order the same way.
4. **Persist the resulting order** — add a field to store it, e.g. a JSON column `question_order` and `option_order_map` on `test_attempts` (or a related table if you prefer full normalization), so that if the student refreshes the page mid-test, the same order is served again rather than re-shuffling (which would be disorienting and could even let a student re-derive information by comparing two different shuffles of the same question).
5. When grading, always map the student's submitted answer index back through the stored `option_order_map` to the canonical option before comparing to the correct answer — do not assume option index 0 is always the same underlying option once shuffled.

### 4.4 What NOT to randomize
Do not randomize which questions are included (that's a separate feature — question pooling/`top_n_count` selection, which is already handled elsewhere per the existing spec, out of scope here) — this section only covers *order*, not *selection*.

---

## 5. Single Active Session Enforcement

### 5.1 Purpose
Prevents a student from starting the test in two tabs/devices simultaneously (e.g., to have a second screen free to search answers while the "official" proctored tab shows a clean state, or to have a friend take part of it on another device).

### 5.2 Mechanism
1. On `POST .../start` (§2.5), before creating a new `in_progress` attempt, check for an existing `in_progress` attempt for this `(student_id, test_id)` pair.
   - If one exists **and its `last_heartbeat_at` is recent** (within a short threshold, e.g. 30 seconds — see §5.3), reject the new start attempt with a 409 Conflict and a message like "You already have this test open in another tab or device. Close it and try again there, or wait a moment if it just disconnected."
   - If one exists but `last_heartbeat_at` is stale (older than the threshold — meaning the old tab likely crashed, lost network, or the browser was force-closed without a clean unload), allow the new session to take over: mark the old attempt's `ended_reason` appropriately (e.g., a value like `session_replaced`, or fold it into `timeout` if you'd rather not add a new enum value — either is defensible, pick one and document it) and proceed with the new attempt using the same underlying `test_attempts` row (don't create a duplicate row — resume the existing one, restoring the same randomized question/option order from §4.3, not a new shuffle).
2. **Heartbeat mechanism**: while a test is in progress, the frontend should ping a lightweight endpoint (e.g., `POST /student/instant-tests/attempts/{attempt_id}/heartbeat`) every ~15-20 seconds. This endpoint just updates `last_heartbeat_at = now()` on the attempt row. This is what makes the staleness check in step 1 possible, and is also useful independently for detecting abandoned attempts for TPO reporting purposes.
3. Use `navigator.sendBeacon()` for a best-effort final heartbeat/cleanup signal on `beforeunload`/`pagehide`, since a regular fetch call is not guaranteed to complete once the page is unloading.

### 5.3 Threshold recommendation
Heartbeat interval: 15 seconds. Staleness threshold for considering a session dead: 45 seconds (3 missed heartbeats) — long enough to tolerate a brief network hiccup without wrongly declaring the session dead, short enough that a genuinely abandoned tab doesn't block a legitimate restart for an unreasonable time. Put this in the shared config object (§8.5), not hardcoded inline.

---

## 6. Face Pose Detection

### 6.1 Purpose & Honest Framing
This detects **face presence and coarse head orientation** — not true eyeball gaze tracking. Say this explicitly in any UI copy and any report/demo material: "attention monitoring" or "face detection," never "eye tracking." See §13 for why true gaze tracking is out of scope.

### 6.2 Library choice
Use **face-api.js** (a TensorFlow.js-based face detection/landmark library that runs entirely client-side in the browser, no server round-trip needed per frame) — specifically its `TinyFaceDetector` model (lightweight, fast enough to run at a low frame rate on modest laptops) combined with `faceLandmark68Net` for landmark points, which are used to estimate coarse head pose. Alternative: MediaPipe Face Mesh, which is more accurate but heavier — **recommend face-api.js first** given the performance concerns already flagged in `Test_ui_design.md` §7 about this page needing to stay light given it also runs backdrop-filter blur and a live noise meter simultaneously; benchmark before committing either way.

### 6.3 Detection logic
Run detection on an interval, not every animation frame — e.g., every 2-3 seconds is sufficient for this purpose and keeps CPU usage low:
```js
setInterval(async () => {
  const detections = await faceapi
    .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks();

  if (detections.length === 0) {
    handleFaceState('no_face');
  } else if (detections.length > 1) {
    handleFaceState('multi_face');
  } else {
    const pose = estimateHeadPose(detections[0].landmarks); // yaw/pitch estimate from landmark geometry
    if (Math.abs(pose.yaw) > YAW_THRESHOLD_DEGREES) {
      handleFaceState('face_away');
    } else {
      handleFaceState('ok');
    }
  }
}, FACE_CHECK_INTERVAL_MS);
```

### 6.4 Debouncing — critical for avoiding false positives
Do **not** report a violation on the first single detection of `no_face`/`face_away`/`multi_face`. A student naturally glances down at a notepad, or the camera briefly loses tracking during normal head movement while reading. Require the same non-`ok` state to persist across **N consecutive checks** (recommend N=3, meaning ~6-9 seconds of sustained away-ness at a 2-3 second check interval) before it counts as a reportable violation. Reset the consecutive counter to 0 the moment an `ok` detection occurs. This debounce window should live in the shared config object (§8.5) as `FACE_AWAY_CONSECUTIVE_THRESHOLD`.

### 6.5 Thresholds (starting recommendations — tune after real testing)
- Yaw threshold for "looking away": ~25-30 degrees off-center. Too tight (e.g., 10 degrees) will constantly false-positive on normal head movement while reading questions on a wide screen.
- Consecutive-check threshold: 3 (per §6.4).
- Check interval: 2500ms.

### 6.6 What happens on a confirmed violation
Same reporting pipeline as every other category (§8): call `reportViolation('face_away' | 'no_face' | 'multi_face', { yaw_degrees, detection_confidence })`. These are three separate violation_type values (not folded together) since a TPO reviewing "no_face" (student left the camera entirely) vs "multi_face" (someone else is in frame) vs "face_away" (glancing off-screen) are meaningfully different severities worth distinguishing in the audit log.

### 6.7 Performance safeguard
If the face-detection model fails to load (slow network, low-end device) or throws repeated errors, **fail open, not closed** — do not block the student from continuing the test just because the ML model didn't load; log a system-level warning distinct from a student violation, and consider surfacing a non-blocking notice like "Attention monitoring couldn't start — your test will continue without this check." A proctoring feature that can accidentally lock a legitimate student out of their test due to a model CDN hiccup is worse than not having the feature.

---

## 7. Noise Detection Meter

### 7.1 Purpose
Live, real-time monitoring of ambient sound level via the already-granted microphone stream, surfaced to the student as the green/yellow/red bar specified in `Test_ui_design.md`, and reported as a violation if sustained sound crosses the danger threshold.

### 7.2 Technical approach — Web Audio API
This does **not** require any ML model — it's a straightforward audio-level calculation, which is why (as noted earlier in the project's design discussion) this is a more reliable signal than face pose:
```js
const audioContext = new AudioContext();
const source = audioContext.createMediaStreamSource(micStream); // reuse the stream from precheck, §2.2
const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;
source.connect(analyser);

const dataArray = new Uint8Array(analyser.frequencyBinCount);

function getVolumeLevel() {
  analyser.getByteFrequencyData(dataArray);
  const sum = dataArray.reduce((a, b) => a + b, 0);
  const average = sum / dataArray.length; // 0-255 scale
  return average;
}
```
Convert the 0-255 average into an approximate dB-like scale for display and thresholding (this is a relative loudness proxy, not a calibrated SPL dB reading — be honest in code comments that this is "dB-like" / relative, since a browser has no access to a calibrated microphone reference level):
```js
function toApproxDb(average) {
  if (average === 0) return 0;
  return 20 * Math.log10(average / 255) + 100; // shifted/scaled to a friendlier 0-100ish display range — tune the offset empirically
}
```

### 7.3 Three-zone mapping (drives the UI meter in `Test_ui_design.md` §3.4.2)
Define three zones against tunable thresholds (config object, §8.5):
- **Safe** (green): below `NOISE_WARN_THRESHOLD`
- **Mid/Warning** (amber): between `NOISE_WARN_THRESHOLD` and `NOISE_LIMIT_THRESHOLD`
- **High/Violation** (red): above `NOISE_LIMIT_THRESHOLD`

Sample continuously (e.g., every 250-500ms is plenty responsive for a visual meter) and update the UI meter's active-segment state in real time regardless of whether a violation is being counted — the meter should always show live status, that's separate from the violation-reporting logic below.

### 7.4 Violation logic — the "5-7dB tolerance for a few seconds" rule
Per the explicit design decision made earlier in this project: don't report a violation the instant the level crosses `NOISE_LIMIT_THRESHOLD` — allow a grace tolerance band and a short sustained-duration requirement, so a single loud cough or a door slam doesn't count:
```js
let overLimitSince = null;

function checkNoiseViolation(currentDbApprox) {
  const hardLimit = NOISE_LIMIT_THRESHOLD + NOISE_TOLERANCE_DB; // e.g. limit + 6dB grace
  if (currentDbApprox > hardLimit) {
    if (overLimitSince === null) {
      overLimitSince = Date.now();
    } else if (Date.now() - overLimitSince > NOISE_SUSTAINED_MS) {
      reportViolation('noise', { peak_db_approx: currentDbApprox, sustained_ms: Date.now() - overLimitSince });
      overLimitSince = null; // reset so it requires a fresh sustained period before reporting again
    }
  } else {
    overLimitSince = null; // level dropped back down, reset the timer entirely
  }
}
```

### 7.5 Threshold recommendations (starting points — must be tuned with real-device testing, since "loud" is highly dependent on mic sensitivity/gain across different laptops)
- `NOISE_WARN_THRESHOLD`: tune so normal room ambience (typing, quiet breathing) sits comfortably below it.
- `NOISE_LIMIT_THRESHOLD`: tune so normal conversational speech volume sits at or above it.
- `NOISE_TOLERANCE_DB`: 5-7 (per the explicit product decision) — added on top of the limit before a violation can even start being timed.
- `NOISE_SUSTAINED_MS`: 3000-4000ms ("a few seconds," per the same decision) — the over-limit condition must hold continuously for this long before it counts.

Document clearly in code and in any TPO-facing help text that this is a relative, uncalibrated measurement affected by each device's microphone hardware and gain settings — it is a deterrent and a coarse signal, not a certified sound-level measurement.

---

## 8. Violation Tracking & Alert Escalation System

This section is the backbone that every detector in §3, §6, and §7 reports into. Build this system first, or at minimum stub its API contract first, before wiring up the individual detectors — every detector above calls into this one shared pipeline (`reportViolation(type, meta)`), it does not implement its own separate strike-counting logic.

### 8.1 The shared reporting function (frontend)
```js
async function reportViolation(violationType, meta = {}) {
  const response = await api.post(`/student/instant-tests/attempts/${attemptId}/violations`, {
    violation_type: violationType,
    meta,
  });
  // The backend is authoritative — it returns the current strike count for this
  // category AND whether the test has now been auto-ended. The frontend reacts
  // to the response, it does not compute strike counts itself.
  const { strike_number, category_total, global_total, auto_ended } = response.data;
  showViolationToast(violationType, strike_number);
  if (auto_ended) {
    handleTestAutoEnded(response.data.ended_reason);
  }
}
```

### 8.2 Backend endpoint: `POST /student/instant-tests/attempts/{attempt_id}/violations`
Logic, in order:
1. Verify the attempt belongs to the requesting student and is still `in_progress` (reject if already `completed`/`ended` — no point logging violations on a finished attempt, though log a warning server-side if this happens, since it may indicate a race condition worth investigating).
2. Insert a new row into `test_violations` (schema per the earlier-agreed design): `attempt_id`, `violation_type`, `strike_number` (computed as `COUNT(*) + 1` of existing rows for this `attempt_id` + `violation_type`), `detected_at = now()`, `meta` (JSON blob from the request body — store whatever diagnostic context the detector sent, e.g. yaw angle, dB level, tab-hidden duration).
3. Increment `test_attempts.total_violation_count` by 1.
4. **Per-category check**: if this violation's `strike_number == 2`, create a TPO-facing notification (`notifications.type = 'test_violation'`) with a payload containing student id, student name, attempt id, violation_type, and a human-readable summary (e.g., "2nd noise violation" — reuse the exact phrasing pattern already agreed on: category-specific, not generic).
5. **Global check**: if `test_attempts.total_violation_count` (after increment) `>= 5`, set `test_attempts.status = 'ended'`, `test_attempts.ended_reason = 'violation_limit'`, `test_attempts.ended_at = now()`, and create a second notification (`notifications.type = 'test_auto_ended'`) to the TPO. This check happens regardless of which categories contributed the 5 — a student could hit 5 total across five different categories at 1 strike each, or hit 2+2+1 across three categories; the global counter doesn't care about distribution, only the total.
6. Return to the frontend: `{ strike_number, category_total (count of this type so far), global_total (total_violation_count), auto_ended (boolean), ended_reason (if applicable) }`.

### 8.3 Why per-category AND global, together
This was an explicit product decision earlier in this project, worth restating here so the implementer understands the intent, not just the mechanics: per-category 2-strikes gives the TPO specific, actionable signal ("this student had 2 noise issues" is meaningfully different information from "this student had 2 violations of unspecified type"). The global 5-strike ceiling exists as a backstop for a student who's mildly non-compliant across *many different* categories — someone who isn't blatantly cheating in one obvious way, but whose overall behavior pattern (a bit of tab-switching, a bit of noise, a face-away moment) adds up to a test environment that can no longer be trusted as valid. Neither number is a magic constant discovered through research — both were chosen by product/faculty judgment for this specific academic context, and should be treated as configurable, tunable values (§8.5), not hardcoded literals scattered through the codebase.

### 8.4 What the student sees when auto-ended
On receiving `auto_ended: true` from any violation report response, the frontend should immediately:
1. Stop all detectors (unmount face-detection interval, noise-analysis loop, remove all lockdown event listeners).
2. Show a clear, non-punitive-sounding but honest message: "This test has ended because it recorded repeated rule violations. Your placement coordinator has been notified. If you believe this was in error, please contact them directly." — avoid language that presumes guilt ("you were caught cheating"); the system flags a pattern, it doesn't adjudicate intent, and that distinction should be reflected in tone.
3. Redirect to the results/summary view, which for an auto-ended attempt should show whatever partial answers were submitted up to that point plus a clear "ended early — violation limit reached" status, not a fabricated "completed" state.

### 8.5 Shared, tunable configuration object
Every threshold mentioned across §3-§8 should live in one place, not scattered as inline magic numbers, so faculty/TPO can tune behavior without a code archaeology exercise later:
```js
export const PROCTORING_CONFIG = {
  STRIKES_PER_CATEGORY_BEFORE_ALERT: 2,
  GLOBAL_VIOLATION_LIMIT: 5,
  HEARTBEAT_INTERVAL_MS: 15000,
  SESSION_STALE_THRESHOLD_MS: 45000,
  FACE_CHECK_INTERVAL_MS: 2500,
  FACE_AWAY_CONSECUTIVE_THRESHOLD: 3,
  FACE_YAW_THRESHOLD_DEGREES: 27,
  NOISE_WARN_THRESHOLD: /* tune per real-device testing */ 55,
  NOISE_LIMIT_THRESHOLD: /* tune per real-device testing */ 70,
  NOISE_TOLERANCE_DB: 6,
  NOISE_SUSTAINED_MS: 3500,
};
```
Recommend this object be mirrored server-side too (not just frontend), since §8.2's strike/global logic is backend-enforced — ideally sourced from one shared config (e.g., a small JSON/YAML file both the FastAPI backend and the React frontend read from at build/deploy time, or at minimum kept in careful sync with a comment in each file pointing to the other) rather than duplicated and allowed to drift.

---

## 9. Backend API Surface Summary

Consolidated list of every endpoint this feature needs (some already referenced above, listed together here for implementation planning):

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/student/instant-tests/{test_id}/start` | Begin an attempt: eligibility check, single-session check, create/resume `test_attempts` row, generate + persist randomized question/option order, return questions + server-authoritative `ends_at` |
| `POST` | `/student/instant-tests/attempts/{attempt_id}/heartbeat` | Update `last_heartbeat_at`, used for single-session staleness detection |
| `POST` | `/student/instant-tests/attempts/{attempt_id}/violations` | Log a violation event; returns strike counts and auto-end status per §8.2 |
| `POST` | `/student/instant-tests/attempts/{attempt_id}/answer` | Submit/update an answer for a single question (autosave pattern recommended — see §9.1) |
| `POST` | `/student/instant-tests/attempts/{attempt_id}/submit` | Final submission — sets `status = 'completed'`, `ended_reason = 'completed'`, `ended_at = now()`, triggers grading |
| `GET` | `/tpo/instant-tests/attempts/{attempt_id}/violations` | TPO-facing: full violation audit log for a given attempt, for review after the fact |

### 9.1 Answer autosave
Recommend saving each answer as the student selects it (debounced, e.g. 500ms after the last change) rather than only on final submit — this protects against the auto-end-on-violation scenario (§8.4), where you want whatever was answered up to that point preserved, not lost.

### 9.2 Timer authority
The countdown timer displayed to the student (and the visual ring specified in `Test_ui_design.md`) should be driven by comparing the client's current time against the server-returned `ends_at` timestamp from the `start` response — not by a client-side `setInterval` counting down from a fixed duration with no server anchor. This prevents clock drift and prevents a student from manipulating a purely-client-side countdown. When `Date.now() >= ends_at`, the frontend should automatically call the `submit` endpoint (§9, `.../submit`) with whatever answers are saved, same as a manual submit, and the backend should independently enforce this too (reject/auto-submit any answer-submission attempt after `ends_at` has passed, as a backstop in case the client-side auto-submit failed to fire for any reason, e.g. the tab was suspended by the OS).

---

## 10. Frontend Component Architecture

Recommended component breakdown, consistent with the structure already proposed in `Test_ui_design.md` §7:

- `<TestPrecheckPage>` — §2, owns the three permission checks and the `MediaStream` that gets handed off.
- `<TestAttemptPage>` — top-level container for the actual test-taking view; owns attempt state (current question index, answers, timer), and mounts/unmounts all the detector hooks below on entry/exit.
- `useTabSwitchDetector()`, `useCopyBlockDetector()`, `useDevtoolsDeterrent()`, `useFullscreenGuard()` — hooks encapsulating §3's listeners, each calling the shared `reportViolation()`.
- `useSingleSessionHeartbeat(attemptId)` — §5's heartbeat interval.
- `useFaceDetector(videoRef)` — §6's detection loop, returns current face-state for the status pill UI and internally calls `reportViolation()` per the debounce logic.
- `useNoiseMeter(micStream)` — §7's audio analysis loop, returns live zone/level for the meter UI and internally calls `reportViolation()` per the tolerance logic.
- `<TestStatusBar>`, `<NoiseMeter>`, `<QuestionCard>`, `<ViolationAlert>` — presentational components, exactly as specified visually in `Test_ui_design.md`; these should be "dumb" components that receive state as props from the hooks above, not contain any detection logic themselves.
- `<TestAutoEndedScreen>` — shown per §8.4 when the backend reports `auto_ended: true`.
- `<TestResultsPage>` — post-submission (whether normal, timeout, or auto-ended) summary view.

---

## 11. UI Design Tie-In

All visual treatment for this feature (colors, spacing, typography, component states) is already fully specified in the companion document `Test_ui_design.md` ("Glass Focus" design). Do not redesign the visual layer while implementing this functional spec — build to that document's exact tokens (§2 of that doc) and component specs (§3.4 of that doc). The two documents are meant to be used together: this document tells you *what to build and how it behaves*, `Test_ui_design.md` tells you *exactly what it should look like, down to the pixel*.

Specific tie-ins worth calling out:
- The noise-meter's three-zone visual (green/amber/red segments) described in `Test_ui_design.md` §3.4.2 should be driven live by the `useNoiseMeter()` hook's current zone from §7.3 of this document.
- The status pill ("Monitoring active") in `Test_ui_design.md` §3.4.1 should reflect real system state — if the face-detection model failed to load (§6.7's fail-open case) or the mic stream dropped, consider whether this pill should communicate a degraded state rather than always showing the same green "active" copy regardless of actual sensor health. This is a UX decision not fully resolved in the design doc — flag it back to the design owner rather than silently deciding either way.
- The alert banner component and copy escalation pattern is specified in §3.7 of this document and should use the exact `.alert` component from `Test_ui_design.md` §3.4.7.

---

## 12. Testing & QA Checklist

Before considering this feature done, verify each of the following manually (automated tests should also be written per the project's existing `pytest`/frontend testing conventions, but manual verification of proctoring UX specifically is essential since much of this depends on real hardware behavior that's hard to fully simulate):

- [ ] Precheck blocks "Start Test" until all three permissions are genuinely granted (test by denying each one individually)
- [ ] Denying camera/mic shows the correct specific error message per §2.4, not a generic one
- [ ] Closing the precheck tab and reopening does not create a duplicate/orphaned attempt
- [ ] Switching tabs during the test triggers a violation on the 1st switch, a stronger warning + TPO notification on the 2nd
- [ ] Exiting fullscreen behaves the same as a tab-switch violation (or as its own category, per whichever choice was made in §3.1)
- [ ] Attempting to copy question text is blocked and logged
- [ ] Right-click and F12/devtools shortcuts are blocked and logged (and it's understood/documented that this is a deterrent, not a guarantee)
- [ ] Opening the same test in a second tab while the first is active is rejected with a clear message
- [ ] Force-closing the first tab (simulating a crash) and starting fresh in a new tab after the staleness threshold succeeds and resumes the same question order
- [ ] Covering the camera / stepping out of frame for the full debounce duration triggers a `no_face` violation; briefly glancing away does NOT trigger one
- [ ] A second person entering the camera frame triggers `multi_face`
- [ ] Sustained loud background noise past the tolerance+duration threshold triggers a `noise` violation; a brief cough does NOT
- [ ] The live noise meter visually updates in real time and its color zones match the actual configured thresholds
- [ ] Hitting 2 strikes in any single category correctly notifies the TPO with the correct category-specific message
- [ ] Hitting 5 total violations across mixed categories correctly auto-ends the test, notifies the TPO, and shows the student the correct non-accusatory end screen
- [ ] All partial answers up to an auto-end are preserved and visible on the results/review view
- [ ] The countdown timer matches server time and auto-submits correctly on expiry even if the tab was backgrounded
- [ ] Performance: face detection + noise analysis + glass UI blur running simultaneously does not cause noticeable jank on a mid-range laptop (manually profile per `Test_ui_design.md` §7's performance note)
- [ ] If the face-detection model fails to load, the test still proceeds (fail-open per §6.7) rather than blocking the student

---

## 13. Explicit Non-Goals — Do Not Implement These As If They Work

Listed here specifically so an AI assistant doesn't over-engineer or falsely claim these capabilities exist:

- **True eyeball gaze tracking** (pinpointing exactly where on the screen someone is looking) is NOT implemented. Only coarse head-pose/yaw estimation is. Never label anything in the UI, code comments, or reports as "eye tracking" or "gaze detection."
- **Guaranteed devtools blocking** is NOT possible from a web page. Only common shortcuts and the right-click entry point are deterred.
- **Screenshot prevention** is NOT fully possible. Only in-browser keyboard-shortcut detection (e.g., PrintScreen keydown, where the browser exposes it — this is itself unreliable across OSes) is attempted, and it is a detection signal at best, never a block. A phone camera photographing the screen is entirely undetectable and this system should make no claim otherwise.
- **Preventing a second device/person from feeding answers out-of-band** (e.g., a phone call, a second person off-camera reading answers aloud) is NOT solved by anything in this document except as a side effect of the noise meter (§7), which may incidentally catch audible conversation but is not a purpose-built solution for this threat.
- **Audio content analysis / speech-to-text monitoring** (detecting *what* is being said, versus just volume) is explicitly out of scope — the noise meter in §7 measures loudness only, never transcribes or analyzes speech content.
- **Calibrated, certified sound-level (true dB SPL) measurement** is not achievable from a browser without specialized hardware/calibration — §7's noise readings are relative/approximate, and all code, UI copy, and documentation should describe them as such.

If a future requirement genuinely needs any of the above, it requires a fundamentally different approach (e.g., a native proctoring client instead of a browser tab, or a live human invigilator) and should be scoped as a separate, explicit project decision — not quietly bolted onto this browser-based system with a comment claiming it works.

---

## 14. Summary of New/Changed Database Objects (for reference — already specced in a prior document, repeated here for completeness so this file is self-contained)

- New table `test_violations`: `id`, `attempt_id` (FK), `violation_type` (enum: `tab_switch`, `copy_attempt`, `devtools`, `noise`, `face_away`, `no_face`, `multi_face`, `screenshot_attempt`), `strike_number`, `detected_at`, `meta` (JSON)
- `test_attempts` additions: `total_violation_count` (int, default 0), `ended_reason` (enum: `completed`, `timeout`, `violation_limit`, and optionally `session_replaced` if that path from §5.2 is implemented as a distinct value), plus fields implied by this document that may not have been in the original schema pass — confirm these exist or add them: `started_at`, `ends_at`, `last_heartbeat_at`, `question_order` (JSON), `option_order_map` (JSON)
- `notifications.type` additions: `test_violation`, `test_auto_ended`

---

## 15. Build Order Recommendation

Suggested implementation sequence, since several pieces depend on earlier ones:

1. Database migration (§14) — everything else depends on this existing first.
2. Backend: `start`, `heartbeat`, `violations`, `answer`, `submit` endpoints (§9), including the strike-counting and auto-end logic (§8.2) — get this fully working and testable via Swagger/API calls before touching frontend detectors.
3. Frontend: precheck screen (§2) and basic test-taking view wired to real questions/answers/timer (§9.2), without any proctoring detectors yet — get the "happy path" test-taking experience solid first.
4. Frontend: browser lockdown detectors (§3) — these are the simplest/cheapest to add next (no ML, no audio processing).
5. Frontend: single-session heartbeat wiring (§5).
6. Frontend: noise meter (§7) — no ML dependency, more reliable, do this before face detection.
7. Frontend: face detection (§6) — most complex, most performance-sensitive, do last so the rest of the system is stable before adding this layer.
8. Full integration testing per the checklist in §12.
9. TPO-side violation review view (the `GET .../violations` endpoint's frontend consumer) — not detailed component-by-component in this document since it's a simpler, standard data-table view, but don't forget it; the whole system is pointless if a TPO can't actually see what happened.
