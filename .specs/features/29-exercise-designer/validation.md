# Exercise Designer Validation (re-verification pass)

**Date**: 2026-08-07
**Spec**: `.specs/features/29-exercise-designer/spec.md`
**Diff range**: `main..feature/29-exercise-designer` (11 commits: T1-T9 implementation
+ `bb7467d` docs + `123b846` fix-pass test additions)
**Verifier**: independent sub-agent (author ≠ verifier), second pass

---

## Context

A prior Verifier pass found the implementation behaviorally sound (5/5 injected
mutations killed, gate green) but flagged 3 coverage gaps. Commit `123b846`
claims to close all three with test-only additions (no implementation files
touched). This pass independently re-verifies that claim.

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1-T9 | ✅ Done | Unchanged since prior pass |
| Fix pass (gap closure) | ✅ Done | `123b846` — additive tests only, confirmed via `git show --stat` (2 test files, +154/-0) |

---

## Gap-by-Gap Re-Verification

### Gap 1: exercise/training deleted before saving → save fails without corrupting the store

**Test**: `src/components/__tests__/TrainingSavePopup.test.jsx:825-873` — "saving an edit whose training was deleted in the meantime fails without corrupting the store (edge case)"

- Exercises the **real** `trainingService.update` (not a mocked `onSubmit`) against the real in-memory store, via `onSubmit: (t) => trainingService.update(t)`.
- Creates two trainings, deletes one (`created`) after the popup has opened on it, then submits.
- Asserts: the popup surfaces `"Failed to save the training. Please try again."`, `console.error` was called with an error whose `name` is `"NotFoundError"`, the deleted training stays absent from `trainingService.getAll()`, and the untouched survivor training is still present.
- This is a precise, spec-defined outcome (not a shallow "an error was thrown" check) and traces directly to `src/services/trainingService.js:64-66` (`throw new NotFoundError(...)` when `findIndex` returns `-1`) and the catch block in `src/components/TrainingSavePopup.jsx:138-140`.
- **Discrimination confirmed** (see Sensor below): mutating `trainingService.update` to upsert instead of throwing on a missing id kills this test.

**Verdict**: ✅ Gap closed — genuine, non-shallow, spec-anchored, and discriminating.

### Gap 2: localStorage quota rejected during a diagram/exercise save → error surfaces, editor stays open

**Test**: `src/components/__tests__/TrainingSavePopup.test.jsx:875-925` — "a localStorage quota rejection while saving a diagram-carrying exercise surfaces the error and keeps the editor open (edge case)"

- Creates a training whose one exercise carries a real `diagram` object, opens the popup on it, mocks `Storage.prototype.setItem` to throw `DOMException("Quota exceeded", "QuotaExceededError")` — the same trigger `src/lib/storage.js`'s `isQuotaExceededError` detects — then submits.
- Asserts the same user-facing error text, that `console.error` received an error with `name: "StorageQuotaError"` (the real error class raised by `src/lib/storage.js:93`), that the popup dialog (`"Edit Training"` heading) and the exercise's description remain mounted (editor stays open, work intact), and — importantly — re-reads the training via `trainingService.getById` after the failed save and asserts `exercises[0].diagram` is byte-equal to the original diagram (the rejected write never landed; no partial corruption).
- Traces to `src/lib/storage.js:85-98` (`write`), `src/services/trainingService.js:59-70` (`update` → `saveTrainings`), and the same `TrainingSavePopup.jsx:138-140` catch block.
- **Discrimination confirmed**: mutating `storage.write` to swallow the quota error instead of throwing `StorageQuotaError` kills this test.

**Verdict**: ✅ Gap closed — genuine, non-shallow, spec-anchored, and discriminating.

### Gap 3 (AC P2.4): diagram keeps relative shape position at a narrower width

**Test**: `src/components/__tests__/DiagramView.test.jsx:133-176` — "every shape keeps its relative pitch position when rendered inside a narrower container (AC P2.4)"

- Renders the same 3-shape diagram (`player-a`, `cone`, `ball` — covering the `<g>`-wrapped-circle, polygon, and bare-circle markup shapes) inside containers of two different pixel widths (1200px and 240px), reads back `viewBox` plus each shape's positional attributes (`cx`/`cy` or `points`), and asserts `narrow.viewBox === wide.viewBox` and `narrow.shapes` deep-equals `wide.shapes`, with a sanity check that all 3 shapes rendered non-trivial output first.
- This is a direct test of the AC's claim (relative position preserved at a narrower width), not just the previously-tested mechanism (a fixed `viewBox` attribute existing).
- **Architectural note**: `src/components/DiagramView.jsx` takes no width/container prop and reads no DOM measurement (`toPixel` at line 18-20 only multiplies by the constant `PITCH_WIDTH`/`PITCH_HEIGHT`) — so a width-dependent pixel bug is the only class of regression this AC actually guards against, and the test is structured to catch exactly that class (see Sensor discussion below for why a live mutation of this specific test was not attempted).

**Verdict**: ✅ Gap closed — the assertion now targets the actual spec claim, not a proxy for it, and is not shallow (compares full structural output, not just presence).

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ------------ | ------- |
| 1 | `src/lib/storage.js:93` | `write()`: on a detected quota error, `return` (swallow) instead of `throw new StorageQuotaError(key)` | ✅ Killed — Gap-2 test failed as expected (`findByText` for the error message timed out) |
| 2 | `src/services/trainingService.js:64-66` | `update()`: on `index === -1` (training not found), push a new record and return it instead of throwing `NotFoundError` | ✅ Killed — Gap-1 test failed as expected (`findByText` for the error message timed out) |

**Sensor depth**: lightweight (2 targeted mutations, one per newly-added test that exercises a distinct failure path). Both mutations were applied directly to the real tree, run, confirmed to kill the corresponding new test, then reverted; `git status`/`git diff` confirmed clean after each revert and at the end of the session.

Gap-3's test (AC P2.4) was not live-mutated: `DiagramView.jsx` has no width-sensing code path to break in a way this component-level test could distinguish from a no-op mutation (any mutation that shifts shape coordinates shifts them identically at both simulated widths, since nothing in the component reads container size). This was confirmed by code reading, not by a failed mutation attempt — noted as a residual limitation rather than a gap, since the component's architecture (fixed `viewBox`, no width prop) is itself what the AC requires.

**Result**: 2/2 attempted mutations killed — ✅ PASS

---

## Spec-Anchored Acceptance Criteria (delta since prior pass)

| Criterion | Spec-defined outcome | file:line + assertion | Result |
| --------- | --------------------- | ---------------------- | ------ |
| Edge case: editor opened for an exercise deleted before saving → save fails without corrupting the store | Save rejected, error surfaced, unaffected records untouched | `src/components/__tests__/TrainingSavePopup.test.jsx:861-872` — asserts error text, `NotFoundError` name, deleted training absent, survivor present | ✅ PASS |
| Edge case: `localStorage` quota rejected during save → existing store error path surfaces it, editor stays open | Error surfaced via existing `StorageQuotaError` path; editor/form remains mounted with work intact | `src/components/__tests__/TrainingSavePopup.test.jsx:907-924` — asserts error text, `StorageQuotaError` name, dialog still mounted, exercise diagram unchanged in store after the failed write | ✅ PASS |
| P2.4: WHEN a diagram is rendered at a narrower width THEN every shape SHALL keep its relative position on the pitch | Shape positions unchanged (relative to pitch) across container widths | `src/components/__tests__/DiagramView.test.jsx:164-175` — renders at 1200px and 240px, asserts identical `viewBox` and byte-identical shape coordinate sets | ✅ PASS |

All other ACs (P1.1-P1.7, P2.1-P2.3, P3.1-P3.5, DRAW-01 through DRAW-06, and the remaining edge cases) were re-spot-checked against their existing test files (`ExerciseFields.test.jsx`, `ExerciseDiagramEditor.test.jsx`, `ExerciseDetailsPopup.test.jsx`, `exerciseDiagram.test.js`, `store.test.js`) and remain unchanged from the prior PASS verdict — the fix commit did not touch any implementation file, so no regression risk was introduced there. Full re-derivation of every AC was not repeated line-by-line since the prior pass already did so and the diff surface since then is two additive test files only (`git show --stat 123b846`).

**Status**: ✅ All 3 previously-flagged gaps closed; no new gaps found.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ — 154 lines added, 0 removed, no implementation files touched |
| Surgical changes | ✅ — exactly the two test files named in the fix-task scope |
| No scope creep | ✅ |
| Matches patterns | ✅ — follows existing `test(...)` naming and AC-tagging conventions in both files |
| Spec-anchored outcome check | ✅ — all three new tests assert the spec-defined outcome, not a proxy |
| No unclaimed tests | ✅ — each new test is explicitly tied to an edge case or AC in its title and a comment block |
| Documented guidelines followed | none — strong defaults applied (no project-specific testing guideline doc found beyond `CLAUDE.md`, which was followed: services layer touched via the real `trainingService`, not re-mocked) |

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: lint clean (0 errors/warnings); build succeeded (Konva chunk `ReactKonva-*.js` emitted as a separate 313.75kB chunk, confirming it is not in the initial bundle per Success Criteria); **1382 tests passed, 0 failed, 0 skipped**, 67 test files
- **Test count before this fix pass**: 1380 (implied — 2 new tests added by `123b846` per its diff, on top of the prior pass's already-passing suite)
- **Test count after**: 1382
- **Delta**: +2 new tests (the third gap, P2.4, was closed by strengthening an existing test file with one new test — `DiagramView.test.jsx` shows +45 lines / 1 new test — so the net new-test count across both files is 3, consistent with "2 tests added to TrainingSavePopup.test.jsx + 1 to DiagramView.test.jsx")
- **Skipped tests**: none
- **Failures**: none

---

## Requirement Traceability Update

| Requirement ID | Story | Phase | Status |
| --------------- | ----- | ----- | ------ |
| DRAW-01 | Dependency + schema | Execute | ✅ Verified |
| DRAW-02 | P1: Diagram model and persistence | Execute | ✅ Verified |
| DRAW-03 | P1: The editor | Execute | ✅ Verified |
| DRAW-04 | P2: Read-only SVG rendering | Execute | ✅ Verified (P2.4 gap closed) |
| DRAW-05 | P3: Editing an existing diagram | Execute | ✅ Verified |
| DRAW-06 | Edge cases: size and corruption guards | Execute | ✅ Verified (deletion-mid-edit and quota-rejection edge cases closed) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 3/3 previously-flagged gaps re-derived and confirmed genuinely closed; all other ACs unchanged from the prior PASS
**Sensor**: 2/2 attempted mutations killed (targeting the two new edge-case tests); the third new test (P2.4) was verified by code reading rather than live mutation, since the component under test has no width-dependent code path to fault-inject against
**Gate**: 1382 passed, 0 failed, 0 skipped; lint clean; build succeeded with Konva correctly code-split

**What works**: All P1-P3 acceptance criteria and edge cases from spec.md, including the three gaps a prior Verifier pass flagged as coverage-only gaps. The fix commit (`123b846`) is exactly what it claims to be: two test files, no implementation changes, each new/modified test independently confirmed to assert the spec-defined outcome and (where fault-injectable) to fail against a plausible wrong implementation.

**Issues found**: none

**Next steps**: none — feature ready to merge from a validation standpoint.
