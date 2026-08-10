# Team CRUD Hardening Validation

**Date**: 2026-08-10
**Spec**: `.specs/features/35-team-crud-hardening/spec.md`
**Diff range**: `main..HEAD` (feat/team-crud-hardening, 5 commits + docs commit)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1: TeamPopup surfaces write failures | ✅ Done | `handleSubmit` async, try/catch, error state |
| T2: TeamCard surfaces delete failures | ✅ Done | `deleteTeam` async, try/catch, `deleteError` state |
| T3: teamService.delete cascades cards/ratings | ✅ Done | Reads players before delete, `Promise.all` cascade |
| T4: TeamPopup labels | ✅ Done | Literal `id`/`htmlFor` on all 3 fields |
| T5: PlayerPopup labels | ✅ Done | Literal `id`/`htmlFor` on all 4 fields |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ------------------------ | ------ |
| CRUD-01.1: WHEN `teamService.create`/`update` rejects THEN `TeamPopup` renders an error and does NOT call `onClose` | Error message rendered, `onClose` not called | `src/components/__tests__/TeamPopup.test.jsx:80-93` (create) — `screen.findByText("Failed to save the team...")`, `expect(onClose).not.toHaveBeenCalled()`; `:95-108` (update) — same pattern | ✅ PASS |
| CRUD-01.2: WHEN `create`/`update` resolves THEN `TeamPopup` calls `onClose` | `onClose` called, as before | `TeamPopup.test.jsx:52-65` (create path) — `mockResolvedValue({})`, `waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))`; `:67-78` (update path) — `updateSpy` called, `createSpy` not called | ✅ PASS |
| CRUD-01.3: WHEN `teamService.delete` rejects THEN `TeamCard` renders an error and does NOT call `onClose` | Error rendered, `onClose` not called | `src/components/__tests__/TeamCard.test.jsx:43-61` — `mockRejectedValue`, `screen.findByRole("alert")` has text "Failed to delete the team...", `expect(onClose).not.toHaveBeenCalled()` | ✅ PASS |
| CRUD-01.4: WHEN `teamService.delete` resolves THEN `TeamCard` calls `onClose` | `onClose` called, as before | `TeamCard.test.jsx:28-41` — `mockResolvedValue()`, `expect(onClose).toHaveBeenCalledTimes(1)` | ✅ PASS |
| CRUD-02.1: WHEN a team with players is deleted THEN every card belonging to any of its players SHALL be removed | Cards for that player gone, verified against real store | `TeamCard.test.jsx:96-117` — `await cardService.getByPlayer(player.id)` → `toEqual([])` (real service call, not a mock/spy count) | ✅ PASS |
| CRUD-02.2: WHEN a team with players is deleted THEN every rating belonging to any of its players SHALL be removed | Ratings for that player gone, verified against real store | `TeamCard.test.jsx:119-138` — `await ratingService.getByPlayer(player.id)` → `toEqual([])` (real service) | ✅ PASS |
| CRUD-02.3: WHEN a team with players is deleted THEN its games SHALL NOT be deleted | Game still present via `gameService.getAll()` | `TeamCard.test.jsx:140-161` — `gameService.getAll()`, `allGames.find(g => g.id === game.id)).toBeDefined()` | ✅ PASS |
| CRUD-02.4: WHEN a team with no players is deleted THEN nothing else SHALL be touched, no error | No throw, `onClose` still called | `TeamCard.test.jsx:163-180` — empty `players: []`, `onClose` called once, no thrown error surfaces (would fail the test via unhandled rejection otherwise) | ✅ PASS |
| CRUD-03.1: WHEN `TeamPopup` renders THEN each of Name/Club/Season has a `<label htmlFor>` matching its `id` | `getByLabelText` resolves for all 3 | `TeamPopup.test.jsx:16-22` — `screen.getByLabelText("Name"/"Club"/"Season")` all `toBeInTheDocument()`; corroborated in source at `src/components/TeamPopup.jsx:54-96` (id/htmlFor pairs `team-name`, `team-club`, `team-season`) | ✅ PASS |
| CRUD-03.2: WHEN `PlayerPopup` renders THEN each of Name/Age/Shirt Number/Position has a `<label htmlFor>` matching its `id` | `getByLabelText` resolves for all 4 | `PlayerPopup.test.jsx:31-38` — `screen.getByLabelText(...)` for all 4 fields; corroborated in source at `src/components/PlayerPopup.jsx:61-118` (id/htmlFor pairs `player-name`, `player-age`, `player-shirtNumber`, `player-position`) | ✅ PASS |

**Status**: ✅ All ACs covered — no spec-precision gaps. All 10 ACs traced to precise `file:line` assertions matching the spec-defined outcome exactly.

**Note on CRUD-02 test integrity (explicitly checked per instructions)**: The cascade tests assert against the *real* `cardService`/`ratingService`/`gameService` state (`getByPlayer`, `getAll`), not mock call counts or spy assertions like `expect(cardService.removeByPlayer).toHaveBeenCalledWith(...)`. This means the tests exercise the actual storage layer end-to-end and would catch a cascade that calls the right method with the wrong argument, or that no-ops silently — a spy-count assertion would not catch either. Confirmed genuine.

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ------------ | ------- |
| 1 | `src/services/teamService.js:57-66` | Removed the entire cascade body (`if (team) { ... }` gutted to a no-op) | ✅ Killed — 2 tests failed (`removes every card...` and `removes every rating...` in `TeamCard.test.jsx`) |
| 2 | `src/components/TeamPopup.jsx:23-36` | Reverted `handleSubmit` to fire-and-forget: dropped `async`/`await`/try-catch, called service without awaiting, called `onClose()` unconditionally | ✅ Killed — 2 tests failed (both `a rejected create/update renders an error...` tests) |
| 3 | `src/components/TeamPopup.jsx:69-71` | Removed `htmlFor="team-club"` from the Club label | ✅ Killed — 1 test failed (`every field has a label properly associated...`) |

**Sensor depth**: lightweight (3 targeted mutations, proportional to a Medium-scope feature)
**Result**: 3/3 killed — PASS ✅

All mutations were applied directly to the working tree and reverted via `git checkout -- <file>` immediately after each run; `git status --short` confirmed a clean tree before proceeding to the next mutation and at the end.

---

## Interactive UAT Results

Not performed — this is a backend/component-logic hardening fix (error surfacing, cascade, label wiring) with straightforward, mechanically verifiable behavior; no complex visual/interaction judgment call is needed beyond what the automated component tests already cover.

---

## Code Quality

| Principle        | Status |
| ---------------- | ------ |
| Minimum code     | ✅ Each fix is a minimal, surgical mirror of an existing sibling pattern (PlayerPopup/PlayerCard/deletePlayer) |
| Surgical changes | ✅ Only `TeamPopup.jsx`, `TeamCard.jsx`, `teamService.js`, `PlayerPopup.jsx` + their test files touched |
| No scope creep   | ✅ No unrelated refactors; games cascade correctly left out of scope per spec |
| Matches patterns | ✅ Literal string ids verified against `Settings.jsx` and `GameSavePopup.jsx` (see below) |
| Spec-anchored outcome check (asserted values match spec) | ✅ All 10 ACs traced above |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ Component tests cover success + rejection + edge (empty-team) paths |
| Every test maps to a spec requirement — no unclaimed tests | ✅ All new/modified tests carry `(AC CRUD-0X.Y)` or `(edge case)` markers tying them to spec |
| Documented guidelines followed: [file(s) or "none — strong defaults applied"] | ✅ None documented beyond CLAUDE.md's command list — strong defaults applied, matches tasks.md's own note |

**Independent verification of the "literal string ids, not `useId()`" convention claim**: Read both files directly.
- `src/pages/Settings.jsx`: uses literal ids/`htmlFor` throughout (`profile-name`, `profile-email`, `password-current`, `password-next`, `password-confirm`) — no `useId()` for field ids.
- `src/components/GameSavePopup.jsx`: uses `useId()` once, only for the `<form id={formId}>` / submit-button `form` association (a different concern — associating the footer's external submit button with the form). All *field* ids/labels (`teamId`, `opponent`, `isHome`, `competition`) are literal strings with matching `htmlFor`.

Confirmed: the spec's Assumptions row is accurate. `TeamPopup.jsx`/`PlayerPopup.jsx` correctly keep `useId()` for the form-id/submit-button wiring (unchanged, pre-existing) while using literal ids for field/label association (the new fix), matching the established convention exactly.

---

## Edge Cases

- [x] Team delete with no players: handled — `TeamCard.test.jsx:163-180`, no error, `onClose` still called (CRUD-02.4)
- [x] TeamPopup used for create (not just edit): handled — separate rejection test for create path exists (`TeamPopup.test.jsx:80-93`), distinct from update path

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: lint 0 errors/warnings; build succeeded (`✓ built in 1.88s`); tests 1442 passed, 0 failed, 0 skipped, 69 test files
- **Test count before feature**: 1430 tests / 68 files (baseline: `git worktree add` on `main`, `npm install`, `npm test`)
- **Test count after feature**: 1442 tests / 69 files
- **Delta**: +12 tests, +1 test file (`TeamCard.test.jsx` — new; did not exist on `main` at all, confirmed via `git show main:src/components/__tests__/TeamCard.test.jsx` → "fatal: path exists on disk, but not in main")
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

None — no gaps found.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status  |
| ----------- | ---------------- | ----------- |
| CRUD-01     | Implementing      | ✅ Verified |
| CRUD-02     | Implementing      | ✅ Verified |
| CRUD-03     | Implementing      | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 10/10 ACs matched spec outcome, 0 spec-precision gaps
**Sensor**: 3/3 mutations killed
**Gate**: 1442 passed, 0 failed, 0 skipped (lint clean, build clean)

**What works**:
- `TeamPopup`/`TeamCard` now mirror `PlayerPopup`/`PlayerCard`'s async/error-handling shape exactly; rejections surface an error and keep the popup/card open, resolutions still close as before.
- `teamService.delete` cascades to `cardService.removeByPlayer`/`ratingService.removeByPlayer` for every player of the deleted team, leaving games untouched; the empty-player edge case doesn't throw.
- `TeamPopup`/`PlayerPopup` now have real `htmlFor`/`id` label associations on every field, verified against the codebase's actual (literal-id) convention, not the spec's originally-assumed `useId()` pattern.
- Cascade tests assert against real service state (`getByPlayer`/`getAll`), not spy call counts — genuinely discriminating.

**Issues found**: None.

**Next steps**: None required. Feature is ready to merge.

---

## Lessons Distillation

No lesson recorded — clean PASS with no gaps, no surviving mutants, no spec-precision gaps, and no `// SPEC_DEVIATION` markers found in the diff. Per validate.md §10, a clean PASS with no signal warrants no lesson entry.
