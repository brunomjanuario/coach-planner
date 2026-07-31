# Persistence Layer Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/01-persistence-layer/spec.md`
**Design**: ✅ Complete — see `design.md`
**Status**: In Progress (T4/10 done)
**Batches**: 10 tasks → 2 batches (Phases 1–3 = 7 tasks, Phase 4 = 3 tasks). Sub-agent offer applies.

---

## Design Notes

Decisions to settle in the Design phase, before T1. These are the open
architectural questions — not answers.

1. **Store shape.** One key per collection (`coachplanner:v1:teams`,
   `:trainings`) or one document key holding everything? Per-collection keeps
   writes small and is friendlier to the later `games` and `ratings`
   collections; a single document makes cross-collection consistency trivial.
2. **Where the copy boundary sits.** `structuredClone` on read is simplest and
   handles `Date` natively. Confirm it against the jsdom version pulled in by
   `00-test-harness` — if unavailable there, the fallback is a JSON round trip
   plus explicit date revival, which changes T1's shape.
3. **Date field registry.** Which fields per collection are dates. Currently only
   `trainings[].day`, but `07-games-league-table` adds `games[].date` and
   `09-player-ratings` adds `ratings[].date`. The registry must be extensible
   without touching the reviver.
4. **Read caching.** Parsing every collection on every read is O(n) per call and
   `pages/Trainings.jsx` calls `getAll()` three times on mount. Decide whether
   the store caches parsed collections in memory and invalidates on write.
5. **Player id uniqueness.** Players are nested inside teams but carry globally
   unique ids today. Confirm whether that invariant is kept (it is what makes
   `09-player-ratings` able to key ratings by `playerId` alone).

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `CLAUDE.md`, `docs/` — no testing standards documented. Strong defaults applied; stack fixed by AD-001 and established by `00-test-harness`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Pure logic (`src/lib/*.js`) | unit | All branches; 1:1 to spec ACs; every listed edge case | `src/lib/__tests__/*.test.js` | `npm test` |
| Services (`src/services/*.js`) | unit | All branches; 1:1 to spec ACs; every listed edge case | `src/services/__tests__/*.test.js` | `npm test` |
| Components (`src/components/*.jsx`) | component | Render + every AC-defined interaction; empty and error states | `src/components/__tests__/*.test.jsx` | `npm test` |
| Pages (`src/pages/*.jsx`) | integration | Happy path + every listed edge case + error path | `src/pages/__tests__/*.test.jsx` | `npm test` |
| Seed data (`src/model/*.js`) | none | — (build gate only) | — | build gate only |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After tasks with unit/component tests only | `npx vitest run <path/to/file.test.js>` |
| Full | After tasks touching pages or multiple layers | `npm test` |
| Build | After phase completion or config-only tasks | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Primitives

```
T1 → T2 → T3
```

### Phase 2: Store core

```
T4
```

### Phase 3: Service migration

```
T5 → T6 → T7
```

### Phase 4: UI refresh and reset

```
T8 → T9 → T10
```

---

## Task Breakdown

### T1: Create the storage adapter ✅ Complete

**What**: A localStorage wrapper handling JSON, namespaced keys, `Date` revival and every failure mode.
**Where**: `src/lib/storage.js` (new)
**Depends on**: None
**Reuses**: nothing
**Requirement**: PERSIST-05, PERSIST-07

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `read(collection, dateFields)` returns the parsed array with listed fields revived to `Date`
- [x] `write(collection, value)` serializes and stores under `coachplanner:v1:<collection>`
- [x] Returns `null` (not a throw) when the key is absent — the signal T4 uses to decide on seeding
- [x] Corrupt JSON returns `null` and logs one warning (edge case: corruption)
- [x] A quota-exceeded write throws a typed `StorageQuotaError` carrying the collection name
- [x] `localStorage` being unavailable falls back to an in-memory `Map` for the session, warning once
- [x] A malformed date string revives as an `Invalid Date`, not a throw (AC PERSIST-05.3)
- [x] Gate passes: `npx vitest run src/lib/__tests__/storage.test.js`
- [x] Test count: 10 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(storage): add localStorage adapter with date revival` — [332c867]

> **SPEC_DEVIATION**: Test count is 10, not the 9 estimated in the plan. The
> extra test covers `remove(key)`, which `design.md` assigns to this module
> (beyond T1's literal `Done when` list) because `store.reset()` in T4 needs
> it. Verified jsdom's quota-exceeded error empirically before writing the
> quota test (per design.md's flagged risk): `DOMException` with
> `name === "QuotaExceededError"` and `code === 22` — matches real-browser
> shape, no special-casing needed.

---

### T2: Create the id generator ✅ Complete

**What**: Collision-free id generation replacing `Math.random()` (AD-003).
**Where**: `src/lib/id.js` (new)
**Depends on**: None
**Reuses**: nothing
**Requirement**: PERSIST-08

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `newId()` returns `crypto.randomUUID()` when available
- [x] Falls back to a timestamp+counter string when `crypto.randomUUID` is absent (older Safari)
- [x] 10,000 successive calls produce 10,000 distinct values
- [x] Return type is always `string` — callers must not assume numeric ids
- [x] Gate passes: `npx vitest run src/lib/__tests__/id.test.js`
- [x] Test count: 4 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(id): add collision-free id generator` — [be56e7e]

---

### T3: Convert mock data into an explicit seed module ⚠️ Partial (see deviation)

**What**: Turn the mutable `mock.js` exports into a factory returning a fresh deep copy per call.
**Where**: `src/model/seed.js` (new), `src/model/mock.js` (delete)
**Depends on**: T2
**Reuses**: The existing team/player/training data verbatim — same records, same ids
**Requirement**: PERSIST-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Exports `createSeed()` returning `{ teams, trainings }` — a new object graph on every call
- [x] Two calls return non-reference-identical data (this is what stops seed corruption)
- [x] The `Positions` map is **exported** (it is currently private) — `04-training-form` and player forms need it
- [x] Seed records keep their existing ids so `docs/` examples stay accurate
- [x] `src/model/mock.js` is deleted and no import of it remains anywhere — **deferred to T7** (see deviation note)
- [x] Gate passes: `npm run lint && npm run build && npm test`

**Tests**: none (matrix: seed data → none) — exercised through T4's tests
**Gate**: build

**Commit**: `refactor(model): convert mock data to a seed factory` — [3de17dd]

> **SPEC_DEVIATION**: `mock.js` is not deleted in this task's commit.
> `teamService.js` and `trainingService.js` still `import { teams }` /
> `import { trainings }` from it, and those files are explicitly out of
> T3's scope (`Where` doesn't list them; they're T5/T6's and T7's files).
> Deleting `mock.js` now would break `npm run build` — the very gate this
> task must pass — before the services that stop importing it have been
> touched. `createSeed()` in `seed.js` is complete and correct (verified by
> the gate and, per the plan's own note, exercised through T4's tests);
> only the physical deletion of the now-superseded file is deferred to T7,
> the task that removes the last import (`trainingService.js`'s `import {
> trainings } from "../model/mock"`). This keeps every task's diff scoped
> to files it actually needs, per the "touch only listed files" hard
> constraint, rather than reaching into T5-T7's files early.

---

### T4: Create the store core ✅ Complete

**What**: The repository layer — load-or-seed, get/set collection, schema version, copy-on-read.
**Where**: `src/services/store.js` (new)
**Depends on**: T1, T2, T3
**Reuses**: `src/lib/storage.js`, `src/model/seed.js`
**Requirement**: PERSIST-01, PERSIST-02, PERSIST-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `getCollection(name)` returns a deep copy — mutating the result does not affect the store (AC PERSIST-03.2)
- [x] Two `getCollection` calls return non-reference-identical results (AC PERSIST-03.1)
- [x] First run with empty storage seeds from `createSeed()` and persists it (AC PERSIST-01.4)
- [x] A second load with data present does **not** re-seed (AC PERSIST-01.5)
- [x] `setCollection(name, value)` persists and bumps nothing else
- [x] A schema-version key is written and an identity migration hook exists for v1
- [x] `reset()` clears all `coachplanner:v1:*` keys and re-seeds, leaving the `user` key untouched (AC PERSIST-06.3)
- [x] Date fields are registered per collection and revive correctly (AC PERSIST-05.1)
- [x] Gate passes: `npx vitest run src/services/__tests__/store.test.js`
- [x] Test count: 12 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(store): add persistent store with seed-on-first-run` — [2c2cc50]

---

### T5: Migrate teamService team methods

**What**: Rewrite `getAll`/`getById`/`create`/`update`/`delete` over the store.
**Where**: `src/services/teamService.js` (modify)
**Depends on**: T4
**Reuses**: `src/services/store.js`, `src/lib/id.js`
**Requirement**: PERSIST-01, PERSIST-03, PERSIST-08

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The `fetch`-based `getById` is replaced with a store lookup returning `null` when absent
- [ ] `create` assigns an id via `newId()` — callers no longer pass one
- [ ] `update` persists and returns the updated team; unknown id throws a typed `NotFoundError`, not a `TypeError`
- [ ] `delete` persists the removal and survives a reload (AC PERSIST-01.3) — the current reference-rebinding bug is gone
- [ ] `update` no longer silently drops `players` (it currently copies only name/club/season)
- [ ] `API_URL` constant removed
- [ ] Gate passes: `npx vitest run src/services/__tests__/teamService.test.js`
- [ ] Test count: 11 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `refactor(teams): migrate team methods to the persistent store`

---

### T6: Migrate teamService player methods

**What**: Rewrite `addPlayer`/`updatePlayer`/`deletePlayer` over the store.
**Where**: `src/services/teamService.js` (modify)
**Depends on**: T5
**Reuses**: `src/services/store.js`, `src/lib/id.js`
**Requirement**: PERSIST-01, PERSIST-03, PERSIST-08

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `addPlayer` assigns an id via `newId()` and persists
- [ ] `addPlayer` with an unknown `teamId` throws `NotFoundError` — it currently throws `TypeError` on `undefined.players`, which is the crash behind the `03` bug
- [ ] `updatePlayer` persists and preserves `goals`, `assists`, `concededGoals` (they are not on the form)
- [ ] `deletePlayer` persists and survives reload
- [ ] Player ids stay unique across all teams (invariant `09-player-ratings` depends on)
- [ ] Gate passes: `npx vitest run src/services/__tests__/teamService.test.js`
- [ ] Test count: 19 tests pass (11 from T5 + 8 new)

**Tests**: unit
**Gate**: quick

**Commit**: `refactor(players): migrate player methods to the persistent store`

---

### T7: Migrate trainingService

**What**: Rewrite all methods over the store and delete the three broken `fetch` methods.
**Where**: `src/services/trainingService.js` (modify)
**Depends on**: T4
**Reuses**: `src/services/store.js`, `src/lib/id.js`
**Requirement**: PERSIST-01, PERSIST-03, PERSIST-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `getById`, `update` and `delete` no longer call `fetch` — all three currently hit the nonexistent `/api/teams`
- [ ] The misnamed `API_URL = "/api/teams"` constant is removed from this file
- [ ] `create` assigns an id via `newId()` and persists
- [ ] `update(training)` takes a whole training (not `(id, data)`) — matching `teamService.update`'s shape
- [ ] A saved training's `day` is a `Date` after reload (AC PERSIST-05.1)
- [ ] A future training still sorts into the future bucket after reload (AC PERSIST-05.2) — regression test for the string-comparison trap
- [ ] Gate passes: `npx vitest run src/services/__tests__/trainingService.test.js`
- [ ] Test count: 13 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `refactor(trainings): migrate training service to the persistent store`

---

### T8: Refresh the Teams page after every mutation

**What**: Re-read from the service after create, update and delete of both teams and players.
**Where**: `src/pages/Teams.jsx` (modify)
**Depends on**: T5, T6
**Reuses**: The existing `loadTeams()` function — extend its call sites
**Requirement**: PERSIST-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `TeamPopup`'s `onClose` triggers `loadTeams()` for the create path (currently only the edit path refreshes)
- [ ] `PlayerPopup`'s `onClose` triggers `loadTeams()` — adding a player currently never refreshes (AC PERSIST-04.3)
- [ ] `selectedTeam` is re-resolved from the reloaded list so the Players column is not left pointing at a stale object
- [ ] Deleting the selected team clears the selection rather than leaving a dangling card
- [ ] Gate passes: `npm test`
- [ ] Test count: 8 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `fix(teams): refresh list after every mutation`

---

### T9: Refresh the Trainings page after every mutation

**What**: Re-read after create, preserving the active team filter.
**Where**: `src/pages/Trainings.jsx` (modify)
**Depends on**: T7
**Reuses**: The existing `filterTranings()` function — **rename to `filterTrainings`** while here
**Requirement**: PERSIST-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Creating a training refreshes both lists (AC PERSIST-04.4)
- [ ] The refresh **preserves the active team filter** — it must not silently reset to showing all teams
- [ ] The duplicated future/past split logic (currently inlined in three places) is extracted to one helper
- [ ] The two mount-time `useEffect`s are consolidated into one
- [ ] Typo `filterTranings` → `filterTrainings` fixed
- [ ] Gate passes: `npm test`
- [ ] Test count: 9 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `fix(trainings): refresh lists after create and preserve filter`

---

### T10: Add reset-demo-data to Settings

**What**: A confirmed destructive action clearing stored data and re-seeding.
**Where**: `src/pages/Settings.jsx` (modify)
**Depends on**: T4, T8, T9
**Reuses**: `src/components/ConfirmationPopup.jsx`, `store.reset()`
**Requirement**: PERSIST-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Settings renders a "Reset demo data" button (replacing the bare placeholder heading)
- [ ] Clicking it opens `ConfirmationPopup` — reset never fires on a single click (AC PERSIST-06.2)
- [ ] Confirming clears all `coachplanner:v1:*` keys and re-seeds
- [ ] The auth session survives the reset — the user is not signed out (AC PERSIST-06.3)
- [ ] Cancelling changes nothing
- [ ] Styled with Tailwind per AD-005
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 5 tests pass

**Tests**: integration
**Gate**: build

**Commit**: `feat(settings): add reset demo data action`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 ──→ T2 ──→ T3
Phase 2:  T4
Phase 3:  T5 ──→ T6 ──→ T7
Phase 4:  T8 ──→ T9 ──→ T10

Batch 1 (worker A): Phases 1–3  = T1..T7   (7 tasks)
Batch 2 (worker B): Phase 4     = T8..T10  (3 tasks)
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Storage adapter | 1 module | ✅ Granular |
| T2: Id generator | 1 function | ✅ Granular |
| T3: Seed module | 1 module (+1 delete) | ✅ Granular |
| T4: Store core | 1 module | ✅ Granular |
| T5: Team methods | 1 file, one cohesive group | ✅ Granular |
| T6: Player methods | Same file, second group | ✅ Granular — split from T5 so a failure isolates |
| T7: Training service | 1 file | ✅ Granular |
| T8: Teams page refresh | 1 file | ✅ Granular |
| T9: Trainings page refresh | 1 file | ✅ Granular |
| T10: Reset action | 1 file | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | None | (start, parallel to T1) | ✅ Match — sequential in-phase, no ordering constraint between them |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T1, T2, T3 | Phase 1 → Phase 2 | ✅ Match |
| T5 | T4 | Phase 2 → Phase 3 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T4 | Phase 2 → Phase 3 | ✅ Match |
| T8 | T5, T6 | Phase 3 → Phase 4 | ✅ Match |
| T9 | T7 | Phase 3 → Phase 4 | ✅ Match |
| T10 | T4, T8, T9 | T8 → T9 → T10 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Pure logic | unit | unit | ✅ OK |
| T2 | Pure logic | unit | unit | ✅ OK |
| T3 | Seed data | none | none | ✅ OK |
| T4 | Service | unit | unit | ✅ OK |
| T5 | Service | unit | unit | ✅ OK |
| T6 | Service | unit | unit | ✅ OK |
| T7 | Service | unit | unit | ✅ OK |
| T8 | Page | integration | integration | ✅ OK |
| T9 | Page | integration | integration | ✅ OK |
| T10 | Page + component | integration | integration | ✅ OK |
