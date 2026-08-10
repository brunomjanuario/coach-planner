# Trainings Unassigned Refresh Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/37-trainings-unassigned-refresh/spec.md`
**Design**: not required
**Status**: Not started
**Batches**: 2 tasks → 1 batch, execute inline

---

## Test Coverage Matrix

> No dedicated testing-standards doc beyond `CLAUDE.md`'s command list. Guidelines found: none — strong defaults applied, floored against `Trainings.test.jsx`'s existing depth for the sibling `assignTeam`/`onDelete` refresh paths.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Pages (`Trainings.jsx`) | integration | The one AC (unassigned list re-fetches after edit) plus the listed edge case | `src/pages/__tests__/Trainings.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | n/a — this feature has one task with a real fix | — |
| Full | After the fix task | `npm test` |
| Build | After the final task | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Fix and verify

```
T1 → T2
```

---

## Task Breakdown

### T1: Refresh the Unassigned list after editing a training

**What**: Add `await loadUnassigned();` to `TrainingSavePopup`'s `onSubmit` handler in `Trainings.jsx`, matching the call already present in `TrainingDetailsPopup`'s `onDelete` and `assignTeam`.
**Where**: `src/pages/Trainings.jsx` (modify), `src/pages/__tests__/Trainings.test.jsx` (modify)
**Depends on**: None
**Reuses**: The exact `loadUnassigned()` call already used by the two sibling paths in the same file
**Requirement**: TRUR-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `onSubmit`'s body calls `await loadUnassigned()` alongside the existing `await filterTrainings(...)`
- [ ] Editing a previously-unassigned training to add a team removes it from the Unassigned list and updates the heading's count in the same interaction, with no manual reload (AC TRUR-01.1, TRUR-01.2) — asserted via the real `Trainings` page, not a mocked `loadUnassigned`
- [ ] Editing an already-assigned training (no unassigned-list change expected) still works with no regression — the edge case from spec.md
- [ ] Gate passes: `npm test`
- [ ] Test count: existing count + 2

**Tests**: integration
**Gate**: full

**Commit**: `fix(trainings): refresh the Unassigned list after editing a training`

---

### T2: Full gate confirmation

**What**: Run the complete build gate as the final step of this single-batch feature.
**Where**: no source change — verification only
**Depends on**: T1
**Reuses**: n/a
**Requirement**: TRUR-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `npm run lint && npm run build && npm test` all pass
- [ ] Test count recorded in the commit body

**Tests**: none (build-level verification)
**Gate**: build

**Commit**: `docs(trainings): record the T1 gate result for feature 37`

---

## Phase Execution Map

```
Phase 1:  T1 ──→ T2
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Fix + test | 1 page, one call | ✅ Granular |
| T2: Gate confirmation | verification only | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Page | integration | integration | ✅ OK |
| T2 | Build verification | none | none | ✅ OK |
