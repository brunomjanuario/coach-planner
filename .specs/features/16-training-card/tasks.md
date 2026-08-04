# Training Card Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/16-training-card/spec.md`
**Design**: not required
**Status**: Draft
**Batches**: 4 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Pure logic (`src/lib/*.js`) | unit | All branches; every listed edge case | `src/lib/__tests__/*.test.js` | `npm test` |
| Components (`src/components/*.jsx`) | component | Render + every AC-defined interaction; empty and invalid states | `src/components/__tests__/*.test.jsx` | `npm test` |
| Pages (`src/pages/*.jsx`) | integration | Every list renders cards; open-details still works | `src/pages/__tests__/*.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After unit/component-only tasks | `npx vitest run <path/to/file>` |
| Full | After tasks touching pages | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Formatting and the card

```
T1 → T2
```

### Phase 2: Adoption

```
T3 → T4
```

---

## Task Breakdown

### T1: Add training display formatters

**What**: Pure helpers for the card's derived strings.
**Where**: `src/lib/trainingDisplay.js` (new), `src/lib/__tests__/trainingDisplay.test.js` (new)
**Depends on**: None
**Reuses**: `totalPlannedMinutes` from `src/lib/trainingDuration.js`
**Requirement**: TCARD-01, TCARD-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `formatTrainingDate(day)` returns weekday + day + short month + `HH:mm`, with no seconds (AC TCARD-01.1)
- [ ] `formatTrainingDate` returns `"Invalid date"` for an invalid or missing `day` (AC TCARD-01.5) — the same string `pages/Trainings.jsx` produces today, so `05`'s TNUM-04.3 still holds
- [ ] `exerciseSummary(exercises)` returns the count and the planned total, and reports the empty case distinctly from the zero-minute case (AC TCARD-01.3)
- [ ] An exercise with a null `duration` contributes 0 to the planned total, never `NaN` (edge case) — assert the numeric result, not just that it renders
- [ ] Singular/plural is correct at 1 exercise
- [ ] Zero-padding and 24-hour formatting verified against a non-UTC offset, as `06` T1 did for `datetime.js`
- [ ] Gate passes: `npx vitest run src/lib/__tests__/trainingDisplay.test.js`
- [ ] Test count: 12+ tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(lib): add training display formatters`

---

### T2: Add `TrainingCard`

**What**: The card component — number badge, date, duration, team, exercise summary.
**Where**: `src/components/TrainingCard.jsx` (new), `src/components/__tests__/TrainingCard.test.jsx` (new)
**Depends on**: T1
**Reuses**: `src/lib/trainingDisplay.js`; the focusable-row pattern from `SelectableListItem` (`02`)
**Requirement**: TCARD-01, TCARD-02, TCARD-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The card renders number, formatted date, duration, team name and exercise summary (AC TCARD-01.1, TCARD-01.2)
- [ ] A training with no exercises renders the explicit empty text (AC TCARD-01.3)
- [ ] A planned/scheduled mismatch renders the planned total; a match does not repeat it (AC TCARD-01.4) — assert both directions
- [ ] A missing or dangling `teamId` renders "Unassigned" (AC TCARD-01.6)
- [ ] A missing `number` renders "—" (AC TCARD-01.7)
- [ ] The card is a `<button>`; Enter and Space both fire `onSelect` (AC TCARD-03.2) — assert via keyboard events, not by clicking
- [ ] A visible focus indicator class is present (AC TCARD-03.4)
- [ ] The accessible name identifies number, date and team (AC TCARD-03.5)
- [ ] A `past` prop renders the muted treatment and the card stays readable — no white-on-light pairing (guard against the `14` defect class)
- [ ] A long team name wraps rather than overflowing (edge case)
- [ ] Gate passes: `npx vitest run src/components/__tests__/TrainingCard.test.jsx`
- [ ] Test count: 16+ tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(trainings): add a TrainingCard component`

---

### T3: Use the card in the upcoming and past lists

**What**: Replace the two `<li onClick>` lists.
**Where**: `src/pages/Trainings.jsx` (modify), `src/pages/__tests__/Trainings.test.jsx` (modify)
**Depends on**: T2
**Reuses**: `TrainingCard`
**Requirement**: TCARD-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Both lists render `TrainingCard` (AC TCARD-04.1, TCARD-04.2)
- [ ] Past cards receive the `past` treatment, upcoming cards do not
- [ ] Each card gets the training's team name resolved from the loaded teams; a dangling `teamId` yields "Unassigned"
- [ ] Clicking a card opens the details popup for that training — assert by id (regression guard on `06` TEDIT-04)
- [ ] Keyboard activation opens the same popup (AC TCARD-03.2)
- [ ] Stable `key` props on every card (edge case)
- [ ] The empty-list messages are unchanged (regression guard on candidate lesson L-004's finding)
- [ ] Gate passes: `npm test`
- [ ] Test count: 10+ tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(trainings): render upcoming and past trainings as cards`

---

### T4: Use the card in the unassigned list and delete the old helper

**What**: The third list, then remove `trainingRowLabel`.
**Where**: `src/pages/Trainings.jsx` (modify)
**Depends on**: T3
**Reuses**: `TrainingCard`
**Requirement**: TCARD-04, TCARD-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The unassigned list renders `TrainingCard` with the assign-to-team `<select>` beside it (AC TCARD-04.3)
- [ ] Operating the `<select>` does **not** open the details popup — assert the popup did not open, not merely that assignment happened (edge case)
- [ ] Assigning a team still moves the training out of the unassigned list (regression guard on `03` TTA)
- [ ] `trainingRowLabel` and the local `formatDay` helper are deleted from `pages/Trainings.jsx` (AC TCARD-05)
- [ ] `grep -r "trainingRowLabel" src` returns nothing
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 8+ tests pass

**Tests**: integration
**Gate**: build

**Commit**: `refactor(trainings): render unassigned trainings as cards`

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ──→ T2
Phase 2:  T3 ──→ T4
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Formatters | 1 module, 2 functions | ✅ Granular |
| T2: Card | 1 component | ✅ Granular |
| T3: Two lists | 1 page, one render path | ✅ Granular |
| T4: Third list + cleanup | 1 page | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | Phase 1 → Phase 2 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Pure logic | unit | unit | ✅ OK |
| T2 | Component | component | component | ✅ OK |
| T3 | Page | integration | integration | ✅ OK |
| T4 | Page | integration | integration | ✅ OK |
