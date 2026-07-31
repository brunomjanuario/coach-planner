# Training Edit Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** 01-persistence-layer, 04-training-form

## Problem Statement

`TrainingDetailsPopup` renders an Edit button wired to an `onEdit` prop that no
caller passes — clicking it does nothing. There is no edit path for a training
anywhere in the app: `TrainingSavePopup` only creates, and `trainingService.update`
was a `fetch` against a nonexistent endpoint until `01-persistence-layer` rewrote
it. There is no delete path either.

A coach who mistypes a date, or whose session moves, has to delete nothing (they
can't) and create a duplicate.

## Goals

- [ ] A training's date, duration, team and exercises can all be changed
- [ ] A training can be deleted with confirmation
- [ ] The dead Edit button becomes functional

## Out of Scope

| Feature | Reason |
|---|---|
| Edit history / audit trail | No stated need. The store is designed not to preclude it. |
| Bulk edit across trainings | Single-record editing first; bulk is a separate interaction model. |
| Recurring-series editing ("change all future sessions") | There are no recurring trainings to edit. |
| Undo after delete | Confirmation is the guard. Undo needs a trash model of its own. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Edit UI | Reuse `TrainingSavePopup` in an edit mode | A second near-identical form would drift from the create form within one feature | n |
| Which fields are editable | All of them — date, duration, team, exercises | Restricting any one of them would need a reason, and there isn't one | n |
| Changing a training's team | Allowed | It is the natural fix for a training created against the wrong squad; `05` already renumbers on reassignment | n |
| Delete confirmation | `ConfirmationPopup`, matching team and player deletion | Consistency with the two destructive actions that already exist | n |
| Where delete lives | In the details popup, beside Edit | The user is already looking at the record they mean to remove | n |
| Concurrent edit of a deleted training | Fail with a clear message; do not resurrect the record | Silently re-creating a deleted training is worse than an error | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Edit a training ⭐ MVP

**User Story**: As a coach, I want to change a training I already created so that a moved
session does not become a duplicate.

**Why P1**: The feature.

**Acceptance Criteria**:

1. WHEN the Edit button in the details popup is used THEN the system SHALL open the training form pre-filled with that training's values
2. WHEN the form opens in edit mode THEN the system SHALL label it "Edit Training" and its action "Save"
3. WHEN an edited training is submitted THEN the system SHALL update the existing record rather than create a second one
4. WHEN an edited training is submitted THEN the system SHALL preserve its id
5. WHEN the edit is cancelled THEN the system SHALL leave the stored training unchanged
6. WHEN an edited training is reloaded THEN the system SHALL return the updated values

**Independent Test**: Edit a training's duration from 90 to 60, reload, confirm 60 and confirm the list length is unchanged.

---

### P1: Pre-filled date and time ⭐ MVP

**User Story**: As a coach, I want the existing date already in the field so that I am
not retyping it to change the duration.

**Why P1**: A `datetime-local` input silently rejects a `Date` object and an ISO
string with a timezone suffix — get this wrong and the field renders empty, which
looks like data loss.

**Acceptance Criteria**:

1. WHEN the form opens in edit mode THEN the date field SHALL be populated with the training's date and time
2. WHEN the date field is populated THEN the value SHALL be in the local timezone, matching what the details popup displayed
3. WHEN the form is submitted without touching the date THEN the system SHALL store the same instant it started with
4. WHEN the training's date is invalid THEN the field SHALL render empty rather than `Invalid Date`

**Independent Test**: Edit a training, change only the duration, save; the date is byte-identical to before.

---

### P1: Delete a training ⭐ MVP

**User Story**: As a coach, I want to delete a cancelled session so that my list reflects
reality.

**Why P1**: Without it, a mistyped training is permanent.

**Acceptance Criteria**:

1. WHEN the Delete control is used THEN the system SHALL open a confirmation dialog naming the training
2. WHEN deletion is confirmed THEN the system SHALL remove the training and close both popups
3. WHEN deletion is cancelled THEN the system SHALL leave the training unchanged
4. WHEN a training is deleted THEN the system SHALL NOT list it after a reload
5. WHEN a training is deleted THEN the remaining trainings for that team SHALL renumber contiguously

**Independent Test**: Delete training #2 of three; the third becomes #2.

---

### P2: Lists reflect edits immediately

**User Story**: As a coach, I want the list to update the moment I save so that I trust
the change landed.

**Why P2**: Correctness is in P1; this is the feedback.

**Acceptance Criteria**:

1. WHEN a training is edited THEN the system SHALL refresh both training lists without a page reload
2. WHEN an edit moves a training from past to future (or back) THEN the system SHALL move it to the correct list
3. WHEN an edit changes a training's team THEN the system SHALL apply the active filter to the updated data
4. WHEN a training is deleted THEN the system SHALL remove it from the list without a reload

**Independent Test**: Edit a past training's date to next week; it jumps to "Next Trainings".

---

## Edge Cases

- WHEN a training is edited to a date that is invalid THEN the system SHALL block the save with a message
- WHEN a training is deleted in one tab and edited in another THEN the edit SHALL fail with a clear message rather than re-create the record
- WHEN a training's team is changed THEN its number SHALL come from the new team's sequence on the next read
- WHEN all exercises are removed during an edit THEN the system SHALL save a training with an empty exercise list rather than block
- WHEN the details popup is open and the underlying training is edited THEN the popup SHALL show the updated values on reopen

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| TEDIT-01 | P1: Edit mode in the training form | Tasks | Pending |
| TEDIT-02 | P1: Update rather than duplicate | Tasks | Pending |
| TEDIT-03 | P1: Pre-filled date and time | Tasks | Pending |
| TEDIT-04 | P1: Wire the Edit button | Tasks | Pending |
| TEDIT-05 | P1: Delete with confirmation | Tasks | Pending |
| TEDIT-06 | P2: Lists reflect edits immediately | Tasks | Pending |

**Coverage:** 6 total, 6 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] The Edit button in the details popup does something
- [ ] Editing a training never increases the training count
- [ ] A round trip through edit with no changes leaves the record byte-identical
- [ ] Deleting a training renumbers the rest correctly
