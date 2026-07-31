# Games & League Table Specification

**Scope:** Large · **Design:** required before Execute · **Depends on:** 01-persistence-layer
**Blocks:** 08-player-cards, 09-player-ratings, 10-calendar-navigation, 11-dashboard

## Problem Statement

`pages/Games.jsx` renders a heading and nothing else. A coach cannot record a
fixture, a result, or where their team sits in the division — which is the
information they are asked about most often. Three later features (cards,
ratings, dashboard) need a Game entity to attach data to, so this is the largest
missing block in the app.

A league table has a structural constraint worth stating up front: a coach can
only observe their own results. There is no data source here for other teams'
fixtures, so a fully-derived table is impossible.

## Goals

- [ ] Fixtures can be scheduled, listed and edited
- [ ] Results can be recorded against played fixtures
- [ ] A standings table shows the team's position, derived from its own results
- [ ] The Game entity exists for features 08–11 to build on

## Out of Scope

| Feature | Reason |
|---|---|
| Automatic league data import | No API, no data source. AD-008 records the manual approach. |
| Player-level match stats (goals, assists, cards, ratings) | `08-player-cards` and `09-player-ratings` own these. This spec creates the Game they hang from. |
| Lineups / formations / substitutions | Distinct feature with its own model. A game here is a fixture and a scoreline. |
| Multiple competitions in one table | A game records its competition, but the table covers one. Multi-competition tables need their own spec. |
| Live / in-progress match state | Games are scheduled or played. There is no third state. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| League table population | Our row derived from our games; rival rows entered manually (AD-008) | A coach cannot observe other fixtures | y |
| Opponent representation | A free-text name on the game, not a Team entity | Opponents are not squads the coach manages; modelling them as Teams would pollute `/teams` | n |
| Points system | 3 for a win, 1 for a draw, 0 for a loss | Standard across essentially all football leagues | n |
| Table ordering | Points, then goal difference, then goals for, then name | The most common tiebreak chain; deviations are league-specific and can be configured later | n |
| Played vs scheduled | Derived from the presence of a result, not from the date | A postponed fixture is still unplayed after its date passes; date-based inference would silently mark it played | n |
| Home / away | A boolean on the game | Needed for the fixture label; venue as free text adds nothing yet | n |
| Deleting a game with a result | Allowed, with confirmation; standings recompute | The alternative — locking played games — makes a mistyped score permanent | n |
| A game's team | Required, same as trainings | A fixture with no squad cannot be filtered or counted (the `03` bug, not repeated) | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Schedule a fixture ⭐ MVP

**User Story**: As a coach, I want to add an upcoming game so that my fixtures live
alongside my trainings.

**Why P1**: Everything else in this feature hangs off a Game record existing.

**Acceptance Criteria**:

1. WHEN the add-game form is submitted THEN the system SHALL persist a game with team, opponent, date, home/away and competition
2. WHEN the form is submitted with no team chosen THEN the system SHALL block submission
3. WHEN the form is submitted with an empty opponent THEN the system SHALL block submission
4. WHEN a game is created THEN the system SHALL assign its id via `newId()`
5. WHEN a game is created THEN the system SHALL persist it with no result, marking it scheduled
6. WHEN a game is created and the page is reloaded THEN the system SHALL still list it

**Independent Test**: Add a fixture against "Benfica", reload, confirm it is listed under upcoming.

---

### P1: List fixtures and results ⭐ MVP

**User Story**: As a coach, I want upcoming and played games in separate lists so that I
can see what is next and what has happened.

**Why P1**: A stored fixture nobody can see is not a feature.

**Acceptance Criteria**:

1. WHEN the Games page loads THEN the system SHALL show an "Upcoming" list of games with no result and a "Played" list of games with one
2. WHEN a team filter is selected THEN the system SHALL show only that team's games
3. WHEN the filter is cleared THEN the system SHALL show all games
4. WHEN a list is empty THEN the system SHALL render an empty-state message
5. WHEN a game row is rendered THEN the system SHALL show the opponent, a locale-formatted date, and home/away
6. WHEN a played game row is rendered THEN the system SHALL show the scoreline

**Independent Test**: With one scheduled and one played game, confirm each lands in the correct list.

---

### P1: Record a result ⭐ MVP

**User Story**: As a coach, I want to enter the score after a match so that my record is
accurate.

**Why P1**: Without results there is no table.

**Acceptance Criteria**:

1. WHEN a result is entered for a scheduled game THEN the system SHALL persist both scores and move the game to the Played list
2. WHEN a score is negative or non-numeric THEN the system SHALL block submission with a message
3. WHEN a result is recorded THEN the system SHALL derive the outcome (win, draw, loss) from the scores rather than asking for it
4. WHEN a recorded result is edited THEN the system SHALL update it in place and recompute the derived outcome
5. WHEN a result is cleared THEN the system SHALL return the game to the Upcoming list

**Independent Test**: Enter 2–1, confirm the game shows as a win and appears under Played.

---

### P2: League standings

**User Story**: As a coach, I want a table showing where my team sits so that I can answer
the question everyone asks me.

**Why P2**: Depends on results existing; the app is useful without it.

**Acceptance Criteria**:

1. WHEN played games exist THEN the system SHALL compute our row: played, won, drawn, lost, goals for, goals against, goal difference and points
2. WHEN a game is won THEN the system SHALL award 3 points; drawn 1; lost 0
3. WHEN rival rows have been entered THEN the system SHALL render all rows sorted by points, then goal difference, then goals for, then name
4. WHEN the table is rendered THEN the system SHALL visually highlight our row and show its position number
5. WHEN a result is added, edited or deleted THEN the system SHALL recompute our row
6. WHEN no played games exist THEN the system SHALL render our row with all zeros rather than omitting it

**Independent Test**: Record two wins and a draw; our row reads P3 W2 D1 L0 Pts7.

---

### P2: Maintain rival rows

**User Story**: As a coach, I want to enter the other teams' records so that the table
reflects the real division.

**Why P2**: The table works without it — it just contains one row.

**Acceptance Criteria**:

1. WHEN a rival row is added THEN the system SHALL persist its name, played, won, drawn, lost, goals for and goals against
2. WHEN a rival row is added THEN the system SHALL derive its points and goal difference rather than accepting them as input
3. WHEN a rival row's wins, draws and losses do not sum to its played count THEN the system SHALL block submission with a message
4. WHEN a rival row is edited or deleted THEN the system SHALL re-sort the table

**Independent Test**: Add a rival on 9 points; confirm it sorts above our 7-point row.

---

## Edge Cases

- WHEN a game's team is deleted THEN the game SHALL surface as unassigned rather than disappear (same treatment as `03` TTA-05)
- WHEN two games share a date THEN ordering SHALL be deterministic
- WHEN a score is entered as `0`–`0` THEN the system SHALL treat it as a recorded draw, not as an absent result — the null-vs-zero trap
- WHEN a rival row duplicates our own team name THEN the system SHALL warn rather than render two rows for the same club
- WHEN a played game is deleted THEN standings SHALL recompute without it
- WHEN a very long opponent name is entered THEN the row SHALL truncate or wrap rather than break the layout
- WHEN goals for and against are equal across two rows with equal points THEN the system SHALL fall through to the next tiebreak deterministically

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| GAME-01 | P1: Game model and seed shape | Tasks | Pending |
| GAME-02 | P1: Game service CRUD | Tasks | Pending |
| GAME-03 | P1: Schedule a fixture (form + validation) | Tasks | Pending |
| GAME-04 | P1: List fixtures and results | Tasks | Pending |
| GAME-05 | P1: Team filter on the Games page | Tasks | Pending |
| GAME-06 | P1: Record and edit a result | Tasks | Pending |
| GAME-07 | P2: Standings computation | Tasks | Pending |
| GAME-08 | P2: League table rendering and highlight | Tasks | Pending |
| GAME-09 | P2: Rival row entry and validation | Tasks | Pending |
| GAME-10 | P2: Table wired into the Games page | Tasks | Pending |

**Coverage:** 10 total, 10 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] A fixture can be scheduled, played, scored and corrected without leaving the Games page
- [ ] Our standings row is always consistent with the recorded results
- [ ] A 0–0 result is never mistaken for an unplayed fixture
- [ ] The Game entity is stable enough for features 08–11 to build on without reshaping it
