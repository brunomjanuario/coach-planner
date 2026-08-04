# Dashboard Grid Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** 11-dashboard

## Problem Statement

The dashboard renders eight tiles into `grid grid-cols-3 gap-10`
(`src/pages/Home.jsx:103`) and lets each size itself. `StatTile` holds one big
number; `LeaderTile` holds a three-row list; the empty variant of either holds a
sentence. So every row is a different height, tiles float against the top of
their cell with ragged bottoms, and the eighth tile leaves a hole in a
three-column grid.

The two tile components also drifted: they define their own copies of
`TILE_CLASS`, `LeaderTile` has no interactive or empty-link variant, and the
`gap-10` is wider than the tiles' own padding, so the grid reads as scattered
boxes rather than one panel.

The mix of kinds is not grouped either — counts, leaders and the next event are
interleaved in source order, so the eye has no structure to follow.

## Goals

- [ ] Every tile in a row is the same height
- [ ] Tiles are grouped by kind, not by declaration order
- [ ] The two tile components share one surface definition
- [ ] The grid reflows cleanly at narrow widths with no holes

## Out of Scope

| Feature | Reason |
|---|---|
| New dashboard metrics | `11` defined what is shown. This is how it is shown. |
| Charts or sparklines | A different feature with its own data questions. |
| Drag-to-rearrange tiles | No stated need; the grouping is editorial. |
| Changing the team filter's behaviour | It works; only its placement in the layout may change. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Equal heights | `auto-rows-fr` plus `h-full` on the tiles, so a row's tiles stretch to the tallest | The ragged bottoms are the complaint; stretching is the direct fix | n |
| Grouping | Two labelled sections: **Overview** (Teams, Trainings, Games, Next Event) and **Leaders** (Most Goals, Most Games, Most Cards, Top Rated) | Four and four — both rows fill exactly, which also removes the eighth-tile hole | n |
| Columns | 1 / 2 / 4 at small / medium / large | Four-across matches the grouping; three never divided eight evenly | n |
| Gap | Tightened to match the tiles' internal padding | `gap-10` is why the grid reads as scattered | n |
| Shared surface | One `Tile` wrapper owning border, radius, padding, height and the label row; `StatTile` and `LeaderTile` render their bodies inside it | Two components with copy-pasted `TILE_CLASS` is exactly how they drifted. `LeaderTile`'s comment calls the shared wrapper premature — with a symmetry requirement, it no longer is | n |
| Loading state | A skeleton of the same height as the loaded tile | Otherwise the grid jumps when data lands | n |
| Next Event tile | Keeps its link behaviour and stays in Overview | It is a fact about the season, not a leaderboard | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: A symmetric grid ⭐ MVP

**User Story**: As a coach, I want the dashboard to look composed so that it reads as one
screen instead of eight loose boxes.

**Why P1**: The complaint.

**Acceptance Criteria**:

1. WHEN tiles render in a row THEN every tile in that row SHALL occupy the full row height
2. WHEN a tile's content is shorter than its row THEN the tile surface SHALL still fill the cell
3. WHEN the grid renders at large width THEN it SHALL lay out four columns with no empty cell
4. WHEN the grid renders at medium width THEN it SHALL lay out two columns; at small width, one
5. WHEN tiles render THEN the gap between them SHALL be consistent horizontally and vertically

**Independent Test**: Screenshot at 1280px — the bottom edges of all four tiles in a row are on one line.

---

### P1: Grouped sections ⭐ MVP

**User Story**: As a coach, I want counts and leaderboards separated so that I know what I
am looking at.

**Why P1**: Symmetry without structure is just a tidier jumble.

**Acceptance Criteria**:

1. WHEN the dashboard renders THEN it SHALL group the four count/next-event tiles under an "Overview" heading
2. WHEN the dashboard renders THEN it SHALL group the four leader tiles under a "Leaders" heading
3. WHEN a section renders THEN its heading SHALL be a real heading element, not styled text
4. WHEN the team filter renders THEN it SHALL sit above both sections and apply to both

**Independent Test**: The page exposes two section headings, four tiles under each.

---

### P1: One tile surface ⭐ MVP

**User Story**: As a maintainer, I want the tile chrome defined once so that the two tile
types cannot drift apart again.

**Why P1**: The duplicated `TILE_CLASS` is why they already differ.

**Acceptance Criteria**:

1. WHEN either tile type renders THEN it SHALL draw its surface from a single shared definition
2. WHEN a tile is in its loading state THEN it SHALL occupy the same height as its loaded state
3. WHEN a tile is in its empty state THEN it SHALL occupy the same surface as its populated state
4. WHEN a tile is interactive THEN focus and hover styling SHALL come from the shared definition
5. WHEN the refactor is complete THEN `TILE_CLASS` SHALL be declared in exactly one module

**Independent Test**: `grep -r "TILE_CLASS" src/components` returns one declaration.

---

## Edge Cases

- WHEN every metric is empty (fresh install, no data) THEN all eight tiles SHALL render their empty states at equal height with their signposting links intact
- WHEN a leader tile shows three entries and its neighbour shows one THEN both SHALL still fill the row height
- WHEN a value is very long (a locale-formatted date-time in Next Event) THEN it SHALL wrap inside the tile rather than widen the column
- WHEN the team filter selects a team with no data THEN the grid SHALL keep its shape and show empty states
- WHEN data is still loading THEN the grid SHALL not shift layout as tiles resolve

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| DGRID-01 | P1: Equal-height tiles | Tasks | Pending |
| DGRID-02 | P1: Responsive 4/2/1 columns, no holes | Tasks | Pending |
| DGRID-03 | P1: Overview and Leaders sections | Tasks | Pending |
| DGRID-04 | P1: Shared tile surface | Tasks | Pending |
| DGRID-05 | P1: Loading and empty states hold the same height | Tasks | Pending |

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] No ragged bottom edges in any row, at any of the three breakpoints
- [ ] One declaration of the tile surface in the codebase
- [ ] The grid does not reflow between loading and loaded
