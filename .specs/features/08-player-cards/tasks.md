# Player Cards Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/08-player-cards/spec.md`
**Design**: not required
**Status**: Draft
**Batches**: 5 tasks → 1 batch, execute inline (no sub-agents)

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

### Phase 1: Data and capture

```
T1 → T2
```

### Phase 2: Aggregation and display

```
T3 → T4 → T5
```

---

## Task Breakdown

### T1: Create the card service

**What**: A `cards` collection with CRUD and cascade deletes.
**Where**: `src/services/cardService.js` (new), `src/services/store.js` (modify)
**Depends on**: None
**Reuses**: `src/services/store.js`, `src/lib/id.js`; the service shape of `gameService` from `07` T2
**Requirement**: CARD-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `cards` is registered as a store collection
- [ ] `record({ playerId, gameId, type })` persists with `newId()`; `type` is `"yellow"` or `"red"` only (AC CARD-01.1, CARD-01.3)
- [ ] Recording for a player not in the game's team is rejected (AC CARD-01.2)
- [ ] `remove(id)` deletes exactly one record, leaving the player's others intact (AC CARD-01.4)
- [ ] `getByGame(gameId)` and `getByPlayer(playerId)` return copies (AD-004)
- [ ] Deleting a game cascades to its cards — wire into `gameService.delete` (AC CARD-01.5)
- [ ] Deleting a player cascades to their cards — wire into `teamService.deletePlayer` (edge case)
- [ ] Two cards for the same player in the same game are both retained (edge case)
- [ ] Records survive a reload (AC CARD-01.6)
- [ ] Gate passes: `npx vitest run src/services/__tests__/cardService.test.js`
- [ ] Test count: 15 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(cards): add card service with cascade deletes`

---

### T2: Add card capture to the game result flow

**What**: A per-player card editor inside the result popup.
**Where**: `src/components/GameCardsSection.jsx` (new), `src/components/GameResultPopup.jsx` (modify)
**Depends on**: T1
**Reuses**: `src/services/cardService.js`; the squad list from `teamService`; `@tabler/icons-react`
**Requirement**: CARD-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The result popup lists the game team's squad with yellow and red controls per player
- [ ] Adding a card persists it against that `(player, game)` pair
- [ ] Removing a card deletes only that record
- [ ] Existing cards for the game are shown when the popup reopens
- [ ] Cards persist independently of the scoreline — clearing a result leaves cards intact (edge case)
- [ ] A game with no team, or a team with no players, renders an empty state rather than an empty control block
- [ ] Gate passes: `npx vitest run src/components/__tests__/GameCardsSection.test.jsx`
- [ ] Test count: 11 tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(cards): capture cards in the game result flow`

---

### T3: Create the card aggregation logic

**What**: Pure functions turning card records into per-player totals and a warning level.
**Where**: `src/lib/playerCards.js` (new)
**Depends on**: T2
**Reuses**: nothing
**Requirement**: CARD-03, CARD-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `cardTotals(cards, playerId)` returns `{ yellow, red }` (AC CARD-04.1)
- [ ] A player with no cards returns zeros, not `undefined` (AC CARD-04.2)
- [ ] `SUSPENSION_THRESHOLD` is exported as a single named constant (AC CARD-05.5)
- [ ] `suspensionStatus(totals)` returns `none` below the band, `approaching` at one below the threshold, `suspended` at or above it (AC CARD-05.1, CARD-05.2)
- [ ] Any red card returns `suspended` regardless of yellow count (AC CARD-05.3)
- [ ] Changing the threshold constant changes every boundary — tested by importing the constant, not hard-coding 5 in the test
- [ ] Totals count only cards from games belonging to the player's team (AC CARD-04.4)
- [ ] More reds than games still returns a valid status (edge case)
- [ ] Input is not mutated (AD-004)
- [ ] Gate passes: `npx vitest run src/lib/__tests__/playerCards.test.js`
- [ ] Test count: 14 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(cards): add card aggregation and suspension logic`

---

### T4: Show card totals on the player card

**What**: Render yellow and red totals alongside the existing stats.
**Where**: `src/components/PlayerCard.jsx` (modify)
**Depends on**: T3
**Reuses**: `src/lib/playerCards.js`, `src/services/cardService.js`; the existing stat-block markup
**Requirement**: CARD-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Yellow and red totals render beside Goals and Conceded Goals (AC CARD-04.1)
- [ ] A player with no cards shows `0`, not blank (AC CARD-04.2)
- [ ] Totals recompute after a card is added or removed, with no page reload (AC CARD-04.3)
- [ ] Cards follow a player moved between teams, staying attached to the games they occurred in (edge case)
- [ ] Gate passes: `npx vitest run src/components/__tests__/PlayerCard.test.jsx`
- [ ] Test count: 9 tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(cards): show card totals on the player card`

---

### T5: Add the suspension warning

**What**: Surface the warning level on the player card.
**Where**: `src/components/PlayerCard.jsx` (modify), `src/pages/Teams.jsx` (modify)
**Depends on**: T4
**Reuses**: `suspensionStatus` from T3
**Requirement**: CARD-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `approaching` renders a distinct amber warning naming how many yellows remain (AC CARD-05.1)
- [ ] `suspended` renders a distinct red warning (AC CARD-05.2)
- [ ] A red card triggers the suspended warning regardless of yellows (AC CARD-05.3)
- [ ] `none` renders no warning at all (AC CARD-05.4)
- [ ] The warning is conveyed by text as well as colour — not colour alone
- [ ] The players list marks suspended players so the coach sees it without opening each card
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 17 tests pass (13 component + 4 integration)

**Tests**: component + integration
**Gate**: build

**Commit**: `feat(cards): add suspension warnings to the player card`

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
| T1: Card service | 1 module + 2 cascade hooks | ⚠️ OK — cascades are the service's own invariant; splitting ships orphan-producing deletes |
| T2: Capture UI | 1 component + 1 mount point | ⚠️ OK — the section is unreachable without its host |
| T3: Aggregation | 2 pure functions + 1 constant | ✅ Granular |
| T4: Totals display | 1 component | ✅ Granular |
| T5: Warnings | 1 component + 1 list marker | ⚠️ OK — same warning logic in two views |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | Phase 1 → Phase 2 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Service | unit | unit | ✅ OK |
| T2 | Component | component | component | ✅ OK |
| T3 | Pure logic | unit | unit | ✅ OK |
| T4 | Component | component | component | ✅ OK |
| T5 | Component + Page | integration (highest) | component + integration | ✅ OK |
