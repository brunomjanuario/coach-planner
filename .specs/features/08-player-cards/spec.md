# Player Cards Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** 07-games-league-table

## Problem Statement

`PlayerCard` shows goals and conceded goals but nothing about discipline. The
Player shape has no card fields at all, and `pages/Home.jsx` already advertises a
"Most Cards" tile with no data behind it. A coach cannot see who is one booking
away from a suspension — which is the single most actionable discipline fact in
youth and amateur football.

## Goals

- [ ] Yellow and red cards can be recorded against a player in a specific game
- [ ] A player's card totals are visible on their card
- [ ] The coach is warned before a player is suspended, not after

## Out of Scope

| Feature | Reason |
|---|---|
| Cards in trainings | Cards are issued by referees in matches. There is no training equivalent. |
| Disciplinary appeals / rescinded cards | Deleting the card record covers the need without a state machine. |
| Competition-specific suspension rules | AD covers one configurable threshold. Per-competition rules need a competition model first. |
| Automatic suspension enforcement (blocking selection) | There is no lineup or selection feature to block. Warning only. |
| Coach / staff cards | Only players are modelled. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Where a card is recorded | Against a `(player, game)` pair, in its own collection | Storing a running total on the Player would drift from the games it came from and could not be corrected per match | n |
| Card types | Yellow and red only | Second-yellow is recorded as two yellows plus a red, matching how referees report it | n |
| Suspension threshold | 5 yellows, as a single named constant | The most common amateur threshold; a constant makes it one edit to change and one place to test | n |
| Red card consequence | Warn of a 1-game suspension | Real bans vary by offence and cannot be derived; a flat warning is honest about what is known | n |
| Counter reset | Never automatic | A season boundary cannot be derived (`Team.season` is free text — see AD-006). Manual clearing only. | n |
| Cards for a deleted game | Deleted with the game | An orphaned card belongs to no fixture and would inflate the totals invisibly | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Record cards against a game ⭐ MVP

**User Story**: As a coach, I want to record who was booked in a match so that my
discipline record is tied to the fixture it happened in.

**Why P1**: The data has to exist before anything can display it.

**Acceptance Criteria**:

1. WHEN cards are recorded for a game THEN the system SHALL persist each as a `(playerId, gameId, type)` record
2. WHEN a card is recorded for a player not in the game's team THEN the system SHALL reject it
3. WHEN a card record is created THEN the system SHALL assign its id via `newId()`
4. WHEN a card is removed THEN the system SHALL delete only that record, leaving the player's other cards intact
5. WHEN a game is deleted THEN the system SHALL delete its card records
6. WHEN cards are recorded and the page is reloaded THEN the system SHALL still return them

**Independent Test**: Book two players in one game, reload, confirm both records survive.

---

### P1: Card totals on the player ⭐ MVP

**User Story**: As a coach, I want to see a player's yellow and red totals so that I know
their discipline record at a glance.

**Why P1**: Recording data nobody can see is not a feature.

**Acceptance Criteria**:

1. WHEN a player card is rendered THEN the system SHALL display that player's yellow and red totals
2. WHEN a player has no cards THEN the system SHALL display zero, not a blank
3. WHEN a card is added or removed THEN the system SHALL recompute the totals without a page reload
4. WHEN totals are computed THEN the system SHALL count only cards from games belonging to that player's team

**Independent Test**: Book a player twice; their card shows 2 yellows.

---

### P2: Suspension warning

**User Story**: As a coach, I want a warning when a player is approaching a ban so that I
am not surprised on matchday.

**Why P2**: The totals are useful without it; this makes them actionable.

**Acceptance Criteria**:

1. WHEN a player reaches one yellow below the threshold THEN the system SHALL display an approaching-suspension warning
2. WHEN a player reaches the threshold THEN the system SHALL display a suspension warning
3. WHEN a player receives a red card THEN the system SHALL display a suspension warning regardless of their yellow count
4. WHEN a player is below the warning band THEN the system SHALL display no warning
5. WHEN the threshold constant is changed THEN the system SHALL apply the new value everywhere without further edits

**Independent Test**: Book a player four times against a threshold of five; the approaching warning appears.

---

## Edge Cases

- WHEN a player is deleted THEN their card records SHALL be removed rather than left orphaned
- WHEN a player is moved between teams THEN their existing cards SHALL stay attached to the games they occurred in
- WHEN the same player is recorded twice for the same game THEN the system SHALL count both — two yellows in one match is a real outcome
- WHEN a game's result is cleared THEN its cards SHALL remain (a card is issued whether or not a score is recorded)
- WHEN a player has more reds than games THEN the display SHALL still render rather than assume an invariant

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| CARD-01 | P1: Card collection and service | Tasks | Pending |
| CARD-02 | P1: Recording UI within the game flow | Tasks | Pending |
| CARD-03 | P1: Card aggregation logic | Tasks | Pending |
| CARD-04 | P1: Totals on the player card | Tasks | Pending |
| CARD-05 | P2: Suspension warnings | Tasks | Pending |

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] A card recorded in a match is visible on the player and survives reload
- [ ] Deleting a game leaves no orphaned card records
- [ ] Changing the suspension threshold is a one-line edit
- [ ] `11-dashboard` can compute "Most Cards" from this data without reshaping it
