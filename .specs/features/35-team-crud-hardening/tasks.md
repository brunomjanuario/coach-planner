# Team CRUD Hardening Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/35-team-crud-hardening/spec.md`
**Design**: not required — every fix mirrors an existing sibling component's already-correct pattern
**Status**: Not started
**Batches**: 5 tasks → 1 batch, execute inline

---

## Test Coverage Matrix

> No dedicated testing-standards doc beyond `CLAUDE.md`'s command list. Guidelines found: none — strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Components (`TeamPopup.jsx`, `TeamCard.jsx`) | component | Success path unchanged; rejection renders an error and does not call `onClose`; 1:1 to spec ACs | `src/components/__tests__/TeamPopup.test.jsx`, `src/components/__tests__/TeamCard.test.jsx` | `npm test` |
| Services (`teamService.delete`) | unit (via component/integration test, no dedicated service test file exists for this service today — floored against that) | Cascade removes cards/ratings for every player of the deleted team; games untouched; empty-team edge case doesn't error | `src/components/__tests__/TeamCard.test.jsx` (exercises the real service, not mocked, matching this repo's existing convention for cascade tests — see `PlayerCard.test.jsx`'s card-cascade tests) | `npm test` |
| Components (label association) | component | `getByLabelText` resolves for every field in both popups | `src/components/__tests__/TeamPopup.test.jsx`, `src/components/__tests__/PlayerPopup.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After a single component-only task | `npx vitest run <path/to/file.test.jsx>` |
| Full | After tasks touching services or cascades | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Stop silent failures

```
T1 → T2
```

### Phase 2: Cascade and labels

```
T3 → T4 → T5
```

---

## Task Breakdown

### T1: TeamPopup surfaces write failures instead of silently closing

**What**: `handleSubmit` becomes `async`, awaits the service call inside a try/catch, renders an error on rejection, and does not call `onClose` on failure.
**Where**: `src/components/TeamPopup.jsx` (modify), `src/components/__tests__/TeamPopup.test.jsx` (modify)
**Depends on**: None
**Reuses**: `PlayerPopup.jsx`'s identical `async handleSubmit` / `error` state / rendered `<p className="text-sm text-red-500">` shape, line-for-line
**Requirement**: CRUD-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `handleSubmit` is `async`; the `teamService.create`/`update` call is `await`ed inside `try { ...; onClose(); } catch (err) { setError(...) }`
- [ ] A rejected `create`/`update` renders an error message and `onClose` is NOT called (AC CRUD-01.1)
- [ ] A resolved `create`/`update` still calls `onClose` exactly as before (AC CRUD-01.2) — existing success-path tests updated to use `mockResolvedValue`/`mockRejectedValue` instead of a bare synchronous mock, matching real service semantics
- [ ] Both the create path and the edit/update path are covered (edge case: "create mode also surfaces errors")
- [ ] Gate passes: `npx vitest run src/components/__tests__/TeamPopup.test.jsx`
- [ ] Test count: existing count + 2 (one rejection test per create/update path)

**Tests**: component
**Gate**: quick

**Commit**: `fix(teams): surface TeamPopup write failures instead of closing silently`

---

### T2: TeamCard surfaces delete failures instead of silently closing

**What**: `deleteTeam` becomes `async`, awaits `teamService.delete` inside a try/catch, renders an error on rejection, and does not call `onClose` on failure.
**Where**: `src/components/TeamCard.jsx` (modify), `src/components/__tests__/TeamCard.test.jsx` (modify)
**Depends on**: None (independent of T1, sequenced for inline single-worker execution)
**Reuses**: `PlayerCard.jsx`'s identical `async deletePlayer` / `deleteError` state / rendered error shape, line-for-line
**Requirement**: CRUD-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `deleteTeam` is `async`; `teamService.delete` is `await`ed inside `try { ...; onClose(); } catch (err) { setDeleteError(...) }`
- [ ] A rejected delete renders an error message and `onClose` is NOT called (AC CRUD-01.3)
- [ ] A resolved delete still calls `onClose` exactly as before (AC CRUD-01.4)
- [ ] Gate passes: `npx vitest run src/components/__tests__/TeamCard.test.jsx`
- [ ] Test count: existing count (2, from feature 34) + 2

**Tests**: component
**Gate**: quick

**Commit**: `fix(teams): surface TeamCard delete failures instead of closing silently`

---

### T3: teamService.delete cascades to its players' cards and ratings

**What**: Before removing the team, read its players; after removing the team, call `cardService.removeByPlayer`/`ratingService.removeByPlayer` for each.
**Where**: `src/services/teamService.js` (modify)
**Depends on**: None
**Reuses**: The exact two service calls `deletePlayer` already makes for a single player, applied per-player in a loop
**Requirement**: CRUD-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `teamService.delete` reads the team's players before removing it from storage, then calls `cardService.removeByPlayer(playerId)` and `ratingService.removeByPlayer(playerId)` for each
- [ ] Deleting a team with players removes every card belonging to any of them (AC CRUD-02.1) — asserted via `cardService.getAll()`/`getByPlayer`, not a mock call-count
- [ ] Deleting a team with players removes every rating belonging to any of them (AC CRUD-02.2) — same, via `ratingService`
- [ ] The team's games are untouched (AC CRUD-02.3) — asserted via `gameService.getAll()` still returning them (now unassigned, not deleted)
- [ ] Deleting a team with zero players does not error (AC CRUD-02.4)
- [ ] Gate passes: `npm test` (no dedicated `teamService.test.js` exists; covered via `TeamCard.test.jsx`'s cascade tests, added in this task)
- [ ] Test count: `TeamCard.test.jsx` gains 3 tests (cards removed, ratings removed, games untouched)

**Tests**: integration (via component test, per the matrix's noted floor)
**Gate**: full

**Commit**: `fix(teams): cascade card and rating cleanup when a team is deleted`

---

### T4: Associate every label in TeamPopup with its field

**What**: `useId()`-generated ids on all three fields (Name, Club, Season), `htmlFor`/`id` pairs.
**Where**: `src/components/TeamPopup.jsx` (modify), `src/components/__tests__/TeamPopup.test.jsx` (modify)
**Depends on**: T1 (same file — sequenced to avoid two tasks racing edits on one file, not a functional dependency)
**Reuses**: `TrainingSavePopup.jsx`/`GameSavePopup.jsx`'s existing `useId()` + `htmlFor` convention
**Requirement**: CRUD-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Each of the three fields has a unique `id` (via `useId()`) and its `<label>` carries the matching `htmlFor`
- [ ] `screen.getByLabelText("Name")`, `getByLabelText("Club")`, `getByLabelText("Season")` each resolve to the correct input (AC CRUD-03.1)
- [ ] Gate passes: `npx vitest run src/components/__tests__/TeamPopup.test.jsx`
- [ ] Test count: existing count + 1 (a single test asserting all three labels resolve, matching how other popups' equivalent test is shaped)

**Tests**: component
**Gate**: quick

**Commit**: `fix(a11y): associate TeamPopup's labels with their fields`

---

### T5: Associate every label in PlayerPopup with its field

**What**: Same fix, `PlayerPopup.jsx`'s four fields (Name, Age, Shirt Number, Position).
**Where**: `src/components/PlayerPopup.jsx` (modify), `src/components/__tests__/PlayerPopup.test.jsx` (modify)
**Depends on**: T4 (sequenced for inline single-worker execution, not a functional dependency)
**Reuses**: Same convention as T4
**Requirement**: CRUD-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Each of the four fields has a unique `id` (via `useId()`) and its `<label>` carries the matching `htmlFor`
- [ ] `screen.getByLabelText("Name")`, `getByLabelText("Age")`, `getByLabelText("Shirt Number")`, `getByLabelText("Position")` each resolve to the correct input (AC CRUD-03.2)
- [ ] Gate passes: `npm run lint && npm run build && npm test` (last task in the batch)
- [ ] Test count: existing count + 1

**Tests**: component
**Gate**: build

**Commit**: `fix(a11y): associate PlayerPopup's labels with their fields`

---

## Phase Execution Map

```
Phase 1:  T1 ──→ T2
                  │
Phase 2:          └──→ T3 ──→ T4 ──→ T5
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: TeamPopup errors | 1 component | ✅ Granular |
| T2: TeamCard errors | 1 component | ✅ Granular |
| T3: Delete cascade | 1 service method | ✅ Granular |
| T4: TeamPopup labels | 1 component | ✅ Granular |
| T5: PlayerPopup labels | 1 component | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | None | T1 → T2 | ✅ Match (sequenced for inline execution, not a true dependency) |
| T3 | None | T2 → T3 | ✅ Match (sequenced for inline execution) |
| T4 | T1 | T3 → T4 | ✅ Match (T1 dependency satisfied transitively — T1 lands in Phase 1, before T4) |
| T5 | T4 | T4 → T5 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Component | component | component | ✅ OK |
| T2 | Component | component | component | ✅ OK |
| T3 | Service (via component test) | integration | integration | ✅ OK |
| T4 | Component | component | component | ✅ OK |
| T5 | Component | component | component | ✅ OK |
