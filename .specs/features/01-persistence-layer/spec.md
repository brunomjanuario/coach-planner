# Persistence Layer Specification

**Scope:** Large · **Design:** required before Execute · **Blocks:** features 03–11

## Problem Statement

All application data lives in module-level arrays in `src/model/mock.js` and is
rebuilt from source on every page load. Anything a coach enters — a new team, a
player, a training — is gone on refresh. Every feature in this roadmap that
records something (ratings, cards, games, standings) is pointless without
durable storage.

There is a second, subtler defect. Services mutate those arrays **in place**, so
React holds the same array reference after a write as before and skips the
re-render. Adding a player or creating a training already fails to update the
list today; `pages/Teams.jsx` works around it by re-reading after every close.
Fixing storage without fixing reference semantics would leave that bug in place
across a larger surface.

## Goals

- [ ] Data entered in one session is present after a full page reload
- [ ] Every service read returns a fresh object graph; no caller holds a live store reference
- [ ] `Date` values survive a save/load round trip as `Date` instances, not strings
- [ ] The `async` service signatures are unchanged, so a backend can replace the store later

## Out of Scope

| Feature | Reason |
|---|---|
| Backend API | AD-002. The service seam is preserved precisely so this can happen later without touching the UI. |
| Cross-device sync | Requires a backend and an account model. Not available from localStorage. |
| Encryption at rest | Squad lists and training plans are not sensitive enough to justify key management in a browser-only app. |
| Undo / history | Distinct feature with its own UX. The store is designed not to preclude it (writes go through one function). |
| IndexedDB | localStorage's ~5MB ceiling holds thousands of trainings. Revisit only if the image field on exercises ever stores real image data. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Storage backend | `localStorage` | User selection (AD-002) | y |
| Key namespace | `coachplanner:v1:<collection>` | Version in the key makes a future migration a rename, not a parse-and-guess | n |
| First-run behaviour | Seed from `mock.js` when no stored data exists | Preserves the current demo experience; an empty app has nothing to demonstrate | n |
| `Date` handling | ISO strings on disk, revived to `Date` on read by an explicit per-collection field list | A generic "does this string look like a date" reviver would mis-convert user text such as a season label | n |
| Storage write failure (quota, private mode) | Surface an error to the caller; do not silently drop the write | A save that appears to work but did not is the worst failure mode for a coach entering a squad | n |
| Corrupt / unparseable stored data | Fall back to seed data and warn in console; do not crash | A parse error must never leave the app unusable with no path back | n |
| Concurrent tabs | Last write wins; no cross-tab sync | Single-user local app. Logged as a known limitation rather than solved. | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Durable data ⭐ MVP

**User Story**: As a coach, I want everything I enter to still be there tomorrow so that
the app is worth entering data into at all.

**Why P1**: Without this, every downstream feature is a demo.

**Acceptance Criteria**:

1. WHEN a team, player or training is created and the page is reloaded THEN the system SHALL still list that record
2. WHEN a record is updated and the page is reloaded THEN the system SHALL show the updated values, not the originals
3. WHEN a record is deleted and the page is reloaded THEN the system SHALL NOT list it
4. WHEN the app loads with no stored data THEN the system SHALL seed from `mock.js` and persist that seed
5. WHEN the app loads with stored data present THEN the system SHALL NOT overwrite it with seed data

**Independent Test**: Create a team, hard-reload, confirm it is listed.

---

### P1: Correct re-render on mutation ⭐ MVP

**User Story**: As a coach, I want a newly added player to appear immediately so that I
do not wonder whether the save worked.

**Why P1**: This is a live bug today, and the persistence rewrite touches every
line that causes it. Fixing it separately would mean touching the services twice.

**Acceptance Criteria**:

1. WHEN a service read is called twice THEN the system SHALL return objects that are not reference-identical (AD-004)
2. WHEN a caller mutates an object returned by a service THEN the system SHALL NOT reflect that change in the store
3. WHEN a player is added to the selected team THEN the players list SHALL display the new player without a manual page refresh
4. WHEN a training is created THEN the trainings list SHALL display it without a manual page refresh

**Independent Test**: Add a player with the popup; the list grows by one immediately.

---

### P1: Date fidelity ⭐ MVP

**User Story**: As a developer, I want `training.day` to be a `Date` after a reload so
that existing comparison code keeps working.

**Why P1**: `pages/Trainings.jsx` splits future from past with `t.day >= new Date()`.
If `day` deserializes as a string, that comparison silently misclassifies every
training — a wrong-looking screen with no error.

**Acceptance Criteria**:

1. WHEN a training with a `Date` day is saved and reloaded THEN `day` SHALL be a `Date` instance
2. WHEN a reloaded training is compared with `>=` against `new Date()` THEN the system SHALL classify it into the same bucket as before the reload
3. WHEN a stored date string is malformed THEN the system SHALL surface the record with an invalid-date marker rather than crashing the list

**Independent Test**: Save a future training, reload, confirm it is still under "Next Trainings".

---

### P2: Reset to demo data

**User Story**: As a developer, I want a one-click reset so that I can get back to a
known state while testing.

**Why P2**: Not user-facing value, but every later feature needs it to test against
a predictable fixture.

**Acceptance Criteria**:

1. WHEN reset is invoked THEN the system SHALL clear all `coachplanner:v1:*` keys and re-seed
2. WHEN reset is invoked THEN the system SHALL require an explicit confirmation first
3. WHEN reset completes THEN the system SHALL leave the auth session untouched

**Independent Test**: Modify data, reset, confirm the seed squad is back and you are still signed in.

---

## Edge Cases

- WHEN `localStorage` is unavailable (private browsing, disabled) THEN the system SHALL fall back to an in-memory store for the session and warn once
- WHEN a write exceeds the storage quota THEN the system SHALL throw a typed error the caller can display, leaving prior data intact
- WHEN stored JSON is corrupt THEN the system SHALL re-seed and log a warning rather than render a broken app
- WHEN a stored schema version is older than the current one THEN the system SHALL route through a migration hook (identity function for v1)
- WHEN two tabs write concurrently THEN last write wins — documented, not prevented
- WHEN a lookup id does not exist THEN the service SHALL return `null` / throw a typed `NotFoundError`, never a `TypeError` on `undefined`

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| PERSIST-01 | P1: Durable data (create/update/delete survive reload) | Tasks | Pending |
| PERSIST-02 | P1: Durable data (seed on first run only) | Tasks | Pending |
| PERSIST-03 | P1: Correct re-render (copy semantics) | Tasks | Pending |
| PERSIST-04 | P1: Correct re-render (UI refresh after mutation) | Tasks | Pending |
| PERSIST-05 | P1: Date fidelity | Tasks | Implementing (T1 done: storage adapter revives Date fields, handles malformed dates) |
| PERSIST-06 | P2: Reset to demo data | Tasks | Pending |
| PERSIST-07 | Edge cases: storage failure, corruption, quota | Tasks | Implementing (T1 done: quota/corruption/unavailability handling) |
| PERSIST-08 | Id generation without collisions (AD-003) | Tasks | Pending |

**Coverage:** 8 total, 8 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] A full create → reload → verify cycle passes for teams, players and trainings
- [ ] No service method returns an object reachable from the store
- [ ] The four broken `fetch` methods are gone from the services
- [ ] Zero `Math.random()` id generation remains in the codebase
