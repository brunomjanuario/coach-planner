# Training Exercise Details Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** 06-training-edit, 13-popup-shell, 27-popup-button-system

## Problem Statement

`TrainingDetailsPopup` renders every exercise as one crammed line of text
(`src/components/TrainingDetailsPopup.jsx:86-97`):

```
Corrida — 10min · 21 players · x1
```

Four fields separated by three different punctuation marks, wrapped mid-sentence
on a narrow panel. There is nowhere to put anything else — and something else is
coming: `29-exercise-designer` adds a diagram to each exercise, which cannot go
on that line.

The exercise is also the only entity in the app with no detail view. Teams,
players, trainings and games all open. An exercise, which is the thing a coach
actually runs on the pitch, does not.

## Goals

- [ ] An exercise opens its own detail view from the training popup
- [ ] Each field is labelled instead of run together with punctuation
- [ ] A coach can move between a training's exercises without closing anything
- [ ] There is a place for `29`'s diagram to live

## Out of Scope

| Feature | Reason |
|---|---|
| Editing an exercise from the detail view | Editing lives in `TrainingSavePopup`'s `ExerciseFields`. Two edit paths for one entity is a modelling decision, not a display one. |
| The exercise diagram itself | `29-exercise-designer`. This feature reserves the slot; `29` fills it. |
| Reordering exercises | A different interaction with its own ACs. |
| An exercise library shared across trainings | Exercises are owned by their training today (`trainingId`). Changing that is a data-model feature. |
| Opening an exercise by URL | Trainings deep-link at the training level. A second nested param is scope the request did not ask for. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| How it opens | A stacked `ExerciseDetailsPopup` over the training popup | Exactly the pattern `TrainingDetailsPopup` already uses for `SquadRatingPopup` (`:117-124`). No new mechanism. | n |
| The training popup stays mounted | Yes — closing the exercise returns to the training, still open | Otherwise a coach checking three exercises reopens the training three times. | n |
| Row affordance | Each exercise row becomes a full-width `button` with a hover and focus style | It must look clickable; a `<li>` that happens to have an `onClick` does not. Same treatment `TrainingCard` got in `16`. | n |
| What the detail shows | Description, duration, number of players, repetitions, each labelled; plus this exercise's share of the training's planned time; plus a reserved diagram region | The share is the one genuinely new fact — `totalPlannedMinutes` already exists in `src/lib/trainingDuration.js` and nothing currently uses it per-exercise. | n |
| Missing optional fields | Render an em dash with the label, not a hidden row | The current line already prints `—` for nulls. Hiding the row would make two exercises look structurally different. | n |
| Prev / next | Included, as P2 | With no keyboard or arrow movement a coach closes and reopens for every exercise, which is the same friction one layer down. | n |
| Diagram slot when empty | Renders nothing at all until `29` lands | An empty bordered box promising a feature that does not exist is worse than no box. | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: An exercise opens ⭐ MVP

**User Story**: As a coach, I want to open an exercise from a training so that I
can read its details properly instead of decoding one line.

**Why P1**: This is the request.

**Acceptance Criteria**:

1. WHEN a training's details popup renders THEN each exercise SHALL be a
   focusable button carrying an accessible name that includes its description
2. WHEN an exercise row is activated by click or Enter THEN an
   `ExerciseDetailsPopup` SHALL open for that exercise
3. WHEN the exercise popup is open THEN the training popup SHALL still be
   mounted behind it
4. WHEN the exercise popup is closed THEN the training popup SHALL still be open
   and no exercise popup SHALL remain in the document
5. WHEN the exercise popup renders THEN it SHALL show Description, Duration,
   Number of players and Repetitions each under its own label
6. WHEN an optional field is null THEN its row SHALL render an em dash under the
   same label, not be omitted

**Independent Test**: Open a training with two exercises, click the first,
assert its four labelled fields are present and the training's title is still
in the document.

---

### P2: Move between exercises

**User Story**: As a coach reviewing a session, I want to step through the
exercises in order so that I can read the whole plan in one pass.

**Why P2**: Useful, not required for the detail view to be worth shipping.

**Acceptance Criteria**:

1. WHEN the exercise popup is open on any exercise but the last THEN a "Next"
   action SHALL be enabled and SHALL move to the following exercise
2. WHEN it is open on any exercise but the first THEN a "Previous" action SHALL
   be enabled and SHALL move to the preceding one
3. WHEN it is open on the first exercise THEN "Previous" SHALL be disabled
4. WHEN it is open on the last exercise THEN "Next" SHALL be disabled
5. WHEN the popup moves to another exercise THEN its title SHALL update to that
   exercise's description
6. WHEN a training has exactly one exercise THEN both actions SHALL be disabled

**Independent Test**: Open exercise 2 of 3; assert both actions enabled, click
Next, assert the title changed and Next is now disabled.

---

### P3: Planned-time context

**User Story**: As a coach, I want to see how much of the session an exercise
takes so that I can tell whether the plan is balanced.

**Why P3**: A small analytical addition on data already computed.

**Acceptance Criteria**:

1. WHEN the exercise popup renders THEN it SHALL show this exercise's duration
   as a share of the training's total planned minutes, rounded to a whole
   percent
2. WHEN the training's total planned time is 0 THEN the share SHALL NOT render
   and SHALL NOT show `NaN%` or `Infinity%`

---

## Edge Cases

- WHEN a training has no exercises THEN the existing "No exercises" line SHALL
  render and SHALL NOT be a button
- WHEN an exercise's description is long THEN the row and the popup title SHALL
  wrap rather than truncate
- WHEN the training popup is closed while an exercise popup is open THEN both
  SHALL close together and neither SHALL remain in the document
- WHEN two exercises share a description THEN each row SHALL still open its own
  record — rows are keyed by exercise id, not by text
- WHEN an exercise's duration is null THEN P3's share SHALL NOT render for it

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| EXDET-01 | P1: An exercise opens | Tasks | Pending |
| EXDET-02 | P1: Labelled fields | Tasks | Pending |
| EXDET-03 | P2: Prev / next | Tasks | Pending |
| EXDET-04 | P3: Planned-time share | Tasks | Pending |

**Coverage:** 4 total, 4 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] A coach can read one exercise's plan without decoding a punctuation-separated line
- [ ] All three exercises of a training can be read without reopening the training
- [ ] `29-exercise-designer` has a defined place to render a diagram
