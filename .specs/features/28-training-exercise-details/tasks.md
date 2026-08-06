# Training Exercise Details Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/28-training-exercise-details/spec.md`
**Design**: not required
**Status**: Not started
**Batches**: 4 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Lib (`src/lib/trainingDuration.js`) | unit | Share arithmetic, zero-total and null-duration guards | `src/lib/__tests__/trainingDuration.test.js` | `npm test` |
| Components (`src/components/ExerciseDetailsPopup.jsx`) | component | Labelled fields, null fields, prev/next bounds, title updates | `src/components/__tests__/ExerciseDetailsPopup.test.jsx` | `npm test` |
| Components (`src/components/TrainingDetailsPopup.jsx`) | component | Row is a button, stacking, close returns to training | `src/components/__tests__/TrainingDetailsPopup.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After lib- or component-only tasks | `npx vitest run <path/to/file.test.js(x)>` |
| Full | After the popups are wired together | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: The detail view

```
T1 → T2 → T3 → T4
```

---

## Task Breakdown

### T1: Compute an exercise's share of the session

**What**: A pure helper beside `totalPlannedMinutes`, with the divide-by-zero and null cases decided in one place.
**Where**: `src/lib/trainingDuration.js` (modify), `src/lib/__tests__/trainingDuration.test.js` (modify)
**Depends on**: None
**Reuses**: `totalPlannedMinutes`, which already sums exercise durations
**Requirement**: EXDET-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `plannedShare(exercise, exercises)` returns a whole-number percent (AC EXDET-04.1)
- [ ] It returns `null` when the total is 0, so the caller renders nothing rather than `NaN%` (AC EXDET-04.2) — assert `null`, not a rendered string
- [ ] It returns `null` when the exercise's own duration is null (edge case)
- [ ] Rounding is asserted at a value that is not already whole (e.g. 10 of 45 → 22), so a dropped `Math.round` fails the test
- [ ] Gate passes: `npx vitest run src/lib/__tests__/trainingDuration.test.js`
- [ ] Test count: 8+ tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(trainings): compute an exercise's share of planned time`

---

### T2: Build the exercise detail popup

**What**: A popup showing one exercise's fields, each labelled, with a reserved diagram region.
**Where**: `src/components/ExerciseDetailsPopup.jsx` (new), `src/components/__tests__/ExerciseDetailsPopup.test.jsx` (new)
**Depends on**: T1
**Reuses**: `PopupShell` (AD-009), `Button`/`PopupActions` from `27`, the labelled-field markup already in `TrainingDetailsPopup`
**Requirement**: EXDET-02, EXDET-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Description, Duration, Number of players and Repetitions each render under their own label (AC EXDET-01.5)
- [ ] A null optional field renders an em dash under its label rather than being omitted (AC EXDET-01.6) — assert the label is present, which is the part that would silently disappear
- [ ] The planned-time share renders when `plannedShare` returns a number and is absent when it returns `null` (AC EXDET-04.1, EXDET-04.2)
- [ ] The popup title is the exercise's description (AC EXDET-03.5)
- [ ] A long description wraps in the title and carries no truncation class (edge case)
- [ ] No diagram region is rendered while `exercise.diagram` is absent (Assumptions: empty diagram slot) — `29` will assert the positive case
- [ ] The footer uses `Button`/`PopupActions` from `27`, not hand-written classes
- [ ] Gate passes: `npx vitest run src/components/__tests__/ExerciseDetailsPopup.test.jsx`
- [ ] Test count: 12+ tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(trainings): add an exercise details popup`

---

### T3: Make exercise rows open it

**What**: The crammed `<li>` becomes a focusable button that stacks the detail popup over the training.
**Where**: `src/components/TrainingDetailsPopup.jsx` (modify), `src/components/__tests__/TrainingDetailsPopup.test.jsx` (modify)
**Depends on**: T2
**Reuses**: The stacking pattern this file already uses for `SquadRatingPopup` (`:117-124`)
**Requirement**: EXDET-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Each exercise row is a `button` whose accessible name includes its description (AC EXDET-01.1)
- [ ] Clicking a row opens the exercise popup for **that** exercise (AC EXDET-01.2)
- [ ] Enter on a focused row does the same (AC EXDET-01.2)
- [ ] With the exercise popup open, the training popup's title is still in the document (AC EXDET-01.3)
- [ ] Closing the exercise popup leaves the training popup open and removes the exercise popup (AC EXDET-01.4) — assert the removal, not only the survivor
- [ ] Two exercises sharing a description each open their own record (edge case) — this is what proves rows are keyed by id
- [ ] With no exercises, "No exercises" renders and is **not** a button (edge case)
- [ ] Closing the training popup while an exercise popup is open removes both (edge case)
- [ ] Gate passes: `npm test`
- [ ] Test count: 12+ tests pass

**Tests**: component
**Gate**: full

**Commit**: `feat(trainings): open exercise details from a training`

---

### T4: Step between exercises

**What**: Previous / Next, bounded at both ends.
**Where**: `src/components/ExerciseDetailsPopup.jsx`, `src/components/TrainingDetailsPopup.jsx` (modify), their `__tests__` files (modify)
**Depends on**: T3
**Reuses**: `Button`'s `disabled` state from `27` — the disabled styling and the non-firing handler are already tested there
**Requirement**: EXDET-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Next moves to the following exercise and updates the title (AC EXDET-03.1, EXDET-03.5)
- [ ] Previous moves to the preceding one (AC EXDET-03.2)
- [ ] Previous is disabled on the first exercise and Next on the last (AC EXDET-03.3, EXDET-03.4) — assert both bounds, in one training, not two separate happy paths
- [ ] With exactly one exercise both are disabled (AC EXDET-03.6)
- [ ] Stepping does not close or remount the training popup behind it
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 8+ tests pass

**Tests**: component
**Gate**: build

**Commit**: `feat(trainings): step between a training's exercises`

---

## Phase Execution Map

```
Phase 1:  T1 ──→ T2 ──→ T3 ──→ T4
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Share helper | 1 lib function | ✅ Granular |
| T2: Detail popup | 1 new component | ✅ Granular |
| T3: Row → popup | 1 component, one interaction | ✅ Granular |
| T4: Prev / next | 1 interaction across 2 files | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Lib | unit | unit | ✅ OK |
| T2 | Component | component | component | ✅ OK |
| T3 | Component | component | component | ✅ OK |
| T4 | Components | component | component | ✅ OK |
