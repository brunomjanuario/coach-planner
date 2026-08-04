# Opponents Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/21-opponents/spec.md`
**Design**: not required
**Status**: Draft
**Batches**: 5 tasks → 1 batch, execute inline (no sub-agents)

**Note for the executor**: this feature is deliberately the mirror image of
`20-competitions`. If `20` has shipped, read its implementation first and decide
— explicitly, in the commit body — whether the manager popup and the
name-validation helpers are shared or duplicated. Do not extract a shared
abstraction and then discover the shapes differ; check first, then choose.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `.specs/STATE.md` AD-002, AD-003, AD-004.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Services (`src/services/*.js`) | unit | All branches; 1:1 to spec ACs; every listed edge case | `src/services/__tests__/*.test.js` | `npm test` |
| Components (`src/components/*.jsx`) | component | Render + every AC-defined interaction; empty and error states | `src/components/__tests__/*.test.jsx` | `npm test` |
| Pages (`src/pages/*.jsx`) | integration | Manager opens, mutates and refreshes from its real call site | `src/pages/__tests__/*.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After unit/component-only tasks | `npx vitest run <path/to/file>` |
| Full | After tasks touching pages or the store | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Data

```
T1 → T2
```

### Phase 2: Management UI

```
T3 → T4 → T5
```

---

## Task Breakdown

### T1: Add the opponents collection and service

**What**: A new store collection plus `opponentService` with validation.
**Where**: `src/services/opponentService.js` (new), `src/services/store.js` (modify), `src/model/seed.js` (modify), `src/services/__tests__/opponentService.test.js` (new)
**Depends on**: None
**Reuses**: `getCollection`/`setCollection`, `newId()`, `NotFoundError`
**Requirement**: OPP-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `opponents` is added to `DATE_FIELDS` (empty array) so `COLLECTION_NAMES` and therefore `reset()` cover it (AC OPP-01.6) — assert reset clears and re-seeds it
- [ ] `createSeed()` returns an `opponents` array matching the seed games' opponents ("Benfica", "Sporting") (AC OPP-01.1)
- [ ] `getAll` returns a copy — mutating the result does not affect a later read (AC OPP-01.2)
- [ ] `create` assigns `newId()` (AC OPP-01.3), trims the name, returns the record
- [ ] `create` rejects case-insensitive and whitespace-variant duplicates (AC OPP-01.4) — assert exact, case and whitespace variants separately
- [ ] `create` rejects empty and whitespace-only names (AC OPP-01.5)
- [ ] `update` rejects a collision but allows a pure case change of the record's own name
- [ ] `update` on a missing id throws `NotFoundError`
- [ ] `delete` removes only the named record
- [ ] Gate passes: `npm test`
- [ ] Test count: 18+ tests pass

**Tests**: unit
**Gate**: full

**Commit**: `feat(opponents): add the opponents collection and service`

---

### T2: Migrate existing opponent names

**What**: A schema migration deriving opponents from stored games.
**Where**: `src/services/store.js` (modify), `src/services/__tests__/store.test.js` (modify)
**Depends on**: T1
**Reuses**: The `MIGRATIONS` registry in `store.js`
**Requirement**: OPP-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The migration is registered under the next unused schema version and `SCHEMA_VERSION` is bumped to match (AC OPP-02.6) — state in the commit body which version it took and why
- [ ] One opponent per distinct non-empty `game.opponent`; case and whitespace variants collapse (AC OPP-02.1, OPP-02.2) — assert the resulting count
- [ ] Games with a null, undefined or empty opponent contribute nothing (AC OPP-02.3)
- [ ] No game record is modified (AC OPP-02.4) — assert the games collection is identical before and after
- [ ] A second load does not re-run the migration or duplicate records (AC OPP-02.5)
- [ ] A store two versions behind runs both migrations in order and ends at the current version — the case the `while` loop in `runMigrations` exists for, and the one nobody tests until it breaks
- [ ] A fresh install seeds directly without running any migration
- [ ] Gate passes: `npm test`
- [ ] Test count: 12+ tests pass

**Tests**: unit
**Gate**: full

**Commit**: `feat(store): migrate existing game opponents into the collection`

---

### T3: Add the opponents manager popup

**What**: List and create, in a popup.
**Where**: `src/components/OpponentsPopup.jsx` (new), `src/components/__tests__/OpponentsPopup.test.jsx` (new)
**Depends on**: T1
**Reuses**: `PopupShell` from `13`; `CompetitionsPopup` from `20` as the reference implementation (share or duplicate — decide explicitly, see the executor note)
**Requirement**: OPP-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The popup renders through `PopupShell` (dependency on `13`)
- [ ] Every stored opponent is listed (AC OPP-03.1)
- [ ] Submitting a name adds it and the list re-reads from the service without a reload (AC OPP-03.2)
- [ ] An empty list renders the invitation state (AC OPP-03.7)
- [ ] A rejected name renders the reason and keeps the typed value (AC OPP-03.8)
- [ ] A 20-item list scrolls inside the shell with the create form still reachable (regression guard on `13` POPUP-02)
- [ ] A storage-quota failure surfaces an error (edge case)
- [ ] Gate passes: `npx vitest run src/components/__tests__/OpponentsPopup.test.jsx`
- [ ] Test count: 12+ tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(opponents): add the opponents manager popup`

---

### T4: Rename with cascade

**What**: Renaming an opponent updates every game carrying the old name — and nothing else.
**Where**: `src/services/opponentService.js` (modify), `src/components/OpponentsPopup.jsx` (modify)
**Depends on**: T3
**Reuses**: `gameService`; the cascade pattern from `20` T4
**Requirement**: OPP-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Renaming updates every matching game (AC OPP-04.3) — assert with two matching and one non-matching game
- [ ] A standings rival row with the same name is **not** touched (edge case) — assert the standings collection is unchanged; this is the boundary the spec draws between the two models
- [ ] A colliding rename is rejected before anything is written (edge case) — assert the games collection is unchanged after the rejection
- [ ] A pure case change is allowed and cascades
- [ ] The rename is awaited before the list re-reads (AD-004)
- [ ] Gate passes: `npm test`
- [ ] Test count: 10+ tests pass

**Tests**: unit + component
**Gate**: full

**Commit**: `feat(opponents): cascade a rename to the games that use it`

---

### T5: Delete with a counted confirmation, wired into the Games page

**What**: Delete behind an impact-stating confirmation, reachable from the page.
**Where**: `src/components/OpponentsPopup.jsx` (modify), `src/pages/Games.jsx` (modify), `src/pages/__tests__/Games.test.jsx` (modify)
**Depends on**: T4
**Reuses**: `ConfirmationPopup`
**Requirement**: OPP-05, OPP-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] An "Opponents" control in the Games page header opens the manager (AC OPP-03.1)
- [ ] The confirmation names how many games use that opponent (AC OPP-05.4) — assert the number
- [ ] Confirming removes the opponent and leaves every game's stored `opponent` string untouched (AC OPP-05.5)
- [ ] Cancelling changes nothing (AC OPP-05.6)
- [ ] An opponent used by zero games states zero, not a blank
- [ ] The Games page header holds both this control and `20`'s without disturbing the add-game button or the page layout from `19`
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 12+ tests pass

**Tests**: integration
**Gate**: build

**Commit**: `feat(opponents): delete an opponent with a counted confirmation`

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ──→ T2
Phase 2:  T3 ──→ T4 ──→ T5
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Collection + service | 1 service, 2 supporting files | ✅ Granular |
| T2: Migration | 1 module, one registry entry | ✅ Granular |
| T3: Manager list + create | 1 component | ✅ Granular |
| T4: Rename cascade | 1 service method + its UI | ⚠️ OK — same rationale as `20` T4 |
| T5: Delete + page wiring | 1 component + its only caller | ⚠️ OK — same rationale |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T1 | Phase 1 → Phase 2 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Service | unit | unit | ✅ OK |
| T2 | Service | unit | unit | ✅ OK |
| T3 | Component | component | component | ✅ OK |
| T4 | Service + Component | component (highest) | unit + component | ✅ OK |
| T5 | Component + Page | integration (highest) | integration | ✅ OK |
