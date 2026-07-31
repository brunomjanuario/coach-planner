# Training Form Validation

**Date**: 2026-07-31
**Spec**: `.specs/features/04-training-form/spec.md`
**Diff range**: `main...feat/04-training-form` (7 commits, 5e2afa6..cf2eb1c — includes fix commit `cf2eb1c`)
**Verifier**: independent sub-agent (author ≠ verifier)
**Re-verification**: fix→re-verify iteration 1 of 3 — closes the single test-coverage gap (TFORM-06.3 boundary) found in the first pass

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `ExerciseFields.jsx` created with 4-field editor + validation |
| T2   | ✅ Done | `TrainingSavePopup.jsx` wired to `ExerciseFields`, exercises carry full shape |
| T3   | ✅ Done | Round-trip integration tests added to `Trainings.test.jsx` |
| T4   | ✅ Done | Edit-in-place via `exercise` prop + `editingExerciseId` state |
| T5   | ✅ Done | Move up/down controls with disabled boundary states |
| T6   | ✅ Done | `trainingDuration.js` helper; consumed by both popups |

---

## Spec-Anchored Acceptance Criteria

### P1: Full exercise fields

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
|---|---|---|---|
| TFORM-01.1 WHEN editor opened THEN inputs for description, duration, players, repetitions | All 4 labeled inputs present | `src/components/__tests__/ExerciseFields.test.jsx:18-25` — `expect(screen.getByLabelText(/description\|duration\|number of players\|repetitions/i)).toBeInTheDocument()` (×4) | ✅ PASS |
| TFORM-01.2 WHEN exercise added with all fields THEN store all four values | Exact values `{description:"SSG", duration:20, numberOfPlayers:8, repetitions:3, image:""}` | `ExerciseFields.test.jsx:27-49` — `expect(exercise).toMatchObject({...})` | ✅ PASS |
| TFORM-01.3 WHEN added with only description+duration THEN `null` for omitted numeric fields | `numberOfPlayers: null, repetitions: null` | `ExerciseFields.test.jsx:51-62` — `expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({numberOfPlayers: null, repetitions: null}))` | ✅ PASS |
| TFORM-02.4 WHEN training saved and reloaded THEN every exercise field unchanged | `matchObject` of all 4 fields after reload via `trainingService.getAll()` | `TrainingSavePopup.test.jsx:304-329` and `Trainings.test.jsx:492-551` — `expect(found.exercises[0]).toMatchObject({...})` | ✅ PASS |
| TFORM-02.5 WHEN exercise created THEN id via `newId()`, never `Date.now()` | id is a non-empty string; two exercises added in the same tick have distinct ids | `ExerciseFields.test.jsx:47-48` — `expect(typeof exercise.id).toBe("string")`; `Trainings.test.jsx:580-603` — `expect(exA.id).not.toBe(exB.id)` | ✅ PASS |

### P1: Field validation

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
|---|---|---|---|
| TFORM-03.1 WHEN duration is zero/negative/non-numeric THEN block + field message | `onAdd` not called; message "Duration must be a positive number." shown | `ExerciseFields.test.jsx:64-108` — `expect(onAdd).not.toHaveBeenCalled()`, `expect(await screen.findByText(/duration must be a positive number/i))` (3 cases: 0, -5, "abc") | ✅ PASS |
| TFORM-03.2 WHEN players < 1 THEN block + message | message "Number of players must be at least 1." | `ExerciseFields.test.jsx:110-123` | ✅ PASS |
| TFORM-03.3 WHEN repetitions < 1 THEN block + message | message "Repetitions must be at least 1." | `ExerciseFields.test.jsx:125-138` | ✅ PASS |
| TFORM-03.4 WHEN description empty/whitespace THEN block | message "Description is required." | `ExerciseFields.test.jsx:140-151` | ✅ PASS |
| TFORM-03.5 WHEN blocked field corrected THEN clear only that field's message | duration message clears, players message persists | `ExerciseFields.test.jsx:153-180` | ✅ PASS |

### P2: Edit and reorder exercises

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
|---|---|---|---|
| TFORM-04.1 WHEN edit control used THEN values load into editor | Inputs show `SSG/20/8/3`, button reads "Save" | `TrainingSavePopup.test.jsx:346-360` | ✅ PASS |
| TFORM-04.2 WHEN edited exercise saved THEN update in place, keep position + id | List still length 2, item[0] text "First"/"15min", item[1] "Second" | `TrainingSavePopup.test.jsx:362-382` | ✅ PASS |
| TFORM-05.3 WHEN move-up used THEN swap with the one above | Order `First, Third, Second` after moving index 2 up | `TrainingSavePopup.test.jsx:442-456` | ✅ PASS |
| TFORM-05.4 WHEN move-up used on first THEN disable, no wrap | `expect(moveUpFirst).toBeDisabled()`; order unchanged after click | `TrainingSavePopup.test.jsx:474-489` | ✅ PASS |
| TFORM-05.5 WHEN move-down used on last THEN disable | `expect(moveDownLast).toBeDisabled()`; order unchanged | `TrainingSavePopup.test.jsx:491-506` | ✅ PASS |

### P2: Session fit indicator

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
|---|---|---|---|
| TFORM-06.1 WHEN exercises present THEN display sum of duration×repetitions | "Planned time 40min" for 20×2 | `TrainingSavePopup.test.jsx:562-571`; unit coverage `src/lib/__tests__/trainingDuration.test.js:1-51` | ✅ PASS |
| TFORM-06.2 WHEN total exceeds session duration THEN warn naming overage in minutes | "exceeds the session by 40 minutes" for 60min session / 100min planned | `TrainingSavePopup.test.jsx:579-590` | ✅ PASS |
| TFORM-06.3 WHEN total is within session duration THEN show remaining minutes | "40 minutes remaining" for 60min session / 20min planned; "0 minutes remaining" at the exact-equal boundary (60min session / 60min planned) | `TrainingSavePopup.test.jsx:592-601` and `TrainingSavePopup.test.jsx:603-613` ("treats an exact match between planned time and session duration as within (0 minutes remaining), not exceeding (AC TFORM-06.3 boundary)") | ✅ PASS |
| TFORM-06.4 WHEN exercise added/edited/removed THEN recompute total immediately | "Planned time 20min" → "30min" (edit) → total row absent (remove) | `TrainingSavePopup.test.jsx:603-621` | ✅ PASS |
| TFORM-06.5 WHEN total exceeds session duration THEN still allow saving | `onSubmit` called once despite 30min overage | `TrainingSavePopup.test.jsx:623-638` | ✅ PASS |

### P2: Full detail view

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
|---|---|---|---|
| TFORM-07.1 WHEN training opened THEN render duration/players/reps alongside description | li contains "20min", "8 players", "x3" | `TrainingDetailsPopup.test.jsx:11-25` | ✅ PASS |
| TFORM-07.2 WHEN field is `null` THEN render "—" | li contains "— players", "x—" | `TrainingDetailsPopup.test.jsx:27-40` | ✅ PASS |
| TFORM-07.3 WHEN no exercises THEN existing "No exercises" message | `screen.getByText("No exercises")` | `TrainingDetailsPopup.test.jsx:42-48` | ✅ PASS |
| TFORM-07.4 WHEN training opened THEN display total planned time | "Total planned time: 50min" for 10×1 + 20×2 | `TrainingDetailsPopup.test.jsx:50-62` | ✅ PASS |

**Status**: ✅ 21/21 ACs matched spec outcome precisely (TFORM-06.3 boundary gap closed by `cf2eb1c` — see Discrimination Sensor)

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `src/lib/trainingDuration.js:6` | `ex.repetitions ?? 1` → `ex.repetitions ?? 0` | ✅ Killed — 3 tests in `trainingDuration.test.js` failed |
| 2 | `src/components/TrainingSavePopup.jsx:240` | `overage > 0` → `overage >= 0` | ✅ Killed (re-verified) — new boundary test "treats an exact match between planned time and session duration as within (0 minutes remaining), not exceeding (AC TFORM-06.3 boundary)" (`TrainingSavePopup.test.jsx:603-613`, added in `cf2eb1c`) now fails under this mutation: 1 failed / 39 passed in `TrainingSavePopup.test.jsx` |
| 3 | `src/components/ExerciseFields.jsx:19` | `duration <= 0` → `duration < 0` | ✅ Killed — 2 tests in `ExerciseFields.test.jsx` failed (duration `"0"` case) |

**Sensor depth**: lightweight (default tier)
**Result**: 3/3 killed — ✅ PASS

Mutation #2, which survived the first verification pass, is now killed. The fix added a test pinning the exact-equality boundary (`totalPlannedMinutes(exercises) === sessionDuration`, 60min session / 60min planned via one 60-minute exercise): it asserts "0 minutes remaining" renders and "exceeds the session" does not. Re-applying `overage > 0` → `overage >= 0` and running `npx vitest run src/components/__tests__/TrainingSavePopup.test.jsx` now produces exactly 1 failure (the new test) with the other 39 tests still passing, confirming the mutant is caught. The mutation was then reverted with `git checkout -- src/components/TrainingSavePopup.jsx`.

All mutations were applied one at a time directly to the working files, the single most relevant test file was run, and each file was reverted with `git checkout --` immediately after. `git status` confirms a clean tree after the sensor pass (see Gate Check below).

---

## Code Quality

| Principle        | Status | Notes |
| ---------------- | ------ | ----- |
| Minimum code     | ✅ | `ExerciseFields.jsx` is a single-purpose editor; `trainingDuration.js` is a 9-line pure helper |
| Surgical changes | ✅ | Only the 4 in-scope implementation files touched, plus their test files |
| No scope creep   | ✅ | No image-upload, DnD, exercise-library, or edit-mode code added (correctly out of scope) |
| Matches patterns | ✅ | Reuses `w-full border px-3 py-2 rounded` input classes, `newId()` from AD-003, `*Popup` naming for the two modals; `ExerciseFields` is a plain component, not a popup — correct since it's not full-screen |
| Spec-anchored outcome check (asserted values match spec) | ✅ | All matched assertions target the literal spec-defined text/values (exact minute counts, exact messages) rather than "toBeInTheDocument" alone |
| Per-layer Coverage Expectation met (domain 1:1 ACs; component happy+edge+error) | ✅ | `trainingDuration.js` unit tests are 1:1 with ACs; component layer now covers the exact-equality boundary as well |
| Every test maps to a spec requirement — no unclaimed tests | ✅ | Every added test title cites an AC id or "(edge case)" |
| Documented guidelines followed | ✅ none beyond `CLAUDE.md` conventions — strong defaults applied |

One minor stylistic note (not a defect): the fit-indicator block in `TrainingSavePopup.jsx:235-249` uses an inline IIFE inside JSX to compute `total`/`overage`. It works and is scoped to a single render, but a plain variable declared before the `return` would read more plainly in this codebase's style. Not blocking.

---

## Edge Cases

- [x] 20+ exercises scroll within the popup rather than push action buttons off-screen — `TrainingSavePopup.test.jsx:331-344`
- [x] Editor holds unsaved values, popup cancelled → discarded without prompting — `TrainingSavePopup.test.jsx:640-654`
- [x] Exercise edit cancelled → original values restored, list unchanged — `TrainingSavePopup.test.jsx:398-414`
- [x] Sparse and fully-populated exercise render without layout shift — `TrainingDetailsPopup.test.jsx:72-86` (asserts identical `className` between the two `li`s, which is the mechanism used to prevent shift)
- [ ] Exercise description exceeding a sensible length wraps rather than overflows — **implemented** (`break-words` class present at `TrainingSavePopup.jsx:193` and `TrainingDetailsPopup.jsx:35`) but **not directly tested**: no test types a long description and asserts a `break-words` class or absence of overflow. Evidence-or-zero → NOT covered.

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: lint clean (0 errors), build succeeded (`dist/` produced), 192 passed, 0 failed, 0 skipped
- **Test count before feature** (main, verified via disposable `git worktree`): 138 (11 files)
- **Test count after feature + fix** (feat/04-training-form, incl. `cf2eb1c`): 192 (14 files)
- **Delta**: +54 new tests (+3 new test files: `ExerciseFields.test.jsx`, `trainingDuration.test.js`, plus `TrainingDetailsPopup.test.jsx` was already new in prior branch history — confirmed net new for this feature via the 6-commit diff; +1 additional test from the fix commit `cf2eb1c`)
- **Skipped tests**: none
- **Failures**: none

Post-sensor working tree verified clean (re-verification pass): `git status --short` → only `.specs/features/04-training-form/spec.md` (modified) and `.specs/features/04-training-form/validation.md` (untracked); `src/components/TrainingSavePopup.jsx` clean after mutation revert.

---

## Fix Plans

### Fix 1: Strengthen the session-fit boundary test (TFORM-06.3) — ✅ Applied (`cf2eb1c`)

- **Root cause**: `TrainingSavePopup.test.jsx` tests the "exceeds" case (planned > session) and a comfortably-under case (planned < session), but never the exact-equality case (planned === session). The discrimination sensor showed `overage > 0` can be mutated to `overage >= 0` without any test failing.
- **Fix applied**: Added a test to `src/components/__tests__/TrainingSavePopup.test.jsx:603-613` ("treats an exact match between planned time and session duration as within (0 minutes remaining), not exceeding (AC TFORM-06.3 boundary)") that sets session duration to `60` and adds one exercise totalling exactly `60` planned minutes, then asserts the "remaining" branch renders (`/0 minutes remaining/`) and the "exceeds" text does NOT render. Commit `cf2eb1c`.
- **Re-verification**: Sensor mutation #2 re-applied and re-run — now kills the mutant (1 failed / 39 passed). Mutation reverted; working tree confirmed clean.
- **Priority**: Minor (implementation was already spec-correct; this closed a latent regression risk in the test suite, not a shipped defect).

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| TFORM-01    | Pending | ✅ Verified |
| TFORM-02    | Pending | ✅ Verified |
| TFORM-03    | Pending | ✅ Verified |
| TFORM-04    | Pending | ✅ Verified |
| TFORM-05    | Pending | ✅ Verified |
| TFORM-06    | Pending | ✅ Verified (Fix 1 applied in `cf2eb1c`, boundary test now kills sensor mutation #2) |
| TFORM-07    | Pending | ✅ Verified |

---

## Summary

**Overall**: ✅ PASS (fix→re-verify iteration 1: prior surviving mutant now killed; implementation was already spec-correct)

**Spec-anchored check**: 21/21 ACs matched spec outcome precisely
**Sensor**: 3/3 mutations killed
**Gate**: 192 passed, 0 failed, lint clean, build clean

**What works**: All four exercise fields captured with `newId()` ids and `null`-safe optional numerics; per-field validation blocks invalid duration/players/repetitions/description and clears messages field-by-field on correction; edit-in-place preserves id and position; move up/down reorders with correct boundary-disabling; the fit indicator sums `duration × repetitions` (treating `null` reps as 1) and recomputes on every mutation, with the exact-equality boundary now explicitly pinned by a dedicated test; `TrainingDetailsPopup` renders every field with `"—"` for nulls and shows the total. Full 192-test gate (lint + build + test) is green, and the round trip through the real store (`trainingService`) is proven end to end in `Trainings.test.jsx`.

**Issues found**: None outstanding. (Previously: the `>` vs `>=` boundary in the fit-indicator's overage check had no test pinning the exact-equality case — closed by Fix 1 / commit `cf2eb1c`.) The "long description wraps" edge case remains implemented (`break-words` class) but not directly asserted by any test — noted as a non-blocking observation, not a discrimination-sensor finding.

**Next steps**: None required to ship. Optionally add a `break-words`-class assertion for the wrap edge case in a future pass.
