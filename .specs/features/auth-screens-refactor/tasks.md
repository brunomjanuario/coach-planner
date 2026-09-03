# Auth Screens Refactor Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/auth-screens-refactor/design.md`
**Spec**: `.specs/features/auth-screens-refactor/spec.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `CLAUDE.md` (Commands + Conventions), `package.json` scripts. Test stack: Vitest + `@testing-library/react` + `@testing-library/user-event`, jsdom, co-located under `__tests__/`. Provenance samples: `src/pages/__tests__/Settings.test.jsx`, `src/__tests__/App.test.jsx`, `src/components/__tests__/Button.test.jsx`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Shared presentational component (`AuthLayout`) | unit | Renders title as heading; renders error only in a `role="alert"`/`aria-live` region when `error` truthy and nothing when falsy; renders `children` + `footer`; root contains no `<main>` and no combined `.h-screen.overflow-hidden` | `src/components/__tests__/*.test.jsx` | `npm test -- --run` |
| Auth page (`SignIn`, `SignUp`) | unit | 1:1 to that page's spec ACs: no inline `style`; calls `signIn`/`signUp` with correct args (SignUp payload `{name,email,password}` preserved); navigates to `/` on success; shows mapped `message` + no navigation on failure; disabled + pending label mid-flight + no double call; labels associated; error live region; already-authed redirect; error clears on edit | `src/pages/__tests__/*.test.jsx` | `npm test -- --run` |
| Routing contract (`App.jsx`) | unit (existing) | Existing `App.test.jsx` no-shell + redirect assertions still pass unchanged | `src/__tests__/App.test.jsx` | `npm test -- --run` |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After a task with unit tests | `npm test -- --run` |
| Full | Same as quick (single Vitest suite; no separate e2e tier) | `npm test -- --run` |
| Build | After final phase / lint check | `npm run lint && npm test -- --run && npm run build` |

---

## Execution Plan

Phases are ordered and run sequentially; tasks within a phase execute in order. Total: 6 tasks (fits a single batch — inline execution, no sub-agents required).

### Phase 1: Shared scaffold

```
T1
```

### Phase 2: Refactor pages

```
T2 → T3
```

### Phase 3: UX + a11y hardening

```
T4 → T5 → T6
```

---

## Task Breakdown

### T1: Create shared `AuthLayout` component

**What**: A presentational, Tailwind-only, dark-theme auth card that takes `title`, optional `error`, `children` (form), and `footer`; renders the title as the single `<h1>`, the error inside a `role="alert"` live region, and no shell wrapper.
**Where**: `src/components/AuthLayout.jsx` (new); `src/components/__tests__/AuthLayout.test.jsx` (new)
**Depends on**: None
**Reuses**: `@theme` tokens in `src/index.css`; contrast approach from `src/components/Button.jsx`
**Requirement**: REQ-07, REQ-08, REQ-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Component renders `title` as an `<h1>` with that accessible name
- [ ] When `error` is truthy, it renders inside a node with `role="alert"` (or `aria-live`); when falsy, no such node/text renders
- [ ] Renders `children` and `footer` slots
- [ ] Root markup uses Tailwind classes only (no `style={{…}}`), no `<main>`, and no single element carrying both `.h-screen` and `.overflow-hidden`
- [ ] Gate passes: `npm test -- --run`
- [ ] Test count: ≥4 tests pass (no silent deletions)

**Tests**: unit
**Gate**: quick

---

### T2: Refactor `SignIn.jsx` onto `AuthLayout` + Tailwind

**What**: Replace all inline `style` in SignIn with `AuthLayout` + Tailwind-styled labeled fields and the shared `Button`; preserve `signIn` call, success navigation, failure message, `/signup` link, already-authed redirect, and error-clear-on-edit.
**Where**: `src/pages/SignIn.jsx` (modify); `src/pages/__tests__/SignIn.test.jsx` (new)
**Depends on**: T1
**Reuses**: `AuthLayout` (T1), `src/components/Button.jsx`, `useAuth`
**Requirement**: REQ-01, REQ-02, REQ-03, REQ-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] No `style={{` remains in `SignIn.jsx`
- [ ] Submitting valid creds calls `signIn(email, password)` and navigates to `/` on `{success:true}` (mocked)
- [ ] `{success:false, message}` shows `message` and does not navigate
- [ ] Heading accessible name "Sign In" present; link to `/signup` works; email/password inputs are label-associated
- [ ] Editing a field after an error clears the error; already-authed user is redirected to `/`
- [ ] Gate passes: `npm test -- --run`
- [ ] Test count: ≥5 tests pass (no silent deletions)

**Tests**: unit
**Gate**: quick

---

### T3: Refactor `SignUp.jsx` onto `AuthLayout` + Tailwind (DRY)

**What**: Same refactor for SignUp with three fields; keep the exact `signUp(username, email, password)` call so the `{ name: username, email, password }` payload is unchanged; render via the shared `AuthLayout` so no card/field markup is duplicated between the two pages.
**Where**: `src/pages/SignUp.jsx` (modify); `src/pages/__tests__/SignUp.test.jsx` (new)
**Depends on**: T2
**Reuses**: `AuthLayout` (T1), `Button`, `useAuth`; mirrors SignIn structure (T2)
**Requirement**: REQ-04, REQ-05, REQ-06, REQ-07, REQ-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] No `style={{` remains in `SignUp.jsx`
- [ ] Submitting calls `signUp(username, email, password)`; the mocked context receives args producing the `{name,email,password}` payload; navigates to `/` on success
- [ ] `{success:false, message}` shows `message` and does not navigate
- [ ] Heading accessible name "Sign Up" present; link to `/signin` works; all three inputs label-associated
- [ ] Both pages import/render the same `AuthLayout` (no duplicated card/field markup)
- [ ] Gate passes: `npm test -- --run`
- [ ] Test count: ≥5 tests pass (no silent deletions)

**Tests**: unit
**Gate**: quick

---

### T4: Add in-flight submit state to both pages

**What**: Add a `submitting` flag to SignIn and SignUp; disable the submit `Button` and show a pending label ("Signing in…" / "Creating account…") while the auth promise is unsettled; guard the handler so a second submit issues no second call; re-enable on settle.
**Where**: `src/pages/SignIn.jsx`, `src/pages/SignUp.jsx` (modify); extend `SignIn.test.jsx` / `SignUp.test.jsx`
**Depends on**: T3
**Reuses**: `Button` `disabled` styling; the pages from T2/T3
**Requirement**: REQ-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] While the auth mock's promise is pending, the submit button is `disabled` and shows the pending label
- [ ] A second submit during pending calls the auth mock exactly once
- [ ] On settle (success or failure), the button re-enables (or the screen has navigated away on success)
- [ ] Gate passes: `npm test -- --run`
- [ ] Test count: prior counts + ≥3 new tests pass (no silent deletions)

**Tests**: unit
**Gate**: quick

---

### T5: Add password visibility toggle (P3)

**What**: Add an accessible show/hide `button` on password field(s) in both pages that toggles the input `type` between `password` and `text`, with an accessible name reflecting current state.
**Where**: `src/pages/SignIn.jsx`, `src/pages/SignUp.jsx` (modify) — or the shared field helper if one was extracted; extend the page tests
**Depends on**: T4
**Reuses**: shared field structure; `@theme` tokens; `@tabler/icons-react` if an icon is used
**Requirement**: REQ-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Activating the toggle flips the password input `type` between `password` and `text`
- [ ] The toggle is a `button` with an accessible name that reflects show vs hide state
- [ ] Gate passes: `npm test -- --run`
- [ ] Test count: prior counts + ≥2 new tests pass (no silent deletions)

**Tests**: unit
**Gate**: quick

---

### T6: Verify no-regression + full build gate

**What**: Confirm the existing `App.test.jsx` no-shell/redirect assertions still pass, lint is clean for changed files, and the production build succeeds; fix anything the gate surfaces.
**Where**: repo-wide gate (no product-code change expected beyond fixes)
**Depends on**: T5
**Reuses**: existing suites
**Requirement**: REQ-08 (regression guard), all

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `src/__tests__/App.test.jsx` `/signin` + `/signup` "no shell wrapper" and redirect tests pass unchanged
- [ ] `grep -R "style={{" src/pages/SignIn.jsx src/pages/SignUp.jsx` returns nothing
- [ ] Build gate passes: `npm run lint && npm test -- --run && npm run build`
- [ ] Full suite green (no silent deletions vs. pre-feature count)

**Tests**: none (aggregate gate only)
**Gate**: build

**Commit**: `feat(auth): refactor sign-in/sign-up screens onto Tailwind + shared AuthLayout`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1
Phase 2:  T2 ──→ T3
Phase 3:  T4 ──→ T5 ──→ T6
```

Execution is strictly sequential — one task at a time, in order. All 6 tasks fit one batch (≤ ~8) → inline execution, no sub-agents.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Create `AuthLayout` | 1 component + its test | ✅ Granular |
| T2: Refactor SignIn | 1 page + its test | ✅ Granular |
| T3: Refactor SignUp | 1 page + its test | ✅ Granular |
| T4: In-flight state | 1 cohesive behavior across the 2 pages | ✅ OK (cohesive, same change) |
| T5: Password toggle | 1 cohesive behavior across the 2 pages | ✅ OK (cohesive, same change) |
| T6: Regression + build gate | verification only | ✅ Granular |

> T4/T5 touch both pages but apply one cohesive behavior each; splitting per-page would fragment a single change. Acceptable per the 2–3-related-things rule.

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |

All dependencies point backward or within-phase. No forward dependencies.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Shared component (`AuthLayout`) | unit | unit | ✅ OK |
| T2 | Auth page (`SignIn`) | unit | unit | ✅ OK |
| T3 | Auth page (`SignUp`) | unit | unit | ✅ OK |
| T4 | Auth pages (behavior) | unit | unit | ✅ OK |
| T5 | Auth pages (behavior) | unit | unit | ✅ OK |
| T6 | Aggregate gate (no new layer) | none | none | ✅ OK |

T6's `Tests: none` is valid — it creates no new code layer; it runs existing suites + the build gate.
</content>
