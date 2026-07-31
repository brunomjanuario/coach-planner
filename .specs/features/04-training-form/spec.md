# Training Form Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** 01-persistence-layer, 03-training-team-assignment

## Problem Statement

The exercise editor in `TrainingSavePopup` collects a single free-text
description. The seed data in `mock.js` shows what an exercise is actually meant
to hold — `numberOfPlayers`, `duration`, `repetitions`, `image` — so a training
created through the UI is a strictly poorer record than one that shipped with the
app. A coach writing "SSG" has captured nothing about how long it runs, how many
players it needs, or how many times it repeats.

Once added, an exercise cannot be edited or reordered — only removed and retyped
— and nothing checks that the exercises fit inside the session's stated duration.
`TrainingDetailsPopup` compounds this by rendering only `description`, so even
the seeded fields are invisible.

## Goals

- [ ] An exercise created in the UI carries the same fields as the seeded ones
- [ ] Exercises can be edited and reordered without being retyped
- [ ] The coach can see whether the plan fits the session length
- [ ] Everything captured is visible again in the details view

## Out of Scope

| Feature | Reason |
|---|---|
| Exercise image upload | The `image` field exists in the seed shape but there is no storage story for binary data in localStorage (AD-002 notes the ~5MB ceiling). Needs its own spec. |
| Exercise library / reuse across trainings | Real feature with its own data model. This spec covers exercises belonging to one training. |
| Drag-and-drop reordering | Move up/down buttons are keyboard-accessible and need no dependency. DnD can replace them later without changing the data. |
| Editing an existing training | `06-training-edit` owns edit mode. |
| Team selection | `03-training-team-assignment` owns it. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Which exercise fields are required | `description` and `duration` only | A coach sketching a plan should not be blocked on player counts; duration is required because the fit-check depends on it | n |
| `numberOfPlayers` / `repetitions` when omitted | Stored as `null`, rendered as "—" | `0` would be a lie (zero players), and `undefined` breaks the round trip | n |
| Exercise total exceeding session duration | Warn, do not block | A coach may deliberately over-plan and cut on the day. Blocking would fight the user. | n |
| Exercise ids | `newId()` from AD-003 | The current `Date.now()` collides when two exercises are added in the same millisecond | n |
| Reorder control | Move up / move down buttons | Accessible by keyboard with no library; DnD is a later enhancement | n |
| `image` field | Written as `""` to preserve the shape | Keeps created and seeded exercises structurally identical for the day upload exists | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Full exercise fields ⭐ MVP

**User Story**: As a coach, I want to record how long an exercise runs, how many players
it needs and how many times it repeats so that my plan is usable on the pitch.

**Why P1**: The entire point of the feature. Without it an exercise is a sticky note.

**Acceptance Criteria**:

1. WHEN the exercise editor is opened THEN the system SHALL present inputs for description, duration, number of players and repetitions
2. WHEN an exercise is added with all fields THEN the system SHALL store all four values on the exercise record
3. WHEN an exercise is added with only description and duration THEN the system SHALL store `null` for the omitted numeric fields
4. WHEN the training is saved and reloaded THEN the system SHALL return every exercise field unchanged
5. WHEN an exercise is created THEN the system SHALL assign its id via `newId()`, never `Date.now()`

**Independent Test**: Add an exercise with all four fields, reload, confirm all four are present.

---

### P1: Field validation ⭐ MVP

**User Story**: As a coach, I want the form to reject impossible values so that I do not
save a 0-minute exercise for -3 players.

**Why P1**: Invalid numbers propagate into the duration fit-check and, later, into
the dashboard aggregates.

**Acceptance Criteria**:

1. WHEN duration is zero, negative or non-numeric THEN the system SHALL block the add and show a field-level message
2. WHEN number of players is less than 1 THEN the system SHALL block the add and show a field-level message
3. WHEN repetitions is less than 1 THEN the system SHALL block the add and show a field-level message
4. WHEN description is empty or whitespace-only THEN the system SHALL block the add
5. WHEN a blocked field is corrected THEN the system SHALL clear that field's message

**Independent Test**: Enter duration `0`, attempt to add, confirm it is refused with a message.

---

### P2: Edit and reorder exercises

**User Story**: As a coach, I want to fix a typo or move an exercise up the session so
that I do not have to delete and retype it.

**Why P2**: The form is usable without it, just tedious.

**Acceptance Criteria**:

1. WHEN an added exercise's edit control is used THEN the system SHALL load its values back into the editor
2. WHEN an edited exercise is saved THEN the system SHALL update it in place, keeping its position and id
3. WHEN move-up is used on an exercise THEN the system SHALL swap it with the one above
4. WHEN move-up is used on the first exercise THEN the system SHALL disable the control rather than wrap around
5. WHEN move-down is used on the last exercise THEN the system SHALL disable the control

**Independent Test**: Add three exercises, move the third to the top, confirm the order.

---

### P2: Session fit indicator

**User Story**: As a coach, I want to see the total planned time against the session
length so that I know whether the plan fits.

**Why P2**: Informational; the form works without it.

**Acceptance Criteria**:

1. WHEN exercises are present THEN the system SHALL display the sum of `duration × repetitions` across all of them
2. WHEN the total exceeds the session duration THEN the system SHALL display a warning that names the overage in minutes
3. WHEN the total is within the session duration THEN the system SHALL display the remaining minutes
4. WHEN an exercise is added, edited or removed THEN the system SHALL recompute the total immediately
5. WHEN the total exceeds the session duration THEN the system SHALL still allow saving

**Independent Test**: Set a 60-minute session, add exercises totalling 90 minutes, confirm a 30-minute overage warning and that saving still works.

---

### P2: Full detail view

**User Story**: As a coach, I want to see every exercise field when I open a training so
that the data I entered is actually useful.

**Why P2**: Without it the captured data is write-only.

**Acceptance Criteria**:

1. WHEN a training is opened THEN the system SHALL render each exercise's duration, players and repetitions alongside its description
2. WHEN a field is `null` THEN the system SHALL render "—" rather than blank or `null`
3. WHEN a training has no exercises THEN the system SHALL render the existing "No exercises" message
4. WHEN a training is opened THEN the system SHALL display the total planned time

**Independent Test**: Open a seeded training; the three exercises show their player counts and repetitions.

---

## Edge Cases

- WHEN an exercise description exceeds a sensible length THEN the system SHALL wrap it in the list rather than overflow the popup
- WHEN 20+ exercises are added THEN the list SHALL scroll within the popup rather than push the action buttons off-screen
- WHEN the editor holds unsaved values and the popup is cancelled THEN the system SHALL discard them without prompting
- WHEN an exercise is edited and the edit is cancelled THEN the system SHALL restore the original values
- WHEN a seeded exercise (which has all fields) is rendered next to a sparse one THEN both SHALL render without layout shift

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| TFORM-01 | P1: Full exercise fields (inputs + storage) | Tasks | Pending |
| TFORM-02 | P1: Full exercise fields (round trip, ids) | Tasks | Pending |
| TFORM-03 | P1: Field validation | Tasks | Pending |
| TFORM-04 | P2: Edit an added exercise | Tasks | Pending |
| TFORM-05 | P2: Reorder exercises | Tasks | Pending |
| TFORM-06 | P2: Session fit indicator | Tasks | Pending |
| TFORM-07 | P2: Full detail view | Tasks | Pending |

**Coverage:** 7 total, 7 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] An exercise created in the UI is structurally identical to a seeded one
- [ ] No exercise can be saved with a zero or negative duration
- [ ] A three-exercise plan can be reordered without retyping
- [ ] Every field entered is visible again in the details popup
