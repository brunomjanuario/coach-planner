# Player List Refresh Specification

**Scope:** Small · **Design:** skipped · **Depends on:** 01-persistence-layer

## Problem Statement

Adding or deleting a player on `/teams` does not update the screen. The player
list keeps showing what it showed before the mutation until the team is
deselected and reselected, or the page is reloaded.

Two independent defects cause it:

1. `PlayerCard.deletePlayer` (`src/components/PlayerCard.jsx:73-77`) calls
   `teamService.deletePlayer(player)` **without awaiting it** and then calls
   `onClose()`. `Teams.jsx:199` passes `onClose={() => setSelectedPlayer(null)}` —
   which clears the selection but never re-reads teams. The deleted player stays
   in the middle column.
2. `PlayerPopup.handleSubmit` (`src/components/PlayerPopup.jsx:25-33`) calls
   `teamService.addPlayer` / `updatePlayer` **without awaiting** either, then
   calls `onClose()`. The parent's `refreshAndResync()` races the unfinished
   write, so a freshly added player can be missing from the list it triggered.

This is exactly the failure mode AD-004 exists to prevent: services return copies
and every caller must re-read *after* the write completes.

## Goals

- [ ] Deleting a player removes it from the list immediately, with no reload
- [ ] Adding a player shows it in the list immediately, with no reload
- [ ] Every player mutation is awaited before the parent re-reads

## Out of Scope

| Feature | Reason |
|---|---|
| Optimistic UI / local list splicing | AD-004 chose re-read-after-write. Optimism is a different contract. |
| A shared `usePlayers` hook | Two call sites do not justify an abstraction; `Teams.jsx` already owns the reload helpers. |
| Undo after delete | Confirmation is the guard, same as trainings (`06`). |
| Error toasts | A failed write logs and surfaces inline; a toast system is its own feature. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Where the delete refresh is wired | `PlayerCard` gets an `onDeleted` callback; `Teams.jsx` passes `refreshAndResync` | `onClose` already means "clear the selection" — overloading it to also mean "data changed" is what made the two cases diverge | n |
| Selection after delete | Selection clears; the team stays selected | The player no longer exists, but the coach is still working on that squad | n |
| Failed delete | The player stays in the list and an inline error renders; the popup does not close | Closing on failure would look like success | n |
| `PlayerPopup` submit | Becomes `async`, awaits the service, and propagates failures to the caller | The race is the bug; awaiting is the fix | n |
| Add while no team is selected | The Add-player control is disabled with a title explaining why | `teamService.addPlayer` throws `NotFoundError` on a null team id — better to prevent than to catch | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Deleting a player updates the list ⭐ MVP

**User Story**: As a coach, I want a deleted player to disappear straight away so that
I can trust the squad list.

**Why P1**: The reported bug.

**Acceptance Criteria**:

1. WHEN a player delete is confirmed THEN the system SHALL remove that player from the player list without a page reload
2. WHEN a player delete is confirmed THEN the system SHALL await `teamService.deletePlayer` before re-reading teams
3. WHEN a player is deleted THEN the system SHALL clear the player selection and keep the team selected
4. WHEN a player is deleted THEN the squad ranking for that team SHALL no longer list them
5. WHEN `teamService.deletePlayer` rejects THEN the system SHALL keep the player in the list and render an inline error

**Independent Test**: Delete a player from a 5-player squad; the list shows 4 immediately, and still 4 after a reload.

---

### P1: Adding a player updates the list ⭐ MVP

**User Story**: As a coach, I want a new player to appear the moment I submit so that I
know the save landed.

**Why P1**: Same defect class, opposite direction.

**Acceptance Criteria**:

1. WHEN a new player is submitted THEN the system SHALL await `teamService.addPlayer` before closing the popup
2. WHEN the popup closes after an add THEN the player list SHALL include the new player without a page reload
3. WHEN an existing player is edited THEN the system SHALL await `teamService.updatePlayer` and show the updated values in the list and the open player card
4. WHEN the popup is cancelled THEN the system SHALL leave the squad unchanged
5. WHEN no team is selected THEN the Add-player control SHALL be disabled and explain why

**Independent Test**: Add "99 Test Player"; the list shows them without touching the browser reload.

---

## Edge Cases

- WHEN the last player of a team is deleted THEN the list SHALL render the "No players yet." empty state
- WHEN a player is deleted while their card is open THEN the card SHALL close rather than render a stale record
- WHEN a player is added to a team other than the selected one THEN the selected team's list SHALL be unchanged
- WHEN `addPlayer` rejects (team missing) THEN the popup SHALL stay open with an inline error and no record written
- WHEN a delete removes a player who holds ratings or cards THEN those SHALL be cascaded away by the service as they already are (regression guard on `08`/`09`)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| PREF-01 | P1: Delete refreshes the list | Tasks | Pending |
| PREF-02 | P1: Delete awaits the service | Tasks | Pending |
| PREF-03 | P1: Add awaits the service | Tasks | Pending |
| PREF-04 | P1: Add/edit refreshes the list | Tasks | Pending |
| PREF-05 | P1: Add disabled with no team selected | Tasks | Pending |

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] No player mutation requires a page reload to become visible
- [ ] No `teamService` player call is invoked without `await`
- [ ] A failed mutation never looks like a successful one
