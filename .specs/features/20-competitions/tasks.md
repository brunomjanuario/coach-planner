# Competitions Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/20-competitions/spec.md`
**Design**: not required
**Status**: Draft
**Batches**: 5 tasks → 1 batch, execute inline (no sub-agents)

**Note for the executor**: this feature adds the project's first schema migration.
`src/services/store.js` ships an empty `MIGRATIONS` registry built for exactly
this (`store.js:16-28`). Read it before starting T2.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `.specs/STATE.md` AD-002 (localStorage store), AD-003 (`newId()`), AD-004 (services return copies).

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

### T1: Add the competitions collection and service

**What**: A new store collection plus `competitionService` with validation.
**Where**: `src/services/competitionService.js` (new), `src/services/store.js` (modify), `src/model/seed.js` (modify), `src/services/__tests__/competitionService.test.js` (new)
**Depends on**: None
**Reuses**: `getCollection`/`setCollection`, `newId()` (AD-003), `NotFoundError` from `src/lib/errors.js`
**Requirement**: COMP-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `competitions` is added to `DATE_FIELDS` (empty array — no date fields) so it is covered by `COLLECTION_NAMES`, and therefore by `reset()` (AC COMP-01.6) — assert reset actually clears and re-seeds it, not just that the key is listed
- [x] `createSeed()` returns a `competitions` array seeded to match the seed games' competition names, so a fresh install is self-consistent (AC COMP-01.1)
- [x] `getAll` returns a copy — mutating the result does not affect a subsequent read (AD-004, AC COMP-01.2)
- [x] `create` assigns `newId()` (AC COMP-01.3) and returns the created record
- [x] `create` trims the name before storing (edge case)
- [x] `create` rejects a case-insensitive duplicate of an existing trimmed name (AC COMP-01.4) — assert all three of: exact, different case, surrounding whitespace
- [x] `create` rejects an empty or whitespace-only name (AC COMP-01.5)
- [x] `update` rejects a duplicate name and allows a pure case change of the record's own name (edge case) — these two are one line apart in the implementation and must be asserted separately
- [x] `update` on a missing id throws `NotFoundError`
- [x] `delete` removes only the named record
- [x] Gate passes: `npm test`
- [x] Test count: 18+ tests pass

**Tests**: unit
**Gate**: full

**Commit**: `feat(competitions): add the competitions collection and service`

---

### T2: Migrate existing competition names

**What**: The project's first schema migration — v1 → v2, deriving competitions from stored games.
**Where**: `src/services/store.js` (modify), `src/services/__tests__/store.test.js` (modify)
**Depends on**: T1
**Reuses**: The `MIGRATIONS` registry and `runMigrations` already in `store.js`
**Requirement**: COMP-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `SCHEMA_VERSION` becomes 2 and `MIGRATIONS[2]` derives competitions from the stored games (AC COMP-02.1)
- [x] Names differing only by case or surrounding whitespace collapse to one competition (AC COMP-02.2) — assert the resulting count, not just that something was created
- [x] Games with a null, undefined or empty competition contribute nothing (AC COMP-02.3)
- [x] No game record is modified by the migration (AC COMP-02.4) — assert the games collection is byte-identical before and after
- [x] After migrating, the stored version is 2 and a second load does not re-run the migration or duplicate records (AC COMP-02.5)
- [x] A fresh install (no stored version) seeds directly and does not run the migration
- [x] A store already at v2 is left alone
- [x] The migration is exercised through `getCollection`, the real entry point, not by calling the migration function directly
- [x] Gate passes: `npm test`
- [x] Test count: 10+ tests pass

**Tests**: unit
**Gate**: full

**Commit**: `feat(store): migrate existing game competitions into the collection`

---

### T3: Add the competitions manager popup

**What**: List and create, in a popup.
**Where**: `src/components/CompetitionsPopup.jsx` (new), `src/components/__tests__/CompetitionsPopup.test.jsx` (new)
**Depends on**: T1
**Reuses**: `PopupShell` from `13`; the inline-error pattern from `GameSavePopup`
**Requirement**: COMP-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] The popup renders through `PopupShell`, with the create form or actions in the footer (dependency on `13` — do not hand-roll the overlay)
- [x] Every stored competition is listed (AC COMP-03.1)
- [x] Submitting a name adds it and the list updates without a reload (AC COMP-03.2) — re-read from the service, per AD-004
- [x] An empty list renders the invitation state (AC COMP-03.7)
- [x] A rejected name renders the reason and keeps the typed value in the field (AC COMP-03.8) — assert the input value, not only the message
- [x] A long name wraps rather than overflowing (edge case)
- [x] A storage-quota failure surfaces an error rather than appearing to succeed (edge case)
- [x] A 20-item list scrolls inside the shell with the create form still reachable (regression guard on `13` POPUP-02)
- [x] Gate passes: `npx vitest run src/components/__tests__/CompetitionsPopup.test.jsx`
- [x] Test count: 12+ tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(competitions): add the competitions manager popup`

---

### T4: Rename with cascade

**What**: Renaming a competition updates every game carrying the old name.
**Where**: `src/services/competitionService.js` (modify), `src/components/CompetitionsPopup.jsx` (modify)
**Depends on**: T3
**Reuses**: `gameService`; the hand-wired cascade pattern from `08`/`09` (`ratingService.removeByPlayer` and friends)
**Requirement**: COMP-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Renaming updates every game whose `competition` matches the old name (AC COMP-04.3) — assert with two matching games and one non-matching game, so a blanket update fails the test
- [x] The match is exact on the stored string; a game whose name differs by case is reported in the affected count and updated too, matching how the migration collapsed them
- [x] Games with no competition are untouched
- [x] A rename colliding with another competition is rejected before anything is written (edge case) — assert the games collection is unchanged after the rejection
- [x] A pure case change is allowed and cascades (edge case)
- [x] The rename is awaited before the list re-reads (AD-004; the defect class `12` fixes)
- [x] Gate passes: `npm test`
- [x] Test count: 10+ tests pass

**Tests**: unit + component
**Gate**: full

**Commit**: `feat(competitions): cascade a rename to the games that use it`

---

### T5: Delete with a counted confirmation, wired into the Games page

**What**: Delete behind a confirmation that states the impact, reachable from the page.
**Where**: `src/components/CompetitionsPopup.jsx` (modify), `src/pages/Games.jsx` (modify), `src/pages/__tests__/Games.test.jsx` (modify)
**Depends on**: T4
**Reuses**: `ConfirmationPopup`
**Requirement**: COMP-05, COMP-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] A "Competitions" control in the Games page header opens the manager (AC COMP-03.1)
- [x] Requesting a delete opens a confirmation naming how many games use that competition (AC COMP-05.4) — assert the number, with a fixture of two matching games
- [x] Confirming removes the competition and leaves every game's stored `competition` string untouched (AC COMP-05.5) — assert the games, which is the whole point of the chosen trade-off
- [x] Cancelling changes nothing (AC COMP-05.6)
- [x] A competition used by zero games states zero in the confirmation, not a blank
- [x] Closing the manager returns to the page with no other state disturbed
- [x] Gate passes: `npm run lint && npm run build && npm test`
- [x] Test count: 12+ tests pass

**Tests**: integration
**Gate**: build

**Commit**: `feat(competitions): delete a competition with a counted confirmation`

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
| T4: Rename cascade | 1 service method + its UI | ⚠️ OK — the cascade is the behaviour; shipping the method without a caller ships dead code |
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
