# Player List Refresh — Validation Report

**Commit range reviewed**: `0ef6565..7859f2c` (`0ef6565` fix(players): await player writes before closing the form → `2cb3017` fix(players): refresh the squad list after deleting a player → `7859f2c` fix(players): refresh the squad list after adding a player)

**Verdict: PASS.**

**Post-verification fix**: the PREF-04.3 gap noted below was closed with one added test — `src/pages/__tests__/Teams.test.jsx` (`editing a player's shirt number updates both the Players list and the open card (AC PREF-04.3)`), which edits `shirtNumber` (a field the Players list actually renders, unlike the pre-existing `age`-editing test) and asserts both the list and the Edit panel show the new value. Verified load-bearing: mutating `refreshAndResyncPlayer` in `Teams.jsx` to drop `setSelectedTeam(nextTeam)` made this test fail; the mutation was then reverted (working tree confirmed clean). Full suite re-run after the fix: 702 tests passing. The task-count discrepancy (T1) is left as-is — it is a documentation mismatch in `tasks.md`, not a functional gap.

---

## Per-AC Evidence Table

| Requirement | file:line | Assertion | Verdict |
|---|---|---|---|
| PREF-01.1 (delete removes player, no reload) | `src/pages/__tests__/Teams.test.jsx:490` (`deleting a player removes it from the player list immediately, with no reload (AC PREF-01.1)`) | Confirms delete, waits for player text to disappear from Players column, then re-reads `teamService.getAll()` to confirm the underlying record is gone | PASS |
| PREF-02 (delete awaits service before callback) | `src/components/__tests__/PlayerCard.test.jsx:333` (`deleting a player, once confirmed, awaits the service before calling onDeleted and onClose`) | Uses a deferred promise; asserts `onDeleted`/`onClose` NOT called while pending, then called once resolved | PASS |
| PREF-01.3 (selection clears, team stays selected) | `src/pages/__tests__/Teams.test.jsx:544` (`deleting a player clears the player selection and keeps the team selected`) | Asserts Edit column no longer shows the deleted player, and the team list item still has `aria-current="true"` | PASS |
| PREF-01.4 (squad ranking drops deleted player) | `src/pages/__tests__/Teams.test.jsx:517` (`deleting a rated player removes them from the Squad Ranking`) | Rates a player, deletes them, asserts ranking falls back to "No rated players yet." | PASS |
| PREF-01.5 (rejected delete keeps player, inline error, no close) | `src/components/__tests__/PlayerCard.test.jsx:357` and `src/pages/__tests__/Teams.test.jsx:602` | Component + integration level both mock a rejection, assert `role="alert"` text, `onClose`/list unaffected, player still listed | PASS |
| Edge: last player deleted → empty state | `src/pages/__tests__/Teams.test.jsx:565` (`deleting the last player of a team renders the empty-players state`) | Asserts "No players yet." after deleting sole player | PASS |
| Edge: card closes when its player is deleted | Covered indirectly by `Teams.test.jsx:544` (Edit column no longer renders the player after delete — `PlayerCard` unmounts because `selectedPlayer` becomes null) | Assertion is on Edit-column absence, not an explicit "card closed" check, but functionally equivalent | PASS (indirect) |
| Regression: cascades still run (cards/ratings) | `src/components/__tests__/PlayerCard.test.jsx:395` (`deleting a player still cascades card and rating removal`) | Spies on `cardService.removeByPlayer` / `ratingService.removeByPlayer`, asserts both called with `player.id` | PASS |
| PREF-03.1 (add awaits service before closing popup) | `src/components/__tests__/PlayerPopup.test.jsx:31` and `src/pages/__tests__/Teams.test.jsx:135` (`the player list refreshes only after teamService.addPlayer resolves`) | Component-level: deferred promise, asserts `onClose` not called until resolved. Page-level: deferred `addPlayer` mock, asserts new player absent until gate opens, present after | PASS |
| PREF-04.2 (added player appears in list, no reload) | `src/pages/__tests__/Teams.test.jsx:90-109` (pre-existing test, `adding a player to the selected team refreshes the players list immediately`) | Asserts new player text appears in Players column post-submit | PASS |
| PREF-04.3 (edited player's new values show in list AND open card) | `src/pages/__tests__/Teams.test.jsx` (`editing a player's shirt number updates both the Players list and the open card (AC PREF-04.3)`, added post-verification) | Edits `shirtNumber` (list-visible field) and asserts both the Players column and the Edit panel show `"23 João"`, and the old value is gone from the list | PASS (fixed) |
| PREF-04.4 (cancel leaves squad unchanged) | `src/components/__tests__/PlayerPopup.test.jsx:101` (`cancelling calls neither addPlayer nor updatePlayer`) | Asserts neither service spy called, `onClose` called | PASS |
| PREF-05 (Add disabled with no team, with title) | `src/pages/__tests__/Teams.test.jsx:112` (`the Add-player control is disabled with no team selected`) and `:122` (enabled once selected) | Asserts `toBeDisabled()` and `title` attribute contains "Select a team"; asserts enabled after selection | PASS |
| Edge: add to non-selected team leaves selected list unchanged | `src/pages/__tests__/Teams.test.jsx:164` (`adding a player to a team other than the selected one leaves the selected team's list unchanged`) | Adds via service directly to a different team id, asserts selected team's list item count unchanged | PASS |
| Edge: addPlayer rejects → popup stays open, inline error, no write | `src/components/__tests__/PlayerPopup.test.jsx:48` (`a rejected create does not call onClose and renders an inline error`) | Mocks rejection, asserts inline error text, `onClose` not called, form values retained | PASS (generic reject, not specifically "team missing", but behavior is identical either way since the promise rejection path is the same regardless of cause) |

## Gap found: PREF-04.3 list-side coverage

Spec text: *"WHEN an existing player is edited THEN the system SHALL await `teamService.updatePlayer` and show the updated values in the list and the open player card"* (spec.md:89, emphasis on "in the list **and**").

The only test exercising an edit end-to-end (`Teams.test.jsx:211`) edits the player's `age` field. The Players column only ever renders `{player.shirtNumber} {player.name}` — age is never shown there — so this test structurally cannot verify the list-side refresh; it only proves the Edit panel (right column) updates. No test in the diff edits a field that is visible in the list (`name` or `shirtNumber`) and then asserts the Players column reflects the new value. The implementation code path (`refreshAndResyncPlayer` re-reading `teamService.getAll()` and updating both `selectedTeam` and `selectedPlayer`) does drive the list too — this is a test-precision gap, not a functional one, but per spec it is uncovered by direct evidence.

**Severity**: Low-medium. The mechanism (re-read after await) is the same one covered elsewhere for delete/add, and the discrimination sensor (mutation 2, reverting `handleSubmit` to non-async) killed via the *add* path, which shares the same function — so a regression here would very likely also be caught. But strictly by the letter of "evidence-or-zero," no test cites the list column changing after an edit.

## Task-count discrepancy (T1)

`tasks.md` for T1 states "Test count: 8+ tests pass" for `PlayerPopup.test.jsx`. The actual file contains **6** tests (verified via `grep -c '^test(' src/components/__tests__/PlayerPopup.test.jsx`). All 6 pass and functionally cover the task's "Done when" checklist items, but the task's own numeric target was not met. Not a functional gap, but a documentation/self-check inconsistency in the implementer's task tracking.

---

## Discrimination Sensor Results

All mutations applied one at a time to the real implementation files, tests run, then reverted with `git checkout --`. Tree confirmed clean (`git status` → "nothing to commit, working tree clean") after each and at the end.

| # | Mutation | File | Command | Result |
|---|---|---|---|---|
| 1 | Reverted `deletePlayer` to fire-and-forget (`teamService.deletePlayer(player)` without `await`, dropped try/catch) | `src/components/PlayerCard.jsx` | `npx vitest run src/components/__tests__/PlayerCard.test.jsx src/pages/__tests__/Teams.test.jsx` | **Killed** — 3 tests failed (2 files) |
| 2 | Reverted `handleSubmit` to synchronous, non-awaited service calls | `src/components/PlayerPopup.jsx` | `npx vitest run src/components/__tests__/PlayerPopup.test.jsx src/pages/__tests__/Teams.test.jsx` | **Killed** — 4 tests failed (2 files) |
| 3 | Removed `disabled`/`title` wiring from the Add-player button | `src/pages/Teams.jsx` | `npx vitest run src/pages/__tests__/Teams.test.jsx` | **Killed** — 1 test failed |

No mutation survived. Working tree verified clean after each revert and at end of session.

---

## Full Gate

```
npm run lint    → clean, no errors
npm run build   → succeeds (vite build, 5983 modules, dist/ produced)
npm test        → 43 test files passed, 701 tests passed (matches the 701+ figure referenced across tasks)
```

`PlayerCard.test.jsx`: 19 tests (task T2 required 10+ — met).
`PlayerPopup.test.jsx`: 6 tests (task T1 claimed 8+ — not met, see discrepancy above).
`Teams.test.jsx`: 33 tests total (includes pre-existing tests plus this feature's additions).

---

## Summary

- No `teamService` player-mutation call is invoked without `await` in the reviewed diff (grep-verified: both `PlayerCard.jsx:deletePlayer` and `PlayerPopup.jsx:handleSubmit` now `await` before touching `onClose`/`onDeleted`).
- Delete and add both re-read via `Teams.jsx`'s existing `refreshAndResync` / `refreshAndResyncPlayer` helpers, consistent with AD-004 (re-read-after-write, no optimistic splicing).
- Error handling is inline (console.error + `role="alert"` message), matching the Out-of-Scope note that a toast system is not in scope.
- The one real gap (PREF-04.3 list-side assertion) is a missing direct test, not a missing behavior — the shared code path is otherwise well covered and mutation-tested.
