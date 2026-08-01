# Training Number Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** 01-persistence-layer

## Problem Statement

`pages/Trainings.jsx` renders each row as `{training.id} {training.day.toString()}
{training.duration}` — a raw internal id, an unformatted `Date.toString()`, and a
bare number. After `01-persistence-layer` switches ids to UUIDs (AD-003), that
first column becomes a 36-character hex string, which is worse than useless.

Coaches do not think in ids. They think "that was session 12". There is no
human-readable way to refer to a training in this app.

## Goals

- [ ] Every training displays a per-team sequential number
- [ ] The number is stable under reload and correct after insert or delete
- [ ] The raw id and `Date.toString()` are gone from the UI

## Out of Scope

| Feature | Reason |
|---|---|
| Per-season numbering | AD-006 — `Team.season` is free text and trainings carry no season field, so there is no reliable boundary to reset the counter on. |
| A stored, immutable training number | AD-006 — computing on read means insert and delete renumber automatically; a stored counter would drift. |
| Global (cross-team) numbering | A coach counts sessions within a squad, not across their whole workload. |
| Numbering games | `07-games-league-table` owns game identity; fixtures are named by opponent, not numbered. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Numbering scope | Per team, chronological across all that team's trainings (AD-006) | User selection; no reliable season boundary exists | y |
| Ordering key | `day` ascending; ties broken by id for determinism | Two trainings can share a timestamp; without a tiebreak the numbering flickers between renders | n |
| Starting number | 1 | Coaches count from one | n |
| Unassigned trainings | No number — rendered as "—" | A training with no team has no sequence to belong to (see `03` TTA-05) | n |
| Display format | `Training #7` | Unambiguous and short enough for a list row | n |
| Date display | `toLocaleString()` — the format `TrainingDetailsPopup` already uses | Consistency with the existing popup beats introducing a second format | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Sequential numbering ⭐ MVP

**User Story**: As a coach, I want each training to carry a session number so that I can
refer to "session 12" instead of a UUID.

**Why P1**: The feature.

**Acceptance Criteria**:

1. WHEN a team's trainings are listed THEN the system SHALL number them from 1 in ascending date order
2. WHEN two trainings share the same `day` THEN the system SHALL order them deterministically by id so numbering does not flicker between renders
3. WHEN a training is inserted earlier than existing ones THEN the system SHALL renumber the later trainings on the next read
4. WHEN a training is deleted THEN the system SHALL close the gap so numbers stay contiguous
5. WHEN a training has no team THEN the system SHALL render "—" instead of a number
6. WHEN a team has no trainings THEN the system SHALL return an empty list without error

**Independent Test**: With a team holding three trainings, insert one dated before all of them; the others shift from 1,2,3 to 2,3,4.

---

### P1: Readable training rows ⭐ MVP

**User Story**: As a coach, I want a training row to show the number, a readable date and
the duration so that I can scan the list.

**Why P1**: The number is pointless if it sits next to an unformatted `Date.toString()`.

**Acceptance Criteria**:

1. WHEN a training row is rendered THEN the system SHALL display `Training #N`, a locale-formatted date and time, and the duration in minutes
2. WHEN a training row is rendered THEN the system SHALL NOT display the raw id
3. WHEN a training's `day` is an invalid date THEN the system SHALL render "Invalid date" rather than crashing the list
4. WHEN the details popup is opened THEN the system SHALL display the training number in its heading

**Independent Test**: Open `/trainings`; no row contains a UUID or the string "GMT".

---

## Edge Cases

- WHEN a team's trainings are filtered to future-only THEN the numbers SHALL remain the team-wide numbers, not restart at 1 within the filtered view
- WHEN the same training appears in the calendar and the trainings list THEN both SHALL show the same number
- WHEN a training is reassigned from team A to team B THEN it SHALL take a number from B's sequence on the next read
- WHEN a team has 100+ trainings THEN numbering SHALL remain correct and the computation SHALL not be re-run per row

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| TNUM-01 | P1: Sequential numbering (ordering + ties) | Tasks | ✅ Verified |
| TNUM-02 | P1: Renumbering on insert and delete | Tasks | ✅ Verified |
| TNUM-03 | P1: Unassigned and empty handling | Tasks | ✅ Verified |
| TNUM-04 | P1: Readable training rows | Tasks | ✅ Verified |
| TNUM-05 | P1: Number in the details popup | Tasks | ✅ Verified |

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped

---

## Success Criteria

- [x] No UUID appears anywhere in the trainings UI
- [x] Inserting a training earlier in the calendar renumbers the rest correctly
- [x] Filtering to future trainings does not restart the numbering
