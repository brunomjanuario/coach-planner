# Opponents Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** 01-persistence-layer, 07-games-league-table, 13-popup-shell

## Problem Statement

A game's opponent is typed by hand every time (`GameSavePopup.jsx:129-141`). A
coach who plays the same eight clubs twice a season types sixteen opponent names,
and one typo produces a club that exists only on that fixture. There is no list
of the clubs a team plays, so nothing can offer the name that was used last time.

This is the same defect as the competition field, on the field that repeats more
often.

## Goals

- [ ] A coach can create, rename and delete the opponents they play
- [ ] Existing games' opponent names become that list, without data loss
- [ ] The list is available for the game form to consume

## Out of Scope

| Feature | Reason |
|---|---|
| Making the game form use the list | `22-game-form-selects` owns that. |
| Linking opponents to league-table rival rows | Tempting — both are club names — but rival rows are standings data with their own lifecycle (AD-008), and merging the two models is a separate decision with its own spec. |
| Opponent metadata (colours, crest, contact, venue) | Nothing reads it. A name is what the game form needs. |
| Head-to-head records per opponent | A consumer of this data, planned separately. |
| Foreign-key integrity between games and opponents | Deliberate — same trade-off as `20`, recorded below. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| What "create a component" meant | Create an **opponent** | User confirmed | y — user chose it |
| How games reference an opponent | Games keep their existing `opponent` **string**; the collection is a managed reference list, not a foreign key | Same trade-off as `20`, chosen for the same reason and stated in the same terms so the two stay symmetric | n |
| Where existing names come from | A schema migration seeds the collection from the distinct non-empty `game.opponent` values already stored | An existing user should not retype the clubs already in their fixture list | n |
| Rename | Cascades to every game carrying the old name | Same as `20` | n |
| Delete | Removes the opponent; games keep their historical name | A fixture against a club still happened | n |
| Scope of the list | Global, not per team | Two squads at the same club usually play the same opposition; a per-team list would be typed twice | n |
| Duplicate names | Rejected, case-insensitively | The disease this feature treats | n |
| Where it is managed | An "Opponents" button in the Games page header opening a manager popup, beside `20`'s Competitions control | Same page, same pattern | n |
| Shared implementation with `20` | The two managers may share a component **only if** `20` has already shipped and the shapes are genuinely identical; otherwise duplicate and note it | Extracting an abstraction across an unshipped feature is how both end up wrong | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: A stored opponent list ⭐ MVP

**User Story**: As a coach, I want the clubs I play stored so that I stop retyping them.

**Why P1**: Everything else needs somewhere to read from.

**Acceptance Criteria**:

1. WHEN the store initialises a fresh install THEN it SHALL include an `opponents` collection
2. WHEN `opponentService.getAll` is called THEN it SHALL return a copy, never a live reference (AD-004)
3. WHEN an opponent is created THEN it SHALL receive an id from `newId()` (AD-003)
4. WHEN an opponent is created with a name matching an existing one, ignoring case and surrounding whitespace THEN the system SHALL reject it
5. WHEN an opponent is created with an empty or whitespace-only name THEN the system SHALL reject it
6. WHEN demo data is reset THEN the opponents collection SHALL be cleared and re-seeded with the rest

**Independent Test**: Create "Porto", reload, it is still there; create " porto ", it is rejected.

---

### P1: Existing opponent names are adopted ⭐ MVP

**User Story**: As an existing user, I want the clubs already on my fixtures in the list.

**Why P1**: Without it, only new installs benefit.

**Acceptance Criteria**:

1. WHEN a store at the previous schema version is loaded THEN the migration SHALL create one opponent per distinct non-empty `game.opponent` value
2. WHEN two games name the same opponent differing only by case or surrounding whitespace THEN the migration SHALL create one opponent
3. WHEN a game has no opponent THEN the migration SHALL create nothing for it
4. WHEN the migration runs THEN it SHALL NOT modify any game record
5. WHEN the migration has run THEN the stored schema version SHALL be the new one, and a second load SHALL NOT run it again
6. WHEN this migration is added THEN it SHALL take the next unused schema version — v3 if `20-competitions` has already shipped, v2 if it has not

**Independent Test**: Load a store holding the seeded Benfica and Sporting fixtures; the list holds exactly those two.

---

### P1: Manage opponents ⭐ MVP

**User Story**: As a coach, I want to add, rename and remove opponents so that the list
matches my division.

**Why P1**: A list nobody can edit is a constant.

**Acceptance Criteria**:

1. WHEN the manager opens THEN it SHALL list every opponent
2. WHEN a name is submitted THEN the system SHALL add it and show it without a reload
3. WHEN an opponent is renamed THEN every game carrying the old name SHALL carry the new one
4. WHEN a delete is requested THEN the system SHALL ask for confirmation, naming how many games use it
5. WHEN a delete is confirmed THEN the opponent SHALL be removed and the affected games' stored names SHALL be unchanged
6. WHEN a delete is cancelled THEN nothing SHALL change
7. WHEN the list is empty THEN the manager SHALL say so and invite the first entry
8. WHEN a rejected name is submitted THEN the system SHALL explain why and keep the typed value

**Independent Test**: Rename "Benfica" to "SL Benfica"; the seeded fixture reports the new name.

---

## Edge Cases

- WHEN a name has leading or trailing whitespace THEN it SHALL be stored trimmed
- WHEN a rename would collide with another opponent THEN it SHALL be rejected before anything is written
- WHEN a rename is a pure case change THEN it SHALL be allowed and SHALL cascade
- WHEN an opponent shares a name with a league-table rival row THEN the two SHALL remain independent — renaming one SHALL NOT touch the other
- WHEN an opponent is deleted while the game form is open THEN the form SHALL not crash — `22` must tolerate a value absent from the list
- WHEN storage is full THEN a create SHALL surface the quota error rather than appear to succeed

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| OPP-01 | P1: Collection, service and validation | Tasks | Pending |
| OPP-02 | P1: Schema migration from existing game strings | Tasks | Pending |
| OPP-03 | P1: Manager popup — list and create | Tasks | Pending |
| OPP-04 | P1: Rename with cascade to games | Tasks | Pending |
| OPP-05 | P1: Delete with a counted confirmation | Tasks | Pending |

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] A coach never types the same club name twice
- [ ] An existing install opens the manager and sees the clubs it already played
- [ ] Renaming a club is reflected on every affected fixture, and on no rival row
