# Games Three-Column Layout Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/19-games-three-column/spec.md`
**Design**: not required
**Status**: Draft
**Batches**: 4 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Column placement and scrolling are asserted as DOM structure and class presence, with a recorded manual check at two breakpoints (candidate lesson L-003).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Pure logic (`src/lib/*.js`) | unit | Selection and ordering, including ties and invalid dates | `src/lib/__tests__/*.test.js` | `npm test` |
| Components (`src/components/*.jsx`) | component | Render + activation + empty state | `src/components/__tests__/*.test.jsx` | `npm test` |
| Pages (`src/pages/*.jsx`) | integration | Layout structure + every listed edge case + `07` regressions | `src/pages/__tests__/*.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After unit/component-only tasks | `npx vitest run <path/to/file>` |
| Full | After tasks touching the page | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Next game

```
T1 → T2
```

### Phase 2: Layout

```
T3 → T4
```

---

## Task Breakdown

### T1: Add next-game selection

**What**: A pure function picking the soonest upcoming game for a scope.
**Where**: `src/lib/gameSchedule.js` (new), `src/lib/__tests__/gameSchedule.test.js` (new)
**Depends on**: None
**Reuses**: `hasResult` from `src/lib/gameResult.js`; the `nextEvent` selection in `src/lib/dashboardStats.js` — reuse its tie-breaking rule rather than inventing a second one
**Requirement**: GLAY-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `nextGame(games, now)` returns the soonest game dated at or after `now`, or `null` when there is none (AC GLAY-04.1, GLAY-04.3)
- [ ] `now` is a parameter, not `new Date()` read inside
- [ ] A tie on timestamp resolves deterministically by id (edge case) — assert with two games at the same instant, in both input orders
- [ ] A game with an invalid date is never selected (edge case)
- [ ] `sortPlayed(games)` returns played games most-recent-first (AC GLAY-05.4), invalid dates last, input not mutated
- [ ] An empty input returns `null` / `[]`, not `undefined`
- [ ] Gate passes: `npx vitest run src/lib/__tests__/gameSchedule.test.js`
- [ ] Test count: 12+ tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(lib): add next-game selection and played-game ordering`

---

### T2: Add the next-game card

**What**: The prominent fixture card for the middle column.
**Where**: `src/components/NextGameCard.jsx` (new), `src/components/__tests__/NextGameCard.test.jsx` (new)
**Depends on**: T1
**Reuses**: `GameRow`'s date formatting and home/away rendering — extract rather than re-implement
**Requirement**: GLAY-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The card shows opponent, home/away, date and time, and competition (AC GLAY-04.2)
- [ ] The team name renders only when the card is given one (the no-filter case) (AC GLAY-04.2)
- [ ] A missing competition renders nothing in that slot rather than an empty separator
- [ ] With no game, the component renders the explicit empty state (AC GLAY-04.3)
- [ ] The card is a focusable control; click and Enter both fire `onSelect` (AC GLAY-04.5)
- [ ] The card is visually distinct from a `GameRow` — assert the distinguishing class, per L-003 name the test for what it asserts
- [ ] Gate passes: `npx vitest run src/components/__tests__/NextGameCard.test.jsx`
- [ ] Test count: 10+ tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(games): add a next-game card`

---

### T3: Restructure the page into three columns

**What**: Teams left, fixtures middle, league table right.
**Where**: `src/pages/Games.jsx` (modify), `src/pages/__tests__/Games.test.jsx` (modify)
**Depends on**: T2
**Reuses**: `NextGameCard`, `LeagueTable`, `RivalRowPopup` — all unchanged, only relocated
**Requirement**: GLAY-01, GLAY-02, GLAY-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Three regions render in source order teams → fixtures → table, so the stacked order matches the column order (AC GLAY-01.1, GLAY-01.2)
- [ ] The teams column is fixed-width; no element carries both `flex-1` and `flex-3` (AC GLAY-01.3, GLAY-01.5)
- [ ] The next-game card renders above the fixtures list and reflects the active team filter (AC GLAY-04.4)
- [ ] Activating the card opens the same popup a list row opens (AC GLAY-04.5)
- [ ] With no team selected, the table column shows the instruction message and the next-game card widens to all teams and shows the team name (edge case)
- [ ] Recording a result, deleting a game and adding a rival row all still work from the new layout (regression guard on `07` GAME requirements)
- [ ] Creating or deleting a game updates the next-game card with no reload (AC GLAY-04.6)
- [ ] The league table scrolls horizontally inside its column rather than widening the page (edge case)
- [ ] Gate passes: `npm test`
- [ ] Test count: 14+ tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(games): lay the page out as teams, fixtures and table`

---

### T4: Uncap and count the fixture sections

**What**: Full lists, counted headings, one page scroll.
**Where**: `src/pages/Games.jsx` (modify)
**Depends on**: T3
**Reuses**: `sortPlayed` from T1; the same treatment `17` T2 applies to trainings
**Requirement**: GLAY-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Twelve games render twelve rows across the two sections, with no per-section cap (AC GLAY-05.1) — assert rendered count equals data length
- [ ] The page-level `h-screen` and the per-list `overflow-y-auto` containers are gone (AC GLAY-05.3)
- [ ] Each heading renders its count (AC GLAY-05.2)
- [ ] The played section is ordered most-recent-first (AC GLAY-05.4)
- [ ] The unassigned section keeps its place and its assignment controls (edge case)
- [ ] A game with an invalid date renders in the played section (edge case)
- [ ] Manual check recorded in the commit body: one vertical scrollbar, and all three regions visible at 1280×800; stacked in order at 480×800
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 10+ tests pass

**Tests**: integration
**Gate**: build

**Commit**: `feat(games): show every fixture and count each section`

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ──→ T2
Phase 2:  T3 ──→ T4
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Selection logic | 1 module, 2 functions | ✅ Granular |
| T2: Card | 1 component | ✅ Granular |
| T3: Columns | 1 page, one structural change | ✅ Granular |
| T4: Sections | 1 page, one visibility change | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | Phase 1 → Phase 2 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Pure logic | unit | unit | ✅ OK |
| T2 | Component | component | component | ✅ OK |
| T3 | Page | integration | integration | ✅ OK |
| T4 | Page | integration | integration | ✅ OK |
