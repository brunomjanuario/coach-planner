# Training Team Assignment Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** 01-persistence-layer

## Problem Statement

`pages/Trainings.jsx` passes `teamId={selectedTeam?.id}` into `TrainingSavePopup`.
When no team is selected — which is the page's default state — that is
`undefined`, and the popup stores `teamId: teamId || null`. The training saves
with `teamId: null`, matches no team filter, and is effectively invisible: the
coach creates a session and it vanishes.

There is no team picker in the form at all. Even with a team selected, the coach
is silently trusting that the list selection on the left is the team they meant.

## Goals

- [ ] A training can never be saved without a team
- [ ] The team is chosen explicitly and visibly in the form
- [ ] Trainings already orphaned by this bug are recoverable

## Out of Scope

| Feature | Reason |
|---|---|
| Full exercise editing | `04-training-form` owns it. |
| Editing an existing training's team | `06-training-edit` owns edit mode entirely. |
| Multi-team / joint sessions | No stated need; a training belongs to exactly one team. |
| Recurring trainings | Distinct feature with its own scheduling semantics. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Team picker control | A `<select>` of all teams | Team counts are small (single digits); a searchable combobox is overkill | n |
| Default value when a team is selected on the page | Pre-select it | Preserves the current one-click flow for the common case | n |
| Default value when no team is selected | Empty, and submit is blocked | Silently defaulting to the first team would produce the same wrong-team bug with extra steps | n |
| Existing `teamId: null` trainings | Shown in an "Unassigned" bucket with an assign action | Deleting user data to clean up a bug is not acceptable | n |
| No teams exist at all | Block creation with a message pointing at `/teams` | A training with no possible owner cannot be valid | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Explicit team selection ⭐ MVP

**User Story**: As a coach, I want to pick the team when I create a training so that the
session is filed against the squad I actually meant.

**Why P1**: The bug this feature exists to fix.

**Acceptance Criteria**:

1. WHEN the create-training form opens THEN the system SHALL display a team `<select>` listing every team by `club` + `name`
2. WHEN a team is selected in the page's filter list THEN the form SHALL pre-select that team
3. WHEN no team is selected in the filter list THEN the form SHALL open with no team chosen
4. WHEN the form is submitted with no team chosen THEN the system SHALL block submission and display a validation message
5. WHEN the form is submitted with a team chosen THEN the system SHALL persist the training with that `teamId`

**Independent Test**: With no team selected, open the form, submit — blocked. Choose a team, submit — the training appears under that team's filter.

---

### P1: Created trainings are visible ⭐ MVP

**User Story**: As a coach, I want the training I just created to appear in the list so
that I trust it saved.

**Why P1**: A save the user cannot see is indistinguishable from a failure.

**Acceptance Criteria**:

1. WHEN a training is created THEN the system SHALL refresh the training lists without a page reload
2. WHEN a training is created for the currently filtered team THEN it SHALL appear in that filtered list
3. WHEN a training is created for a different team than the active filter THEN the system SHALL keep the filter and inform the user where the training went
4. WHEN a training is created with a future date THEN it SHALL appear under "Next Trainings"

**Independent Test**: Filter to team A, create a training for team B, confirm the message names team B.

---

### P2: Recover orphaned trainings

**User Story**: As a coach, I want to find trainings that lost their team so that data
created before the fix is not stranded.

**Why P2**: Only affects data created before this feature ships.

**Acceptance Criteria**:

1. WHEN trainings exist with a null or unknown `teamId` THEN the system SHALL show an "Unassigned" bucket
2. WHEN no such trainings exist THEN the system SHALL NOT render the bucket at all
3. WHEN an unassigned training is assigned to a team THEN the system SHALL persist it and remove it from the bucket

**Independent Test**: Hand-write a null-teamId training into storage, confirm it surfaces and can be assigned.

---

## Edge Cases

- WHEN no teams exist THEN the create button SHALL be disabled with a message pointing at `/teams`
- WHEN the selected team is deleted while the form is open THEN submission SHALL fail with a clear message rather than writing a dangling `teamId`
- WHEN a training references a `teamId` that no longer exists THEN it SHALL fall into the Unassigned bucket, not disappear
- WHEN the team list is still loading THEN the select SHALL render disabled rather than empty-and-submittable

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| TTA-01 | P1: Explicit team selection (control + population) | Tasks | Pending |
| TTA-02 | P1: Pre-selection behaviour | Tasks | Pending |
| TTA-03 | P1: Submit validation | Tasks | Pending |
| TTA-04 | P1: List refresh after create | Tasks | Pending |
| TTA-05 | P2: Unassigned bucket and reassignment | Tasks | Pending |

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] It is impossible to persist a training with a null `teamId` through the UI
- [ ] A created training is visible without a reload in every filter state
- [ ] Pre-existing orphaned trainings can be reassigned rather than lost
