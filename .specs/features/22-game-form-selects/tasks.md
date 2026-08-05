# Game Form Selects Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/22-game-form-selects/spec.md`
**Design**: not required
**Status**: Draft
**Batches**: 4 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Components (`src/components/*.jsx`) | component | Every option state: populated, empty, legacy value, add-new | `src/components/__tests__/*.test.jsx` | `npm test` |
| Pages (`src/pages/*.jsx`) | integration | Create and edit a game end to end from the Games page | `src/pages/__tests__/*.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After component-only tasks | `npx vitest run <path/to/file.test.jsx>` |
| Full | After tasks touching pages | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: The two selects

```
T1 → T2 → T3
```

### Phase 2: Add without leaving

```
T4
```

---

## Task Breakdown

### T1: Add an option-list helper

**What**: One pure helper turning a managed list plus a current value into the options to render.
**Where**: `src/lib/selectOptions.js` (new), `src/lib/__tests__/selectOptions.test.js` (new)
**Depends on**: None
**Reuses**: nothing
**Requirement**: GSEL-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `toOptions(items, currentValue)` returns the list alphabetically, case-insensitively (AC GSEL-01.1)
- [x] A `currentValue` absent from the list is appended as an extra option flagged as not-in-list (AC GSEL-03) — assert the flag, since it is what the UI renders the marker from
- [x] A `currentValue` matching a list entry case-insensitively does **not** produce a duplicate option (edge case) — the case that makes a naive `includes` check wrong
- [x] An empty or null `currentValue` adds nothing
- [x] An empty list with a legacy value returns exactly that one flagged option
- [x] The input array is not mutated
- [x] Gate passes: `npx vitest run src/lib/__tests__/selectOptions.test.js`
- [x] Test count: 10+ tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(lib): add a select-option helper for managed lists`

---

### T2: Turn the opponent field into a select

**What**: Replace the text input with a populated, validated select.
**Where**: `src/components/GameSavePopup.jsx` (modify), `src/components/__tests__/GameSavePopup.test.jsx` (modify)
**Depends on**: T1
**Reuses**: `opponentService` from `21`; `toOptions`; the existing team `<select>` in the same form as the pattern
**Requirement**: GSEL-01, GSEL-03, GSEL-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] The opponent field is a `<select>` populated from `opponentService.getAll`, alphabetically (AC GSEL-01.1)
- [x] Submitting stores the selected name in the game's `opponent` string field (AC GSEL-01.2) — assert the submitted payload, not the DOM
- [x] Submitting with nothing selected is rejected with a message and no service call (AC GSEL-01.3)
- [x] An empty opponents list disables the select and points at the manager (AC GSEL-01.4)
- [x] Editing a game whose opponent is not in the list shows it marked and preserves it through an untouched save (AC GSEL-01.5) — assert the saved value equals the original string exactly
- [x] A stored opponent matching a list entry only by case renders as that entry, not as a second option (edge case)
- [x] The `07` GameSavePopup tests still pass; assertions that typed into the opponent input are rewritten to select
- [x] Gate passes: `npm test`
- [x] Test count: existing counts hold, 12+ new tests pass

**Tests**: component
**Gate**: full

**Commit**: `feat(games): choose the opponent from the managed list`

---

### T3: Turn the competition field into a select

**What**: Same treatment, with an explicit None option.
**Where**: `src/components/GameSavePopup.jsx` (modify)
**Depends on**: T2
**Reuses**: `competitionService` from `20`; `toOptions`
**Requirement**: GSEL-02, GSEL-03, GSEL-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] The competition field is a `<select>` populated from `competitionService.getAll`, alphabetically (AC GSEL-02.1)
- [x] An explicit "None" option exists and stores an empty competition (AC GSEL-02.2, GSEL-02.3) — assert the stored value is the same empty value an untyped field produced before, so nothing downstream changes shape
- [x] Selecting a competition stores its name (AC GSEL-02.4)
- [x] A legacy stored competition is shown marked and preserved through an untouched save (AC GSEL-02.5)
- [x] An empty competitions list offers only "None" and points at the manager (AC GSEL-02.6)
- [x] The form contains no `type="text"` input for opponent or competition
- [x] Gate passes: `npm test`
- [x] Test count: 12+ tests pass

**Tests**: component
**Gate**: full

**Commit**: `feat(games): choose the competition from the managed list`

---

### T4: Add a new entry without leaving the form

**What**: The "Add new…" affordance on both selects.
**Where**: `src/components/GameSavePopup.jsx` (modify), `src/pages/__tests__/Games.test.jsx` (modify)
**Depends on**: T3
**Reuses**: `OpponentsPopup` (`21`), `CompetitionsPopup` (`20`), `PopupShell` stacking (`13`)
**Requirement**: GSEL-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Choosing "Add new…" on either select opens the matching manager over the form (AC GSEL-01.6)
- [x] Closing the manager re-reads the list, and a name added there becomes the selected value with no second interaction (edge case) — assert the select's value, not just the option's presence
- [x] Closing the manager without adding anything leaves every form value untouched, including a half-typed date (edge case) — assert each field
- [x] The stacked manager is interactive above the form (regression guard on `13`'s nested-popup edge case)
- [x] Creating a game end to end from the Games page, choosing both values, stores the expected record (AC GSEL-01.2, GSEL-02.4)
- [x] With long lists, both selects stay reachable inside the popup's scroll region (edge case)
- [x] Gate passes: `npm run lint && npm run build && npm test`
- [x] Test count: 10+ tests pass

**Tests**: integration
**Gate**: build

**Commit**: `feat(games): add opponents and competitions from the game form`

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ──→ T2 ──→ T3
Phase 2:  T4
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Option helper | 1 module, 1 function | ✅ Granular |
| T2: Opponent select | 1 component, 1 field | ✅ Granular |
| T3: Competition select | 1 component, 1 field | ✅ Granular |
| T4: Add-new | 1 component + integration | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | Phase 1 → Phase 2 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Pure logic | unit | unit | ✅ OK |
| T2 | Component | component | component | ✅ OK |
| T3 | Component | component | component | ✅ OK |
| T4 | Component + Page | integration (highest) | integration | ✅ OK |
