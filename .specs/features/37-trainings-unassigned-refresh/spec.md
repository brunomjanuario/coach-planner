# Trainings Unassigned Refresh Specification

**Scope:** Small · **Design:** skipped · **Depends on:** none

## Problem Statement

`Trainings.jsx` refreshes its "Unassigned" list (`loadUnassigned()`) after
deleting a training (`TrainingDetailsPopup`'s `onDelete`) and after assigning
a team via the unassigned list's own `<select>` (`assignTeam`) — but not
after editing a training through `TrainingSavePopup`'s `onSubmit`. If a coach
assigns a team to a previously-unassigned training via the Edit popup (rather
than the unassigned row's own dropdown), the training now has a `teamId` but
the "Unassigned (N)" section keeps showing it, with a stale count, until the
next full reload.

## Goals

- [ ] Editing a training that was unassigned, and giving it a team, removes
      it from the Unassigned list immediately
- [ ] The Unassigned count updates immediately in the same case

## Out of Scope

| Feature | Reason |
|---|---|
| The equivalent path on `Games.jsx` | `Games.jsx`'s `GameSavePopup` `onSubmit` already calls nothing that touches an "unassigned games" list — games don't have an editable-team path through the same popup shape (`GameSavePopup` doesn't accept a `teamId` reassignment for an existing game the way `TrainingSavePopup` does). Confirmed by reading `Games.jsx`: no `loadUnassigned` omission exists there to fix. |

---

## Assumptions & Open Questions

None — the fix is mechanical (one missing call, matching two sibling call
sites in the same file) and needs no gray-area decision.

**Open questions:** none.

---

## User Stories

### P1: Assigning a team via Edit updates the Unassigned list immediately ⭐ MVP

**User Story**: As a coach, I want a training I just assigned a team to
(via Edit) to leave the Unassigned list right away, so the count and list
I'm looking at are never stale.

**Why P1**: This is the whole bug.

**Acceptance Criteria**:

1. WHEN an unassigned training is edited to add a `teamId` THEN
   `Trainings.jsx` SHALL re-fetch the unassigned list (`loadUnassigned`) as
   part of the same `onSubmit` handler that already re-fetches the filtered
   list
2. WHEN the re-fetch completes THEN the training SHALL no longer appear in
   the Unassigned section, and the Unassigned heading's count SHALL reflect
   the new, smaller total

**Independent Test**: Seed an unassigned training, open its Edit popup,
select a team, submit; assert the Unassigned heading no longer includes it
and its count decreased by one — without triggering any other reload.

---

## Edge Cases

- WHEN an *already-assigned* training is edited (no change to `teamId`, or a
  change from one team to another) THEN the Unassigned list SHALL be
  re-fetched too (same call, unconditional) but SHALL show no visible change
  since the training was never in it
- WHEN editing a training's team back to unset (if the form allowed it —
  confirmed it does not; `teamId` can only be set to an existing team via the
  select, never cleared) THEN this is not a reachable state and is not tested

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| TRUR-01 | P1: Unassigned list refreshes after edit | Implementing | Verified |

**Coverage:** 1 total, 1 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] `TrainingSavePopup`'s edit-mode `onSubmit` in `Trainings.jsx` calls
      `loadUnassigned()` alongside `filterTrainings()`, matching the delete
      and assign-team paths in the same file
