# Dashboard Filter UI Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** 18-dashboard-grid, 25-dashboard-tile-lists, 31-settings-tabs-polish

## Problem Statement

Two things about the dashboard's chrome.

**The filter.** It is a bare `<label>Team <select>` sitting alone above the grid
(`src/pages/Home.jsx:88-102`) — an unstyled native control, borrowed from the
form idiom, doing the most consequential thing on the page. It gives no
indication that a filter is *active*: with a team selected, the only difference
is the text inside a closed dropdown. Nothing else on the page says "you are
looking at one team".

**The squares.** `18-dashboard-grid` gave each section `auto-rows-fr`, which
equalises tiles *within a row*. But Overview and Leaders are two separate
`<section>` grids, so the two rows size themselves independently: four tiles
holding a number end up shorter than four tiles holding a three-row list. The
grid still reads as two bands of different heights — which is the "make all the
squares the same size" complaint that `18` did not reach.

`25-dashboard-tile-lists` changes what the Overview tiles contain, so the sizing
has to be settled after it, not before.

## Goals

- [ ] All eight tiles are the same size, across both sections
- [ ] The team filter looks like a filter and shows its active state on the page
- [ ] Clearing the filter is one obvious action
- [ ] The filter degrades sensibly with many teams

## Out of Scope

| Feature | Reason |
|---|---|
| Filtering by anything other than team | The dashboard scopes by team today. New dimensions are new features with their own data questions. |
| Persisting the filter across reloads | No current dashboard state persists. Adding it here would be an unrelated behaviour change. |
| Changing which tiles exist or what they show | `11` defined the metrics, `25` defined the lists. This is chrome and geometry. |
| A global (all-pages) team filter | Trainings and Games have their own team lists. Unifying them is a navigation feature. |
| Drag-to-rearrange tiles | Ruled out in `18`; still ruled out. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Filter control | A segmented chip bar: an "All teams" chip followed by one chip per team | It shows every option and the active one at once, which is exactly what a closed `<select>` cannot do. Reuses the segmented visual language `31` establishes for `Tabs`. | n |
| Semantics | Toggle buttons in a `role="group"` with `aria-pressed`, **not** a `tablist` | These are filters, not tabs — there is no panel per chip and no roving focus. Borrowing `tablist` semantics would mislead a screen reader. | n |
| Many teams | The bar scrolls horizontally and keeps every chip reachable by keyboard; it does not collapse back to a `<select>` | One control that always behaves the same beats two that swap at a breakpoint. | n |
| Active state beyond the chip | A short "Showing: <team>" line with a Clear action beside the bar, rendered only while a filter is active | The complaint is that an active filter is invisible. The chip alone still requires scanning the bar. | n |
| Clearing | Both the "All teams" chip and the Clear action clear it; they are two routes to one state | The chip is discoverable, the Clear action is fast. Neither is redundant enough to drop. | n |
| Equal tile size | `Tile` gains a shared minimum height; both section grids keep `auto-rows-fr` | Sets one number in one place. Merging the two grids into one would cost the section headings, which `18` chose deliberately. | n |
| The minimum height value | Whatever fits `LeaderTile`'s three rows plus its label and overflow line without clipping — measured once at implementation and recorded in `Tile`'s doc comment | The tallest current variant sets the floor; picking a round number and hoping is how the ragged bottoms came back. | n |
| Verification of "same size" | jsdom lays nothing out, so tests assert the **shared class** on every tile and that both grids carry `auto-rows-fr`; the rendered result is checked once by eye in the browser | Named honestly so no test claims to have measured a height it cannot see. | n |
| Order relative to `25` | This feature runs **after** `25` | Sizing tiles before their contents are final would be measured against the wrong content. | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Every tile is the same size ⭐ MVP

**User Story**: As a coach, I want the dashboard to look like one composed grid
so that it reads as a single panel rather than two mismatched bands.

**Why P1**: The stated request, and the part `18` left unfinished.

**Acceptance Criteria**:

1. WHEN the dashboard renders THEN every tile in both sections SHALL carry the
   same shared minimum-height class
2. WHEN either section renders THEN its grid SHALL carry `auto-rows-fr`, so
   tiles stretch to their row
3. WHEN a tile's content is shorter than the minimum THEN the tile SHALL still
   occupy the full height rather than shrinking
4. WHEN a tile's content is taller than the minimum THEN the tile SHALL grow and
   its row-mates SHALL grow with it
5. WHEN the dashboard is loading THEN skeleton tiles SHALL carry the same
   minimum height, so the grid does not resize when data lands

**Independent Test**: Render the dashboard with 1 team and 3 leaders; assert
every one of the eight tiles carries the shared height class and both grids
carry `auto-rows-fr`.

---

### P2: The filter looks and behaves like a filter

**User Story**: As a coach, I want to see which team I am looking at without
opening a dropdown so that I stop misreading last week's numbers as this week's.

**Why P2**: The second half of the request.

**Acceptance Criteria**:

1. WHEN the dashboard renders THEN the team filter SHALL be a chip bar in a
   `role="group"` with an accessible name, and SHALL NOT be a `<select>`
2. WHEN no filter is active THEN the "All teams" chip SHALL carry
   `aria-pressed="true"` and every team chip SHALL carry `aria-pressed="false"`
3. WHEN a team chip is activated THEN it SHALL become the pressed chip, all
   others SHALL become unpressed, and every tile SHALL rescope to that team
4. WHEN a filter is active THEN a "Showing: <club name>" line SHALL render with
   a Clear action beside it
5. WHEN Clear is activated THEN the filter SHALL clear, the "All teams" chip
   SHALL become pressed, and the Showing line SHALL be removed
6. WHEN no filter is active THEN the Showing line and Clear action SHALL NOT be
   in the document
7. WHEN a chip is focused THEN it SHALL show a visible focus ring and SHALL
   activate on Enter and Space

**Independent Test**: Render with 3 teams, click the second chip, assert its
`aria-pressed`, the Showing line's text, and a rescoped tile count.

---

### P3: The bar survives a long team list

**User Story**: As a coach with many teams, I want the filter to stay usable so
that it does not push the dashboard sideways.

**Why P3**: Robustness rather than the reported problem.

**Acceptance Criteria**:

1. WHEN there are more chips than fit THEN the bar SHALL scroll horizontally
   within itself and SHALL NOT cause the page to scroll horizontally
2. WHEN the bar scrolls THEN every chip SHALL still be reachable by Tab
3. WHEN a team's name is long THEN its chip SHALL NOT be truncated

---

## Edge Cases

- WHEN there are no teams THEN the bar SHALL render "All teams" alone, pressed,
  and SHALL NOT render an empty group or the Showing line
- WHEN there is exactly one team THEN both chips SHALL render — filtering to
  the only team is still a distinct state from "all"
- WHEN the filtered team is deleted in another tab and the dashboard re-reads
  THEN the filter SHALL fall back to "All teams" rather than showing a Showing
  line naming a team that no longer exists
- WHEN a team has an empty `name` THEN its chip SHALL fall back to the club
  alone rather than rendering a trailing space
- WHEN a filter is active and the filtered team has no records THEN each tile
  SHALL show its own empty state, not a blank tile

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| DFILT-01 | P1: Equal tile size | Tasks | Pending |
| DFILT-02 | P2: Chip-bar filter | Tasks | Pending |
| DFILT-03 | P2: Active-state signposting | Tasks | Pending |
| DFILT-04 | P3: Overflow behaviour | Tasks | Pending |

**Coverage:** 4 total, 4 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] All eight tiles render at one height in the browser, across both sections
- [ ] The active team is readable without opening any control
- [ ] Every existing dashboard test passes with only the filter interaction updated
