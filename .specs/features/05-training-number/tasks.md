# Training Number Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/05-training-number/spec.md`
**Design**: not required
**Status**: Draft
**Batches**: 4 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `CLAUDE.md`, `docs/04-data-model.md`. No testing standards documented; strong defaults applied.

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
| Quick | After tasks with unit/component tests only | `npx vitest run <path/to/file.test.js>` |
| Full | After tasks touching pages | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Numbering logic

```
T1 → T2
```

### Phase 2: Display

```
T3 → T4
```

---

## Task Breakdown

### T1: Create the training-numbering function

**What**: A pure function assigning per-team sequential numbers to a training list.
**Where**: `src/lib/trainingNumber.js` (new)
**Depends on**: None
**Reuses**: nothing
**Requirement**: TNUM-01, TNUM-02, TNUM-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `numberTrainings(trainings)` returns each training with an added `number`, grouped by `teamId` and ordered by `day` ascending (AC TNUM-01.1)
- [ ] Trainings sharing a `day` are ordered deterministically by id — running it twice on the same input yields identical numbering (AC TNUM-01.2)
- [ ] Numbering starts at 1 per team
- [ ] Inserting an earlier training shifts the later numbers up (AC TNUM-01.3)
- [ ] Deleting a training closes the gap — numbers stay contiguous (AC TNUM-01.4)
- [ ] Trainings with a null or unknown `teamId` receive `number: null` (AC TNUM-01.5)
- [ ] An empty input returns an empty array, not `undefined` (AC TNUM-01.6)
- [ ] An invalid `day` sorts last rather than throwing or producing `NaN` numbering
- [ ] The input array is not mutated — copy semantics per AD-004
- [ ] 100+ trainings across 3 teams number correctly in a single pass (edge case)
- [ ] Gate passes: `npx vitest run src/lib/__tests__/trainingNumber.test.js`
- [ ] Test count: 13 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(trainings): add per-team training numbering function`

---

### T2: Expose numbered trainings from the service

**What**: A service read that returns trainings already carrying their numbers.
**Where**: `src/services/trainingService.js` (modify)
**Depends on**: T1
**Reuses**: `src/lib/trainingNumber.js`, the store from `01-persistence-layer`
**Requirement**: TNUM-01, TNUM-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `getAllNumbered()` returns every training with its `number` populated
- [ ] Numbering is computed over the **team's full set**, then filtered — so a future-only view keeps team-wide numbers rather than restarting at 1 (edge case, and the main trap in this feature)
- [ ] `getAllNumbered(teamId)` filters to one team while preserving that team's numbering
- [ ] Numbering is computed once per call, not per row (edge case: 100+ trainings)
- [ ] A training reassigned from team A to team B takes a number from B's sequence (edge case)
- [ ] Returned objects are copies (AD-004)
- [ ] Gate passes: `npx vitest run src/services/__tests__/trainingService.test.js`
- [ ] Test count: 20 tests pass (13 carried from `01` T7 + 7 new)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(trainings): expose numbered trainings from the service`

---

### T3: Render numbered, readable training rows

**What**: Replace the raw `id` + `Date.toString()` row content with number, formatted date and duration.
**Where**: `src/pages/Trainings.jsx` (modify)
**Depends on**: T2
**Reuses**: `trainingService.getAllNumbered()`; the `toLocaleString()` format already used by `TrainingDetailsPopup`
**Requirement**: TNUM-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Rows render `Training #N`, a locale-formatted date and time, and the duration in minutes (AC TNUM-04.1)
- [ ] No row renders the raw id (AC TNUM-04.2) — assert no UUID-shaped string is present
- [ ] No row renders a `Date.toString()` form — assert the string "GMT" is absent
- [ ] An invalid `day` renders "Invalid date" without breaking the list (AC TNUM-04.3)
- [ ] Unassigned trainings render "—" in place of a number (AC TNUM-01.5)
- [ ] Future-only and past-only lists both show team-wide numbers, not restarted sequences (edge case)
- [ ] Gate passes: `npm test`
- [ ] Test count: 10 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(trainings): render training number, formatted date and duration`

---

### T4: Show the training number in the details popup

**What**: Put the number in the popup heading so the list and detail views agree.
**Where**: `src/components/TrainingDetailsPopup.jsx` (modify)
**Depends on**: T3
**Reuses**: The popup's existing heading markup
**Requirement**: TNUM-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The heading reads `Training #N` when a number is present (AC TNUM-05.1)
- [ ] The heading falls back to "Training Details" when `number` is null — the popup must not render `Training #null`
- [ ] The number shown matches the one on the row that opened the popup (edge case: list and detail agree)
- [ ] The existing date, duration and exercise rendering is unchanged
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 14 tests pass (10 integration + 4 component)

**Tests**: component
**Gate**: build

**Commit**: `feat(trainings): show training number in the details popup`

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
| T1: Numbering function | 1 function | ✅ Granular |
| T2: Service method | 1 method | ✅ Granular |
| T3: Row rendering | 1 file | ✅ Granular |
| T4: Popup heading | 1 file | ✅ Granular |

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
| T2 | Service | unit | unit | ✅ OK |
| T3 | Page | integration | integration | ✅ OK |
| T4 | Component | component | component | ✅ OK |
