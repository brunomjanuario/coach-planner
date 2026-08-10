# Team CRUD Hardening Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** 33-css-foundation-reset (sequenced after per round-four roadmap, no code overlap)

## Problem Statement

Three related defects sit in the team/player create-edit-delete path:

1. **Silent write failures.** `TeamPopup.jsx`'s `handleSubmit` calls
   `teamService.update`/`teamService.create` without `await` and with no
   try/catch, then immediately calls `onClose()`. `TeamCard.jsx`'s
   `deleteTeam` does the same for `teamService.delete`. Every sibling popup
   (`PlayerPopup`, `TrainingSavePopup`, `GameSavePopup`) awaits its service
   call inside a try/catch and surfaces a failure message — teams are the
   one outlier. A `StorageQuotaError` (a real, already-modeled failure mode
   — see `src/lib/storage.js`) becomes an unhandled promise rejection today,
   and the popup reports success regardless.
2. **No delete cascade.** `teamService.deletePlayer` cascades to
   `cardService.removeByPlayer` and `ratingService.removeByPlayer`;
   `gameService.delete` cascades to both card and rating cleanup too.
   `teamService.delete` cascades nothing — deleting a team leaves every one
   of its players' cards and ratings behind as permanently unreachable
   records (no UI ever reads them again, since the owning player is gone),
   growing storage until quota with no way to reclaim it.
3. **Unassociated form labels.** Neither `TeamPopup.jsx` nor
   `PlayerPopup.jsx` has a single `htmlFor`/`id` pair on any field. A screen
   reader announces nothing for a label click or focus; every sibling popup
   in the app (`GameSavePopup`, `TrainingSavePopup`, Settings' forms) already
   associates its labels correctly.

## Goals

- [ ] A failed team create/update/delete surfaces an error instead of
      silently closing as if it succeeded
- [ ] Deleting a team removes its players' cards and ratings along with it
- [ ] Every field in `TeamPopup`/`PlayerPopup` has a properly associated label

## Out of Scope

| Feature | Reason |
|---|---|
| Cascading to a team's *games* on delete | Games already survive team deletion by design — `gameService.getUnassigned` deliberately treats a dangling `teamId` as "unassigned" rather than orphaned, so a coach can reassign a game to a new team. Only cards/ratings (which have no reassignment path and no meaning without their player) are in scope. |
| Adding a confirmation-count to team deletion (naming how many players/cards will be removed) | `TeamCard.jsx`'s existing `ConfirmationPopup` ("Do you want to delete this team?") is a generic yes/no, matching the app's other non-counted deletes (e.g. player delete). Adding a count is a UX feature, not a bug fix — `20`/`21`/`30`'s opponent/competition deletes count because the *count itself* was the point of those features; team deletion never had that requirement. |
| A general retry/offline-queue mechanism for failed writes | Out of scope for a mock localStorage backend with no network. Surfacing the failure (this feature) is the fix; retry logic is a real-backend concern. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Error-handling pattern for `TeamPopup` | Mirror `PlayerPopup.jsx` exactly: `async handleSubmit`, `try { await ...; onClose(); } catch { setError(...) }`, an `error` state rendered as a message in the form | `PlayerPopup` already solves this exact problem in the same directory for the same kind of form; reusing its shape means zero new pattern to review. | y |
| Error-handling pattern for `TeamCard`'s delete | Same shape: `async deleteTeam`, `try { await teamService.delete(...); onClose(); } catch { setDeleteError(...) }`, rendered the same way `PlayerCard.jsx`'s `deleteError` already is (that component fixed this exact bug for players already) | `PlayerCard.jsx` is the direct sibling and already has this exact fix for the player-delete path — same file shape, same component family. | y |
| Cascade implementation | `teamService.delete` reads the team first, then calls `cardService.removeByPlayer`/`ratingService.removeByPlayer` for each of its players, mirroring `deletePlayer`'s existing cascade line-for-line | Reuses the exact two service calls `deletePlayer` already makes; no new service method needed. | y |
| Label association pattern | Literal string ids (`htmlFor="team-name"` / `id="team-name"`, etc.), matching `Settings.jsx`/`GameSavePopup.jsx`'s actual convention — verified by reading both files; `useId()` was assumed at spec time but is not what this codebase's single-instance popups actually use | Already the established pattern for every other form-bearing popup in this codebase; no new convention introduced. | y |

**Open questions:** none.

---

## User Stories

### P1: A failed team write is never silently reported as success ⭐ MVP

**User Story**: As a coach, I want to know if saving or deleting a team
failed, so I don't believe my change went through when it didn't.

**Why P1**: This is the data-loss-shaped bug — the UI actively lies about
the outcome today.

**Acceptance Criteria**:

1. WHEN `teamService.create`/`teamService.update` rejects THEN `TeamPopup`
   SHALL render an error message and SHALL NOT call `onClose`
2. WHEN `teamService.create`/`teamService.update` resolves THEN `TeamPopup`
   SHALL call `onClose` exactly as it does today
3. WHEN `teamService.delete` rejects THEN `TeamCard` SHALL render an error
   message and SHALL NOT call `onClose`
4. WHEN `teamService.delete` resolves THEN `TeamCard` SHALL call `onClose`
   exactly as it does today

**Independent Test**: Mock `teamService.update` to reject; submit the edit
form; assert an error renders and the popup stays open.

---

### P2: Deleting a team removes its players' cards and ratings

**User Story**: As a coach, I want deleting a team to actually clean up
after itself, so old data doesn't quietly accumulate forever.

**Why P2**: Storage grows unboundedly otherwise, with no path to reclaim it
(AD-002's ~5MB ceiling makes this a real, not theoretical, constraint).

**Acceptance Criteria**:

1. WHEN a team with players is deleted THEN every card belonging to any of
   its players SHALL be removed
2. WHEN a team with players is deleted THEN every rating belonging to any of
   its players SHALL be removed
3. WHEN a team with players is deleted THEN its games SHALL NOT be deleted
   (unchanged existing behavior — games become unassigned, not orphaned)
4. WHEN a team with no players is deleted THEN nothing else SHALL be
   touched (edge case — no cascade calls needed, but none SHALL error either)

**Independent Test**: Create a team with a player, record a card and a
rating for that player, delete the team, assert both the card and the
rating are gone via their services' own `getAll`.

---

### P3: Every field in TeamPopup/PlayerPopup has an associated label

**User Story**: As a screen-reader user, I want clicking a field's label to
focus that field, so the form is actually usable non-visually.

**Why P3**: Accessibility gap with a mechanical, low-risk fix — not tied to
the data-loss risk of P1/P2, hence lower priority.

**Acceptance Criteria**:

1. WHEN `TeamPopup` renders THEN each of its three fields (Name, Club,
   Season) SHALL have a `<label>` with `htmlFor` matching that field's `id`
2. WHEN `PlayerPopup` renders THEN each of its four fields (Name, Age, Shirt
   Number, Position) SHALL have a `<label>` with `htmlFor` matching that
   field's `id`

**Independent Test**: `screen.getByLabelText("Name")` resolves to the actual
input in both popups (fails today — currently only reachable via
`getByRole` + position, not by label).

---

## Edge Cases

- WHEN a team delete fails partway (e.g. the cascade's card removal
  succeeds but a subsequent write throws) THEN the team record itself SHALL
  NOT be considered deleted if the top-level `teamService.delete` call
  rejects — matches the general P1 contract, no special-casing needed since
  the cascade calls happen after the team is already removed from
  storage in the existing `deletePlayer` pattern this reuses (mirroring
  its exact ordering, not inventing new transaction semantics)
- WHEN `TeamPopup` is used to create a new team (not edit) THEN the same
  error-surfacing behavior SHALL apply (AC covers both create and update)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| CRUD-01 | P1: Failed writes surface an error | Implementing | Verified |
| CRUD-02 | P2: Delete cascades to cards/ratings | Implementing | Verified |
| CRUD-03 | P3: Labels are associated | Implementing | Verified |

**Coverage:** 3 total, 3 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] `TeamPopup.jsx` and `TeamCard.jsx` match `PlayerPopup.jsx`/`PlayerCard.jsx`'s
      existing async/error-handling shape
- [ ] `teamService.delete` leaves no orphaned cards or ratings behind
- [ ] `screen.getByLabelText(...)` works for every field in both popups
