# Dashboard Filter UI Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/32-dashboard-filter-ui/spec.md`
**Design**: not required
**Status**: Not started
**Batches**: 4 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> Heights and overflow are not laid out in jsdom. Sizing ACs are asserted as
> **shared class presence** across all eight tiles; the rendered result is
> checked by eye once, in the browser, at T1 and recorded in the commit body.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Components (`src/components/Tile.jsx`) | component | Shared min-height class on every variant, including the skeleton | `src/components/__tests__/Tile.test.jsx` | `npm test` |
| Components (`src/components/TeamFilterBar.jsx`) | component | Pressed state, group role, clear action, focus, long labels | `src/components/__tests__/TeamFilterBar.test.jsx` | `npm test` |
| Pages (`src/pages/Home.jsx`) | integration | Filter rescopes every tile; grids carry `auto-rows-fr`; deleted-team fallback | `src/pages/__tests__/Home.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After component-only tasks | `npx vitest run <path/to/file.test.jsx>` |
| Full | After tasks touching the page | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Geometry

```
T1
```

### Phase 2: The filter

```
T1 → T2 → T3 → T4
```

---

## Task Breakdown

### T1: Give every tile one height

**What**: A shared minimum height on `Tile`, so the two section grids stop sizing independently.
**Where**: `src/components/Tile.jsx` (modify), `src/components/__tests__/Tile.test.jsx` (modify), `src/pages/__tests__/Home.test.jsx` (modify)
**Depends on**: None
**Reuses**: `TILE_CLASS`, which `18` already made the single surface definition — the height belongs in it
**Requirement**: DFILT-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `TILE_CLASS` carries a minimum-height class, so every tile variant inherits it (AC DFILT-01.1)
- [ ] All eight dashboard tiles carry it — assert by querying the rendered dashboard and checking the count, not by checking one tile (AC DFILT-01.1)
- [ ] `StatTile`'s and `LeaderTile`'s loading skeletons carry it too (AC DFILT-01.5) — the skeleton is the variant most likely to be missed
- [ ] Both section grids still carry `auto-rows-fr` (AC DFILT-01.2)
- [ ] A tile whose content exceeds the minimum is not clipped — no `overflow-hidden` or fixed `h-` class is introduced (AC DFILT-01.4)
- [ ] The chosen value is measured against `LeaderTile` with three entries plus an overflow line, and recorded in `Tile`'s doc comment (Assumptions: minimum height value)
- [ ] Verified by eye in the browser that all eight tiles render at one height; the observation is recorded in the commit body, since the suite cannot see it
- [ ] Gate passes: `npm test`
- [ ] Test count: 8+ tests pass

**Tests**: component + integration
**Gate**: full

**Commit**: `style(dashboard): give every tile one shared height`

---

### T2: Build the team filter bar

**What**: A chip bar with correct toggle semantics, replacing the bare `<select>`.
**Where**: `src/components/TeamFilterBar.jsx` (new), `src/components/__tests__/TeamFilterBar.test.jsx` (new)
**Depends on**: T1
**Reuses**: The segmented pill classes `31` introduces for `Tabs` — same visual language, different semantics
**Requirement**: DFILT-02, DFILT-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Renders a `role="group"` with an accessible name and one button per team plus "All teams" (AC DFILT-02.1)
- [ ] Exactly one chip carries `aria-pressed="true"` at a time; the others are explicitly `"false"`, not absent (AC DFILT-02.2)
- [ ] Activating a chip calls `onChange` with that team's id, and "All teams" calls it with `null` (AC DFILT-02.3)
- [ ] The component holds no selection state of its own — the parent owns it, as `Tabs` does
- [ ] Chips carry a visible focus ring and activate on Enter and Space (AC DFILT-02.7)
- [ ] The bar carries a horizontal-scroll class and no chip carries a truncation class (AC DFILT-04.1, DFILT-04.3)
- [ ] With no teams, only "All teams" renders, pressed (edge case)
- [ ] With one team, both chips render (edge case) — filtering to the only team is a distinct state
- [ ] A team with an empty `name` renders its club alone, with no trailing space (edge case)
- [ ] Gate passes: `npx vitest run src/components/__tests__/TeamFilterBar.test.jsx`
- [ ] Test count: 14+ tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(dashboard): add a team filter chip bar`

---

### T3: Put the bar on the dashboard

**What**: Swap the `<select>` for the bar and keep every tile scoping to it.
**Where**: `src/pages/Home.jsx` (modify), `src/pages/__tests__/Home.test.jsx` (modify)
**Depends on**: T2
**Reuses**: The existing `teamFilter` state and the `scopedTeams`/`scopedTrainings`/`scopedGames` derivations — only the control changes
**Requirement**: DFILT-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] No `<select>` remains on the dashboard (AC DFILT-02.1) — assert the absence
- [ ] Activating a team chip rescopes every tile: counts, lists and leaders (AC DFILT-02.3) — assert at least one tile from each section, so a partially-wired filter fails
- [ ] Activating "All teams" restores the unfiltered figures (AC DFILT-02.5)
- [ ] A filtered team with no records shows each tile's own empty state, not a blank tile (edge case)
- [ ] Existing dashboard tests pass with only the filter *interaction* updated — no assertion about what the tiles show changes
- [ ] Gate passes: `npm test`
- [ ] Test count: 10+ tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(dashboard): filter by team from the chip bar`

---

### T4: Signpost the active filter

**What**: The "Showing: <team>" line and its Clear action — the part that makes an active filter visible on the page.
**Where**: `src/pages/Home.jsx` (modify), `src/pages/__tests__/Home.test.jsx` (modify)
**Depends on**: T3
**Reuses**: `Button` (`ghost` variant) from `27` for Clear
**Requirement**: DFILT-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] With a filter active, a "Showing: <club name>" line renders with a Clear action beside it (AC DFILT-03 / AC DFILT-02.4)
- [ ] With no filter active, neither the line nor Clear is in the document (AC DFILT-02.6) — assert the absence, which is what makes the signpost meaningful
- [ ] Clear resets the filter, presses "All teams" and removes the line (AC DFILT-02.5)
- [ ] The line names the same team as the pressed chip — asserted together in one test, so the two cannot drift apart
- [ ] When the filtered team is no longer in the re-read team list, the filter falls back to "All teams" and no line naming a missing team renders (edge case)
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 8+ tests pass

**Tests**: integration
**Gate**: build

**Commit**: `feat(dashboard): show and clear the active team filter`

---

## Phase Execution Map

```
Phase 1:  T1
           │
Phase 2:   └──→ T2 ──→ T3 ──→ T4
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Tile height | 1 class in 1 shared component | ✅ Granular |
| T2: Filter bar | 1 new component | ✅ Granular |
| T3: Page wiring | 1 page, one control swap | ✅ Granular |
| T4: Active signpost | 1 page, one added region | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Component + page | component + integration | component + integration | ✅ OK |
| T2 | Component | component | component | ✅ OK |
| T3 | Page | integration | integration | ✅ OK |
| T4 | Page | integration | integration | ✅ OK |
