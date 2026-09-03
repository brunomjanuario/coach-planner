# Auth Screens Refactor Specification

**Slug:** `auth-screens-refactor`
**Scope size:** Large (multi-component refactor of two pages + shared extraction; auth / form-state / in-flight dimensions present)
**Feature request (verbatim):** "Fix sigin and log in screens, make something better complete refactoring"

## Problem Statement

`src/pages/SignIn.jsx` and `src/pages/SignUp.jsx` are the two authentication
entry screens. They are near-duplicate components built entirely with inline
`style` objects — one of only three files in the app (with `Calendar.jsx`)
that violate the project's Tailwind convention (CLAUDE.md). They render a
white card on the app's dark background, duplicate ~90% of their markup,
double-submit on a slow network, and have thin accessibility (no announced
error region, no in-flight feedback). This refactor brings them onto Tailwind
and the app's theme tokens, removes the duplication, and improves the
sign-in / sign-up UX — without touching the real authentication logic in
`context/AuthContext.jsx` or any service.

## Goals

- [ ] Both screens use Tailwind utility classes + `@theme` tokens only — zero inline `style` objects.
- [ ] The duplicated markup between the two screens is extracted into a shared, reused structure (DRY).
- [ ] Both screens are visually consistent with the app's dark theme and reuse the shared `Button` component.
- [ ] Submitting shows an in-flight/disabled state that prevents double submission.
- [ ] Accessibility improved: associated labels, an announced error region, preserved heading structure, visible focus states.
- [ ] All existing auth behavior and routing contracts are preserved (no regression).

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Forgot / reset password | Requires a backend endpoint that does not exist in `AuthContext`/services; a separate feature. |
| "Remember me" toggle | Session persistence is already handled by the refresh-token boot flow (CLAUDE.md); no new control needed. |
| Social / OAuth sign-in | No backend support; out of this refactor's boundary. |
| Client-side password-strength rules / new validation contract | Validation is owned server-side and surfaced via typed errors; refactor must not invent a new contract. |
| Changes to `AuthContext.jsx`, `apiClient.js`, `tokenStore.js`, or any service | Auth logic is real and correct; this is a presentation/UX refactor only. |
| `Calendar.jsx` inline-style migration | The third inline-style exception, but outside this feature's boundary (auth screens only). |
| Renaming the `username` field or changing the register payload (`{ name: username, … }`) | The API contract is fixed in `AuthContext.signUp`; the label may change (see AS-06) but the wire shape must not. |

---

## Assumptions & Open Questions

Because this is an automated (non-interactive) planning pass, gray areas that
would normally be discussed are resolved here with a conventional default +
rationale. Downstream agents should treat these as decisions, not blockers.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| AS-01 Visual direction | Dark theme matching the app (`lightblack`/`neutral-950` surfaces, light text), replacing the current white card | The white card is inconsistent with every other screen; "make something better" + "complete refactoring" reads as aligning with the app, not preserving the outlier. | n |
| AS-02 Shared extraction shape | Extract a presentational `AuthLayout` wrapper (centered card + heading + optional brand + footer-link slot) and a small labeled-field structure; keep each page as the stateful container | Mirrors this codebase's established de-duplication pattern (AD-013 popup shell, AD-016 merged managers): shared shell, per-instance state. | n |
| AS-03 Field set unchanged | Sign In = email + password; Sign Up = username + email + password | No backend change; the register payload is fixed (`{ name: username, email, password }`). | n |
| AS-04 In-flight handling | Disable the submit button and show a pending label ("Signing in…" / "Creating account…") while the promise is unsettled; re-enable on settle | Prevents the current double-submit; standard form pattern. | n |
| AS-05 Error surface | Keep mapping `result.message` from `signIn`/`signUp` verbatim (e.g. "Invalid email or password"); render it in an `aria-live` region, not a new client-side error taxonomy | The message mapping already lives in `AuthContext`; the screen must not reinterpret typed errors. | n |
| AS-06 Sign Up label copy | Label the first field "Name" (the API stores it as `name`); keep `name="username"` state key or rename consistently — must still send `{ name: … }` | Reduces user confusion; the wire contract is what matters, not the input's local key. Downstream may keep `username` to minimize churn. | n |
| AS-07 Password visibility toggle | Included as P3 (nice-to-have), show/hide on the password field(s) | Common, low-risk UX win; deferrable without blocking MVP. | n |
| AS-08 Brand/logo | Optionally show `src/assets/images/coach-planner-logo.png` (or `logo.png`) above the heading; not required for MVP | Assets exist; purely decorative, safe to include or omit. | n |
| AS-09 Success flow (Sign Up) | On success, navigate to `/` immediately (current behavior); the inline "Account created" success message is effectively unreachable after navigation and may be dropped | Matches current code (`navigate("/")` runs on success); keeps one post-auth destination. | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Themed, Tailwind-based Sign In screen ⭐ MVP

**User Story**: As a coach, I want the Sign In screen to look and behave like the rest of Coach Planner so that signing in feels consistent and reliable.

**Why P1**: Sign In is the primary auth entry; the inline-style white card is the most visible inconsistency and the core of "fix … make something better".

**Acceptance Criteria**:

1. WHEN the Sign In screen renders THEN it SHALL contain no inline `style` attribute/object and SHALL style all elements with Tailwind utility classes (and `@theme` tokens where a custom color is used).
2. WHEN a coach submits valid credentials THEN the screen SHALL call `signIn(email, password)` and, on `{ success: true }`, navigate to `/`.
3. WHEN `signIn` resolves `{ success: false, message }` THEN the screen SHALL display that `message` and SHALL NOT navigate.
4. WHEN the Sign In screen renders THEN it SHALL expose a heading with accessible name "Sign In" and a working link to `/signup`.

**Independent Test**: Render `/signin`, submit with a mocked `signIn` resolving success → asserts navigation; resolving failure → asserts message shown and no navigation; assert no inline `style` on rendered nodes.

---

### P2: Themed, Tailwind-based Sign Up screen (DRY with Sign In)

**User Story**: As a new coach, I want a matching Sign Up screen so that registering feels like part of the same app.

**Why P2**: Same defect class as Sign In; sharing the extracted structure is where the duplication is actually removed.

**Acceptance Criteria**:

1. WHEN the Sign Up screen renders THEN it SHALL contain no inline `style` attribute/object and SHALL use Tailwind utilities/tokens.
2. WHEN a coach submits username, email and password THEN the screen SHALL call `signUp(username, email, password)` and, on success, navigate to `/`; the wire payload SHALL remain `{ name: username, email, password }` (unchanged contract).
3. WHEN `signUp` resolves `{ success: false, message }` THEN the screen SHALL display that `message` and SHALL NOT navigate.
4. WHEN the Sign Up screen renders THEN it SHALL expose a heading with accessible name "Sign Up" and a working link to `/signin`.
5. WHEN both screens are compared THEN the shared card/heading/field/footer structure SHALL come from a single shared source (no copy-pasted duplicate markup).

**Independent Test**: Render `/signup`, submit with mocked `signUp`; assert payload shape via the mock, navigation on success, message on failure; assert both pages import the shared layout.

---

### P2: In-flight submission state

**User Story**: As a coach on a slow connection, I want the button to show it's working and refuse a second click so that I don't fire duplicate auth requests.

**Why P2**: The current screens can double-submit; a visible pending state is a direct "make something better" win.

**Acceptance Criteria**:

1. WHEN a submit is in progress (auth promise unsettled) THEN the submit button SHALL be `disabled` and SHALL show a pending label.
2. WHEN the auth promise settles (success or failure) THEN the button SHALL return to its enabled, default-label state (except when navigation has already unmounted the screen on success).
3. WHEN the button is disabled mid-flight THEN a second submit SHALL NOT trigger a second `signIn`/`signUp` call.

**Independent Test**: Submit with a `signIn` mock that returns a pending (deferred) promise; assert button disabled + pending label; click again → assert mock called once; resolve → assert re-enabled or navigated.

---

### P2: Accessibility & error announcement

**User Story**: As a keyboard or screen-reader user, I want proper labels, visible focus, and announced errors so that I can complete auth without sight of a mouse.

**Why P2**: Low cost, part of "better"; the current error `<div>` is not announced.

**Acceptance Criteria**:

1. WHEN an input renders THEN it SHALL have a programmatically associated label (`htmlFor`/`id`).
2. WHEN an auth error message is shown THEN it SHALL be inside a live region (`role="alert"` or `aria-live="polite"`) so assistive tech announces it.
3. WHEN a coach tabs to any interactive element THEN it SHALL have a visible focus indicator (Tailwind `focus-visible` styling; the shared `Button` already provides one).
4. WHEN each screen renders THEN there SHALL be exactly one page `<h1>`-level heading with the screen's accessible name.

**Independent Test**: Query inputs by their label text; render an error and assert it sits in a node with `role="alert"`/`aria-live`; assert heading role/name.

---

### P3: Password visibility toggle

**User Story**: As a coach, I want to reveal the password I'm typing so that I can catch typos before submitting.

**Why P3**: Convenience; not required to ship the refactor.

**Acceptance Criteria**:

1. WHEN a coach activates the show/hide control on a password field THEN the input `type` SHALL toggle between `password` and `text`.
2. WHEN the toggle renders THEN it SHALL be a labelled `button` (accessible name reflecting show/hide state), not a bare icon.

**Independent Test**: Click the toggle; assert the input `type` attribute flips and the control's accessible name updates.

---

## Edge Cases

- WHEN required fields are empty THEN the browser's native `required` validation SHALL block submission (preserve current behavior).
- WHEN an already-authenticated user navigates to `/signin` or `/signup` THEN the screen SHALL redirect to `/` (preserve the existing `useEffect` redirect).
- WHEN `signIn`/`signUp` rejects due to network failure THEN the mapped `message` SHALL be shown in the error region and the button SHALL re-enable.
- WHEN either screen renders THEN it SHALL NOT introduce the app shell wrapper — no `<main>` element and no element carrying both `.h-screen` and `.overflow-hidden` (App.test.jsx asserts this for `/signin` and `/signup`).
- WHEN the user edits any field after an error THEN the error message SHALL clear (preserve current `handleChange` reset behavior).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| REQ-01 | P1 Sign In / AC1 — no inline styles, Tailwind + tokens (Sign In) | Design | Pending |
| REQ-02 | P1 Sign In / AC2–AC3 — signIn call, navigate on success, message on failure | Design | Pending |
| REQ-03 | P1 Sign In / AC4 — heading "Sign In" + link to /signup | Tasks | Pending |
| REQ-04 | P2 Sign Up / AC1 — no inline styles, Tailwind + tokens (Sign Up) | Design | Pending |
| REQ-05 | P2 Sign Up / AC2–AC3 — signUp call w/ unchanged `{name,email,password}` payload, navigate/message | Design | Pending |
| REQ-06 | P2 Sign Up / AC4 — heading "Sign Up" + link to /signin | Tasks | Pending |
| REQ-07 | P2 Sign Up / AC5 — shared structure, no duplicate markup (DRY extraction) | Design | Pending |
| REQ-08 | Edge case — no app-shell wrapper (`<main>` / `.h-screen.overflow-hidden`) on either screen | Tasks | Pending |
| REQ-09 | P2 In-flight / AC1–AC3 — disabled + pending label, no double submit | Design | Pending |
| REQ-10 | P2 A11y / AC1–AC4 — labels, live error region, focus, single heading | Design | Pending |
| REQ-11 | Edge cases — error-clear-on-edit + already-authed redirect preserved | Tasks | Pending |
| REQ-12 | P3 Password visibility toggle | Tasks | Pending |

**ID format:** `REQ-NN`
**Status values:** Pending → In Design → In Tasks → Implementing → Verified
**Coverage:** 12 total; all mapped to Design or Tasks. REQ-12 is P3 (may defer without failing MVP).

---

## Success Criteria

- [ ] `grep` for `style={{` in `src/pages/SignIn.jsx` and `src/pages/SignUp.jsx` returns nothing.
- [ ] Both pages import and render one shared auth layout/structure; no duplicated card/field markup remains.
- [ ] `npm test -- --run` passes, including the existing `App.test.jsx` no-shell and redirect assertions.
- [ ] `npm run lint` is clean for the changed files.
- [ ] Manual: on a throttled network the submit button visibly disables and shows a pending label; a second click issues no second request.
- [ ] Manual: inputs are reachable and labelled; an auth error is announced by a screen reader.
</content>
</invoke>
