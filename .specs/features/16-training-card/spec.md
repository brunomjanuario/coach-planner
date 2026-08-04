# Training Card Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** 05-training-number, 06-training-edit

## Problem Statement

A training renders as one run-on line of text built by string concatenation
(`src/pages/Trainings.jsx:35-38`):

```
Training #3 · 10/24/2024, 3:00:00 PM · 90 min
```

Everything has the same weight, the date is a raw `toLocaleString()` with
seconds, nothing shows which team the session belongs to, and nothing shows what
is in it — a session with six exercises looks identical to an empty one. The row
is a `<li>` with an `onClick`, so it is invisible to the keyboard.

The same label function is used for the "Unassigned" rows, so the problem is
duplicated across three lists on one page.

## Goals

- [ ] A training is scannable: number, when, how long, whose, and how full
- [ ] One `TrainingCard` component renders a training everywhere it is listed
- [ ] Training rows are keyboard-reachable

## Out of Scope

| Feature | Reason |
|---|---|
| Page layout — which lists exist and how they are sized | `17-trainings-page-layout` owns it. This feature changes what one row looks like, not where rows go. |
| Editing from the card | The card opens the details popup, which already owns Edit/Delete/Rate. |
| Exercise thumbnails | `exercise.image` exists in the seed but is empty everywhere and has no upload path. |
| Drag-to-reorder | Training order is chronological by definition (AD-006). |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| What a card shows | Number badge · weekday + date + time · duration · team name · exercise count · total planned minutes | The five things a coach checks before opening a session | n |
| Date format | Weekday, day, short month, and `HH:mm` — no seconds | `toLocaleString()`'s seconds are noise on a scheduled session | n |
| Team name on the card | Always shown; "Unassigned" when the training has no valid team | The page lists all teams' trainings by default, so the row must say whose it is | n |
| Planned-vs-scheduled mismatch | Shown as a subtle hint when `totalPlannedMinutes` ≠ `duration` | The data is already computed in the details popup; surfacing it is free and catches a common planning slip | n |
| Past vs upcoming | Carried by a muted treatment on past cards, not by colour alone | The two lists already separate them; the card reinforces without shouting | n |
| Interaction | The whole card is a `<button>`, like `SelectableListItem` from `02` | Fixes the keyboard hole and matches the established pattern | n |
| Invalid dates | Render "Invalid date" as today, not a crash or an empty slot | Regression guard on `05`'s TNUM-04.3 | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: A scannable training card ⭐ MVP

**User Story**: As a coach, I want to see what a session is without opening it so that I
can find the right one quickly.

**Why P1**: The feature.

**Acceptance Criteria**:

1. WHEN a training renders THEN the card SHALL show its number, its date and time, its duration and its team
2. WHEN a training has exercises THEN the card SHALL show how many
3. WHEN a training has no exercises THEN the card SHALL say so rather than render an empty slot
4. WHEN a training's exercises' planned minutes differ from its scheduled duration THEN the card SHALL show the planned total alongside it
5. WHEN a training's `day` is invalid THEN the card SHALL render "Invalid date" and still render every other field
6. WHEN a training has no valid team THEN the card SHALL render "Unassigned" in place of a team name
7. WHEN a training has no number THEN the card SHALL render the "—" placeholder it does today

**Independent Test**: A card for a 90-minute session with three 10/20/10-minute exercises shows `3 exercises · 40 min planned of 90`.

---

### P1: Keyboard and pointer parity ⭐ MVP

**User Story**: As a keyboard user, I want to open a training without a mouse.

**Why P1**: The current `<li onClick>` is unreachable; shipping a redesign that keeps that would bake the hole in.

**Acceptance Criteria**:

1. WHEN a card renders THEN it SHALL be a focusable control
2. WHEN a focused card receives Enter or Space THEN the system SHALL open that training's details
3. WHEN a card is clicked THEN the system SHALL open the same details popup it opens today
4. WHEN a card is focused THEN the system SHALL render a visible focus indicator
5. WHEN a card renders THEN its accessible name SHALL identify the training by number, date and team

**Independent Test**: Tab to the third card, press Enter, the details popup opens for that training.

---

### P2: One card everywhere a training is listed

**User Story**: As a maintainer, I want a single component so that the three lists cannot drift.

**Why P2**: Correctness is in P1; this is what stops the regression.

**Acceptance Criteria**:

1. WHEN the upcoming list renders THEN it SHALL use `TrainingCard`
2. WHEN the past list renders THEN it SHALL use `TrainingCard`
3. WHEN the unassigned list renders THEN it SHALL use `TrainingCard` with its team-assignment control alongside
4. WHEN the page renders THEN the `trainingRowLabel` string-concatenation helper SHALL be gone

**Independent Test**: `grep trainingRowLabel src` returns nothing.

---

## Edge Cases

- WHEN an exercise has a null duration THEN the planned total SHALL treat it as 0 rather than render `NaN`
- WHEN a team name is long THEN the card SHALL wrap rather than overflow its container
- WHEN a training is in the past THEN the card SHALL render the muted treatment while staying readable (contrast held — see `14`)
- WHEN a card renders inside the unassigned list THEN the assignment `<select>` SHALL remain independently operable and SHALL NOT trigger the card's own click
- WHEN the same training appears in two lists during a re-render THEN each SHALL carry a stable React key

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| TCARD-01 | P1: Card content and formatting | Tasks | Pending |
| TCARD-02 | P1: Exercise count and planned-minutes hint | Tasks | Pending |
| TCARD-03 | P1: Keyboard-operable card | Tasks | Pending |
| TCARD-04 | P2: Used by all three lists | Tasks | Pending |
| TCARD-05 | P2: String-concatenation helper removed | Tasks | Pending |

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] A coach can identify a session's team, size and timing without opening it
- [ ] Every training row is reachable by Tab and openable by Enter
- [ ] Exactly one component renders a training row
