# Player Ratings Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/09-player-ratings/spec.md`
**Design**: ⚠️ **required before Execute** — run the skill's Design phase first; see Design Notes below
**Status**: Draft
**Batches**: 9 tasks → 2 batches (Phases 1–2 = 6 tasks, Phase 3 = 3 tasks). Sub-agent offer applies.

---

## Design Notes

Open questions to settle in the Design phase, before T1.

1. **Event reference shape.** A rating points at either a training or a game.
   One nullable field per type, or a `(eventType, eventId)` pair? The pair keeps
   the collection uniform and is what the spec's key assumes — confirm it does
   not make the cascade deletes awkward.
2. **Aggregation placement.** `08-player-cards` put aggregation in `src/lib/`
   and left the service thin. Ratings need event **dates** to compute form,
   which live on the training and game records — so the aggregator needs either
   joined input or a service that does the join. Decide which, because it sets
   the function signature every consumer uses.
3. **Recompute cost.** `11-dashboard` will ask for averages across a whole squad
   at once. Decide whether the aggregator takes one player or a batch; a
   per-player call inside a `.map()` re-scans the collection per player.
4. **Shared cascade mechanism.** This is the second feature needing "delete my
   records when the parent dies" (after `08` cards). Decide whether to extract a
   shared cascade registry in the store or keep wiring hooks per service. Two
   instances is the point where the pattern is worth naming.
5. **Rating input affordance.** Number input, slider, or a 0–10 button row.
   Affects how fast a 25-player squad can be rated — the feature's stated
   success criterion.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `CLAUDE.md`, `docs/03-architecture.md`, `docs/04-data-model.md`. No testing standards documented; strong defaults applied.

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
| Full | After tasks touching pages or multiple layers | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Data and aggregation

```
T1 → T2
```

### Phase 2: Capture

```
T3 → T4 → T5 → T6
```

### Phase 3: Display

```
T7 → T8 → T9
```

---

## Task Breakdown

### T1: Create the rating service

**What**: A `ratings` collection with upsert semantics and cascade deletes.
**Where**: `src/services/ratingService.js` (new), `src/services/store.js` (modify)
**Depends on**: None
**Reuses**: `src/services/store.js`, `src/lib/id.js`; the service and cascade shape of `cardService` from `08` T1
**Requirement**: RATE-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `ratings` is registered as a store collection
- [ ] `setRating({ playerId, eventType, eventId, value })` persists with `newId()` (AC RATE-01.2)
- [ ] Re-rating the same `(playerId, eventType, eventId)` **overwrites** rather than appending (AC RATE-01.4)
- [ ] A value outside 0–10, or non-integer, is rejected (AC RATE-01.5)
- [ ] A value of exactly `0` is stored and retrievable as a real rating (edge case: null-vs-zero)
- [ ] `getByEvent(eventType, eventId)` and `getByPlayer(playerId)` return copies (AD-004)
- [ ] `remove(id)` deletes one record
- [ ] Deleting a training or game cascades to its ratings — wire into `trainingService.delete` and `gameService.delete` (edge case)
- [ ] Deleting a player cascades to their ratings (edge case)
- [ ] Records survive a reload (AC RATE-01.6)
- [ ] Gate passes: `npx vitest run src/services/__tests__/ratingService.test.js`
- [ ] Test count: 17 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(ratings): add rating service with upsert and cascade deletes`

---

### T2: Create the rating aggregation logic

**What**: Pure functions for season average, recent form and ranking.
**Where**: `src/lib/playerRatings.js` (new)
**Depends on**: T1
**Reuses**: nothing
**Requirement**: RATE-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `average(ratings)` returns the mean to one decimal place (AC RATE-03.1)
- [ ] No ratings returns `null`, not `0` — so the UI can render "—" (AC RATE-03.2)
- [ ] A rating of `0` is included in the mean (edge case: null-vs-zero)
- [ ] `form(ratings, events, n = 5)` averages the last `n` rated events by **event date**, most recent first (AC RATE-03.3)
- [ ] Fewer than `n` rated events computes over what exists and returns the count alongside (AC RATE-03.4)
- [ ] Events sharing a date order deterministically (edge case)
- [ ] Filtering to `training` or `game` only produces the corresponding subset figures (AC RATE-02.4)
- [ ] `rankSquad(players, ratings)` orders by average descending, unrated players last — never treated as 0 (AC RATE-09.3)
- [ ] Equal averages order deterministically (AC RATE-09.2)
- [ ] Input is not mutated (AD-004)
- [ ] Gate passes: `npx vitest run src/lib/__tests__/playerRatings.test.js`
- [ ] Test count: 18 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(ratings): add average, form and ranking logic`

---

### T3: Create the rating input control

**What**: A single-player 0–10 input.
**Where**: `src/components/RatingInput.jsx` (new)
**Depends on**: T2
**Reuses**: Tailwind form patterns per AD-005
**Requirement**: RATE-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Accepts whole numbers 0–10 and emits the value on change
- [ ] Values outside the range cannot be entered or are rejected with a message (AC RATE-01.5)
- [ ] An unset control renders as empty, distinguishable from `0` (edge case: null-vs-zero)
- [ ] Clearing a set value emits `null`, not `0` (AC RATE-01.3)
- [ ] Operable by keyboard and correctly labelled for screen readers
- [ ] Gate passes: `npx vitest run src/components/__tests__/RatingInput.test.jsx`
- [ ] Test count: 9 tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(ratings): add rating input control`

---

### T4: Create the squad rating view

**What**: One popup rating a whole squad for one event.
**Where**: `src/components/SquadRatingPopup.jsx` (new)
**Depends on**: T3
**Reuses**: `RatingInput`, `ratingService`, `teamService`; the `*Popup` overlay pattern
**Requirement**: RATE-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Lists every player in the event's team with a `RatingInput` (AC RATE-01.1)
- [ ] Submitting persists one record per rated player (AC RATE-01.2)
- [ ] Players left blank produce **no record** (AC RATE-01.3) — assert the record count, not just the absence of a value
- [ ] Existing ratings for the event pre-fill the inputs (AC RATE-02.5)
- [ ] Re-submitting overwrites rather than duplicating (AC RATE-01.4)
- [ ] A 30-player squad scrolls within the popup without pushing the actions off-screen (edge case)
- [ ] Cancelling persists nothing
- [ ] A team with no players renders an empty state
- [ ] Gate passes: `npx vitest run src/components/__tests__/SquadRatingPopup.test.jsx`
- [ ] Test count: 13 tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(ratings): add squad rating popup`

---

### T5: Rate from a training

**What**: A rating action in the training details flow.
**Where**: `src/components/TrainingDetailsPopup.jsx` (modify), `src/pages/Trainings.jsx` (modify)
**Depends on**: T4
**Reuses**: `SquadRatingPopup`
**Requirement**: RATE-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The details popup offers a "Rate squad" action (AC RATE-02.1)
- [ ] It opens `SquadRatingPopup` for that training, with `eventType: "training"` (AC RATE-02.3)
- [ ] Ratings persist against that specific training and survive reload
- [ ] Reopening shows the previously entered ratings (AC RATE-02.5)
- [ ] The existing Edit, Delete and Close actions still work — regression guard on `06`
- [ ] Gate passes: `npm test`
- [ ] Test count: 10 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(ratings): rate a squad from the training details view`

---

### T6: Rate from a game

**What**: A rating action in the game result flow.
**Where**: `src/components/GameResultPopup.jsx` (modify), `src/pages/Games.jsx` (modify)
**Depends on**: T5
**Reuses**: `SquadRatingPopup`
**Requirement**: RATE-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The result popup offers a "Rate squad" action (AC RATE-02.2)
- [ ] It opens `SquadRatingPopup` with `eventType: "game"` (AC RATE-02.3)
- [ ] Ratings persist independently of the scoreline — clearing a result leaves ratings intact
- [ ] Ratings and cards (from `08` T2) coexist in the same flow without interfering
- [ ] A training rating and a game rating for the same player are distinguishable (AC RATE-02.4)
- [ ] Gate passes: `npm test`
- [ ] Test count: 18 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(ratings): rate a squad from the game result view`

---

### T7: Show average and form on the player card

**What**: Surface the two headline figures.
**Where**: `src/components/PlayerCard.jsx` (modify)
**Depends on**: T6
**Reuses**: `src/lib/playerRatings.js`, `ratingService`; the stat-block markup extended in `08` T4
**Requirement**: RATE-07

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The mean rating renders to one decimal place (AC RATE-03.1)
- [ ] A player with no ratings renders "—", never `0.0` (AC RATE-03.2)
- [ ] Form renders as the last-5 mean with its event count labelled (AC RATE-03.3, RATE-03.4)
- [ ] Both figures recompute after a rating changes, with no page reload (AC RATE-03.5)
- [ ] Card totals from `08` still render — regression guard
- [ ] Gate passes: `npx vitest run src/components/__tests__/PlayerCard.test.jsx`
- [ ] Test count: 18 tests pass (13 carried from `08` T5 + 5 new)

**Tests**: component
**Gate**: quick

**Commit**: `feat(ratings): show average and form on the player card`

---

### T8: Add the rating history view

**What**: A per-player list of individual ratings, with delete.
**Where**: `src/components/PlayerRatingHistory.jsx` (new), `src/components/PlayerCard.jsx` (modify)
**Depends on**: T7
**Reuses**: `ratingService`, `src/lib/datetime.js`
**Requirement**: RATE-08

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Lists each rated event with date, type and value, most recent first (AC RATE-08.1)
- [ ] Deleting an entry recomputes the average and form immediately (AC RATE-08.2)
- [ ] No ratings renders an empty-state message (AC RATE-08.3)
- [ ] A rating of `0` renders as `0`, not as blank (edge case)
- [ ] Training and game entries are visually distinguishable
- [ ] Gate passes: `npx vitest run src/components/__tests__/PlayerRatingHistory.test.jsx`
- [ ] Test count: 10 tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(ratings): add per-player rating history`

---

### T9: Add the squad ranking view

**What**: Rank the selected team by average rating.
**Where**: `src/components/SquadRanking.jsx` (new), `src/pages/Teams.jsx` (modify)
**Depends on**: T8
**Reuses**: `rankSquad` from T2
**Requirement**: RATE-09

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Lists the selected team's players ordered by average, highest first (AC RATE-09.1)
- [ ] Unrated players sort last and show "—", never a 0 average (AC RATE-09.3)
- [ ] Equal averages order deterministically (AC RATE-09.2)
- [ ] A training-only / game-only toggle recomputes the order from that subset (AC RATE-09.4)
- [ ] A team with no rated players renders an empty state rather than an arbitrary order
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 16 tests pass (11 component + 5 integration)

**Tests**: component + integration
**Gate**: build

**Commit**: `feat(ratings): add squad ranking by average rating`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ──→ T2
Phase 2:  T3 ──→ T4 ──→ T5 ──→ T6
Phase 3:  T7 ──→ T8 ──→ T9

Batch 1 (worker A): Phases 1–2 = T1..T6  (6 tasks)
Batch 2 (worker B): Phase 3    = T7..T9  (3 tasks)
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Rating service | 1 module + cascade hooks | ⚠️ OK — cascades are the service's own invariant |
| T2: Aggregation | 3 pure functions, 1 file | ✅ Granular |
| T3: Rating input | 1 component | ✅ Granular |
| T4: Squad rating popup | 1 component | ✅ Granular |
| T5: Training entry point | 1 component + 1 page | ⚠️ OK — a trigger and its host |
| T6: Game entry point | 1 component + 1 page | ⚠️ OK — same rationale |
| T7: Card figures | 1 component | ✅ Granular |
| T8: History view | 1 component + 1 mount | ⚠️ OK — unreachable without its host |
| T9: Ranking | 1 component + 1 mount | ⚠️ OK — same rationale |

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

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Service | unit | unit | ✅ OK |
| T2 | Pure logic | unit | unit | ✅ OK |
| T3 | Component | component | component | ✅ OK |
| T4 | Component | component | component | ✅ OK |
| T5 | Component + Page | integration (highest) | integration | ✅ OK |
| T6 | Component + Page | integration (highest) | integration | ✅ OK |
| T7 | Component | component | component | ✅ OK |
| T8 | Component | component | component | ✅ OK |
| T9 | Component + Page | integration (highest) | component + integration | ✅ OK |
