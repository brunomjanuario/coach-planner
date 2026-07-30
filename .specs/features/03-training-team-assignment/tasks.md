# Training Team Assignment Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/03-training-team-assignment/spec.md`
**Design**: not required
**Status**: Draft
**Batches**: 5 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `CLAUDE.md`, `docs/07-components.md` (popup conventions). No testing standards documented; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
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

### Phase 1: Form control

```
T1 → T2 → T3
```

### Phase 2: List integration

```
T4 → T5
```

---

## Task Breakdown

### T1: Add the team select to the training form

**What**: A required team `<select>` populated from `teamService`.
**Where**: `src/components/TrainingSavePopup.jsx` (modify)
**Depends on**: None
**Reuses**: `src/services/teamService.js`, the popup's existing form-field markup
**Requirement**: TTA-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A `<select name="teamId">` renders above the date field
- [ ] Options list every team as `club` + `name`, matching the label format used on `/teams` (AC TTA-01.1)
- [ ] Teams are loaded via `teamService.getAll()` inside the popup, not passed as a prop — the popup is mounted from two places
- [ ] While teams are loading the select renders disabled (edge case)
- [ ] With zero teams the select renders disabled with a message pointing at `/teams` (edge case)
- [ ] Gate passes: `npx vitest run src/components/__tests__/TrainingSavePopup.test.jsx`
- [ ] Test count: 6 tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(trainings): add team select to the create form`

---

### T2: Pre-select the active team

**What**: Default the select to the page's selected team; leave empty when there is none.
**Where**: `src/components/TrainingSavePopup.jsx` (modify)
**Depends on**: T1
**Reuses**: The existing `teamId` prop from `pages/Trainings.jsx`
**Requirement**: TTA-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A `teamId` prop pre-selects the matching option (AC TTA-02.1)
- [ ] An absent or `undefined` `teamId` leaves the select empty — **not** defaulting to the first team (AC TTA-02.2)
- [ ] A `teamId` matching no existing team leaves the select empty rather than showing a blank selected option
- [ ] The `teamId || null` fallback in the initial form state is removed — it is the line that produced the orphan bug
- [ ] Gate passes: `npx vitest run src/components/__tests__/TrainingSavePopup.test.jsx`
- [ ] Test count: 10 tests pass (6 from T1 + 4 new)

**Tests**: component
**Gate**: quick

**Commit**: `feat(trainings): pre-select the active team in the create form`

---

### T3: Block submission without a team

**What**: Validation preventing a null-team training from ever being persisted.
**Where**: `src/components/TrainingSavePopup.jsx` (modify)
**Depends on**: T2
**Reuses**: nothing
**Requirement**: TTA-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Submitting with no team chosen blocks and shows a validation message (AC TTA-03.1)
- [ ] `trainingService.create` is **not** called when validation fails — assert the spy, not just the message
- [ ] Choosing a team clears the message
- [ ] Submitting with a team persists with the correct `teamId` (AC TTA-03.2)
- [ ] A team deleted while the form is open produces a clear failure, not a dangling `teamId` write (edge case)
- [ ] The shadowed local `onSubmit` is removed and the `onSubmit` **prop** is invoked — the bug documented in `docs/07-components.md`
- [ ] Gate passes: `npx vitest run src/components/__tests__/TrainingSavePopup.test.jsx`
- [ ] Test count: 15 tests pass

**Tests**: component
**Gate**: quick

**Commit**: `fix(trainings): block training creation without a team`

---

### T4: Refresh and report after create

**What**: Reload the lists after a create and tell the user when the new training landed outside the active filter.
**Where**: `src/pages/Trainings.jsx` (modify)
**Depends on**: T3
**Reuses**: The `filterTrainings()` helper from `01-persistence-layer` T9
**Requirement**: TTA-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Creating a training refreshes both lists with no page reload (AC TTA-04.1)
- [ ] A training created for the active filter's team appears in the filtered list (AC TTA-04.2)
- [ ] A training created for a different team keeps the filter and shows a message naming the target team (AC TTA-04.3)
- [ ] A future-dated training lands under "Next Trainings" (AC TTA-04.4)
- [ ] The `onSubmit` prop now passed to the popup drives this refresh
- [ ] Gate passes: `npm test`
- [ ] Test count: 8 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(trainings): refresh and report after creating a training`

---

### T5: Unassigned bucket with reassignment

**What**: Surface trainings whose `teamId` is null or dangling, and let the coach assign them.
**Where**: `src/pages/Trainings.jsx` (modify), `src/services/trainingService.js` (modify)
**Depends on**: T4
**Reuses**: `src/components/SelectableListItem.jsx` from `02-select-team-color`
**Requirement**: TTA-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `trainingService.getUnassigned()` returns trainings with a null `teamId` **or** a `teamId` matching no team (AC TTA-05.1, and the dangling-reference edge case)
- [ ] The bucket renders only when it is non-empty (AC TTA-05.2)
- [ ] Assigning a team persists the change and removes the row from the bucket (AC TTA-05.3)
- [ ] Assignment reuses the same team `<select>` built in T1 rather than a second control
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 13 tests pass (8 integration + 5 service unit)

**Tests**: integration (page) + unit (service) — highest requirement wins
**Gate**: build

**Commit**: `feat(trainings): add unassigned bucket with team reassignment`

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
| T1: Team select | 1 component, 1 control | ✅ Granular |
| T2: Pre-selection | Same component, 1 behaviour | ✅ Granular |
| T3: Validation | Same component, 1 behaviour | ✅ Granular |
| T4: Refresh + report | 1 page | ✅ Granular |
| T5: Unassigned bucket | 1 page + 1 service method | ⚠️ OK — cohesive; the method exists only for this view |

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
| T1 | Component | component | component | ✅ OK |
| T2 | Component | component | component | ✅ OK |
| T3 | Component | component | component | ✅ OK |
| T4 | Page | integration | integration | ✅ OK |
| T5 | Page + Service | integration (highest) | integration + unit | ✅ OK |
