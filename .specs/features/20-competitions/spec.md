# Competitions Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** 01-persistence-layer, 07-games-league-table, 13-popup-shell

## Problem Statement

A game's competition is a free-text field (`GameSavePopup.jsx:165-177`) typed
fresh every time. "District League", "district league" and "Distrital" are three
different competitions as far as the app is concerned, nothing offers what was
typed before, and there is no list of the competitions a coach actually plays in.
Nothing can group, filter or report by competition because there is no
competition — only a string on each game.

## Goals

- [ ] A coach can create, rename and delete the competitions they play in
- [ ] Existing games' competition names become that list, without data loss
- [ ] The list is available for the game form to consume

## Out of Scope

| Feature | Reason |
|---|---|
| Making the game form use the list | `22-game-form-selects` owns that. This feature creates and manages the list; `22` consumes it. |
| Per-competition league tables | AD-008's table is anchored on one team's games. Scoping it per competition is a real feature with its own standings questions — not this one. |
| Filtering games or the dashboard by competition | A consumer of this data, planned separately. |
| Competition metadata (format, season, group stage, rounds) | Nothing in the app reads it yet. A name is what the game form needs. |
| Foreign-key integrity between games and competitions | Deliberate — see the assumption below. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Depth | A simple named entity, managed in its own list | User's stated choice | y — user chose it |
| How games reference a competition | Games keep their existing `competition` **string**; the collection is a managed reference list, not a foreign key | Avoids rewriting every game record and every read path for a feature whose job is to populate a dropdown. Documented trade-off: names can drift, and a deleted competition leaves its name on historical games | n |
| Where existing names come from | A schema migration seeds the collection from the distinct non-empty `game.competition` values already stored | Otherwise an existing user opens an empty list and has to retype what they already have | n |
| Rename | Cascades to every game carrying the old name | A rename that leaves games pointing at a dead string is a rename that lost data | n |
| Delete | Removes the competition; games keep their historical name untouched | A past fixture happened in that competition whether or not the coach still plays in it | n |
| Delete warning | The confirmation names how many games carry that competition | Deleting silently is how a coach discovers the trade-off too late | n |
| Duplicate names | Rejected, case-insensitively, with an inline message | Duplicate names are the disease this feature treats | n |
| Where it is managed | A "Competitions" button in the Games page header opening a manager popup | The Games page is where competitions are used | n |
| Empty name | Rejected | Nothing else in the app has a name-optional entity | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: A stored competition list ⭐ MVP

**User Story**: As a coach, I want my competitions stored so that they exist as things, not
as typing.

**Why P1**: Everything else needs somewhere to read from.

**Acceptance Criteria**:

1. WHEN the store initialises a fresh install THEN it SHALL include a `competitions` collection
2. WHEN `competitionService.getAll` is called THEN it SHALL return a copy, never a live reference (AD-004)
3. WHEN a competition is created THEN it SHALL receive an id from `newId()` (AD-003)
4. WHEN a competition is created with a name matching an existing one, ignoring case and surrounding whitespace THEN the system SHALL reject it
5. WHEN a competition is created with an empty or whitespace-only name THEN the system SHALL reject it
6. WHEN demo data is reset THEN the competitions collection SHALL be cleared and re-seeded with the rest

**Independent Test**: Create "Cup", reload, it is still there; create "cup", it is rejected.

---

### P1: Existing competition names are adopted ⭐ MVP

**User Story**: As an existing user, I want the competitions I already typed to be in the
list so that I do not start from nothing.

**Why P1**: Without it, the feature is only useful to new installs.

**Acceptance Criteria**:

1. WHEN a store at the previous schema version is loaded THEN the migration SHALL create one competition per distinct non-empty `game.competition` value
2. WHEN two games carry the same competition name differing only by case or surrounding whitespace THEN the migration SHALL create one competition
3. WHEN a game has no competition THEN the migration SHALL create nothing for it
4. WHEN the migration runs THEN it SHALL NOT modify any game record
5. WHEN the migration has run THEN the stored schema version SHALL be the new one, and a second load SHALL NOT run it again

**Independent Test**: Load a v1 store holding two games both in "District League"; the list holds exactly one competition.

---

### P1: Manage competitions ⭐ MVP

**User Story**: As a coach, I want to add, rename and remove competitions so that the list
matches my season.

**Why P1**: A list nobody can edit is a constant.

**Acceptance Criteria**:

1. WHEN the manager opens THEN it SHALL list every competition
2. WHEN a name is submitted THEN the system SHALL add it and show it in the list without a reload
3. WHEN a competition is renamed THEN every game carrying the old name SHALL carry the new one
4. WHEN a delete is requested THEN the system SHALL ask for confirmation, naming how many games use it
5. WHEN a delete is confirmed THEN the competition SHALL be removed and the affected games' stored names SHALL be unchanged
6. WHEN a delete is cancelled THEN nothing SHALL change
7. WHEN the list is empty THEN the manager SHALL say so and invite the first entry
8. WHEN a rejected name is submitted THEN the system SHALL explain why and keep the typed value

**Independent Test**: Rename "District League" to "Distrital"; both seeded games report the new name.

---

## Edge Cases

- WHEN a name has leading or trailing whitespace THEN it SHALL be stored trimmed
- WHEN a rename would collide with another competition's name THEN it SHALL be rejected with the same message a duplicate create gets
- WHEN a rename is a pure case change ("cup" → "Cup") THEN it SHALL be allowed and SHALL cascade
- WHEN a competition is deleted while the game form is open THEN the form SHALL not crash — this is why `22` must tolerate a value absent from the list
- WHEN storage is full THEN a create SHALL surface the quota error rather than appear to succeed
- WHEN a very long name is entered THEN it SHALL be stored and SHALL wrap rather than overflow the manager

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| COMP-01 | P1: Collection, service and validation | Tasks | Pending |
| COMP-02 | P1: Schema migration from existing game strings | Tasks | Pending |
| COMP-03 | P1: Manager popup — list and create | Tasks | Pending |
| COMP-04 | P1: Rename with cascade to games | Tasks | Pending |
| COMP-05 | P1: Delete with a counted confirmation | Tasks | Pending |

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] A coach never types the same competition name twice
- [ ] An existing install opens the manager and sees the competitions it already had
- [ ] A rename is reflected on every affected game
