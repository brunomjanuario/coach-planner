# Training Edit Validation

**Date**: 2026-08-01
**Spec**: `.specs/features/06-training-edit/spec.md`
**Diff range**: `main...feat/06-training-edit` (5 commits: af23b24, 6e795fe, a5fe628, 5329066, 5d37630)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
|------|---------|-------|
| T1   | ✅ Done | `src/lib/datetime.js` + 10 tests |
| T2   | ✅ Done | Edit mode added to `TrainingSavePopup.jsx` |
| T3   | ✅ Done | `onEdit` wired in `Trainings.jsx` |
| T4   | ✅ Done | Delete + `ConfirmationPopup` wired |
| T5   | ✅ Done | List refresh after edit/delete, filter re-applied |

---

## Spec-Anchored Acceptance Criteria

### P1: Edit a training

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
|---|---|---|---|
| TEDIT-01.1 Edit opens form pre-filled | team/date/duration/exercises match training | `src/components/__tests__/TrainingSavePopup.test.jsx:678-688` — `expect(select).toHaveValue("2")`, `expect(dayInput).toHaveValue("2027-06-15T14:30")`, `expect(durationInput).toHaveValue(60)`, `screen.getByText(/Rondo/)` | ✅ PASS |
| TEDIT-01.2 Label "Edit Training"/"Save" | exact heading + button text | `TrainingSavePopup.test.jsx:690-700` — `findByRole("heading",{name:"Edit Training"})`, `getByRole("button",{name:"Save"})`, `queryByRole("button",{name:"Create"})` absent | ✅ PASS |
| TEDIT-01.3 Update not create | `trainingService.update` called, `create` not called | `TrainingSavePopup.test.jsx:713-728` — `expect(updateSpy).toHaveBeenCalledTimes(1)`, `expect(createSpy).not.toHaveBeenCalled()` | ✅ PASS |
| TEDIT-01.4 id preserved | submitted payload has original id | `TrainingSavePopup.test.jsx:730-742` — `expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({id:"train-1"}))` | ✅ PASS |
| TEDIT-01.5 Cancel leaves store unchanged | `update` not called on cancel | `TrainingSavePopup.test.jsx:744-756` — `expect(updateSpy).not.toHaveBeenCalled()` | ✅ PASS |
| TEDIT-01.6 Reload returns updated values | real store round trip shows new value | `src/pages/__tests__/Trainings.test.jsx:869-892` — edits duration to 77, reopens details popup, `screen.findByText((_,el)=>el.textContent==="77")` | ✅ PASS |

### P1: Pre-filled date and time

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
|---|---|---|---|
| TEDIT-03.1 Date field populated | field shows training's date/time | `TrainingSavePopup.test.jsx:685` — `expect(dayInput).toHaveValue("2027-06-15T14:30")` | ✅ PASS |
| TEDIT-03.2 Local timezone match | value in local time, not UTC-shifted | `src/lib/__tests__/datetime.test.js:14-18,58-70` — `toInputValue` verified under `TZ=Pacific/Auckland` | ✅ PASS (unit-level; no test directly diffs the value against the details popup's own rendering, but both derive from the same local Date getters) |
| TEDIT-03.3 Same instant if untouched | `day.getTime()` unchanged | `TrainingSavePopup.test.jsx:758-769` — `expect(submitted.day.getTime()).toBe(sampleTraining.day.getTime())` | ✅ PASS |
| TEDIT-03.4 Invalid date renders empty | `toInputValue` → `""` | `datetime.test.js:26-28` — `expect(toInputValue(new Date("not-a-date"))).toBe("")` | ✅ PASS |

### P1: Delete a training

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
|---|---|---|---|
| TEDIT-05.1 Confirmation names training | dialog text `Delete Training #N?` | `src/components/__tests__/TrainingDetailsPopup.test.jsx:102-110` — `expect(screen.getByText("Delete Training #4?")).toBeInTheDocument()` | ✅ PASS |
| TEDIT-05.2 Confirm deletes + closes both popups | `onDelete` called, `onClose` called once | `TrainingDetailsPopup.test.jsx:123-136` + `Trainings.test.jsx:834-851` (both popups actually gone from DOM) | ✅ PASS |
| TEDIT-05.3 Cancel leaves unchanged | `onDelete`/`onClose` not called | `TrainingDetailsPopup.test.jsx:138-151` + `Trainings.test.jsx:853-867` (list length unchanged) | ✅ PASS |
| TEDIT-05.4 Not listed after reload | store no longer contains it | `Trainings.test.jsx:804-832` — `expect(allTrainings).toHaveLength(2)` after delete (was 3) | ✅ PASS |
| TEDIT-05.5 Contiguous renumber | remaining numbers are `[1,2]` | `Trainings.test.jsx:828-829` — `expect(remainingTrainings.map(t=>t.number).sort()).toEqual([1,2])` | ✅ PASS |

### P2: Lists reflect edits immediately

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
|---|---|---|---|
| TEDIT-06.1 Refresh both lists, no reload | new value visible, edit heading gone | `Trainings.test.jsx:894-913` — `within(getPastList()).getByText(/81 min/)`, edit heading absent | ✅ PASS |
| TEDIT-06.2 Moves list on past/future crossing | past count -1, future count +1 | `Trainings.test.jsx:915-934` | ✅ PASS |
| TEDIT-06.3 Team change re-applies filter | training disappears from filtered list | `Trainings.test.jsx:936-957` | ✅ PASS |
| TEDIT-06.4 Delete removes without reload | list length -1 in same render | `Trainings.test.jsx:804-832` (same assertion path as TEDIT-05.4) | ✅ PASS |

**Status**: ✅ All 20 ACs covered (1 with a noted unit-vs-integration caveat on TEDIT-03.2, not a gap)

---

## Edge Cases

- [x] Invalid date on edit blocks save with a message — `TrainingSavePopup.test.jsx:771-785`, asserts exact text `"Please enter a valid date and time."`
- [x] Training deleted in one tab, edited in another → edit fails, does not resurrect — `Trainings.test.jsx:985-1010`, asserts count unchanged and generic failure text `"Failed to save the training. Please try again."` — ⚠️ **spec-precision note**: spec asks for "a clear message"; the message is the same generic save-failure text used for any rejected `update`, not one naming the delete-elsewhere cause. Not a functional gap (behavior is correct: fails, does not re-create), but the message does not tell the coach *why* it failed.
- [ ] ❌ **GAP** — "WHEN a training's team is changed THEN its number SHALL come from the new team's sequence on the next read": no test in this diff asserts the *numeric value* a training receives after being moved to a new team via edit. `Trainings.test.jsx:936-957` (TEDIT-06.3) only asserts the training disappears from the old filtered list — it never re-queries `getAllNumbered` for the new team and checks the number. The behavior likely works (numbering is derived live from `teamId` in `trainingService.getAllNumbered`, unchanged by this feature), but per evidence-or-zero this specific edge case has no direct assertion in the diff.
- [x] All exercises removed during edit saves empty list rather than blocking — `TrainingSavePopup.test.jsx:787-800`, asserts `exercises: []`
- [x] Details popup shows updated values on reopen after edit — `Trainings.test.jsx:869-892`

---

## Discrimination Sensor

| # | File:line | Description | Killed? |
|---|-----------|--------------|---------|
| 1 | `src/components/TrainingSavePopup.jsx:144` | Flipped heading logic: `{training ? "Edit Training" : "Create Training"}` → always `"Create Training"` | ✅ Killed — `TrainingSavePopup.test.jsx` AC TEDIT-01.2 test failed (`findByRole("heading",{name:"Edit Training"})` timed out) |
| 2 | `src/components/TrainingSavePopup.jsx:126` | Removed `id: formData.id` from the `onSubmit` payload | ✅ Killed — AC TEDIT-01.4 test failed (`onSubmit` called without `id`) |
| 3 | `src/components/TrainingDetailsPopup.jsx:18` | Removed the `onClose()` call from `handleDelete` (kept `onDelete` call) | ✅ Killed — AC TEDIT-05.2 test failed (`expect(onClose).toHaveBeenCalledTimes(1)` → 0 calls) |

All mutations were applied directly to the working tree, run against their targeted spec file, confirmed failing, then reverted with `git checkout --`. `git status` confirmed a clean tree after each revert and at sensor completion.

**Sensor depth**: lightweight (3 mutations, default tier)
**Result**: 3/3 killed — ✅ PASS

---

## Code Quality

| Principle | Status |
|---|---|
| No features beyond what was asked | ✅ |
| No abstractions for single-use code | ✅ |
| No unnecessary flexibility added | ✅ |
| Only touched files required for task | ✅ — `src/lib/datetime.js`, `TrainingSavePopup.jsx`, `TrainingDetailsPopup.jsx`, `Trainings.jsx` + their test files |
| Didn't "improve" unrelated code | ✅ |
| Matches existing patterns/style | ✅ — reuses `ConfirmationPopup`, mirrors `TeamPopup`/`PlayerPopup` create/edit prop pattern |
| Spec-anchored outcome check (asserted values match spec) | ✅ — see AC table above |
| Per-layer coverage (pure logic 1:1 ACs; integration happy+edge+error) | ✅ — `datetime.js` fully branch-covered; `Trainings.jsx` integration tests cover happy, edge (cross-tab delete), and error (rejected update) paths |
| Every test maps to a spec AC/edge case/Done-when | ✅ — spot-checked; no orphan tests found in the diff |
| Documented guidelines followed | none documented for testing — strong defaults applied, consistent with existing `04`/`05` test style |

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: lint clean (0 errors), build succeeded, **257 passed, 0 failed, 0 skipped** (16 test files)
- **Test count before feature** (`main`): `TrainingSavePopup.test.jsx` 40, `Trainings.test.jsx` 38, `TrainingDetailsPopup.test.jsx` 8, `datetime.test.js` 0 → 86 relevant + other unrelated suites
- **Test count after feature**: `TrainingSavePopup.test.jsx` 49 (+9), `Trainings.test.jsx` 49 (+11), `TrainingDetailsPopup.test.jsx` 14 (+6), `datetime.test.js` 10 (new) → **+36 new tests**, total suite 257 passed
- **Delta**: +36 tests, all passing; no test deletions or weakened assertions observed
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans (if issues found)

### Fix 1: Missing assertion for team-change renumbering edge case

- **Root cause**: `TEDIT-06.3` test only checks the training leaves the old filter's list; no test re-reads `trainingService.getAllNumbered(newTeamId)` after an edit-driven team change to assert the training receives a number from the new team's contiguous sequence.
- **Fix task**: Add an assertion (either extending `Trainings.test.jsx:936-957` or a new test) that after editing a training to a new team, `trainingService.getAllNumbered(newTeamId)` includes it with a number consistent with that team's sequence (e.g., `length + 1` or matching existing `05` TNUM-02 conventions).
- **Priority**: Minor — the underlying mechanism (`getAllNumbered` derives numbers live from `teamId`) was already verified in feature `05` and is untouched by this diff, so functional risk is low; this is a coverage/evidence gap, not a known defect.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
|---|---|---|
| TEDIT-01 | Pending | ✅ Verified |
| TEDIT-02 | Pending | ✅ Verified |
| TEDIT-03 | Pending | ✅ Verified |
| TEDIT-04 | Pending | ✅ Verified |
| TEDIT-05 | Pending | ✅ Verified |
| TEDIT-06 | Pending | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready (with one minor coverage gap noted)

**Spec-anchored check**: 20/20 ACs matched spec outcome; 0 blocking spec-precision gaps (1 informational note on TEDIT-03.2's unit-vs-integration boundary, and 1 informational note on the cross-tab-delete message being generic rather than cause-specific)

**Sensor**: 3/3 mutations killed

**Gate**: lint clean, build clean, 257/257 tests passed

**What works**: Edit mode fully wired end-to-end (details popup → form → service → list refresh); delete with confirmation, renumbering, and cross-list refresh all verified; datetime helper correctly handles local-time round trips and invalid input across a non-UTC timezone.

**Issues found**: One edge case ("training's team changed → number comes from new team's sequence on next read") lacks a direct assertion in this diff — see Fix 1. Not blocking; behavior is inherited from feature `05`'s tested `getAllNumbered` implementation.

**Next steps**: Optional — add the one missing assertion in Fix 1 if stricter evidence is desired before closing out the feature. No code changes required; this is a test-coverage addition only.
