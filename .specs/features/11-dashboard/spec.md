# Dashboard Specification

**Scope:** Large · **Design:** required before Execute · **Depends on:** 07-games-league-table, 08-player-cards, 09-player-ratings

## Problem Statement

`pages/Home.jsx` is the app's landing route and renders six bordered `div`s
labelled Teams, Training, Games, Most Goals, Most Games and Most Cards. Every one
is empty. The tiles describe exactly the right summary — the placeholder is a
statement of intent — but nothing is wired to data, so signing in lands the coach
on a page that tells them nothing.

This feature is scheduled last because five of the six tiles need entities that
do not exist until `07`, `08` and `09` ship.

## Goals

- [ ] Every tile shows a real number derived from stored data
- [ ] The coach sees what is next, not only what has happened
- [ ] The dashboard can be scoped to one team
- [ ] Empty states read as "nothing yet", never as a broken tile

## Out of Scope

| Feature | Reason |
|---|---|
| Charts and trend lines | Counts and leaders answer the questions the placeholder tiles pose. Visualisation is its own spec. |
| Configurable / draggable tile layout | The six tiles are fixed by the placeholder. Personalisation is a later concern. |
| Date-range filtering | There is no season boundary to filter on — the same constraint as AD-006 and AD-007. |
| Export / print | No stated need. |
| Cross-team comparison | The team filter scopes to one squad. Comparing squads is a different question. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Tile set | The six from the placeholder, plus a "Next event" tile | The placeholder is the stated design; the next-event tile is the one thing a coach opens the app to check | n |
| "Most Games" meaning | Games the player's **team** has played | Per-player appearances need a lineup feature, which does not exist. This is stated on the tile so it cannot mislead. | n |
| Leader tiles | Top 3, not top 1 | One name hides a tie and tells the coach less for the same space | n |
| Ties in leader tiles | All tied players shown, ordered deterministically by name | Truncating a tie arbitrarily is a silent lie | n |
| Team filter default | All teams | A coach with one squad sees their data immediately with no interaction | n |
| Zero-data tiles | "No data yet" with a link to the page that creates it | An empty tile looks broken; a signposted one is an onboarding step | n |
| Recomputation | On mount and on filter change | No live subscription exists in the store; a mount-time read matches every other page | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Count tiles ⭐ MVP

**User Story**: As a coach, I want to see how many teams, trainings and games I have so
that the landing page tells me something.

**Why P1**: The three tiles that need no other feature to be meaningful.

**Acceptance Criteria**:

1. WHEN the dashboard loads THEN the Teams tile SHALL show the number of teams
2. WHEN the dashboard loads THEN the Trainings tile SHALL show the number of trainings, split into past and upcoming
3. WHEN the dashboard loads THEN the Games tile SHALL show the number of games, split into played and upcoming
4. WHEN a count is zero THEN the tile SHALL show "No data yet" with a link to the page that creates that record
5. WHEN a record is created elsewhere and the dashboard is revisited THEN the counts SHALL reflect it

**Independent Test**: With two teams and three trainings, the tiles read 2 and 3.

---

### P1: Leader tiles ⭐ MVP

**User Story**: As a coach, I want to see who leads for goals, appearances and cards so
that the squad picture is on the landing page.

**Why P1**: Three of the six placeholder tiles.

**Acceptance Criteria**:

1. WHEN players have goals THEN the Most Goals tile SHALL list the top 3 by goals with their totals
2. WHEN games have been played THEN the Most Games tile SHALL show the count of games played by each team, labelled to make clear it is team appearances not individual ones
3. WHEN cards have been recorded THEN the Most Cards tile SHALL list the top 3 by total cards, showing yellows and reds separately
4. WHEN players tie on a leader metric THEN the system SHALL show all tied players ordered deterministically
5. WHEN no data exists for a metric THEN the tile SHALL show "No data yet"
6. WHEN fewer than 3 players have a non-zero value THEN the tile SHALL list only those, never padding with zero-value players

**Independent Test**: With three players on 5, 5 and 2 goals, the tile shows both 5-goal players above the 2.

---

### P1: Next event tile ⭐ MVP

**User Story**: As a coach, I want to see what is coming up so that the landing page
answers the question I actually opened the app with.

**Why P1**: The single highest-value piece of information available.

**Acceptance Criteria**:

1. WHEN future trainings or games exist THEN the system SHALL show the soonest one with its date, time, type and team
2. WHEN both a training and a game are upcoming THEN the system SHALL show whichever is sooner
3. WHEN the next event is clicked THEN the system SHALL navigate to that record, reusing the deep-link behaviour from `10-calendar-navigation`
4. WHEN no future events exist THEN the tile SHALL say so and link to the calendar
5. WHEN two events share the soonest timestamp THEN the system SHALL pick deterministically

**Independent Test**: With a training tomorrow and a game next week, the tile shows the training.

---

### P2: Rating tile

**User Story**: As a coach, I want to see the best-rated players so that form is visible
from the landing page.

**Why P2**: Depends on `09-player-ratings`; the dashboard is useful without it.

**Acceptance Criteria**:

1. WHEN ratings exist THEN the system SHALL list the top 3 players by average rating with their averages
2. WHEN a player has no ratings THEN the system SHALL exclude them rather than rank them as 0
3. WHEN no ratings exist THEN the tile SHALL show "No data yet"

**Independent Test**: With four rated and one unrated player, the unrated player never appears.

---

### P2: Team filter

**User Story**: As a coach with several squads, I want to scope the dashboard to one team
so that the numbers mean something.

**Why P2**: A single-squad coach never needs it.

**Acceptance Criteria**:

1. WHEN a team is selected THEN every tile SHALL recompute for that team only
2. WHEN the filter is cleared THEN every tile SHALL recompute across all teams
3. WHEN a team with no data is selected THEN every tile SHALL show its empty state rather than stale figures
4. WHEN the filter changes THEN the system SHALL recompute without a page reload

**Independent Test**: Filter to a team with no games; the Games tile shows its empty state.

---

## Edge Cases

- WHEN a player's team has been deleted THEN they SHALL be excluded from leader tiles rather than counted under a missing team
- WHEN a training or game has no team THEN it SHALL be excluded from a filtered view but counted in the unfiltered one
- WHEN every player has zero goals THEN the Most Goals tile SHALL show its empty state, not three players tied on zero
- WHEN the next event's date is invalid THEN it SHALL be skipped and the following event shown
- WHEN a leader tile has 20 players tied THEN the tile SHALL cap the visible list and indicate the overflow rather than grow unbounded
- WHEN the dashboard loads before the store has seeded THEN tiles SHALL render a loading state rather than zeros

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| DASH-01 | P1: Aggregation logic | Tasks | Pending |
| DASH-02 | P1: Stat tile component | Tasks | Pending |
| DASH-03 | P1: Leader tile component | Tasks | Pending |
| DASH-04 | P1: Count tiles wired | Tasks | Pending |
| DASH-05 | P1: Leader tiles wired | Tasks | Pending |
| DASH-06 | P1: Next event tile | Tasks | Pending |
| DASH-07 | P2: Rating tile | Tasks | Pending |
| DASH-08 | P2: Team filter | Tasks | Pending |

**Coverage:** 8 total, 8 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Every tile shows real data or an explicit, signposted empty state
- [ ] No tile ever renders a zero-value player as a "leader"
- [ ] The next-event tile is clickable through to the record
- [ ] Filtering to a team recomputes all eight tiles consistently
