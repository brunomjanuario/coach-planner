# Training Exercise Details Validation

**Date**: 2026-08-06
**Spec**: `.specs/features/28-training-exercise-details/spec.md`
**Diff range**: `34a960c..HEAD` (feature/28-training-exercise-details, 4 commits: d1735ad, d6ea97e, 089dbf9, bd0a8a4)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `plannedShare` added to `src/lib/trainingDuration.js:18-26`; 5 new tests in `trainingDuration.test.js` |
| T2   | ✅ Done | `src/components/ExerciseDetailsPopup.jsx` (new, 70 lines), 12 tests in `ExerciseDetailsPopup.test.jsx` |
| T3   | ✅ Done | Exercise rows are `<button>`s (`TrainingDetailsPopup.jsx:82-92`), stack `ExerciseDetailsPopup`, 8 new tests |
| T4   | ✅ Done | Prev/Next state lives in `ExerciseDetailsPopup`, bounded correctly; 1 wiring test in `TrainingDetailsPopup.test.jsx` |

All tasks.md "Done when" checkboxes are marked `[x]`, Status: Complete (note: this checkbox/status edit is currently an uncommitted change to `tasks.md` in the working tree, not part of the 4 reviewed commits — pre-existing when this review began, not made by the Verifier).

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| EXDET-01.1 row is focusable button, accessible name includes description | button carrying description text | `TrainingDetailsPopup.test.jsx:360-370` — `screen.getByRole("button", { name: /SSG/ })` | ✅ PASS |
| EXDET-01.2 activation by click opens popup | click → `ExerciseDetailsPopup` for that exercise | `TrainingDetailsPopup.test.jsx:372-387` | ✅ PASS |
| EXDET-01.2 activation by Enter | Enter on focused row opens popup | **No test found.** Rows are native `<button type="button">` (`TrainingDetailsPopup.jsx:82-92`), so Enter-activation is native HTML/browser behavior, not custom JS — low risk, but tasks.md T3 checks this box with no corresponding assertion in either test file (`grep` for `{enter}`/keyboard found nothing) | ⚠️ **Coverage gap** (task checklist claims coverage that doesn't exist; behavior is still correct by virtue of using a real `<button>`) |
| EXDET-01.3 training popup still mounted while exercise popup open | both headings present | `TrainingDetailsPopup.test.jsx:385-386` — asserts both "SSG" and "Training #4" headings | ✅ PASS |
| EXDET-01.4 closing exercise popup leaves training open, removes exercise popup | heading gone, training heading remains | `TrainingDetailsPopup.test.jsx:389-408` — asserts `queryByRole("heading",{name:"SSG"})` absent and `"Training #4"` present | ✅ PASS |
| EXDET-01.5 four labelled fields | Description/Duration/Number of players/Repetitions each under own label | `ExerciseDetailsPopup.test.jsx:14-25` | ✅ PASS |
| EXDET-01.6 null optional field → em dash under label, not omitted | label present + "—" rendered | `ExerciseDetailsPopup.test.jsx:27-41` — asserts both labels present and exactly 2 dashes | ✅ PASS |
| EXDET-03.1 Next moves forward, updates title | title changes, EXDET-03.5 tied in | `ExerciseDetailsPopup.test.jsx:90-99` | ✅ PASS |
| EXDET-03.2 Previous moves back | title changes | `ExerciseDetailsPopup.test.jsx:101-110` | ✅ PASS |
| EXDET-03.3/03.4 Previous disabled on first, Next disabled on last (both bounds, one training) | both asserted together | `ExerciseDetailsPopup.test.jsx:112-127` — 3-exercise training, checks both ends | ✅ PASS |
| EXDET-03.5 title = exercise description | heading matches | `ExerciseDetailsPopup.test.jsx:60-64` | ✅ PASS |
| EXDET-03.6 single exercise → both disabled | both disabled | `ExerciseDetailsPopup.test.jsx:129-135` | ✅ PASS |
| EXDET-04.1 share = rounded whole percent, weighted by duration×repetitions | non-whole rounding case + a case where raw-duration math would differ from the correct weighted math | `trainingDuration.test.js:53-60` (22% rounding case) **and** `:62-68` (target dur=10,reps=2 vs other dur=10,reps=1 → weighted 67% vs raw-duration-only 50%; a de-weighted implementation would fail this) | ✅ PASS — genuinely discriminating test present |
| EXDET-04.2 total planned time 0 → no render, no NaN/Infinity | returns `null`, and component asserts absence of "%" text | `trainingDuration.test.js:70-74` (`toBeNull()`); `ExerciseDetailsPopup.test.jsx:53-58` (`queryByText(/%.../)` absent) | ✅ PASS |
| Edge: exercise duration null → share doesn't render | `plannedShare` returns null when own duration null | `trainingDuration.test.js:76-81` | ✅ PASS (no dedicated component-level test for this specific edge, but the lib-level guard is the single source of truth the component reads from) |
| Edge: no exercises → "No exercises", not a button | text present, not `getByRole("button")` | `TrainingDetailsPopup.test.jsx:427-433` | ✅ PASS |
| Edge: long description wraps, no truncation class | heading found by full text, no `truncate` class | `ExerciseDetailsPopup.test.jsx:66-74` | ✅ PASS |
| Edge: closing training popup while exercise popup open closes both | `queryAllByRole("dialog")` length 0 | `TrainingDetailsPopup.test.jsx:435-453` | ✅ PASS |
| Edge: two exercises share description, keyed by id | second row opens exercise with distinct data | `TrainingDetailsPopup.test.jsx:410-425` | ✅ PASS |
| Reserved diagram slot renders nothing (Assumptions) | no "Diagram" text/region | `ExerciseDetailsPopup.test.jsx:76-80`; direct read of `ExerciseDetailsPopup.jsx` confirms no diagram markup, conditional or otherwise — the implementer omitted the branch entirely rather than writing dead `exercise.diagram &&` code | ✅ PASS |
| Stepping doesn't remount training popup | training heading still present after Next | `TrainingDetailsPopup.test.jsx:455-472` | ✅ PASS |

**Status**: ✅ All 4 requirement groups (EXDET-01 through -04) verified with direct evidence; one coverage gap (Enter-key activation claimed done in tasks.md but untested — low severity, native button semantics cover it regardless).

---

## Verification of Specific Concerns Raised

1. **Share weighting** — confirmed correct. `plannedShare` (`trainingDuration.js:24`) computes `exercise.duration * (exercise.repetitions ?? 1)` over `totalPlannedMinutes(exercises)`, the same weighting formula `totalPlannedMinutes` itself uses (`trainingDuration.js:6`). `trainingDuration.test.js:62-68` is a genuinely discriminating test: target duration 10/reps 2 vs. other duration 10/reps 1 gives 67% weighted vs. 50% if computed from raw duration alone — a de-weighted implementation would fail this specific assertion, not just miss rounding.

2. **Reserved diagram slot** — confirmed clean. Read `ExerciseDetailsPopup.jsx` in full: no diagram markup, no `exercise.diagram &&` stub, nothing conditional reserved for it — the region simply doesn't exist yet, matching the spec's explicit "renders nothing at all until 29 lands." `ExerciseDetailsPopup.test.jsx:76-80` asserts `queryByText("Diagram")` is absent.

3. **Prev/Next state ownership** — coherent. `ExerciseDetailsPopup` owns `index` via `useState(() => exercises.findIndex(...))`, computed once at mount from the `exercise` prop, which `TrainingDetailsPopup` only ever supplies from `training.exercises.find(...)` — so `findIndex` is guaranteed to find a match in practice; a literal id collision in the array (a pre-existing data-integrity issue outside this feature's scope) would only affect which of the duplicates is initially selected, not crash. Because `TrainingDetailsPopup` conditionally mounts the popup only via `{selectedExercise && <ExerciseDetailsPopup .../>}` (no `key` needed since `selectedExerciseId` only flips `null`→id→`null`, never id→id directly while the stacked popup blocks the row underneath), Next/Previous updates local `index` state with zero re-renders or new props from the parent — confirmed by `TrainingDetailsPopup.test.jsx:455-472`, which asserts the parent's heading is untouched across a Next click.

4. **Browser verification claim (13%/50%/38%)** — independently recomputed from `src/model/seed.js:142-167` (training id 1): exercises are duration 10/reps 1, duration 20/reps 2, duration 10/reps 3. Total planned = 10×1 + 20×2 + 10×3 = 80. Shares: 10/80=12.5%→**13** (`Math.round` rounds .5 up), 40/80=50%→**50**, 30/80=37.5%→**38**. All three figures in the commit message check out exactly.

---

## Discrimination Sensor

Each mutation applied to the real working tree, relevant test file(s) run, then reverted with `git checkout -- <file>`; `git status`/`git diff` confirmed each file byte-identical to HEAD after reversion, full suite re-confirmed green afterward.

| # | File:line | Description | Killed? |
| - | --- | --- | --- |
| 1 | `src/lib/trainingDuration.js:24` | Dropped the `(exercise.repetitions ?? 1)` weighting so `plannedShare` uses raw duration only | ✅ **Killed** — `npx vitest run trainingDuration.test.js ExerciseDetailsPopup.test.jsx` → 2 test files failed |
| 2 | `src/components/TrainingDetailsPopup.jsx:82-92` | Reverted the exercise row from `<button>` to a plain `<div onClick>` (regression to pre-feature non-interactive markup) | ✅ **Killed** — `TrainingDetailsPopup.test.jsx` → 6 tests failed (all `getByRole("button", {name: /.../})` lookups) |
| 3 | `src/components/ExerciseDetailsPopup.jsx:44-50` | Removed the `disabled={!canGoPrevious}` guard on the Previous button | ✅ **Killed** — `ExerciseDetailsPopup.test.jsx` → 2 tests failed (both bound-checking tests expecting `toBeDisabled()`) |

**Sensor depth**: lightweight (3 mutations, default tier)
**Result**: 3/3 killed — ✅ Sensor PASS

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: lint exit 0 (no findings), build exit 0 (6000 modules, no errors), test: 64 files / 1271 tests passed, 0 failed, 0 skipped
- **Stability check**: `npm test` run twice in a row — both runs 64 files / 1271 tests passed, 0 failed
- **Failures**: none

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ `ExerciseDetailsPopup.jsx` is 70 lines, single-purpose; `TrainingDetailsPopup.jsx` diff is a row→button swap plus one stacked popup, no unrelated refactors |
| Surgical changes | ✅ Only the 6 files in the diff stat touched |
| No scope creep | ✅ No diagram stub added despite being mentioned in the spec — correctly deferred to feature 29 |
| Matches patterns | ✅ Stacking pattern mirrors `SquadRatingPopup` exactly as the spec's Assumptions table calls for; uses `Button`/`PopupActions` from feature 27, not hand-written classes (confirmed by `ExerciseDetailsPopup.test.jsx:82-88`) |
| Per-layer coverage | ✅ Lib unit tests, component tests for both popups |
| Documented guidelines followed | CLAUDE.md conventions (Tailwind-only styling, `*Popup` naming, `onClose` callback) — followed |

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| EXDET-01 | Pending | ✅ Verified (one minor coverage gap: Enter-key activation untested, though native-button semantics make it low risk) |
| EXDET-02 | Pending | ✅ Verified |
| EXDET-03 | Pending | ✅ Verified |
| EXDET-04 | Pending | ✅ Verified |

---

## Summary

**Overall**: ✅ PASS — no shipped defects found, one minor coverage gap.

**Spec-anchored check**: all EXDET-01 through EXDET-04 criteria and edge cases matched spec outcome with direct evidence; 1 minor gap flagged (Enter-key activation claimed "done" in tasks.md T3 with no corresponding test — behavior is still correct via native `<button>` semantics).

**Sensor**: 3/3 mutations killed — share-weighting, button-affordance, and disabled-guard regressions are all caught by the existing suite.

**Gate**: 3/3 passed (lint, build, test — 1271 tests, 0 failed, stable across 2 consecutive full runs).

**What works**: `plannedShare` correctly weights by duration×repetitions (verified both by a genuinely discriminating test and independent recomputation against seed data: 13%/50%/38% confirmed exact); the reserved diagram slot is truly empty with no dead conditional code; Prev/Next state is cleanly owned by `ExerciseDetailsPopup` with no parent re-render dependency; exercise rows are real focusable buttons; null fields render em dashes under their labels; closing either popup independently or together behaves correctly.

**Issues found**: 1 Minor — Enter-key row activation (part of EXDET-01.2) has no dedicated keyboard-interaction test in `TrainingDetailsPopup.test.jsx`, despite tasks.md T3 checking that box as done. Recommend adding one `fireEvent.keyDown(row, {key:"Enter"})`-style assertion (or accept the risk, since native `<button>` elements activate on Enter by default in all browsers and jsdom).

---

## Post-Verifier fix (same session, not a re-verify cycle)

Closed immediately: a new test in `TrainingDetailsPopup.test.jsx` focuses an
exercise row and dispatches a real `{Enter}` keypress via `userEvent`, then
asserts the exercise details popup opened — exercising the actual browser
activation path rather than resting on the "native buttons do this" argument.
Full suite green at 1272/1272 (1271 + 1 new test), lint and build clean. This
was a direct fix, not a formal fix→re-verify Verifier dispatch — the original
verdict was PASS with a Minor gap, not FAIL. EXDET-01 is now ✅ Verified
without qualification.
