# Training Edit Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/06-training-edit/spec.md`
**Design**: not required
**Status**: Draft
**Batches**: 5 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `CLAUDE.md`, `docs/07-components.md` (the `*Popup` convention and the documented dead `onEdit` prop). No testing standards documented; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Pure logic (`src/lib/*.js`) | unit | All branches; 1:1 to spec ACs; every listed edge case | `src/lib/__tests__/*.test.js` | `npm test` |
| Services (`src/services/*.js`) | unit | All branches; 1:1 to spec ACs; every listed edge case | `src/services/__tests__/*.test.js` | `npm test` |
| Components (`src/components/*.jsx`) | component | Render + every AC-defined interaction; empty and error states | `src/components/__tests__/*.test.jsx` | `npm test` |
| Pages (`src/pages/*.jsx`) | integration | Happy path + every listed edge case + error path | `src/pages/__tests__/*.test.jsx` | `npm test` |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After tasks with unit/component tests only | `npx vitest run <path/to/file.test.jsx>` |
| Full | After tasks touching pages | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Edit mode

```
T1 → T2 → T3
```

### Phase 2: Delete and refresh

```
T4 → T5
```

---

## Task Breakdown

### T1: Add a datetime-local formatting helper

**What**: Convert a `Date` to and from the `YYYY-MM-DDTHH:mm` string a `datetime-local` input requires.
**Where**: `src/lib/datetime.js` (new)
**Depends on**: None
**Reuses**: nothing
**Requirement**: TEDIT-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `toInputValue(date)` returns a `YYYY-MM-DDTHH:mm` string in **local** time (AC TEDIT-03.2) — `toISOString()` would shift the displayed time by the UTC offset, which is the trap this helper exists to avoid
- [ ] `fromInputValue(string)` returns a `Date` at the same local instant
- [ ] A round trip `fromInputValue(toInputValue(d))` preserves the instant to the minute (AC TEDIT-03.3)
- [ ] `toInputValue` on an invalid `Date` returns `""` (AC TEDIT-03.4)
- [ ] `fromInputValue("")` returns `null`, not `Invalid Date`
- [ ] Single-digit months, days, hours and minutes are zero-padded
- [ ] Verified across at least one non-UTC timezone offset
- [ ] Gate passes: `npx vitest run src/lib/__tests__/datetime.test.js`
- [ ] Test count: 10 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(lib): add datetime-local formatting helpers`

---

### T2: Add edit mode to the training form

**What**: An optional `training` prop switching the popup between create and update.
**Where**: `src/components/TrainingSavePopup.jsx` (modify)
**Depends on**: T1
**Reuses**: `src/lib/datetime.js`; the same create/edit prop pattern `TeamPopup` and `PlayerPopup` already use
**Requirement**: TEDIT-01, TEDIT-02, TEDIT-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Passing a `training` prop pre-fills date, duration, team and exercises (AC TEDIT-01.1)
- [ ] The heading reads "Edit Training" and the action button "Save" in edit mode (AC TEDIT-01.2)
- [ ] Submitting in edit mode calls `trainingService.update`, never `create` — assert both spies (AC TEDIT-01.3)
- [ ] The training's id is preserved through the edit (AC TEDIT-01.4)
- [ ] Cancelling leaves the store untouched (AC TEDIT-01.5)
- [ ] Submitting without changing the date stores the same instant (AC TEDIT-03.3)
- [ ] An invalid date blocks the save with a message (edge case)
- [ ] Removing all exercises saves an empty list rather than blocking (edge case)
- [ ] Create mode behaviour is unchanged — all `03` and `04` tests still pass
- [ ] Gate passes: `npx vitest run src/components/__tests__/TrainingSavePopup.test.jsx`
- [ ] Test count: 43 tests pass (34 carried from `04` T5 + 9 new)

**Tests**: component
**Gate**: quick

**Commit**: `feat(trainings): add edit mode to the training form`

---

### T3: Wire the Edit button in the details popup

**What**: Make the dead `onEdit` prop functional end to end.
**Where**: `src/components/TrainingDetailsPopup.jsx` (modify), `src/pages/Trainings.jsx` (modify)
**Depends on**: T2
**Reuses**: The existing Edit button markup — it already exists, nothing renders it useful
**Requirement**: TEDIT-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `pages/Trainings.jsx` passes `onEdit` — the missing caller documented in `docs/07-components.md`
- [ ] Clicking Edit closes the details popup and opens the form in edit mode for that training (AC TEDIT-04.1)
- [ ] The form receives the same training the popup was showing — assert by id, not by index
- [ ] Reopening the details popup after an edit shows the updated values (edge case)
- [ ] Gate passes: `npm test`
- [ ] Test count: 8 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `fix(trainings): wire the details popup Edit button`

---

### T4: Add delete with confirmation

**What**: A Delete control in the details popup guarded by `ConfirmationPopup`.
**Where**: `src/components/TrainingDetailsPopup.jsx` (modify), `src/pages/Trainings.jsx` (modify)
**Depends on**: T3
**Reuses**: `src/components/ConfirmationPopup.jsx`; the delete pattern in `TeamCard` and `PlayerCard`
**Requirement**: TEDIT-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A Delete control renders beside Edit and Close
- [ ] Clicking it opens `ConfirmationPopup` naming the training by its number (AC TEDIT-05.1)
- [ ] `trainingService.delete` is **not** called until confirmation — assert the spy
- [ ] Confirming deletes and closes both popups (AC TEDIT-05.2)
- [ ] Cancelling leaves the training in place (AC TEDIT-05.3)
- [ ] A deleted training is absent after reload (AC TEDIT-05.4)
- [ ] Remaining trainings for that team renumber contiguously (AC TEDIT-05.5) — regression guard on `05` TNUM-02
- [ ] Gate passes: `npm test`
- [ ] Test count: 15 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(trainings): add delete with confirmation`

---

### T5: Refresh lists after edit and delete

**What**: Reload and re-bucket after a mutation, preserving the active filter.
**Where**: `src/pages/Trainings.jsx` (modify)
**Depends on**: T4
**Reuses**: The `filterTrainings()` helper from `01` T9
**Requirement**: TEDIT-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Editing refreshes both lists with no page reload (AC TEDIT-06.1)
- [ ] An edit that moves a training across the now boundary moves it between the two lists (AC TEDIT-06.2)
- [ ] An edit that changes the team re-applies the active filter to the updated data (AC TEDIT-06.3)
- [ ] Deleting removes the row without a reload (AC TEDIT-06.4)
- [ ] Editing a training out of the active team filter keeps the filter and reports where it went — same behaviour as `03` TTA-04.3
- [ ] Editing a training deleted in another tab fails with a clear message and does not re-create it (edge case)
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 21 tests pass

**Tests**: integration
**Gate**: build

**Commit**: `feat(trainings): refresh lists after edit and delete`

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ──→ T2 ──→ T3
Phase 2:  T4 ──→ T5
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Datetime helper | 2 functions, 1 file, inverse pair | ✅ Granular |
| T2: Edit mode | 1 component | ✅ Granular |
| T3: Wire Edit button | 2 files, one wiring | ⚠️ OK — a prop and its only caller; splitting ships a dead prop again |
| T4: Delete | 2 files, one behaviour | ⚠️ OK — same rationale |
| T5: Refresh | 1 file | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | Phase 1 → Phase 2 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Pure logic | unit | unit | ✅ OK |
| T2 | Component | component | component | ✅ OK |
| T3 | Component + Page | integration (highest) | integration | ✅ OK |
| T4 | Component + Page | integration (highest) | integration | ✅ OK |
| T5 | Page | integration | integration | ✅ OK |
