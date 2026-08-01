# Games & League Table Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/07-games-league-table/spec.md`
**Design**: ⚠️ **required before Execute** — run the skill's Design phase first; see Design Notes below
**Status**: Draft
**Batches**: 10 tasks → 2 batches (Phases 1–2 = 6 tasks, Phase 3 = 4 tasks). Sub-agent offer applies.

---

## Design Notes

**Resolved in `design.md` (approved) — see that file for full rationale:**

1. **Result representation**: two flat nullable fields, `usScore` / `themScore`
   (user-confirmed over a nested `result` object, for simpler form binding).
   This reintroduces the null-vs-zero risk the spec warns about, so a new
   `src/lib/gameResult.js` centralizes the check: `hasResult(game)` and
   `deriveOutcome(game)`. **Every task below that checks "has a result" or
   computes win/draw/loss MUST call these — never inline-compare
   `usScore`/`themScore`.**
2. **Outcome storage**: derived on read via `deriveOutcome()`, never persisted
   (AC GAME-06.3).
3. **Standings storage**: a dedicated `standings` collection holding **rival
   rows only** (user-confirmed). Our row is always computed from `games` via
   `computeOurRow()` — never written to the store, no flag, no sync step.
4. **Opponent identity**: independent free text on both `Game.opponent` and
   the rival row's `name` — no linkage. The only required cross-check is a
   rival name duplicating **our own team's** label, not the opponent field.
5. **Competition field**: free text, no enum.
6. **Shared list-page shape**: duplicate the filter + two-bucket JSX structure
   from `Trainings.jsx` into `Games.jsx` rather than extracting a shared
   layout component (consistent with existing precedent and "no abstraction
   for a second use case").

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `CLAUDE.md`, `docs/03-architecture.md` (layer boundaries), `docs/04-data-model.md`. No testing standards documented; strong defaults applied.

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
| Build | After phase completion or seed-only tasks | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Data layer

```
T1 → T2
```

### Phase 2: Fixture management

```
T3 → T4 → T5 → T6
```

### Phase 3: Standings

```
T7 → T8 → T9 → T10
```

---

## Task Breakdown

### T1: Define the Game shape and register its collection

**What**: Add `games` to the seed and to the store's collection and date-field registries.
**Where**: `src/model/seed.js` (modify), `src/services/store.js` (modify)
**Depends on**: None
**Reuses**: The collection registration pattern from `01-persistence-layer` T4
**Requirement**: GAME-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `createSeed()` returns a `games` array alongside `teams` and `trainings`
- [ ] The seed contains at least one scheduled and one played game so every later task has a fixture to work with
- [ ] `games[].date` is registered as a date field so it revives as a `Date` (regression guard on `01` PERSIST-05)
- [ ] A game record carries `id`, `teamId`, `opponent`, `date`, `isHome`, `competition`, `usScore`, `themScore`
- [ ] A scheduled game has `usScore: null, themScore: null`; a played game holds both as numbers
- [ ] The seed's played game round-trips through the store with its scores intact
- [ ] Gate passes: `npm run lint && npm run build && npm test`

**Tests**: none (matrix: seed data → none) — exercised through T2
**Gate**: build

**Commit**: `feat(games): add Game shape to seed and store registry`

---

### T2: Create the null-vs-zero guard and the game service

**What**: A pure `hasResult`/`deriveOutcome` helper, then CRUD over the `games` collection built on top of it.
**Where**: `src/lib/gameResult.js` (new), `src/services/gameService.js` (new)
**Depends on**: T1
**Reuses**: `src/services/store.js`, `src/lib/id.js`; the method shape of `trainingService` after `01` T7
**Requirement**: GAME-02, GAME-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `hasResult(game)` returns `true` iff **both** `usScore` and `themScore` are not `null`/`undefined`; `0`–`0` → `true` (edge case: the null-vs-zero trap)
- [ ] `deriveOutcome(game)` returns `null` when `hasResult(game)` is `false`, otherwise `"win"`/`"draw"`/`"loss"` from comparing the two scores (AC GAME-06.3)
- [ ] `getAll()` and `getAll(teamId)` return copies (AD-004)
- [ ] `create(game)` assigns `newId()` and persists with `usScore: null, themScore: null` (AC GAME-01.4, GAME-01.5)
- [ ] `update(game)` persists; unknown id throws `NotFoundError`
- [ ] `delete(id)` persists the removal
- [ ] `recordResult(id, { us, them })` persists both scores
- [ ] `clearResult(id)` sets `usScore` and `themScore` back to `null` (AC GAME-06.5)
- [ ] `getScheduled()` / `getPlayed()` split via `hasResult()`, not date (AC GAME-04.1) — a postponed fixture stays scheduled
- [ ] Games whose `teamId` matches no team are returned by `getUnassigned()` (edge case)
- [ ] Ties on date are ordered deterministically (edge case)
- [ ] Gate passes: `npx vitest run src/lib/__tests__/gameResult.test.js src/services/__tests__/gameService.test.js`
- [ ] Test count: 8 (gameResult) + 18 (gameService) tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(games): add null-vs-zero guard and game service`

---

### T3: Create the game form popup

**What**: A create/edit popup for a fixture.
**Where**: `src/components/GameSavePopup.jsx` (new)
**Depends on**: T2
**Reuses**: The `*Popup` overlay pattern; the team `<select>` built in `03` T1; `src/lib/datetime.js` from `06` T1
**Requirement**: GAME-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Fields for team, opponent, date/time, home/away and competition
- [ ] Submitting persists all five values (AC GAME-03.1)
- [ ] No team chosen blocks submission (AC GAME-03.2) — the `03` bug, not repeated
- [ ] Empty or whitespace-only opponent blocks submission (AC GAME-03.3)
- [ ] `gameService.create` is not called on a blocked submit — assert the spy
- [ ] An optional `game` prop opens the popup in edit mode, pre-filling every field including the date via `toInputValue`
- [ ] Cancelling leaves the store untouched
- [ ] Gate passes: `npx vitest run src/components/__tests__/GameSavePopup.test.jsx`
- [ ] Test count: 13 tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(games): add game form popup`

---

### T4: Create the game row component

**What**: One row rendering a fixture or a result.
**Where**: `src/components/GameRow.jsx` (new)
**Depends on**: T3
**Reuses**: `src/components/SelectableListItem.jsx` from `02-select-team-color`
**Requirement**: GAME-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Renders opponent, locale-formatted date and a home/away indicator (AC GAME-04.5)
- [ ] A played game additionally renders the scoreline (AC GAME-04.6)
- [ ] A played game shows a win/draw/loss indicator derived from the scores, never from a stored field (AC GAME-06.3)
- [ ] A `0`–`0` game renders as a draw, not as unplayed (edge case)
- [ ] A very long opponent name truncates or wraps without breaking the row (edge case)
- [ ] An invalid date renders "Invalid date" rather than crashing
- [ ] Gate passes: `npx vitest run src/components/__tests__/GameRow.test.jsx`
- [ ] Test count: 10 tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(games): add game row component`

---

### T5: Build the Games page

**What**: Replace the placeholder with a team filter and the two game lists.
**Where**: `src/pages/Games.jsx` (rewrite)
**Depends on**: T4
**Reuses**: The filter-list + two-bucket layout from `pages/Trainings.jsx`; `GameRow`; `GameSavePopup`
**Requirement**: GAME-04, GAME-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Upcoming and Played lists render, split on result presence (AC GAME-04.1)
- [ ] A team filter narrows both lists (AC GAME-04.2) and clearing it restores all (AC GAME-04.3)
- [ ] Empty lists render empty-state messages (AC GAME-04.4)
- [ ] An add-game button opens `GameSavePopup`; creating refreshes both lists with no page reload
- [ ] Creating a game outside the active filter keeps the filter and reports where it went — same contract as `03` TTA-04.3
- [ ] Games whose team was deleted surface in an unassigned bucket rather than vanishing (edge case)
- [ ] Rows carry stable `key` props
- [ ] Gate passes: `npm test`
- [ ] Test count: 14 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(games): build the games page with filter and lists`

---

### T6: Add result entry

**What**: A popup for recording, editing and clearing a scoreline.
**Where**: `src/components/GameResultPopup.jsx` (new), `src/pages/Games.jsx` (modify)
**Depends on**: T5
**Reuses**: The `*Popup` overlay pattern; `gameService.recordResult` / `clearResult`
**Requirement**: GAME-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Entering a result moves the game from Upcoming to Played (AC GAME-06.1)
- [ ] Negative or non-numeric scores block submission with a message (AC GAME-06.2)
- [ ] `recordResult` is not called on a blocked submit — assert the spy
- [ ] An existing result pre-fills the popup and updates in place (AC GAME-06.4)
- [ ] Clearing a result returns the game to Upcoming (AC GAME-06.5)
- [ ] Recording `0`–`0` moves the game to Played (edge case)
- [ ] The derived win/draw/loss updates when a result is edited
- [ ] Gate passes: `npm test`
- [ ] Test count: 26 tests pass (14 page + 12 component)

**Tests**: integration
**Gate**: full

**Commit**: `feat(games): add result entry and editing`

---

### T7: Create the standings computation

**What**: A pure function turning played games into a standings row.
**Where**: `src/lib/standings.js` (new)
**Depends on**: T6
**Reuses**: nothing
**Requirement**: GAME-07

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `computeOurRow(games, teamName)` returns played, won, drawn, lost, goalsFor, goalsAgainst, goalDifference and points (AC GAME-07.1)
- [ ] 3 points per win, 1 per draw, 0 per loss (AC GAME-07.2)
- [ ] Scheduled games are excluded from every figure
- [ ] A `0`–`0` game counts as a played draw (edge case)
- [ ] Zero played games returns a row of zeros, not `null` or `NaN` (AC GAME-07.6)
- [ ] `sortStandings(rows)` orders by points, then goal difference, then goals for, then name (AC GAME-07.3)
- [ ] Two rows equal on every tiebreak sort deterministically by name (edge case)
- [ ] Goal difference is derived, never read from input
- [ ] Input is not mutated (AD-004)
- [ ] Gate passes: `npx vitest run src/lib/__tests__/standings.test.js`
- [ ] Test count: 16 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(standings): add standings computation and sorting`

---

### T8: Create the league table component

**What**: Render sorted standings with our row highlighted.
**Where**: `src/components/LeagueTable.jsx` (new)
**Depends on**: T7
**Reuses**: `src/lib/standings.js`; Tailwind table styling per AD-005
**Requirement**: GAME-08

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Renders one row per team with position, name, P, W, D, L, GF, GA, GD, Pts
- [ ] Our row is visually highlighted and its position number shown (AC GAME-08.4)
- [ ] Rows render in the order `sortStandings` produced — the component does not re-sort
- [ ] With only our row present, the table renders a single row at position 1 (AC GAME-07.6)
- [ ] The table scrolls horizontally on narrow viewports rather than overflowing the page
- [ ] Gate passes: `npx vitest run src/components/__tests__/LeagueTable.test.jsx`
- [ ] Test count: 9 tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(standings): add league table component`

---

### T9: Add rival row entry

**What**: Persist and validate manually-entered rival standings rows.
**Where**: `src/services/standingsService.js` (new), `src/components/RivalRowPopup.jsx` (new)
**Depends on**: T8
**Reuses**: `src/services/store.js`, `src/lib/id.js`, the `*Popup` pattern
**Requirement**: GAME-09

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A rival row persists name, played, won, drawn, lost, goalsFor, goalsAgainst (AC GAME-09.1)
- [ ] Points and goal difference are **derived**, never accepted as input (AC GAME-09.2)
- [ ] W + D + L ≠ P blocks submission with a message naming the discrepancy (AC GAME-09.3)
- [ ] The service is not called on a blocked submit — assert the spy
- [ ] Editing or deleting a rival row persists and the table re-sorts (AC GAME-09.4)
- [ ] A rival name matching our own team warns rather than rendering a duplicate row (edge case)
- [ ] Negative figures are rejected
- [ ] Gate passes: `npm test`
- [ ] Test count: 22 tests pass (13 service unit + 9 component)

**Tests**: unit (service) + component (popup)
**Gate**: full

**Commit**: `feat(standings): add rival row entry with validation`

---

### T10: Wire the table into the Games page

**What**: Show the standings alongside the fixtures and keep them in sync.
**Where**: `src/pages/Games.jsx` (modify)
**Depends on**: T9
**Reuses**: `LeagueTable`, `standingsService`, `src/lib/standings.js`
**Requirement**: GAME-10

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The table renders on the Games page, scoped to the selected team
- [ ] Adding, editing or deleting a result recomputes our row with no page reload (AC GAME-07.5)
- [ ] Deleting a played game removes its contribution from the standings (edge case)
- [ ] With no team selected the table renders an instruction to pick one rather than a merged table
- [ ] Adding a rival row re-sorts the table immediately
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 30 tests pass

**Tests**: integration
**Gate**: build

**Commit**: `feat(games): wire the league table into the games page`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ──→ T2
Phase 2:  T3 ──→ T4 ──→ T5 ──→ T6
Phase 3:  T7 ──→ T8 ──→ T9 ──→ T10

Batch 1 (worker A): Phases 1–2 = T1..T6   (6 tasks)
Batch 2 (worker B): Phase 3    = T7..T10  (4 tasks)
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Game shape | Seed + 1 registry entry | ✅ Granular |
| T2: Game service | 1 module | ✅ Granular |
| T3: Game form | 1 component | ✅ Granular |
| T4: Game row | 1 component | ✅ Granular |
| T5: Games page | 1 page | ✅ Granular |
| T6: Result entry | 1 component + wiring | ⚠️ OK — the popup is unreachable without its trigger |
| T7: Standings logic | 2 pure functions, 1 file | ✅ Granular |
| T8: League table | 1 component | ✅ Granular |
| T9: Rival rows | 1 service + 1 popup | ⚠️ OK — the service exists solely for this popup; splitting ships an unreachable collection |
| T10: Wire the table | 1 page | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | Phase 1 → Phase 2 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | Phase 2 → Phase 3 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Seed + store registry | none | none | ✅ OK |
| T2 | Service | unit | unit | ✅ OK |
| T3 | Component | component | component | ✅ OK |
| T4 | Component | component | component | ✅ OK |
| T5 | Page | integration | integration | ✅ OK |
| T6 | Component + Page | integration (highest) | integration | ✅ OK |
| T7 | Pure logic | unit | unit | ✅ OK |
| T8 | Component | component | component | ✅ OK |
| T9 | Service + Component | unit + component | unit + component | ✅ OK |
| T10 | Page | integration | integration | ✅ OK |
