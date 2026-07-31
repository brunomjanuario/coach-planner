# Player Ratings Specification

**Scope:** Large · **Design:** required before Execute · **Depends on:** 07-games-league-table

## Problem Statement

There is no way to record how a player performed. The Player shape carries season
totals (`goals`, `assists`, `concededGoals`) but nothing about individual
sessions or matches, so a coach has no record of who is in form, who has dipped,
or how a squad compares — the judgement calls coaching actually turns on.

Per AD-007, "points" here means a **0–10 coach rating recorded per event**
(one game or one training), aggregated into a season average and a recent-form
figure. It is not an accumulating gamification score.

## Goals

- [ ] A whole squad can be rated for one event in a single pass
- [ ] Both trainings and games can be rated, through the same mechanism
- [ ] A player's season average and recent form are visible
- [ ] The squad can be ranked by rating

## Out of Scope

| Feature | Reason |
|---|---|
| Accumulating gamification points / leaderboard | AD-007 chose per-event rating. A points economy is a different feature that could later derive from these records. |
| Per-attribute ratings (pace, passing, finishing) | One overall rating per event. Attribute scoring is a much larger model and was not asked for. |
| Player self-assessment or peer rating | Single-user app; the only rater is the coach. |
| Automatic rating from match stats | Derives judgement from goals and cards, which is exactly what a coach rating is meant to override. |
| Attendance tracking | Rating an event implies presence, but attendance is its own feature with its own semantics (excused, injured, late). |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Rating scale | 0–10, whole numbers | User selection (AD-007). Halves double the input space for precision a coach rarely has. | y |
| Rating storage | Own collection, keyed `(playerId, eventType, eventId)` | Mirrors the card model from `08`; keeps per-event history correctable | n |
| Unrated players | No record written — absent, not zero | A zero rating is a judgement; no record is an absence. Averaging zeros for unrated players would be badly wrong. | n |
| Re-rating the same event | Overwrites the existing record | Two ratings for one player in one event has no meaning | n |
| Form window | Last 5 rated events, most recent first | Standard football convention; short enough to move, long enough to mean something | n |
| Events with fewer than 5 ratings | Form computed over what exists, labelled with the count | Hiding form until 5 events makes the feature useless for the first month | n |
| Season boundary for the average | None — all recorded ratings | Same constraint as AD-006: `Team.season` is free text with no reliable boundary | n |
| Ratings for a deleted event | Deleted with the event | An orphaned rating skews the average invisibly (same rule as `08` cards) | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Rate a squad for an event ⭐ MVP

**User Story**: As a coach, I want to rate every player after a session in one pass so
that recording is fast enough that I actually do it.

**Why P1**: If rating takes one popup per player, it will not happen.

**Acceptance Criteria**:

1. WHEN the squad rating view is opened for an event THEN the system SHALL list every player in that event's team with a 0–10 input
2. WHEN ratings are submitted THEN the system SHALL persist one record per rated player, keyed to that event
3. WHEN a player is left unrated THEN the system SHALL NOT write a record for them
4. WHEN a player already rated for that event is re-rated THEN the system SHALL overwrite the existing record rather than add a second
5. WHEN a value outside 0–10 is entered THEN the system SHALL reject it
6. WHEN ratings are submitted and the page is reloaded THEN the system SHALL still return them

**Independent Test**: Rate three of five players, reload, confirm exactly three records exist.

---

### P1: Rate both trainings and games ⭐ MVP

**User Story**: As a coach, I want to rate training performance as well as matches so that
the player who works hardest in the week is visible.

**Why P1**: AD-007 explicitly covers both. Games-only would be half the feature.

**Acceptance Criteria**:

1. WHEN a training's details are open THEN the system SHALL offer a rating action for that training
2. WHEN a game's result is being recorded THEN the system SHALL offer a rating action for that game
3. WHEN a rating is stored THEN the system SHALL record whether its event was a training or a game
4. WHEN ratings are aggregated THEN the system SHALL be able to report training-only, game-only and combined figures
5. WHEN an event already has ratings THEN reopening its rating view SHALL pre-fill them

**Independent Test**: Rate a player 8 in a training and 6 in a game; both are retrievable and distinguishable.

---

### P1: Season average and form ⭐ MVP

**User Story**: As a coach, I want a player's average and recent form so that I can see
who is performing and who has dropped off.

**Why P1**: The aggregation is the reason to record ratings at all.

**Acceptance Criteria**:

1. WHEN a player has ratings THEN the system SHALL display their mean rating to one decimal place
2. WHEN a player has no ratings THEN the system SHALL display "—" rather than 0.0
3. WHEN a player has ratings THEN the system SHALL display form as the mean of their last 5 rated events, most recent first by event date
4. WHEN a player has fewer than 5 rated events THEN the system SHALL compute form over the events that exist and label the count
5. WHEN a rating is added, changed or deleted THEN the system SHALL recompute both figures without a page reload

**Independent Test**: Rate a player 6, 6, 9, 9; the average reads 7.5.

---

### P2: Squad ranking

**User Story**: As a coach, I want the squad ordered by rating so that I can see the
picture without opening every player.

**Why P2**: The per-player figures deliver the value; ranking makes it scannable.

**Acceptance Criteria**:

1. WHEN the ranking is shown THEN the system SHALL list the selected team's players ordered by average rating, highest first
2. WHEN two players share an average THEN the system SHALL order them deterministically
3. WHEN a player has no ratings THEN the system SHALL place them last rather than treat their average as 0
4. WHEN the ranking is filtered to trainings or games only THEN the system SHALL recompute the order from that subset

**Independent Test**: With four rated players and one unrated, the unrated player sorts last.

---

### P2: Rating history

**User Story**: As a coach, I want to see a player's individual ratings so that an average
is explainable.

**Why P2**: The aggregate is the headline; the history is the audit.

**Acceptance Criteria**:

1. WHEN a player's history is shown THEN the system SHALL list each rated event with its date, type and value, most recent first
2. WHEN a history entry is deleted THEN the system SHALL recompute the average and form
3. WHEN a player has no ratings THEN the system SHALL show an empty-state message

**Independent Test**: Delete the lowest of four ratings; the average rises accordingly.

---

## Edge Cases

- WHEN a training or game is deleted THEN its ratings SHALL be deleted with it
- WHEN a player is deleted THEN their ratings SHALL be deleted with them
- WHEN a player is moved between teams THEN their existing ratings SHALL remain attached to the events they were given for
- WHEN two events share a date THEN form ordering SHALL be deterministic
- WHEN a rating of exactly `0` is recorded THEN the system SHALL treat it as a real rating, not as absent — the null-vs-zero trap
- WHEN a squad has 30+ players THEN the rating view SHALL scroll rather than push its action buttons off-screen

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| RATE-01 | P1: Rating collection and service | Tasks | Pending |
| RATE-02 | P1: Aggregation (average, form) | Tasks | Pending |
| RATE-03 | P1: Rating input control | Tasks | Pending |
| RATE-04 | P1: Squad rating view | Tasks | Pending |
| RATE-05 | P1: Rating from a training | Tasks | Pending |
| RATE-06 | P1: Rating from a game | Tasks | Pending |
| RATE-07 | P1: Average and form on the player card | Tasks | Pending |
| RATE-08 | P2: Rating history | Tasks | Pending |
| RATE-09 | P2: Squad ranking | Tasks | Pending |

**Coverage:** 9 total, 9 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] A full squad can be rated for one event in under a minute
- [ ] An unrated player never contributes a zero to any average
- [ ] A rating of 0 is stored and counted as a real judgement
- [ ] Deleting an event leaves no orphaned ratings
