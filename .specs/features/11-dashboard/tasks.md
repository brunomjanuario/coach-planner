# Dashboard Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/11-dashboard/spec.md`
**Design**: ⚠️ **required before Execute** — run the skill's Design phase first; see Design Notes below
**Status**: Draft
**Batches**: 8 tasks → 2 batches (Phases 1–2 = 5 tasks, Phase 3 = 3 tasks). Sub-agent offer applies.

---

## Design Notes

Open questions to settle in the Design phase, before T1.

1. **One aggregator or several.** Every tile reads from a different collection.
   A single `dashboardStats(filter)` that loads everything once is efficient but
   couples all eight tiles into one function; per-tile selectors are cleaner but
   re-read the store repeatedly. This is the main structural decision.
2. **Loading semantics.** Every current page loads via `useEffect` + `useState`
   with no loading flag, which is why AC DASH edge-case "renders a loading state
   rather than zeros" has nothing to build on. Decide whether to introduce a
   small loading convention here — and if so, whether it is worth retrofitting.
3. **Reuse of existing aggregators.** `08` built `playerCards.js` and `09` built
   `playerRatings.js`. Confirm their signatures serve a batch/squad-wide call
   (design note 3 in `09` flagged exactly this) or whether the dashboard needs
   batch variants.
4. **Tile composition.** `StatTile` and `LeaderTile` are proposed as two
   components. Check whether the next-event tile is a third shape or a
   configuration of `StatTile` — building three where two would do is the more
   likely error here.
5. **Whether the dashboard owns a team filter at all.** Three pages now have one.
   Decide whether to extract a shared `TeamFilter` component before adding a
   fourth copy.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `CLAUDE.md`, `docs/03-architecture.md`, `docs/06-routing-and-pages.md` (Home described as a placeholder). No testing standards documented; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Pure logic (`src/lib/*.js`) | unit | All branches; 1:1 to spec ACs; every listed edge case | `src/lib/__tests__/*.test.js` | `npm test` |
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

### Phase 1: Aggregation and tiles

```
T1 → T2 → T3
```

### Phase 2: Core tiles wired

```
T4 → T5
```

### Phase 3: Next event, ratings and filter

```
T6 → T7 → T8
```

---

## Task Breakdown

### T1: Create the dashboard aggregation logic

**What**: Pure functions producing every tile's figures from the stored collections.
**Where**: `src/lib/dashboardStats.js` (new)
**Depends on**: None
**Reuses**: `src/lib/playerCards.js` (`08` T3), `src/lib/playerRatings.js` (`09` T2)
**Requirement**: DASH-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `counts(data, teamId?)` returns team, training and game counts, trainings split past/upcoming and games split played/upcoming (AC DASH-01.1–3)
- [ ] `topScorers(players, n)` returns the top `n` by goals, **excluding zero-goal players** (AC DASH-05.6) — the tile must never show a "leader" on 0
- [ ] `topCarded(players, cards, n)` returns the top `n` by total cards with yellows and reds separate (AC DASH-05.3)
- [ ] `topRated(players, ratings, n)` excludes unrated players rather than ranking them as 0 (AC DASH-07.2)
- [ ] Ties return **all** tied entries, ordered deterministically by name (AC DASH-05.4)
- [ ] A tie of 20+ is capped with an overflow count rather than returned unbounded (edge case)
- [ ] `nextEvent(trainings, games)` returns the soonest future event across both types, or `null` (AC DASH-06.1, DASH-06.2)
- [ ] An invalid date is skipped and the following event returned (edge case)
- [ ] Events sharing the soonest timestamp resolve deterministically (AC DASH-06.5)
- [ ] Players whose team was deleted are excluded from leader results (edge case)
- [ ] Unassigned trainings and games are excluded from a filtered result but counted unfiltered (edge case)
- [ ] Every function returns an empty/`null` result rather than `NaN` or `undefined` for empty input
- [ ] Input is not mutated (AD-004)
- [ ] Gate passes: `npx vitest run src/lib/__tests__/dashboardStats.test.js`
- [ ] Test count: 26 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(dashboard): add dashboard aggregation logic`

---

### T2: Create the stat tile component

**What**: A tile rendering a headline figure with an optional breakdown and empty state.
**Where**: `src/components/StatTile.jsx` (new)
**Depends on**: T1
**Reuses**: The `border px-3 py-2 rounded-2xl` tile markup already in `pages/Home.jsx`
**Requirement**: DASH-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Renders a label, a primary value and an optional breakdown line
- [ ] A `null` or zero value renders "No data yet" plus a link to the creating page (AC DASH-04.4)
- [ ] A loading state renders a placeholder rather than `0` (edge case)
- [ ] The tile is keyboard-focusable when it carries a link
- [ ] Gate passes: `npx vitest run src/components/__tests__/StatTile.test.jsx`
- [ ] Test count: 8 tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(dashboard): add stat tile component`

---

### T3: Create the leader tile component

**What**: A tile rendering a ranked top-N list with ties and empty state.
**Where**: `src/components/LeaderTile.jsx` (new)
**Depends on**: T2
**Reuses**: `StatTile`'s empty-state and shell conventions
**Requirement**: DASH-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Renders up to 3 entries with rank, name and value (AC DASH-05.1)
- [ ] Tied entries all render, sharing a rank number (AC DASH-05.4)
- [ ] Fewer than 3 entries renders only those, never padded (AC DASH-05.6)
- [ ] An empty list renders "No data yet" (AC DASH-05.5)
- [ ] An overflowing tie renders the cap indicator from T1 (edge case)
- [ ] Supports a two-part value so the cards tile can show yellows and reds separately (AC DASH-05.3)
- [ ] Gate passes: `npx vitest run src/components/__tests__/LeaderTile.test.jsx`
- [ ] Test count: 10 tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(dashboard): add leader tile component`

---

### T4: Wire the count tiles

**What**: Replace the Teams, Training and Games placeholders with real counts.
**Where**: `src/pages/Home.jsx` (modify)
**Depends on**: T3
**Reuses**: `StatTile`, `dashboardStats.counts`, the three services
**Requirement**: DASH-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The Teams tile shows the team count (AC DASH-04.1)
- [ ] The Trainings tile shows the total split past/upcoming (AC DASH-04.2)
- [ ] The Games tile shows the total split played/upcoming (AC DASH-04.3)
- [ ] A zero count renders the signposted empty state (AC DASH-04.4)
- [ ] Revisiting after creating a record elsewhere shows updated counts (AC DASH-04.5)
- [ ] The existing 3×2 grid layout is preserved
- [ ] Gate passes: `npm test`
- [ ] Test count: 11 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(dashboard): wire the count tiles to real data`

---

### T5: Wire the leader tiles

**What**: Replace the Most Goals, Most Games and Most Cards placeholders.
**Where**: `src/pages/Home.jsx` (modify)
**Depends on**: T4
**Reuses**: `LeaderTile`, `dashboardStats`, `cardService`
**Requirement**: DASH-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Most Goals lists the top 3 scorers with totals (AC DASH-05.1)
- [ ] Most Games shows games played per team, **labelled** as team appearances rather than individual ones (AC DASH-05.2) — the assumption that would otherwise mislead
- [ ] Most Cards lists the top 3 with yellows and reds separate (AC DASH-05.3)
- [ ] All-zero data renders the empty state, not three players tied on zero (edge case)
- [ ] Ties render every tied player (AC DASH-05.4)
- [ ] Gate passes: `npm test`
- [ ] Test count: 19 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(dashboard): wire the leader tiles to real data`

---

### T6: Add the next-event tile

**What**: A clickable tile showing the soonest upcoming training or game.
**Where**: `src/pages/Home.jsx` (modify)
**Depends on**: T5
**Reuses**: `dashboardStats.nextEvent`; the deep-link routes from `10` T5 and T6
**Requirement**: DASH-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Shows the soonest future event with date, time, type and team (AC DASH-06.1)
- [ ] Picks correctly across both trainings and games (AC DASH-06.2)
- [ ] Clicking navigates to that record via `?training=` or `?game=` (AC DASH-06.3)
- [ ] No future events renders a message linking to the calendar (AC DASH-06.4)
- [ ] The tile is keyboard-activatable
- [ ] Gate passes: `npm test`
- [ ] Test count: 26 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(dashboard): add the next event tile`

---

### T7: Add the rating tile

**What**: Top-rated players on the dashboard.
**Where**: `src/pages/Home.jsx` (modify)
**Depends on**: T6
**Reuses**: `LeaderTile`, `dashboardStats.topRated`, `ratingService`
**Requirement**: DASH-07

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Lists the top 3 by average rating with their averages to one decimal (AC DASH-07.1)
- [ ] Unrated players are excluded, never ranked as 0 (AC DASH-07.2)
- [ ] No ratings renders the empty state (AC DASH-07.3)
- [ ] The grid accommodates the extra tiles without breaking the layout
- [ ] Gate passes: `npm test`
- [ ] Test count: 31 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(dashboard): add the top-rated players tile`

---

### T8: Add the team filter

**What**: Scope every tile to one team.
**Where**: `src/pages/Home.jsx` (modify)
**Depends on**: T7
**Reuses**: The team `<select>` from `03` T1, or the shared `TeamFilter` if Design extracted one
**Requirement**: DASH-08

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Selecting a team recomputes every tile for that team (AC DASH-08.1)
- [ ] Clearing recomputes across all teams (AC DASH-08.2)
- [ ] A team with no data shows every tile's empty state, never stale figures (AC DASH-08.3) — the most likely bug in this task
- [ ] Filter changes recompute with no page reload (AC DASH-08.4)
- [ ] Unassigned trainings and games are excluded when filtered, counted when not (edge case)
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 39 tests pass

**Tests**: integration
**Gate**: build

**Commit**: `feat(dashboard): add team filter across all tiles`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ──→ T2 ──→ T3
Phase 2:  T4 ──→ T5
Phase 3:  T6 ──→ T7 ──→ T8

Batch 1 (worker A): Phases 1–2 = T1..T5  (5 tasks)
Batch 2 (worker B): Phase 3    = T6..T8  (3 tasks)
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Aggregation | 5 pure functions, 1 file | ⚠️ OK — cohesive; every function feeds the same page and shares its filter argument |
| T2: Stat tile | 1 component | ✅ Granular |
| T3: Leader tile | 1 component | ✅ Granular |
| T4: Count tiles | 1 page, 3 tiles | ✅ Granular |
| T5: Leader tiles | 1 page, 3 tiles | ✅ Granular |
| T6: Next event tile | 1 page, 1 tile | ✅ Granular |
| T7: Rating tile | 1 page, 1 tile | ✅ Granular |
| T8: Team filter | 1 page, 1 control | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | Phase 1 → Phase 2 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | Phase 2 → Phase 3 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Pure logic | unit | unit | ✅ OK |
| T2 | Component | component | component | ✅ OK |
| T3 | Component | component | component | ✅ OK |
| T4 | Page | integration | integration | ✅ OK |
| T5 | Page | integration | integration | ✅ OK |
| T6 | Page | integration | integration | ✅ OK |
| T7 | Page | integration | integration | ✅ OK |
| T8 | Page | integration | integration | ✅ OK |
