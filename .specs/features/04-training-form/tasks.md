# Training Form Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/04-training-form/spec.md`
**Design**: not required
**Status**: Draft
**Batches**: 6 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `CLAUDE.md`, `docs/07-components.md` (popup conventions), `docs/04-data-model.md` (exercise shape). No testing standards documented; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Pure logic (`src/lib/*.js`) | unit | All branches; 1:1 to spec ACs; every listed edge case | `src/lib/__tests__/*.test.js` | `npm test` |
| Components (`src/components/*.jsx`) | component | Render + every AC-defined interaction; empty and error states | `src/components/__tests__/*.test.jsx` | `npm test` |
| Pages (`src/pages/*.jsx`) | integration | Happy path + every listed edge case + error path | `src/pages/__tests__/*.test.jsx` | `npm test` |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After tasks with unit/component tests only | `npx vitest run <path/to/file.test.jsx>` |
| Full | After tasks touching pages or multiple layers | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Exercise capture

```
T1 → T2 → T3
```

### Phase 2: Manipulation and feedback

```
T4 → T5 → T6
```

---

## Task Breakdown

### T1: Create the ExerciseFields editor component

**What**: A four-field exercise editor with per-field validation, extracted from the popup.
**Where**: `src/components/ExerciseFields.jsx` (new)
**Depends on**: None
**Reuses**: The `w-full border px-3 py-2 rounded` input pattern from `TrainingSavePopup`; `src/lib/id.js` (AD-003)
**Requirement**: TFORM-01, TFORM-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Renders inputs for description, duration, numberOfPlayers and repetitions (AC TFORM-01.1)
- [ ] Calls `onAdd` with all four values plus `id: newId()` and `image: ""` (AC TFORM-01.2, TFORM-02.5)
- [ ] Omitted numeric fields are emitted as `null`, never `0` or `undefined` (AC TFORM-01.3)
- [ ] Duration ≤ 0 or non-numeric blocks the add with a field-level message (AC TFORM-03.1)
- [ ] `numberOfPlayers` < 1 blocks with a field-level message (AC TFORM-03.2)
- [ ] `repetitions` < 1 blocks with a field-level message (AC TFORM-03.3)
- [ ] Whitespace-only description blocks the add (AC TFORM-03.4)
- [ ] Correcting a field clears only that field's message (AC TFORM-03.5)
- [ ] `onAdd` is not called on any blocked submit — assert the spy
- [ ] Gate passes: `npx vitest run src/components/__tests__/ExerciseFields.test.jsx`
- [ ] Test count: 12 tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(trainings): add ExerciseFields editor with validation`

---

### T2: Wire ExerciseFields into the training form

**What**: Replace the single description input with the new editor and persist the full shape.
**Where**: `src/components/TrainingSavePopup.jsx` (modify)
**Depends on**: T1
**Reuses**: `src/components/ExerciseFields.jsx`, the popup's existing `exercises` state
**Requirement**: TFORM-01, TFORM-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The `exerciseInput` string state is replaced by the `ExerciseFields` component
- [ ] Added exercises render duration, players and repetitions in the list, not just description
- [ ] The saved training carries all four fields per exercise (AC TFORM-01.2)
- [ ] A saved training reloaded from the store returns every exercise field unchanged (AC TFORM-02.4)
- [ ] `trainingId` is stamped on each exercise so created records match the seeded shape
- [ ] 20+ exercises scroll within the popup without pushing the action buttons off-screen (edge case)
- [ ] Cancelling the popup with values in the editor discards them without a prompt (edge case)
- [ ] Gate passes: `npx vitest run src/components/__tests__/TrainingSavePopup.test.jsx`
- [ ] Test count: 21 tests pass (15 carried from `03` T3 + 6 new)

**Tests**: component
**Gate**: quick

**Commit**: `feat(trainings): capture full exercise fields in the training form`

---

### T3: Verify the exercise round trip through the store

**What**: An integration test proving a fully-populated training survives create → reload.
**Where**: `src/pages/__tests__/Trainings.test.jsx` (modify)
**Depends on**: T2
**Reuses**: The store test helpers from `01-persistence-layer`
**Requirement**: TFORM-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Creating a training with three fully-populated exercises and re-reading returns all fields (AC TFORM-02.4)
- [ ] `null` numeric fields survive the round trip as `null`, not `0` or `undefined` (AC TFORM-01.3)
- [ ] Exercise ids are unique across two exercises added in the same tick (AC TFORM-02.5) — the `Date.now()` collision this replaces
- [ ] `training.day` is still a `Date` after the round trip — regression guard on `01` PERSIST-05
- [ ] Gate passes: `npm test`
- [ ] Test count: 12 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `test(trainings): verify full exercise round trip through the store`

---

### T4: Add edit-in-place for added exercises

**What**: Load an added exercise back into the editor and update it without changing its position.
**Where**: `src/components/TrainingSavePopup.jsx` (modify), `src/components/ExerciseFields.jsx` (modify)
**Depends on**: T3
**Reuses**: `ExerciseFields` — same component serves add and edit via an optional `exercise` prop
**Requirement**: TFORM-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Each listed exercise has an edit control that loads its values into the editor (AC TFORM-04.1)
- [ ] Saving an edit updates in place, preserving both id and list position (AC TFORM-04.2)
- [ ] The editor's action label switches between "Add" and "Save" by mode
- [ ] Cancelling an edit restores the original values and leaves the list unchanged (edge case)
- [ ] Validation from T1 applies identically in edit mode
- [ ] Gate passes: `npx vitest run src/components/__tests__/TrainingSavePopup.test.jsx`
- [ ] Test count: 27 tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(trainings): allow editing an added exercise in place`

---

### T5: Add exercise reordering

**What**: Move-up / move-down controls on each listed exercise.
**Where**: `src/components/TrainingSavePopup.jsx` (modify)
**Depends on**: T4
**Reuses**: `@tabler/icons-react` (`IconArrowUp`, `IconArrowDown`) — the project's icon set
**Requirement**: TFORM-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Move-up swaps an exercise with the one above (AC TFORM-05.3)
- [ ] Move-down swaps with the one below
- [ ] Move-up is **disabled** on the first exercise — no wrap-around (AC TFORM-05.4)
- [ ] Move-down is disabled on the last exercise (AC TFORM-05.5)
- [ ] Reordering preserves every exercise's field values and id
- [ ] The saved training persists the displayed order
- [ ] Controls are reachable and operable by keyboard
- [ ] Gate passes: `npx vitest run src/components/__tests__/TrainingSavePopup.test.jsx`
- [ ] Test count: 34 tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(trainings): add exercise reordering controls`

---

### T6: Add the session fit indicator and full detail view

**What**: A shared duration-total helper, surfaced in both the form and the details popup.
**Where**: `src/lib/trainingDuration.js` (new), `src/components/TrainingSavePopup.jsx` (modify), `src/components/TrainingDetailsPopup.jsx` (modify)
**Depends on**: T5
**Reuses**: nothing
**Requirement**: TFORM-06, TFORM-07

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `totalPlannedMinutes(exercises)` sums `duration × repetitions`, treating a `null` repetition count as 1 (AC TFORM-06.1)
- [ ] The helper returns `0` for an empty list rather than `NaN`
- [ ] The form displays the total and recomputes on add, edit, remove and reorder (AC TFORM-06.4)
- [ ] Exceeding the session duration warns and names the overage in minutes (AC TFORM-06.2)
- [ ] Within the session duration, the remaining minutes are shown (AC TFORM-06.3)
- [ ] Saving is **not** blocked by an overage (AC TFORM-06.5)
- [ ] `TrainingDetailsPopup` renders duration, players and repetitions per exercise (AC TFORM-07.1)
- [ ] `null` fields render as "—" (AC TFORM-07.2)
- [ ] The existing "No exercises" empty state is preserved (AC TFORM-07.3)
- [ ] The details popup shows the total planned time (AC TFORM-07.4)
- [ ] A sparse and a fully-populated exercise render without layout shift (edge case)
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 48 tests pass (34 form + 8 helper unit + 6 details component)

**Tests**: unit (helper) + component (both popups) — highest requirement wins
**Gate**: build

**Commit**: `feat(trainings): add session fit indicator and full exercise detail view`

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ──→ T2 ──→ T3
Phase 2:  T4 ──→ T5 ──→ T6
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: ExerciseFields | 1 component | ✅ Granular |
| T2: Wire into form | 1 file | ✅ Granular |
| T3: Round-trip test | 1 test file | ✅ Granular |
| T4: Edit in place | 2 files, one behaviour | ⚠️ OK — the editor gains a mode, the popup routes to it; splitting leaves a half-wired control |
| T5: Reorder | 1 file | ✅ Granular |
| T6: Fit indicator + detail view | 1 helper + 2 consumers | ⚠️ OK — the helper has no purpose without a consumer; both consumers render the same computed value |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | Phase 1 → Phase 2 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Component | component | component | ✅ OK |
| T2 | Component | component | component | ✅ OK |
| T3 | Page | integration | integration | ✅ OK |
| T4 | Component | component | component | ✅ OK |
| T5 | Component | component | component | ✅ OK |
| T6 | Pure logic + Component | unit + component | unit + component | ✅ OK |
