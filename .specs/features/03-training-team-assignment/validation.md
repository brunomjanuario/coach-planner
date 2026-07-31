# Training Team Assignment Validation

**Date**: 2026-07-31
**Spec**: `.specs/features/03-training-team-assignment/spec.md`
**Diff range**: `main..feature/03/training-team-assignment` (c8a0711, 72660ef, b77e7cd, d76e527, dcc44fb, d0a3bcd)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | Team `<select>` added, populated via `teamService.getAll()` |
| T2   | ✅ Done | Pre-selection guarded by existence check; `teamId \|\| null` fallback removed |
| T3   | ✅ Done | Submit-time validation + shadowed-callback fix confirmed |
| T4   | ✅ Done | Refresh + report wired through the real `onSubmit` prop |
| T5   | ✅ Done | `getUnassigned()` + Unassigned bucket UI present |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
|---|---|---|---|
| TTA-01.1: form opens → team `<select>` lists every team as `club` + `name` | Options rendered as `"{club} {name}"` | `src/components/__tests__/TrainingSavePopup.test.jsx:33-45` — `within(select).getByRole("option", { name: "Amadora Sub-11" })` | ✅ PASS |
| TTA-01 edge: teams still loading → select disabled | `disabled` attribute true while loading | `TrainingSavePopup.test.jsx:47-53` — `expect(screen.getByRole("combobox")).toBeDisabled()` | ✅ PASS |
| TTA-01 edge: zero teams → select disabled + message to `/teams` | disabled + "No teams yet" message | `TrainingSavePopup.test.jsx:55-62` — `findByText(/No teams yet/)` + `toBeDisabled()` | ✅ PASS |
| TTA-02.1: team selected in filter → form pre-selects it | select value = matched team id | `TrainingSavePopup.test.jsx:83-90` — `renderPopup({ teamId: 2 })` → `toHaveValue("2")` | ✅ PASS |
| TTA-02.2: no team selected (`teamId` undefined) → select stays empty, not first team | select value = `""` | `TrainingSavePopup.test.jsx:92-98, 110-118` — `toHaveValue("")`, explicit `not.toHaveValue("1")` | ✅ PASS |
| TTA-02 edge: `teamId` matches no loaded team → empty, not blank-selected | select value = `""` | `TrainingSavePopup.test.jsx:101-108` — `renderPopup({ teamId: 999 })` → `toHaveValue("")` | ⚠️ Sensor gap — see Discrimination Sensor mutation 4; the guard in the code (`data.some(...)`) is not what makes this pass — the empty result is a side effect of no matching `<option>` existing. Test still asserts the correct spec-defined outcome, but does not discriminate the guard's presence. |
| TTA-03.1: submit with no team chosen → blocked + validation message | message "Please select a team." shown, no persistence call | `TrainingSavePopup.test.jsx:127-143` — `findByText("Please select a team.")`, `expect(onSubmit).not.toHaveBeenCalled()`, `expect(createSpy).not.toHaveBeenCalled()` | ✅ PASS |
| T3 done-when: choosing a team clears the message | message removed after selecting | `TrainingSavePopup.test.jsx:145-157` — `queryByText(...)).not.toBeInTheDocument()` | ✅ PASS |
| TTA-03.2: submit with a team chosen → persists with correct `teamId` | `onSubmit` called with `teamId: 2` (matching selection) | `TrainingSavePopup.test.jsx:159-173` — `expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ teamId: 2 }))` | ✅ PASS |
| T3 done-when: shadowed `onSubmit` removed, prop invoked, not `trainingService.create` directly | `onSubmit` called once, `trainingService.create` never called from the popup | `TrainingSavePopup.test.jsx:175-189` | ✅ PASS |
| Edge case: team deleted while form open → clear failure, no dangling write | Message "Selected team no longer exists..." shown, `onSubmit` not called | `TrainingSavePopup.test.jsx:191-210` — `getAll` mocked to return a team list without the selected team on the second call | ✅ PASS |
| TTA-04.1: training created → both lists refresh without reload | New training visible without `window.location.reload` | `src/pages/__tests__/Trainings.test.jsx:128-145` (future) and `:147-166` (past) | ✅ PASS |
| TTA-04.2: training created for active filter's team → appears in filtered list | Item count = 1 in the filtered list | `Trainings.test.jsx:168-192` | ✅ PASS |
| TTA-04.3: training created for a different team than active filter → filter kept, message names target team | Filter stays on Areias, message contains "Training created for Amadora Sub-11" | `Trainings.test.jsx:310-335` — `findByText(/Training created for Amadora Sub-11/)` + `aria-current` still on Areias row + future list still empty for the active filter | ✅ PASS |
| TTA-04.4: future-dated training → appears under Next Trainings | Item present in future list | `Trainings.test.jsx:128-145, 284-300` | ✅ PASS |
| TTA-05.1: null or dangling `teamId` → Unassigned bucket shown | Bucket renders with the training visible | `Trainings.test.jsx:367-379` (null) and `:381-393` (dangling `"no-such-team"`) + service-level `trainingService.test.js:125-149` | ✅ PASS |
| TTA-05.2: no such trainings → bucket not rendered at all | `queryByText("Unassigned")` absent | `Trainings.test.jsx:360-365` — `expect(screen.queryByText("Unassigned")).not.toBeInTheDocument()`; service-level `trainingService.test.js:165-175` — `expect(unassigned).toEqual([])` | ✅ PASS |
| TTA-05.3: unassigned training assigned to a team → persisted, removed from bucket | Bucket empty after assignment; also verified newly-filtered list shows it | `Trainings.test.jsx:415-435` (bucket removal) and `:437-461` (appears in the active filter's future list) | ✅ PASS |
| Edge: no teams exist at all → create button disabled + message to `/teams` | — | No `file:line` found. The "Create" trigger button (`IconPlus` button in `Trainings.jsx:101-109`) is never disabled based on `teams.length === 0`; only the popup's internal `<select>` is disabled once opened. No test asserts the outer button's disabled state when there are zero teams. | ❌ GAP — not covered (see Gaps below) |

**Status**: ❌ Gaps present (1 uncovered edge case) — ⚠️ 1 sensor-adequacy caveat flagged (see Discrimination Sensor)

---

## Discrimination Sensor

All mutations were injected into the real tree, verified, then reverted via `git checkout --`; `git status` confirmed clean after each and at the end.

| # | File:line | Description | Killed? |
|---|---|---|---|
| 1 | `src/components/TrainingSavePopup.jsx:77-81` | Removed the submit-time re-validation against fresh teams (`currentTeams.some(...)` dangling-team check) | ✅ Killed — `TrainingSavePopup.test.jsx` "blocks submission with a clear message when the selected team no longer exists" fails (`findByText` times out) |
| 2 | `src/pages/Trainings.jsx:120` | Flipped `created.teamId !== selectedTeam.id` → `created.teamId === selectedTeam.id` | ✅ Killed — 2 tests in `Trainings.test.jsx` fail (the "keeps the filter and names the target team" test and the "clears a previous different-team message" test) |
| 3 | `src/services/trainingService.js:18-24` | Reduced `getUnassigned()` to only check `teamId == null`, dropping the dangling-reference (`!teamIds.has(...)`) branch | ✅ Killed — 2 tests fail: `trainingService.test.js` "matches no existing team (dangling-reference edge case)" and `Trainings.test.jsx` "dangling teamId in the Unassigned bucket" |
| 4 | `src/components/TrainingSavePopup.jsx:22` | Removed the `data.some((team) => team.id === teamId)` existence guard in the pre-select effect, pre-selecting any non-null `teamId` unconditionally | ❌ **Survived** — all 15 `TrainingSavePopup.test.jsx` tests still pass. Root cause: the relevant test only asserts the rendered `<select>` DOM value (`toHaveValue("")`), and a `<select>` whose controlled `value` prop doesn't match any rendered `<option>` naturally resolves to the first (empty) option in jsdom/the browser — masking the missing guard. The test's assertion matches the spec-defined outcome (empty select) but does not discriminate *why* it's empty, so it cannot distinguish "guarded correctly" from "unguarded but incidentally empty because no matching option exists." |

**Sensor depth**: lightweight (4 manual mutations)
**Result**: 3/4 killed, 1 survived → ❌ Sensor FAIL (survived mutant found)

---

## Race Condition Investigation — `handleSubmit`'s unawaited `onSubmit`

**The claim under test**: In `TrainingSavePopup.jsx:84-93`, `onSubmit(...)` is called without `await`, followed immediately by `onClose()`. The implementer's stated reasoning: since `trainingService.create`/`teamService.getAll` are `async` functions with no internal `await`, the synchronous portion of the parent's `onSubmit` (which calls `trainingService.create`) fully executes before JS yields control back to `handleSubmit`'s continuation, so `onClose()` never races the actual persistence write.

**Empirical verification**: A standalone Node probe (mirroring the exact call shape — an async function with zero internal `await` calls, invoked-but-not-awaited from a caller that proceeds to a next statement) confirms:

```
handleSubmit:before-onSubmit-call
onSubmit:before-await
create:sync-mutation          <- the actual array push + storage.write, synchronous
handleSubmit:onClose() called here
onSubmit:after-await (filterTrainings/setCreateMessage would run here)
```

The synchronous mutation genuinely completes before `onClose()` fires. This part of the reasoning **holds** — calling an async function with no internal `await` runs its entire body synchronously up to the implicit return; only the `await` on its already-resolved promise yields control, and that yield point is reached in the *caller* (`onSubmit`), not before the write happens.

**Where the reasoning does NOT hold / genuine risk found**:

1. **No error handling.** `onSubmit(...)` is fired without `await` and without `.catch()`. If the parent's `onSubmit` throws or its promise rejects for any reason — e.g. `trainingService.create` → `store.js` → `storage.js` `write()` throwing `StorageQuotaError` (a real, tested exception type in this codebase, `src/lib/storage.js:3-9`) — the rejection is unhandled, and `onClose()` has already fired regardless, closing the popup as though the save succeeded. The user gets no failure feedback for this class of error, which is exactly the "silent, invisible failure" class of bug this feature was built to eliminate for the *no-team-selected* case, but reintroduced here for *storage-layer* failures. No test in `TrainingSavePopup.test.jsx` exercises a rejecting/throwing `onSubmit` — every mocked `onSubmit` in the test suite is a plain non-throwing `vi.fn()` (confirmed via `grep`), so this gap is untested as well as unhandled.

2. **The correctness depends on an implementation detail that is documented elsewhere as temporary.** `CLAUDE.md` states the service layer is `async` specifically "so a real API can be dropped in later," and further notes that `teamService.getById` and `trainingService.getById/update/delete` *already* perform real `fetch` calls (to a currently-nonexistent endpoint). If `trainingService.create` or `teamService.getAll` ever gain a real network `await` — a change the codebase's own stated design intent anticipates — the synchronous-completion assumption silently breaks: `onClose()` would then fire before the write/read actually resolves, and the created training could be invisible after the popup closes exactly as in the original bug this feature fixes. There is no test, comment, or type-level guard pinning this ordering assumption to the current mock implementation, so a future change to make persistence genuinely async would regress this silently (no test would fail — the popup would just start closing before writes land).

**Conclusion**: Not a live data-integrity bug today (the mock store's writes are synchronous), but it is a **genuine, unguarded, latent race** — both in error-swallowing (present-day risk, real exception type exists and is untested here) and in fragility to the exact refactor CLAUDE.md documents as anticipated. Recommend: `await onSubmit(...)` before `onClose()`, and either wrap in try/catch to surface `onSubmit` failures as a form error, or accept the risk with an explicit code comment documenting the synchronous-mock assumption so a future async backend change doesn't reintroduce this silently.

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Lint**: 0 errors
- **Build**: succeeded (`dist/` produced, 5956 modules transformed)
- **Test result**: 135 passed, 0 failed, 0 skipped (11 test files)
- **Test count before feature** (measured on `main` @ `7513e6f` via a temporary `git worktree`, removed after use): 106 tests (10 files)
- **Test count after feature**: 135 tests (11 files)
- **Delta**: +29 new tests (matches the sum of T1–T5's stated new-test counts: 6+4+5 component tests across T1-T3 net to 15 total in `TrainingSavePopup.test.jsx` which didn't exist on `main`, +9 integration tests in `Trainings.test.jsx`, +5 unit tests in `trainingService.test.js`)
- **Skipped tests**: none

---

## Code Quality

| Principle | Status |
|---|---|
| Minimum code | ✅ — changes confined to the 3 files the tasks named plus their test files |
| Surgical changes | ✅ |
| No scope creep | ✅ — no edits to `04-training-form`/`06-training-edit` territory (exercise editing, edit mode) |
| Matches patterns | ✅ — `*Popup` convention, Tailwind utility classes, page-owns-fetch pattern all preserved |
| Spec-anchored outcome check | ⚠️ — 1 spec-precision/sensor caveat (mutation 4), 1 uncovered edge case (no-teams-exist create-button disable) |
| Per-layer Coverage Expectation met | ⚠️ — domain logic (`trainingService`) has solid 1:1 AC mapping; page/component layers cover happy + most edges, but the "no teams exist → disable create trigger" edge case (spec.md line 105) is not implemented at the outer button and not tested |
| Every test maps to a spec AC/edge/Done-when | ✅ — spot-checked; no unclaimed tests found |
| Documented guidelines followed | none — strong defaults applied (no testing standards documented per tasks.md's Test Coverage Matrix header) |

---

## Edge Cases (from spec.md)

- [x] Selected team deleted while form open → clear failure, not a dangling write (`TrainingSavePopup.test.jsx:191-210`)
- [x] Training references a `teamId` that no longer exists → falls into Unassigned, not disappeared (`trainingService.test.js:138-149`, `Trainings.test.jsx:381-393`)
- [x] Team list still loading → select renders disabled, not empty-and-submittable (`TrainingSavePopup.test.jsx:47-53`)
- [ ] **No teams exist at all → create button disabled with a message pointing at `/teams`** — NOT handled. `Trainings.jsx:101-109`'s `IconPlus` trigger button has no `disabled` binding to `teams.length === 0`, and no test asserts this. The popup itself does render "No teams yet" once opened (T1's done-when), but the spec's edge case is explicitly about the *outer* create trigger, not the in-form message — these are different requirements and only the in-form one is implemented.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
|---|---|---|
| TTA-01 | Implemented | ✅ Verified |
| TTA-02 | Implemented | ✅ Verified (with sensor-adequacy caveat on the no-match sub-case) |
| TTA-03 | Implemented | ✅ Verified |
| TTA-04 | Implemented | ✅ Verified |
| TTA-05 | Implemented | ✅ Verified |

---

## Fix Plans

### Fix 1: "No teams exist" — outer create button not disabled

- **Root cause**: `Trainings.jsx`'s `IconPlus` trigger button (`Trainings.jsx:101-109`) has no `disabled` condition; only the popup's internal `<select>` (rendered after the popup opens) reflects the zero-teams state. Spec.md's edge case ("the create button SHALL be disabled with a message pointing at `/teams`") targets the trigger itself, so a coach with zero teams can still open the popup (which then blocks them one step later via the disabled select + "No teams yet" text) rather than being stopped at the entry point with a `/teams` link.
- **Fix task**: Disable the outer create button when `teams.length === 0`, and render an inline message with a link to `/teams` next to it (mirroring the existing "No teams yet." empty-state text already used for the team-filter column at `Trainings.jsx:168`).
- **Priority**: Minor (the popup-level message still prevents the actual bug — a null-teamId save — but the coach experience described in the spec's edge case is not fully met).

### Fix 2: Discrimination sensor survivor — pre-select guard untested

- **Root cause**: `TrainingSavePopup.test.jsx:101-108` ("leaves the select empty when the teamId prop matches no loaded team") asserts only the rendered `<select>` value, which resolves to `""` regardless of whether the `data.some((team) => team.id === teamId)` guard in `TrainingSavePopup.jsx:22` is present, because no `<option>` exists for the unmatched id.
- **Fix task**: Strengthen the assertion to distinguish "guarded" from "incidentally empty" — e.g., spy on `setFormData` (or expose the guard's effect via a different observable, such as asserting `formData` state through a test-only render prop, or checking that submitting immediately without touching the select still fails validation with "Please select a team." even though a non-matching `teamId` prop was passed). The latter is the cleanest: add an assertion that submitting the form with an unmatched `teamId` prop (999) and a filled-in date still shows the "Please select a team." error — this would fail today if the guard were removed but the option list is empty (since `formData.teamId` would be `999`, which passes the `!formData.teamId` check, causing the fresh-teams check to fire and produce the *different* "Selected team no longer exists" message instead of blocking cleanly at all — worth asserting explicitly either way).
- **Priority**: Minor (the guard's code is correct today; only the test's discriminating power is weak).

### Fix 3: Unawaited `onSubmit` in `handleSubmit` — latent race / silent failure risk

- **Root cause**: `TrainingSavePopup.jsx:84-93` calls the parent's `onSubmit` without `await` or error handling, then unconditionally calls `onClose()`. Correctness today rests entirely on `trainingService.create`/`teamService.getAll` having no internal `await` — true for the current mock store but explicitly anticipated to change per `CLAUDE.md`.
- **Fix task**: `await onSubmit(...)` before calling `onClose()`, wrapped in try/catch to surface persistence failures (e.g. `StorageQuotaError`) as a form-level error message instead of silently closing the popup.
- **Priority**: Minor/Major depending on risk tolerance — no live bug today, but unguarded against a documented near-future refactor, and it silently swallows a real, already-implemented exception type (`StorageQuotaError`).

---

## Summary

**Overall**: ⚠️ Issues (not a full FAIL — all 5 ACs' primary behaviors are correctly implemented and gate-clean, but 1 uncovered spec edge case, 1 surviving mutant, and 1 latent race condition were found)

**Spec-anchored check**: 17/18 criteria+edges matched spec outcome with solid evidence; 1 edge case (no-teams-exist → disable outer create button) has no evidence at all (NOT covered)
**Sensor**: 3/4 mutations killed, 1 survived
**Gate**: 135 passed, 0 failed (lint clean, build clean)

**What works**: Team select control, population, pre-selection, submit-time validation (including the stale-team and dangling-teamId edge cases), list refresh + cross-team messaging, and the Unassigned bucket with reassignment are all implemented and covered by targeted, spec-anchored tests. The shadowed-`onSubmit` bug this feature exists to fix is genuinely fixed and tested.

**Issues found**:
1. Outer create-trigger button is never disabled when zero teams exist (spec.md edge case, not implemented, not tested) — see Fix 1.
2. `TrainingSavePopup.test.jsx`'s "matches no loaded team" test does not discriminate the presence of the pre-select existence guard — see Fix 2.
3. `handleSubmit`'s unawaited, unhandled `onSubmit` call is a latent race that silently swallows persistence errors and is fragile to the async-backend migration `CLAUDE.md` anticipates — see Fix 3.

**Next steps**: Route Fixes 1–3 back to an implementer as fix tasks; re-verify after. None of the three block the P1/P2 acceptance criteria from being considered met, but all three should be resolved before considering the feature fully hardened.

---

## Re-Verification (iteration 2)

**Date**: 2026-07-31
**Fix commit**: `c08de8d` "fix(trainings): disable create button with no teams, surface save failures"
**Scope**: targeted re-check of Fix 1 (outer create-button disable) and Fix 3 (unawaited `onSubmit`). Fix 2 (survived mutant on the pre-select guard) was accepted as non-blocking and is re-confirmed below, not re-fixed.

### Fix 1 — outer create-trigger button disabled with no teams

- **Code**: `src/pages/Trainings.jsx:101-120`. The `IconPlus` trigger button now carries `disabled={teams.length === 0}` (line 103) and a `title` attribute explaining why (lines 104-108). A red "No teams yet. Add one on the Teams page first." message renders next to the button when `teams.length === 0` (lines 116-120), pointing the coach at the Teams page as the spec's edge case requires.
- **Tests**: `src/pages/__tests__/Trainings.test.jsx:310-317` ("disables the create-training button with a message pointing at Teams when there are no teams (edge case)") asserts `container.querySelector(".bg-blue-500")` `toBeDisabled()` — not merely that a message rendered. `Trainings.test.jsx:319-325` ("keeps the create-training button enabled once teams have loaded") asserts `toBeEnabled()` once teams load, guarding against an always-disabled regression.
- **Discrimination check**: reverted `disabled={teams.length === 0}` (and the accompanying `title`) on the button, leaving the button always-enabled. Ran `npx vitest run src/pages/__tests__/Trainings.test.jsx -t "disables the create-training button"` — **failed** as expected (`expect(element).toBeDisabled()` — received a non-disabled button). Restored via `git checkout -- src/pages/Trainings.jsx`.
- **Verdict**: ✅ Gap 1 closed. Test genuinely discriminates the fix.

### Fix 3 — unawaited `onSubmit` / silent save failure

- **Code**: `src/components/TrainingSavePopup.jsx:83-98`. `handleSubmit` now wraps `await onSubmit(...)` and `onClose()` in a `try`; on rejection the `catch` logs `console.error("Failed to save training:", err)` and sets `error` to `"Failed to save the training. Please try again."` instead of closing the popup.
- **Tests**: `src/components/__tests__/TrainingSavePopup.test.jsx:212-233` ("shows an error and does not close when the onSubmit prop rejects") mocks `onSubmit` with `vi.fn().mockRejectedValue(new Error("storage full"))`, submits the form, and asserts: the error text renders (`findByText("Failed to save the training. Please try again.")`), `onClose` was **not** called, and `console.error` was called with the expected error — a real behavioral assertion, not just "something rendered."
- **Discrimination check**: reverted `handleSubmit`'s tail to the original fire-and-forget shape (`onSubmit(...)` without `await`/try-catch, followed unconditionally by `onClose()`). Ran `npx vitest run src/components/__tests__/TrainingSavePopup.test.jsx -t "shows an error and does not close"` — **failed** as expected (`findByText` timed out waiting for the error message, since the un-awaited rejection was unhandled and `onClose()` fired unconditionally). Restored via `git checkout -- src/components/TrainingSavePopup.jsx`.
- **Verdict**: ✅ Gap 3 closed. Test genuinely discriminates the fix.

### Fix 2 — survived mutant on the pre-select existence guard (re-confirmed, not re-fixed)

- Per the task brief, this gap was judged low-severity and intentionally left unfixed: removing the `data.some((team) => team.id === teamId)` guard in `TrainingSavePopup.jsx`'s mount effect (line 22) doesn't fail any test at that layer because T3's submit-time revalidation (`handleSubmit`'s `currentTeams.some(...)` check, lines 77-81) independently blocks a stale/non-existent `teamId` at submit time regardless of what the pre-select effect did.
- Re-confirmed the redundant safety net is still present and unmodified: `TrainingSavePopup.jsx:77-81` still performs `const currentTeams = await teamService.getAll(); if (!currentTeams.some((team) => team.id === formData.teamId)) { setError(...); return; }` before any submit proceeds. This means even if the pre-select guard were silently removed, a bad `teamId` could never reach `onSubmit` — the end-to-end behavior remains correct, only the unit-level test at the mount-effect layer is non-discriminating.
- **Verdict**: Still accepted as non-blocking. No new evidence found that the redundant check is missing or has degraded.

### Gate re-run

- **Command**: `npm run lint && npm run build && npm test`
- **Lint**: 0 errors
- **Build**: succeeded (`dist/` produced, 5956 modules transformed)
- **Test result**: **138 passed, 0 failed, 0 skipped (11 test files)** — up from 135 (net +3: the two new Trainings.test.jsx button tests + the one new TrainingSavePopup.test.jsx rejection test)
- **Working tree**: `git status --short` confirmed clean after both temporary reverts were restored (only this validation.md file, which is new/untracked, appears in status)

### Updated overall verdict

**✅ PASS.** Both previously-blocking gaps (outer create-button disable, unawaited/unhandled `onSubmit`) are now implemented at the correct location, covered by tests that assert the spec-defined outcome (not incidental DOM state), and independently confirmed via discrimination (mutation-revert) checks — both new tests fail when their corresponding fix is reverted and pass when restored.

**Still open / accepted**:
- Gap 2 (pre-select existence-guard mutant surviving at the unit level) remains accepted as non-blocking per the original ranking — the submit-time revalidation provides genuine defense-in-depth, so no dangling/incorrect team can be persisted end-to-end. Recommend addressing only opportunistically (e.g., if `TrainingSavePopup.test.jsx` is touched again for another reason), not as a standalone fix task.
- No new issues found during this targeted re-verification.

**Feature status**: Ready to be considered complete for merge purposes.
