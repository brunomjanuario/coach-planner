# Game Form Selects Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** 20-competitions, 21-opponents

## Problem Statement

`20` and `21` give the app a managed list of competitions and a managed list of
opponents, but the game form still asks the coach to type both by hand
(`GameSavePopup.jsx:129-141` and `:165-177`). The lists exist and nothing reads
them, so every fixture still risks a new spelling of a club that is already on
file.

The team field on the same form is already a `<select>` — the two text inputs
beside it are the outlier.

## Goals

- [ ] Opponent and competition are chosen from the managed lists
- [ ] A game whose stored value is not in the list can still be edited without losing it
- [ ] Adding a new opponent or competition does not mean abandoning the form

## Out of Scope

| Feature | Reason |
|---|---|
| Creating, renaming or deleting from the manager | `20` and `21` own the managers. This feature adds at most a create-inline affordance. |
| Changing what a game stores | Games keep their `opponent` and `competition` strings — the trade-off recorded in `20` and `21`. |
| Making competition mandatory | It is optional today; a friendly is a real fixture. |
| Typeahead / combobox | A `<select>` is what was asked for, and the lists are small. |
| Applying the same treatment to rival-row entry | `RivalRowPopup` is standings data with its own lifecycle (AD-008). |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Control type | A native `<select>` for each, matching the existing team select | User asked for a selectable box; the pattern is already on the form | y — user chose it |
| Opponent required | Yes, as today | The form already rejects an empty opponent | n |
| Competition required | No, as today | Optional field; the select carries a "None" option | n |
| A stored value absent from the list | Rendered as an extra option, marked as not in the list, and preserved on save | Otherwise editing a game silently rewrites its opponent — the worst possible outcome for a save button | n |
| Empty list | The select is disabled and the form points at the manager, mirroring how the team select already handles "no teams yet" | Consistency with the control beside it | n |
| Adding without leaving the form | Each select offers an "Add new…" option opening the matching manager popup; on close the list re-reads and the new value is selected | Otherwise the coach loses a half-filled fixture to add one club | n |
| Ordering | Alphabetical, case-insensitive | The only order that is predictable in a dropdown | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Pick the opponent ⭐ MVP

**User Story**: As a coach, I want to choose the opponent from my list so that I stop
typing club names.

**Why P1**: The requested change, on the field that repeats most.

**Acceptance Criteria**:

1. WHEN the game form opens THEN the opponent field SHALL be a select populated from the opponents list, ordered alphabetically
2. WHEN a game is submitted THEN the system SHALL store the selected opponent's name in the game's existing `opponent` field
3. WHEN no opponent is selected THEN the system SHALL reject the submission with the existing "Please enter the opponent." class of message
4. WHEN the opponents list is empty THEN the select SHALL be disabled and the form SHALL point at the opponents manager
5. WHEN an existing game is edited and its stored opponent is not in the list THEN the select SHALL show that value, marked as not in the list, and SHALL preserve it on save
6. WHEN "Add new…" is chosen THEN the system SHALL open the opponents manager, and on close SHALL re-read the list

**Independent Test**: Create a game against a listed club; the stored game reads exactly that name.

---

### P1: Pick the competition ⭐ MVP

**User Story**: As a coach, I want to choose the competition from my list.

**Why P1**: Same change, second field; leaving one as free text keeps the drift.

**Acceptance Criteria**:

1. WHEN the game form opens THEN the competition field SHALL be a select populated from the competitions list, ordered alphabetically
2. WHEN the competition select renders THEN it SHALL offer an explicit "None" option
3. WHEN "None" is selected THEN the system SHALL store an empty competition, as an untyped field does today
4. WHEN a game is submitted with a competition THEN the system SHALL store that competition's name in the game's existing `competition` field
5. WHEN an existing game's stored competition is not in the list THEN the select SHALL show that value, marked as not in the list, and SHALL preserve it on save
6. WHEN the competitions list is empty THEN the select SHALL offer only "None" and point at the competitions manager

**Independent Test**: Edit the seeded "District League" fixture without touching the field; the stored value is unchanged.

---

## Edge Cases

- WHEN both lists are empty THEN the form SHALL still be usable for a competition-less game only if an opponent can be added — otherwise it SHALL say plainly what is missing
- WHEN the manager is opened from the form and the coach adds nothing THEN the form's values SHALL be exactly as they were
- WHEN a name is added from the form THEN it SHALL become the selected value without a second interaction
- WHEN a stored opponent differs from a listed one only by case THEN it SHALL match that list entry rather than render as a second, "not in the list" option
- WHEN the lists are long THEN the selects SHALL remain usable inside the popup's scroll region (`13`)
- WHEN a game is created and the opponent is later renamed in the manager THEN that game SHALL follow the rename, as `21` specifies

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| GSEL-01 | P1: Opponent select populated and validated | Tasks | Pending |
| GSEL-02 | P1: Competition select with a None option | Tasks | Pending |
| GSEL-03 | P1: Legacy values preserved and marked | Tasks | Pending |
| GSEL-04 | P1: Empty-list states point at the managers | Tasks | Pending |
| GSEL-05 | P1: Add-new from inside the form | Tasks | Pending |

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] The game form contains no free-text opponent or competition input
- [ ] Editing a game and pressing Save never changes its opponent or competition
- [ ] A coach can add a new club without losing a half-filled fixture
