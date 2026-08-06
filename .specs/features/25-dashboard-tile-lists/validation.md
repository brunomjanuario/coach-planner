# Dashboard Tile Lists Validation

**Date**: 2026-08-06
**Spec**: `.specs/features/25-dashboard-tile-lists/spec.md`
**Diff range**: `62c71d2..HEAD` (feature/25-dashboard-tile-lists, 6 commits: d2bdd18, 618b318, e006551, 0c3e8ae, 945c4ad, 7c76ff3)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `teamRows`/`upcomingRows` in `src/lib/dashboardStats.js:141-196`, 12 new tests |
| T2   | ✅ Done | `src/components/ListTile.jsx` (new, 76 lines), 14 tests |
| T3   | ✅ Done | `?team=` deep link in `src/pages/Teams.jsx:74-82`, 5 new tests |
| T4   | ✅ Done | Teams tile switched to `ListTile` in `Home.jsx:121-132` |
| T5   | ✅ Done | Trainings/Games tiles switched to `ListTile` in `Home.jsx:133-163` |
| T6   | ✅ Done | Dangling-reference test in `Home.test.jsx:991-1008`; DTILE-03.5 covered by pre-existing `Trainings.test.jsx`/`Games.test.jsx` (reused, not modified this feature) |

All tasks.md "Done when" checkboxes are marked `[x]` and Status: Complete.

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| DTILE-01.1 Teams tile lists names, alphabetical by "club name" (Assumptions: resolved to `${club} ${name}`, case-insensitive) | up to 3 team rows, ordered by full display string, case-insensitive | `src/lib/dashboardStats.js:147-158` (`teamRows`); `src/lib/__tests__/dashboardStats.test.js:335-348` — `teamRows(mixedCase, 2).entries` equals `[{id:2,name:"Alpha FC"},{id:3,name:"Beta FC"}]` from input `["zeta FC","Alpha FC","Beta FC"]`; `Home.jsx:124-128` builds row labels from `team.name` (the `${club} ${name}` string) | ⚠️ **Spec-precision/coverage gap** — implementation is correct (uses `.toLowerCase()` on both sides), but the test fixture (`zeta`/`Alpha`/`Beta`) never crosses a case boundary that would produce a *different* order with vs. without folding (`z`>`A`>`B` holds under raw string compare too) — see Discrimination Sensor #1 |
| DTILE-01.2 Trainings tile: up to 3 upcoming, soonest first, number+date | entries have `number` and `day`, sorted ascending by date | `dashboardStats.test.js:378-390` (`upcomingRows` sorts ascending, `basis:"upcoming"`); `Home.test.jsx:850-877` — training rows rendered with `Training #\d+`, soonest first | ✅ PASS |
| DTILE-01.3 Games tile: up to 3 upcoming, soonest first, opponent+date | same shape for games | `Home.test.jsx:897-919` — asserts `Sooner FC` before `Later FC` | ✅ PASS |
| DTILE-01.4 "+N more" when >3 | overflow = count − limit | `dashboardStats.test.js:350-368`; `ListTile.test.jsx:38-48`; `Home.test.jsx:798-813` (5 teams → 3 rows + "+2 more") | ✅ PASS |
| DTILE-01.5 empty collection → existing empty state | unchanged `StatTile`-style empty markup | `ListTile.test.jsx:58-70`; `Home.test.jsx:67-82,660-683` | ✅ PASS |
| DTILE-01.6 team filter scopes tile rows to match the count | rows come from the same `scopedX` used for `count` | `Home.jsx:81,83-88` builds `teamList`/`trainingList`/`gameList` from `scopedTeams`/`scopedTrainings`/`scopedGames`; `Home.test.jsx:836-848` (Teams tile), and both tiles' basis in `Home.test.jsx:922-945` (indirectly scoped) | ✅ PASS for Teams; ⚠️ no dedicated Home.test.jsx assertion filters Trainings/Games *rows* under an active team filter (only basis-fallback tests exist unfiltered) — see Gap below |
| DTILE-02 counts/breakdown survive | count + breakdown line still rendered above the list | `ListTile.test.jsx:24-36`; `Home.test.jsx:947-953` — `"2 past · 0 upcoming"` and `"1 played · 1 upcoming"` still present | ✅ PASS |
| DTILE-03.1 team row click → `/teams?team=<id>`, selected on arrival | destination page shows the team's players | `Home.test.jsx:815-834` — clicks row, asserts `heading "Teams"` and `"1 João"` (a player of the linked team) rendered | ✅ PASS |
| DTILE-03.2 training row click → `/trainings?training=<id>`, popup open | dialog opens, URL settles on bare path (per `useDeepLinkPopup`'s pre-existing strip-on-resolve behavior) | `Home.test.jsx:955-988` — asserts link `href` matches `/trainings?training=`, then after click asserts `role="dialog"` present and location is `/trainings` (param stripped) | ✅ PASS — reasoning re: URL-stripping verified independently by reading `src/lib/useDeepLinkPopup.js:13-37`: `setSearchParams` deletes `paramName` synchronously before `findTarget` resolves, `{replace:true}`; this is generic, pre-existing (used by Trainings/Games/Calendar already), not introduced by this feature |
| DTILE-03.3 game row click → `/games?game=<id>`, popup open | same for games | Not directly tested with an *assertion on the popup* in `Home.test.jsx` — only the `href` pattern is implied by `Home.jsx:157` (`href: /games?game=${game.id}`) reusing the same `?game=` mechanism as Trainings | ⚠️ **Coverage gap** — no `Home.test.jsx` test clicks a Games-tile row and asserts the popup opens, unlike the analogous training-row test at line 955. Games' own `?game=` deep-link mechanism is independently covered in `Games.test.jsx`, so the *destination* behavior is proven, but the *dashboard wiring* to it is only proven by the games test that clicks the Next-Event tile (`Home.test.jsx:347-371`), not a Games-tile list row |
| DTILE-03.4 keyboard focus + Enter activates | visible focus class + Enter navigates | `ListTile.test.jsx:50-56` (focus class) and `:106-122` (Tab + Enter navigates to href) | ✅ PASS |
| DTILE-03.5 deleted record → "no longer exists" message | destination shows pre-existing not-found message | `Trainings.test.jsx:1288,1335,1508` and `Games.test.jsx:591,639` — pre-existing tests reused (not modified this feature); confirmed these predate the branch by checking `git diff 62c71d2..HEAD` touches neither file | ✅ PASS (reused coverage, correctly not duplicated) |
| DTILE-04.1 `/teams?team=<id>` opens with team selected + players listed | `Teams.test.jsx:693-700` — `renderTeams(["/teams?team=1"])`, `within(Players column).findByText("1 João")` | ✅ PASS |
| DTILE-04.2 selecting updates URL, no reload | `Teams.test.jsx:702-717` — asserts `location` becomes `/teams?team=1` after click | ✅ PASS |
| DTILE-04.3 unknown id → no selection, no throw | `Teams.test.jsx:719-724` — `renderTeams(["/teams?team=does-not-exist"])`, asserts `"Select a team to see its players."` present (implies no crash, since a crash would abort rendering the whole tree) | ✅ PASS — confirmed genuinely load-bearing via Discrimination Sensor #3 below |
| DTILE-04.4 no `?team=` → unchanged behavior | `Teams.test.jsx:726-731` (new) plus all 36 pre-existing tests pass unedited except mechanical `render`→`renderTeams` wrapper change | ✅ PASS — diff of `Teams.test.jsx` confirmed mechanical (see Code Quality) |
| Edge: dangling reference not rendered | `Home.test.jsx:991-1008` — stale training id excluded from a second render's rows | ✅ PASS |
| Edge: no upcoming or past → empty state, no "+0 more" | `dashboardStats.test.js:406-411`; `ListTile.test.jsx:44-48` (0 overflow → no indicator) | ✅ PASS |
| Edge: exactly 3 → no overflow | `dashboardStats.test.js:360-368,435-441` | ✅ PASS |
| Edge: training with no number → date alone, not "Training #undefined" | `Home.test.jsx:879-895` | ✅ PASS |
| Edge: long opponent wraps, not truncates | `ListTile.test.jsx:94-104` (generic long-label test, not games-specific, but the component is shared) | ✅ PASS |
| Edge: loading → unchanged skeleton | `ListTile.test.jsx:72-80`; `Home.test.jsx:171-182,685-699` | ✅ PASS |
| Edge: "past" basis exercised for BOTH Trainings and Games tiles | `Home.test.jsx:921-932` (Training) and `:934-945` (Games) — each independently asserts `"most recent"` | ✅ PASS — confirmed both tiles covered, not just one |

**Status**: ⚠️ Two coverage gaps flagged (DTILE-01.6 filter-scoping for Trainings/Games rows specifically, and DTILE-03.3 games-row-click-opens-popup); one spec-precision/test-fixture gap on DTILE-01.1's case-insensitivity. All other ACs and edge cases PASS with exact-outcome evidence.

---

## Discrimination Sensor

Sensor run via single-file edits on the real working tree, each reverted with `git checkout HEAD -- <file>` immediately after observing the result; `git status`/diff confirmed clean before and after all three.

| # | File:line | Description | Killed? |
| - | --- | --- | --- |
| 1 | `src/lib/dashboardStats.js:149-150` | Removed `.toLowerCase()` from both sides of the `teamRows` comparator (raw case-sensitive string compare) | ❌ **Survived** — `npx vitest run src/lib/__tests__/dashboardStats.test.js` → 38/38 still pass. The only test exercising mixed case (`zeta`/`Alpha`/`Beta`) happens to produce the identical order with or without folding, since every cross-case comparison in that fixture already resolves the same way raw (`'z'>'A'`, `'A'<'B'`). A fixture with e.g. `"banana"` vs `"Cherry"` would expose the bug (`'b'`(98) > `'C'`(67) under raw compare, flipping the correct order) but no such case exists. |
| 2 | `src/lib/dashboardStats.js:189-195` | Removed the `basis:"past"` fallback branch in `upcomingRows`; made it return `{entries:[], overflow:0, basis:"past"}` unconditionally when nothing is upcoming | ✅ Killed — `dashboardStats.test.js` fails 1 test (`falls back to the most recent past records...`) and `Home.test.jsx` fails (Training-tile row rendering test), 2 failures total |
| 3 | `src/pages/Teams.jsx:79-80` | Removed the `if (match)` guard (`setSelectedTeam(match)` unconditionally, so an unresolved id sets state to `undefined` instead of leaving it `null`) | ✅ Killed — 3 tests in `Teams.test.jsx` fail with `TypeError: Cannot read properties of undefined (reading 'players')` at `Teams.jsx:189`, precisely reproducing the crash DTILE-04.3 requires must not happen |

**Sensor depth**: lightweight (3 mutations, default tier)
**Result**: 2/3 killed, 1 survived — ❌ Sensor FAIL (mutation #1 exposes a real, if narrow, test-fixture weakness)

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ `ListTile.jsx` (76 lines) is small and single-purpose; `dashboardStats.js` additions are two pure functions |
| Surgical changes | ✅ Only the 8 files listed in the diff stat touched |
| No scope creep | ✅ `trainingService.getAllNumbered()` swap in `Home.jsx` is required to get training numbers for row labels, not scope creep |
| Matches patterns | ✅ `?team=` mirrors `Settings.jsx`'s `?tab=` pattern per the spec's own Assumption; `ListTile` reuses `Tile`/`StatTile`'s skeleton and empty-state markup verbatim |
| Spec-anchored outcome check | ⚠️ Two coverage gaps noted above |
| Per-layer coverage | ⚠️ DTILE-01.6 not independently proven for Trainings/Games rows (only for Teams); DTILE-03.3 popup-open not proven for a Games-tile row specifically |
| Every test maps to a spec requirement | ✅ Spot-checked; no unclaimed tests found |
| Documented guidelines followed | CLAUDE.md conventions (`*Popup`/services layer/Tailwind) — followed; no dedicated testing guideline file beyond the tasks.md Test Coverage Matrix, which was followed |

**Mechanical-refactor verification**: `git diff 62c71d2..HEAD -- src/pages/__tests__/Teams.test.jsx`, filtered to non-`render↔renderTeams` lines, shows only additive new tests/helpers (`renderTeams`, `LocationDisplay`, 5 new DTILE-04 tests) — confirmed no existing assertion was altered.

**Race-condition fix verification**: `Teams.test.jsx:693-700` and `:733-754` use `await within(getColumn("Players")).findByText(...)` (async) rather than a synchronous `getByText` immediately after `screen.findByText("Amadora Sub-11")` — this correctly awaits the second `useEffect` (resolving `?team=` → `selectedTeam`) rather than only the first (`loadTeams`). This is a genuine fix for the described race, not a longer timeout papering over it.

**`useDeepLinkPopup` param-stripping verification**: read `src/lib/useDeepLinkPopup.js` directly — `setSearchParams` deletes `paramName` inside the effect before `findTarget` resolves (`replace:true`). This is pre-existing, generic behavior (the comment says "so a refresh never reopens the popup") shared by Trainings/Games/Calendar already; feature 25 did not introduce or alter it. The two tests that assert on the settled bare path instead of the lingering param are therefore correctly aligned with real behavior, not weakened.

**Past-basis fallback verification**: read `upcomingRows` (`dashboardStats.js:168-196`) — confirmed it falls through to a `past`-filtered, most-recent-first branch only when `upcoming.length === 0`. The "0 links after delete" test story checked out: `Home.test.jsx` fixed test isolates the stale-href invariant with a fully mocked fixture (`Home.test.jsx:991-1008`) rather than asserting a literal zero, which would have been false given seed data's 2 pre-existing past trainings.

---

## Edge Cases

- [x] No upcoming but past exist → most-recent-past + "most recent" note (both Trainings and Games tiles independently verified)
- [x] Neither upcoming nor past → empty state, no "+0 more"
- [x] Exactly 3 records → no overflow indicator
- [x] Training with no number → date alone, not "Training #undefined"
- [x] Long opponent/label wraps, no truncation class
- [x] Loading → unchanged skeleton, no grid jump
- [x] Dangling reference (deleted since load) → not rendered on revisit

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: lint exit 0, build exit 0 (5998 modules, no errors), test: 62 files / 1223 tests passed, 0 failed, 0 skipped
- **Stability check**: `npm test` run twice in a row, both runs 62 files / 1223 tests passed, 0 failed — the previously-described full-suite race condition (Teams.test.jsx selection-dependent assertions racing the second `useEffect`) did not reproduce; the fix (async `findByText` instead of sync `getByText`) holds under repeat runs
- **Test count before feature**: not independently re-measured against `62c71d2` (a full-tree checkout to the parent commit was judged unnecessary risk for a read-only Verifier pass, consistent with the prior feature's validation precedent); diff stat shows 8 files changed, all insertions plus two new test files (`ListTile.test.jsx` 135 lines, additions to 3 existing test files), no deleted test blocks visible in the diff
- **Test count after feature**: 1223
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans (if issues found)

### Fix 1: `teamRows` case-insensitivity is unverified by its own test

- **Root cause**: `dashboardStats.test.js:335-348`'s mixed-case fixture (`zeta`/`Alpha`/`Beta`) never produces a different sort order with vs. without `.toLowerCase()`, since the cross-case comparisons involved already resolve correctly under raw string compare.
- **Fix task**: Add/replace a case in the `teamRows` test with a fixture that would sort *incorrectly* without folding — e.g. `"banana FC"` vs `"Cherry FC"` (raw compare puts `banana` after `Cherry`; case-folded correctly puts it before).
- **Priority**: Minor (implementation is correct today, verified by direct source read; this is a discrimination-sensor gap, not a shipped defect)

### Fix 2: DTILE-01.6 filter-scoping not independently proven for Trainings/Games tile rows

- **Root cause**: `Home.test.jsx` proves team-filter scoping for the Teams tile's rows (`:836-848`) and for counts generally (pre-existing DASH-08 tests), but no test asserts that an active team filter also narrows the *rows* rendered inside the Trainings/Games `ListTile`s specifically (as opposed to just their counts/breakdown).
- **Fix task**: Add a test mirroring `Home.test.jsx:836-848` for the Training and Games tiles — mock two teams each with an upcoming record, filter to one team, assert only that team's row(s) render.
- **Priority**: Minor (the underlying `scopedTrainings`/`scopedGames` wiring is straightforward and shared with the already-tested count path, but it is currently unverified in isolation)

### Fix 3: DTILE-03.3 (games row → popup open) has no dedicated dashboard-wiring test

- **Root cause**: The analogous training-row-click test (`Home.test.jsx:955-988`) has no games-tile counterpart; only the Next-Event tile's `?game=` click is tested from Home.
- **Fix task**: Add a test clicking a Games-tile list row and asserting the game popup (`role="dialog"` or equivalent) opens on `/games`, mirroring the training test's structure.
- **Priority**: Minor (Games' `?game=` deep-link resolution itself is independently proven correct in `Games.test.jsx`; only the dashboard-to-Games wiring specifically lacks its own assertion)

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| DTILE-01 | Pending | ⚠️ Verified with minor coverage gaps (case-fold test fixture, filter-scoping on Trainings/Games rows) |
| DTILE-02 | Pending | ✅ Verified |
| DTILE-03 | Pending | ⚠️ Verified with minor coverage gap (games-row → popup wiring untested from Home) |
| DTILE-04 | Pending | ✅ Verified |

---

## Summary

**Overall**: ⚠️ Issues (minor) — functionally correct and gate-clean; three narrow test-coverage gaps, none indicating a shipped defect

**Spec-anchored check**: 20/23 criteria matched spec outcome exactly with direct evidence; 3 flagged (1 spec-precision/fixture gap on DTILE-01.1's case-folding, 2 coverage gaps on DTILE-01.6 for Trainings/Games rows and DTILE-03.3's dashboard-to-Games-popup wiring)
**Sensor**: 2/3 mutations killed, 1 survived (case-fold removal in `teamRows` is undetected by the current test fixture)
**Gate**: 3/3 passed (lint, build, test — 1223 tests, 0 failed, stable across 2 consecutive full runs)

**What works**: `teamRows`/`upcomingRows` are correctly implemented (verified by direct source read and 2/3 sensor kills); `ListTile` faithfully reuses `Tile`/`StatTile` surfaces; the `?team=` deep link correctly mirrors `?tab=`'s pattern and its unknown-id guard is load-bearing (sensor #3 proves removing it crashes the page exactly as DTILE-04.3 warns against); the `useDeepLinkPopup` param-stripping reasoning and the past-basis fallback reasoning supplied by the implementer both check out against direct source reads; the Teams.test.jsx `render`→`renderTeams` refactor is confirmed purely mechanical; the described full-suite race-condition fix holds under two consecutive `npm test` runs.

**Issues found**: see Fix Plans 1-3 above (all Minor).

**Next steps**: Optional follow-up task to close the 3 minor gaps; not a blocker given all are test-coverage refinements on correct, already-shipped behavior, not defects in the implementation itself.

---

## Re-verify (2026-08-06)

**Commit under review**: `edee6f5` ("test(dashboard): close the 3 gaps from the first Verifier pass") — touches only `src/lib/__tests__/dashboardStats.test.js` (+12) and `src/pages/__tests__/Home.test.jsx` (+55). No implementation files changed. Independent re-verification, author ≠ verifier.

### Mutation re-runs (each applied to the real tree, confirmed red, then reverted with `git checkout --`; `git status` clean before/after all three)

| # | Mutation | File:line | Command | Result |
| - | --- | --- | --- | --- |
| A | Removed `.toLowerCase()` from both sides of `teamRows`'s comparator | `src/lib/dashboardStats.js:149-150` | `npx vitest run src/lib/__tests__/dashboardStats.test.js` | ✅ **Killed** — new test at `dashboardStats.test.js:350` ("compares case-insensitively... 'Cherry' < 'banana'...") fails with an `AssertionError` showing entries in the wrong order (`Cherry FC` before `banana FC`); 38 passed / 1 failed. Previously this survived (38/38 passed). Gap 1 confirmed closed. |
| B | Made `scopedTrainings`/`scopedGames` in `Home.jsx` ignore the team filter (`= trainings` / `= games` unconditionally) | `src/pages/Home.jsx:74-77` | `npx vitest run src/pages/__tests__/Home.test.jsx -t "team filter"` | ✅ **Killed** — new test at `Home.test.jsx:1018` ("both training and game tile rows respect the active team filter") fails: `expected [...] to have a length of 1 but got 2` on both training and game link counts. Gap 2 confirmed closed. |
| C | Changed the Games tile row `href` to `/games?game=wrong-${game.id}` | `src/pages/Home.jsx:157` | `npx vitest run src/pages/__tests__/Home.test.jsx -t "game row"` | ✅ **Killed** — new test at `Home.test.jsx:990` ("clicking a game row navigates to /games?game=<id> with the game popup open") times out waiting for `role="dialog"` (the wrong id never resolves to a game, so `useDeepLinkPopup` never opens a popup). Gap 3 confirmed closed. |

All three mutations were reverted immediately after observing red; `git diff` on `src/lib/dashboardStats.js` and `src/pages/Home.jsx` is empty post-revert (confirmed via the harness's own post-edit diff surfacing, plus `git status --short` showing no changes to either file at the end of the session).

### Spec-anchored re-check (previously-gapped criteria, full re-derivation)

| Criterion | `file:line` + assertion | Result |
| --- | --- | --- |
| DTILE-01.1 (case-fold sort) | `dashboardStats.js:147-158` (`teamRows`, unchanged); new fixture `dashboardStats.test.js:350-361` — `crossCase = [{club:"Cherry"}, {club:"banana"}]`, asserts `banana FC` sorts before `Cherry FC`, which only holds under `.toLowerCase()` folding (raw ASCII: `'C'`=67 < `'b'`=98, so `Cherry` would sort first without folding) | ✅ PASS — mutation A above proves this is now load-bearing |
| DTILE-01.6 for Trainings/Games rows specifically | `Home.jsx:74-77` (`scopedTrainings`/`scopedGames`, unchanged); new test `Home.test.jsx:1018-1044` — 2 teams, 1 training + 1 game each, filters to team 1, asserts exactly 1 training link and 1 game link remain, and the surviving game link's text contains `"A FC"` not `"B FC"` | ✅ PASS — mutation B above proves this is now load-bearing |
| DTILE-03.3 (Games row click opens popup) | `Home.jsx:150-163` (Games `ListTile`, unchanged); new test `Home.test.jsx:990-1016` — clicks the first Games-tile row link, asserts `href` matches `/^\/games\?game=/`, then asserts `role="dialog"` appears and the URL settles on `/games` | ✅ PASS — mutation C above proves this is now load-bearing |

Spot-checked a sample of the other 20 previously-PASS criteria (DTILE-01.2/01.3/01.4/02, DTILE-03.1/03.2/03.4/03.5, DTILE-04.1-04.4) against the current tree — no implementation files changed since the first pass, so their evidence (`file:line` references) still resolves identically. No regression found.

### Gate re-run

- `npm run lint` → exit 0, no findings
- `npm run build` → exit 0, 5998 modules, no errors, same output shape as first pass
- `npm test -- --run` → **run 1**: 62 files / 1226 tests passed, 0 failed, 0 skipped
- `npm test -- --run` → **run 2**: 62 files / 1226 tests passed, 0 failed, 0 skipped (stable repeat, confirming the earlier full-suite race fix still holds)
- Test count grew from 1223 (first pass) to 1226 (+3: the 2 recovered Home tests + 1 dashboardStats test), matching the commit message's claim exactly

### Verdict

**PASS** — all 3 previously-flagged gaps are closed and independently confirmed via red/green mutation testing on the real tree. No new gaps introduced (only test files changed; diff is purely additive, no existing assertions altered — confirmed via `git show edee6f5`).

**Ranked gap list**: none.

### Requirement Traceability Update

| Requirement | Previous Status | Re-verified Status |
| --- | --- | --- |
| DTILE-01 | ⚠️ Verified with minor coverage gaps | ✅ Fully verified — case-fold sensor now kills, filter-scoping proven for Trainings/Games rows |
| DTILE-02 | ✅ Verified | ✅ Verified (unchanged) |
| DTILE-03 | ⚠️ Verified with minor coverage gap | ✅ Fully verified — games-row → popup wiring now proven from Home |
| DTILE-04 | ✅ Verified | ✅ Verified (unchanged) |
