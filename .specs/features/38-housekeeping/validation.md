# Housekeeping Validation

**Date**: 2026-08-10
**Spec**: `.specs/features/38-housekeeping/spec.md`
**Diff range**: `main..HEAD` (branch `feat/round-four-cleanup`)
**Verifier**: independent sub-agent (author ≠ verifier)

Note: this feature shares one branch/PR with feature 37
(`trainings-unassigned-refresh`) — both were reviewed in a single pass; see
cross-reference at the bottom. The combined gate run (lint/build/test) and
baseline delta are reported once here and referenced from feature 37's report
rather than duplicated with different numbers.

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1 (404 route) | ✅ Done | `src/pages/NotFound.jsx` created; catch-all `<Route path="*">` added to `App.jsx`'s inner `<Routes>`; commit `d6cfa81` |
| T2 (dead `App.css` import) | ✅ Done | `import "./App.css";` removed from `App.jsx`; commit `2147979` |
| T3 (`!= null` convention) | ✅ Done | `trainingService.getAllNumbered`'s filter changed from `teamId ? … : …` to `teamId != null ? … : …`; commit `19a2dcb` |

---

## Spec-Anchored Acceptance Criteria

### HOUSE-01: An unknown authenticated path shows something, not nothing

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | --------------------- | ------------------------ | ------ |
| HOUSE-01.1: WHEN an authenticated coach navigates to a path matching none of the six routes THEN the app SHALL render a visible message | Heading "Page not found" renders, `<main>` is non-empty | `src/__tests__/App.test.jsx:105-111` — `await screen.findByRole("heading", { name: "Page not found" })` then `expect(main.textContent.trim()).not.toBe("")` | ✅ PASS |
| HOUSE-01.2: WHEN that message renders THEN it SHALL include a link back to `/` | A link with accessible name and `href="/"` | `src/__tests__/App.test.jsx:114-121` — `expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/")` | ✅ PASS |
| HOUSE-01.3: WHEN a defined route is visited THEN behavior SHALL be unchanged | `/teams` still renders the `Teams` heading, no `NotFound` heading | `src/__tests__/App.test.jsx:123-133` — `expect(await screen.findByRole("heading", { name: "Teams" })).toBeInTheDocument()` and `expect(screen.queryByRole("heading", { name: "Page not found" })).not.toBeInTheDocument()` | ✅ PASS |
| Edge case: unauthenticated visit to `/does-not-exist` still redirects to `/signin` before the catch-all is reached | `PrivateRoute` gate wins; sign-in heading renders, `NotFound` heading does not | `src/__tests__/App.test.jsx:135-141` — `expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument()` and `expect(screen.queryByRole("heading", { name: "Page not found" })).not.toBeInTheDocument()` | ✅ PASS |

### HOUSE-02: Two housekeeping fixes with no user-visible behavior

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | --------------------- | ------------------------ | ------ |
| HOUSE-02.1: WHEN `App.jsx` and `pages/Calendar.jsx` are read THEN neither SHALL import `App.css` | Zero `App.css` import statements in either file | Verified directly: `grep -rn "App.css" src` → **0 hits** (exit code 1, no matches) across the whole `src/` tree, confirming both files. `App.jsx`'s `import "./App.css";` line is absent from `git diff main..HEAD -- src/App.jsx` (removed). | ✅ PASS |
| HOUSE-02.2: WHEN `trainingService.getAllNumbered` is called with a `teamId` THEN its filter SHALL use `!= null`, behavior unchanged for every id currently possible | `teamId != null ? … : …` at the filter line; full existing suite stays green with 0 modifications to `Trainings.test.jsx`'s pre-existing tests (only 2 new tests were added, both for feature 37, not this change) | `src/services/trainingService.js:41` — `return teamId != null` (was `return teamId`); full-suite gate: 1464/1464 passed, no `getAllNumbered`-related test files modified beyond feature 37's own additions | ✅ PASS |

**Status**: ✅ All ACs covered — no spec-precision gaps

---

## Verification of the `App.css` claim (explicitly re-derived, not trusted from commit messages)

The spec/commit claims `Calendar.jsx` had already stopped importing `App.css` before this
feature (an earlier feature fixed that half without updating `CLAUDE.md`), and that only
`App.jsx`'s import needed removing here. Independently confirmed:

1. **Current state** — `grep -rn "App.css" src` from the repo root on `HEAD` returns **zero
   matches** anywhere in `src/`.
2. **Pre-feature state on `main`** — `git show main:src/pages/Calendar.jsx | grep -n "App.css"`
   also returns **zero matches** — i.e. `Calendar.jsx` did not import `App.css` even before
   this feature touched anything. Only `git diff main..HEAD -- src/App.jsx` shows an
   `App.css` import actually being removed (from `App.jsx`).
3. **History** — `git log -p --all -- src/pages/Calendar.jsx | grep -B5 "App.css"` shows the
   `import "../App.css";` line was dropped from `Calendar.jsx` in the `cb5220e feat(calendar):
   render real trainings and games` commit, long before this branch existed.

Conclusion: the claim is accurate. `CLAUDE.md`'s removed sentence ("`src/App.css` is empty but
still imported by `App.jsx` and `pages/Calendar.jsx`") was indeed half-stale at the time this
feature started work, and the fix (removing only `App.jsx`'s import, and removing the whole
now-false `CLAUDE.md` line) is correct and matches reality post-fix.

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ------------ | ------- |
| 2 | `src/App.jsx:39` | Removed the catch-all `<Route path="*" element={<NotFound />} />` | ✅ Killed — `src/__tests__/App.test.jsx` failed 2/12 (`findByRole("heading", { name: "Page not found" })` timed out for both the HOUSE-01.1 and HOUSE-01.2 tests) |
| 3 | `src/services/trainingService.js:41` | Reverted `teamId != null` back to the old truthy check `teamId` | ❌ Survived (as predicted) — full suite (`npx vitest run`) still 1464/1464 passed; `Trainings.test.jsx` and `trainingService.test.js` alone: 117/117 passed |

(Mutation 1, covering feature 37's `loadUnassigned()` call, is reported in that feature's
validation.md since it targets `Trainings.jsx`'s edit path specifically — both mutations were
run in the same pass on this shared branch.)

Each mutation was applied directly to the real working tree, the targeted test file(s) run,
the result recorded, then reverted immediately with `git checkout -- <file>`; `git status`
confirmed a clean tree after each revert and again at the end of the full sequence.

**Mutation 3 analysis — is the "survives" claim honest?** Yes. The spec (HOUSE-02, "Out of
Scope" table) explicitly states no team id of `0` or `""` exists anywhere in this app today
(seed ids are `1`/`2`; generated ids are non-empty UUID strings via
`Math.floor(Math.random()*100)` per `CLAUDE.md`'s known rough edges — none of which coerce to
falsy). `teamId ? X : Y` and `teamId != null ? X : Y` diverge only for `teamId === 0` or
`teamId === ""`, neither of which this app can produce or pass through
`getAllNumbered`. The task's own claim was never "a test will catch a regression here" — it
was "behavior is unchanged for every id this app can produce, proven by the full suite staying
green with zero test modifications." That is exactly what was observed: the mutation survives
review-sensor scrutiny not because the tests are weak, but because there is no reachable input
that would make the two implementations diverge. This is a deliberately non-discriminating
mutation by the spec's own design, not a coverage gap — no fix task is warranted.

**Sensor depth**: lightweight (2 mutations for this feature: catch-all removal, truthy-check
revert; 1 more for feature 37 reported there — 3 total across the shared branch)
**Result**: 1/2 killed for this feature's own mutations (the second is an expected, spec-declared non-kill, not a failure) — PASS ✅

---

## Edge Cases

- [x] Unauthenticated visit to `/does-not-exist` still redirects to `/signin` first (`PrivateRoute` gate wins over the new catch-all) — `src/__tests__/App.test.jsx:135-141`.
- [x] `App.css` dead-import claim re-verified directly against the codebase rather than trusted from the commit message (see dedicated section above).
- [x] `getAllNumbered`'s `!= null` change: no unreachable-input test added, matching the spec's explicit statement that no such input exists; the full pre-existing 91-test `Trainings.test.jsx` suite is unmodified and green.

---

## Code Quality

| Principle        | Status |
| ----------------- | ------ |
| No features beyond what was asked | ✅ — `NotFound.jsx` is a minimal heading + message + link, consistent with the spec's explicit "no design system, no polish" scope decision |
| No abstractions for single-use code | ✅ |
| No unnecessary "flexibility" added | ✅ |
| Only touched files required for task (`App.jsx`, `NotFound.jsx`, `App.test.jsx`, `trainingService.js`, `CLAUDE.md`) | ✅ |
| Didn't "improve" unrelated code | ✅ — `src/App.css` itself left in place, as the spec explicitly scoped out deleting it |
| Matches existing patterns/style | ✅ — `NotFound.jsx` follows the one-file-per-route convention, Tailwind-only styling (no inline `style`), same as every page except the three named exceptions in `CLAUDE.md` |
| Would senior engineer approve? | ✅ |
| Tests map to acceptance criteria and are non-shallow (spot-checked HOUSE-01 story) | ✅ — all four new `App.test.jsx` tests assert concrete, spec-derived outcomes (heading text, link href, absence of the NotFound heading on defined routes and on the unauthenticated redirect) |
| Spec-anchored outcome check (asserted values match spec-defined outcome) | ✅ |
| Per-layer Coverage Expectation met (route-level test covers happy path, defined-route regression, and unauthenticated edge case) | ✅ |
| Every test in scope maps to a spec AC or edge case — no unclaimed tests | ✅ (each test title cites its AC or is explicitly labeled "edge case") |
| Documented guidelines followed | none — strong defaults applied, as stated in tasks.md |

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: lint clean (0 errors/warnings), build succeeded (`vite build`, 1.84s, no warnings), tests: **1464 passed, 0 failed** (69 files)
- **Test count before feature (baseline, `main` via `git worktree add /tmp/scratch-baseline main` + `npm install` + `npm test`, independently re-derived, not trusted from a prior report)**: **1458 passed**
- **Test count after feature (HEAD, this branch)**: **1464 passed**
- **Delta**: +6 (4 new tests in `App.test.jsx` for this feature's HOUSE-01 ACs/edge case; +2 in `Trainings.test.jsx` belong to the co-branched feature 37 — see that feature's validation.md)
- **Skipped tests**: none
- **Failures**: none
- Baseline worktree (`/tmp/scratch-baseline`) removed via `git worktree remove --force` after the count was captured; confirmed no longer listed.

---

## Fix Plans

None — no gaps found.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status  |
| ----------- | ---------------- | ------------ |
| HOUSE-01    | Implementing      | ✅ Verified |
| HOUSE-02    | Implementing      | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 6/6 ACs (incl. 1 edge case rolled into HOUSE-01's table) matched spec outcome, 0 spec-precision gaps
**Sensor**: 1/1 feature-38-specific "must be killed" mutation killed (catch-all removal); 1/1 "should survive" mutation (truthy→`!=null` revert) correctly survived, matching the spec's own explicit prediction
**Gate**: 1464 passed, 0 failed (baseline 1458 → +6 across both co-branched features)

**What works**: All three housekeeping items are correctly and minimally implemented. The
`App.css` stale-documentation claim was independently re-verified against `git grep` and `git
log`, not taken on faith — it holds up. The `!= null` mutation's survival is not a testing gap;
it is the expected, spec-declared outcome for a change with no currently-reachable
distinguishing input, and the task's own framing of that fact is accurate.

**Issues found**: none

**Next steps**: none — feature is ready to ship as part of this branch, alongside feature 37
(`.specs/features/37-trainings-unassigned-refresh/validation.md`).
