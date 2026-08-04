# Games Three-Column Layout Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** 07-games-league-table

## Problem Statement

The Games page stacks four things in one narrow column: Upcoming, Played, the
league table and the Add-Rival-Row control (`src/pages/Games.jsx:237-311`). Each
list gets a `flex-1` slice of the viewport — roughly two rows each — and the
league table, the densest thing on the page, is pushed below both of them where
it is reached only by scrolling. Meanwhile the team filter column takes an equal
half of the page width for a two-item list, and the content column carries the
same contradictory `flex-3` + `flex-1` pair as the trainings page.

The most important question a coach asks on this page — *who do we play next?* —
has no answer anywhere on the screen. The next fixture is just the first row of
a scrolling list.

## Goals

- [ ] Teams on the left, fixtures in the middle, league table on the right
- [ ] The next game is called out, not buried at the top of a list
- [ ] The league table is visible without scrolling past the fixtures

## Out of Scope

| Feature | Reason |
|---|---|
| How the table is computed | AD-008 settled it: our row is derived, rival rows are manual. Unchanged. |
| Recording results, deleting games | `07` owns those flows. They must keep working; they do not change. |
| Competition and opponent selection | `20`, `21` and `22` own those. |
| Game cards / discipline section | `08` owns it. |
| Applying the same layout to trainings | `17` owns the trainings page. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Column split | Left: teams (fixed narrow). Middle: next game + fixtures. Right: league table | User's stated arrangement | y — user chose it |
| "Next game" | The soonest upcoming game for the current filter, rendered as a prominent card above the fixtures list | It is the page's headline question | n |
| Next game with no team filter | The soonest upcoming game across all teams, labelled with its team | Consistent with how the dashboard's Next Event behaves | n |
| No upcoming games | The slot shows an explicit "No upcoming games" state, not an empty gap | An invisible slot looks like a rendering bug | n |
| League table with no team selected | Keeps today's "Select a team to see its league table." message, in the right column | AD-008 — there is no our-row to anchor on | n |
| Narrow viewports | The three columns stack: teams, then fixtures, then table | Three columns below ~1024px is unreadable | n |
| Fixture list heights | Sections render in full and the page scrolls once, as `17` does for trainings | Same defect, same fix; keeping them divergent is how pages drift | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Three-column layout ⭐ MVP

**User Story**: As a coach, I want teams, fixtures and the table side by side so that I
can see my season on one screen.

**Why P1**: The requested change.

**Acceptance Criteria**:

1. WHEN the page renders at large width THEN the system SHALL lay out three columns: teams, fixtures, league table, in that order
2. WHEN the page renders at narrow width THEN the columns SHALL stack in the same order
3. WHEN the teams column renders THEN it SHALL take a fixed narrow width, not an equal third
4. WHEN the league table renders THEN it SHALL be visible without scrolling past the fixtures at large width
5. WHEN the page renders THEN no element SHALL carry both `flex-1` and `flex-3`

**Independent Test**: At 1280px all three regions are on screen simultaneously; at 480px they stack in order.

---

### P1: The next game is called out ⭐ MVP

**User Story**: As a coach, I want to see the next fixture immediately so that I do not
read a list to find it.

**Why P1**: It is the reason the middle column exists.

**Acceptance Criteria**:

1. WHEN there is at least one upcoming game in scope THEN the system SHALL render the soonest one as a distinct next-game card above the fixtures list
2. WHEN the next-game card renders THEN it SHALL show opponent, home/away, date and time, competition and — when no team filter is active — the team
3. WHEN there are no upcoming games in scope THEN the system SHALL render an explicit empty state in that slot
4. WHEN a team filter is active THEN the next game SHALL be that team's soonest upcoming game
5. WHEN the next-game card is activated THEN the system SHALL open the same game popup the list rows open
6. WHEN a game is created, deleted or has its result recorded THEN the next-game card SHALL update without a page reload

**Independent Test**: With fixtures in March, May and next week, the card shows next week's.

---

### P2: Fixture sections show everything

**User Story**: As a coach, I want to see all my fixtures without scrolling inside a small box.

**Why P2**: The same fix as `17`, applied to the second page that has it.

**Acceptance Criteria**:

1. WHEN the fixtures column renders THEN Upcoming and Played SHALL each render every game in scope, with no per-section height cap
2. WHEN each section renders THEN its heading SHALL show how many games it holds
3. WHEN the page's content exceeds the viewport THEN the page SHALL scroll as one document
4. WHEN the played section renders THEN games SHALL be ordered most recent first

**Independent Test**: Twelve games render twelve rows, all reachable with one page scroll.

---

## Edge Cases

- WHEN a game's date is invalid THEN it SHALL render in the played section and SHALL NOT be chosen as the next game
- WHEN two upcoming games share the soonest timestamp THEN the choice SHALL be deterministic (by id), not render-order dependent
- WHEN unassigned games exist THEN that section SHALL keep its place and its assignment controls
- WHEN the standings hold only our row THEN the table SHALL render that single row rather than an empty state
- WHEN a team is deselected THEN the league table SHALL return to its instruction message and the next-game card SHALL widen its scope to all teams
- WHEN the league table is wider than its column THEN it SHALL scroll horizontally within the column rather than widen the page

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| GLAY-01 | P1: Three-column responsive layout | Tasks | Pending |
| GLAY-02 | P1: Fixed-width teams column; no conflicting flex utilities | Tasks | Pending |
| GLAY-03 | P1: Next-game selection logic | Tasks | Pending |
| GLAY-04 | P1: Next-game card | Tasks | Pending |
| GLAY-05 | P2: Uncapped, counted, ordered fixture sections | Tasks | Pending |

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] A coach can answer "who's next?" and "where are we in the table?" without scrolling
- [ ] The games page has one vertical scrollbar
- [ ] Every `07` result/delete flow still works from the new layout
