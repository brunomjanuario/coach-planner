# Trainings Unassigned Refresh Validation

**Date**: 2026-08-10
**Spec**: `.specs/features/37-trainings-unassigned-refresh/spec.md`
**Diff range**: `main..HEAD` (branch `feat/round-four-cleanup`)
**Verifier**: independent sub-agent (author ≠ verifier)

Note: this feature shares one branch/PR with feature 38 (`housekeeping`) — both
were reviewed in a single pass; see cross-reference at the bottom.

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `await loadUnassigned();` added to `TrainingSavePopup`'s edit `onSubmit` in `src/pages/Trainings.jsx:286`, two new tests added |
| T2   | ✅ Done | Gate confirmed clean (see Gate Check below); recorded in commit `46810a7` |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | --------------------- | ------------------------ | ------ |
| TRUR-01.1: WHEN an unassigned training is edited to add a `teamId` THEN `Trainings.jsx` SHALL re-fetch the unassigned list (`loadUnassigned`) in the same `onSubmit` | `loadUnassigned()` called unconditionally alongside `filterTrainings()` in edit-mode `onSubmit` | `src/pages/Trainings.jsx:286` — `await loadUnassigned();` (added directly after `await filterTrainings(selectedTeam?.id ?? null);` at line 285) | ✅ PASS |
| TRUR-01.2: WHEN the re-fetch completes THEN the training SHALL no longer appear in the Unassigned section, and the count SHALL reflect the new total | Unassigned heading (which only renders `{unassignedTrainings.length > 0 && …}`, `src/pages/Trainings.jsx:168`) disappears once the last unassigned training is assigned | `src/pages/__tests__/Trainings.test.jsx:507` — `expect(screen.queryByRole("heading", { name: /^Unassigned/ })).not.toBeInTheDocument()` after editing the sole unassigned training to add a team | ✅ PASS |

**Status**: ✅ All ACs covered

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ------------ | ------- |
| 1 | `src/pages/Trainings.jsx:286` | Removed `await loadUnassigned();` from the edit `onSubmit` handler | ✅ Killed — `Trainings.test.jsx:507` failed (`Unassigned` heading still present after edit) |

Mutation run in the real working tree, reverted immediately with `git checkout -- src/pages/Trainings.jsx` after confirming the failure; `git status` confirmed a clean tree afterward.

**Sensor depth**: lightweight (feature-specific mutation; two more mutations for the co-located feature 38 are reported in that feature's validation.md, since both features share one gate/branch)
**Result**: 1/1 killed — PASS ✅

---

## Edge Cases

- [x] Already-assigned training edited (no `teamId` change, or a change from one team to another): `loadUnassigned()` still called unconditionally, no visible change to the Unassigned list — `src/pages/__tests__/Trainings.test.jsx:518` ("editing an already-assigned training still refreshes the unassigned list with no error") asserts the pre-existing unrelated unassigned training's heading (`Unassigned (1)`) is unchanged after editing a different, already-assigned training.
- [x] Editing a training's team back to unset: confirmed by spec as unreachable (the select never offers "no team"); not tested, consistent with the spec's own statement.

---

## Code Quality

| Principle        | Status |
| ----------------- | ------ |
| Minimum code (one added line: `await loadUnassigned();`) | ✅ |
| Surgical change, matches two sibling call sites (`assignTeam` at line 42, delete path) exactly | ✅ |
| No scope creep | ✅ |
| Only touched files required for task (`Trainings.jsx`, `Trainings.test.jsx`) | ✅ |
| Matches existing patterns/style | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (page/integration test covers the one AC + edge case) | ✅ |
| Every test maps to a spec requirement — no unclaimed tests | ✅ (both new tests reference TRUR-01 / the edge case explicitly in their names) |
| Documented guidelines followed | none — strong defaults applied, as stated in tasks.md's Test Coverage Matrix |

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: lint clean (0 errors/warnings), build succeeded (`vite build` in 1.84s), tests: **1464 passed, 0 failed** (69 test files)
- **Test count before feature (baseline, `main` via `git worktree add /tmp/scratch-baseline main` + `npm install` + `npm test`)**: **1458 passed**
- **Test count after feature (this branch, HEAD)**: **1464 passed**
- **Delta**: +6 (2 from feature 37's `Trainings.test.jsx`, 4 from feature 38's `App.test.jsx` — both features share this one gate run since they share a branch)
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

None — no gaps found.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status  |
| ----------- | ---------------- | ------------ |
| TRUR-01     | Implementing      | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 2/2 ACs matched spec outcome
**Sensor**: 1/1 mutation killed
**Gate**: 1464 passed, 0 failed (baseline was 1458 → delta +6 across both co-branched features)

**What works**: The one missing `loadUnassigned()` call was added exactly where the spec and sibling call sites indicated; both the happy-path AC and the "already-assigned" edge case are covered by non-shallow integration tests against the real page (no mocked `loadUnassigned`).

**Issues found**: none

**Next steps**: none — feature is ready to ship as part of this branch. See `.specs/features/38-housekeeping/validation.md` for the co-verified companion feature on the same branch.
