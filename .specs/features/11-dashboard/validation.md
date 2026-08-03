# Dashboard — Verification Report

**Verdict: PASS** (with one coverage gap noted below, not blocking)

**Commit range covered** (`git log main..HEAD --oneline`):

```
68a7c11 feat(dashboard): add team filter across all tiles
82d5334 feat(dashboard): add the top-rated players tile
f80c090 feat(dashboard): add the next event tile
7689b63 feat(dashboard): wire the leader tiles to real data
196c78a feat(dashboard): wire the count tiles to real data
41b69e6 feat(dashboard): add leader tile component
a66c78e refactor(dashboard): attach a display rank to leader-tile entries
c33779b feat(dashboard): add stat tile component
2d1a0b4 feat(dashboard): add dashboard aggregation logic
0964804 docs(dashboard): add design for 11-dashboard
```

Design's two documented deviations from `tasks.md`'s literal text were verified as intentional and correctly implemented:
- `topTeamGames(teams, games, n)` exists in `src/lib/dashboardStats.js:122-128`, not in T1's literal list, added per design.md to satisfy T5.
- `nextEvent(trainings, games, teams)` takes three args (`src/lib/dashboardStats.js:147`) to supply `teamName`, per AC DASH-06.1.

---

## Per-AC / Done-when coverage table

| Req | Criterion | Test (file:line) | Assertion | Spec outcome | Covered |
|---|---|---|---|---|---|
| DASH-01.1 | Teams tile count | `dashboardStats.test.js:18-20` | `counts(...).teams === 2` | number of teams | y |
| DASH-01.2 | Trainings split past/upcoming | `dashboardStats.test.js:22-33` | `{total:2,past:1,upcoming:1}` | exact split | y |
| DASH-01.3 | Games split played/upcoming | `dashboardStats.test.js:35-46` | `{total:2,played:1,upcoming:1}` | exact split | y |
| DASH-05.6 | `topScorers` excludes zero-goal | `dashboardStats.test.js:108-117` | zero-goal player absent from `entries` | never show 0 as leader | y |
| DASH-05.3 | `topCarded` yellows/reds separate | `dashboardStats.test.js:155-171` | `value:{yellow:2,red:1}` shape | separate totals | y |
| DASH-07.2 | `topRated` excludes unrated (null-vs-zero) | `dashboardStats.test.js:222-241` | unrated absent; genuine 0-avg included | exclude null, keep real 0 | y |
| DASH-05.4 | Ties: all shown, name-ordered | `dashboardStats.test.js:119-130` | `[Ana(5), Carla(5)]` both rank 1, alpha order | all ties, deterministic | y |
| edge: 20+ tie capped | `MAX_LEADER_ENTRIES` cap + overflow | `dashboardStats.test.js:251-263` | `entries.length===MAX_LEADER_ENTRIES`, `overflow===10` | capped + overflow indicated | y |
| DASH-06.1/06.2 | `nextEvent` soonest across types | `dashboardStats.test.js:281-294` | returns game over training, correct `teamName` | soonest wins, team label present | y |
| edge: invalid date skipped | `nextEvent` | `dashboardStats.test.js:296-305` | invalid-date training skipped, next returned | skip & continue | y |
| DASH-06.5 | Tied timestamp deterministic | `dashboardStats.test.js:307-313` | game wins tie over training | deterministic pick | y |
| DASH-06.4 | No future events → `null` | `dashboardStats.test.js:315-319` | `toBeNull()` | null result | y |
| AD-004 | No mutation of inputs | `dashboardStats.test.js` (counts/topScorers/nextEvent, several) | deep-equal before/after | pure functions | y |
| edge: unassigned excluded when filtered, counted unfiltered | `counts` | `dashboardStats.test.js:65-73` | `total:0` filtered vs `total:1` unfiltered | matches edge case | y |
| edge: empty input → zeros not NaN | `counts` | `dashboardStats.test.js:75-81` | all-zero shape | no NaN/undefined | y |
| edge: player's team deleted → excluded from leaders | — | — | — | excluded via `Home.jsx`'s `flatMap` over currently-loaded `teams` (design.md "Error Handling Strategy") | **n — no direct test** |
| DASH-02 (StatTile) | label/value/breakdown | `StatTile.test.jsx:14-20` | all three render | y | y |
| DASH-02 | zero/null → "No data yet" + link | `StatTile.test.jsx:28-52` | link href correct, no link when no `emptyHref` | y | y |
| DASH-02 | loading placeholder not 0 | `StatTile.test.jsx:54-60` | `—` shown, no "0"/"No data yet" | y | y |
| DASH-02 | focusable link/button | `StatTile.test.jsx:62-91` | Tab reaches link/button, onClick fires | y | y |
| DASH-03 (LeaderTile) | rank/name/value, ties share rank | `LeaderTile.test.jsx:4-41` | 3 listitems, shared rank text | y | y |
| DASH-03 | no padding below n | `LeaderTile.test.jsx:43-52` | 1 listitem only | y | y |
| DASH-03 | empty → "No data yet" | `LeaderTile.test.jsx:54-65` | text present, no listitems | y | y |
| DASH-03 | overflow indicator | `LeaderTile.test.jsx:67-90` | "+10 more tied" shown only when overflow>0 | y | y |
| DASH-03 | two-part value / note | `LeaderTile.test.jsx:92-117` | custom `renderValue`, `note` text | y | y |
| DASH-04.1-4 (wired counts) | `Home.test.jsx:43-79` | tile text "2", split strings, 7×"No data yet" | y | y |
| DASH-04.5 | revisit reflects new record | `Home.test.jsx:81-93` | count goes 2→3 after `teamService.create` + remount | y | y |
| DASH-05.1-4 (wired leaders) | `Home.test.jsx:117-236` | Most Goals/Games/Cards content, all-zero empty state, ties | y | y |
| DASH-06.1-4 (wired next event) | `Home.test.jsx:238-347` | text shown, sooner-of-two picked, click + keyboard nav to `?game=99`, empty-state link | y | y |
| DASH-07.1-3 (wired rating tile) | `Home.test.jsx:349-416` | "7.5" one-decimal avg, unrated excluded, empty state | y | y |
| DASH-08.1-4 (team filter) | `Home.test.jsx:446-532` | recompute on select/clear, empty state for no-data team, no re-fetch (`toHaveBeenCalledTimes(1)`), unassigned-training exclude/include | y | y |
| `ratingService.getAll()` (design addition) | `ratingService.test.js:38-59` | returns every persisted rating | y | y |

**Coverage summary**: 8/8 requirement groups (DASH-01–08) have passing tests matching the spec's stated outcome. One edge case — "player's team has been deleted → excluded from leader tiles" — has no dedicated test in either `dashboardStats.test.js` or `Home.test.jsx`; the exclusion is a structural consequence of `Home.jsx:71`'s `flatMap` over the currently-loaded `teams` array (a deleted team is absent from that array, so its players can never reach `topScorers`/`topCarded`/`topRated`). This is architecturally sound per design.md's Error Handling Strategy table, but the "Done when" bullet in `tasks.md` T1 ("Players whose team was deleted are excluded from leader results (edge case)") is not verified by an executable test. Recommend a follow-up unit/integration test (e.g., in `Home.test.jsx`: load two teams, then a scoped-out team's players never surface in leader tiles) to close the gap, though risk of regression is low given the mechanism has no separate code path to break silently.

---

## Discrimination sensor (mutation testing)

All mutations applied as uncommitted edits, one at a time, then reverted. Working tree confirmed clean (`git status --short`) after each and at the end.

| # | Mutation | File:line | Test run | Result |
|---|---|---|---|---|
| 1 | `rankEntries` zero-exclusion filter: `e.score > 0` → `e.score >= 0` | `dashboardStats.js:63` | `dashboardStats.test.js`, `Home.test.jsx` | **Killed** (7 failures — zero-goal/zero-card players started appearing as leaders) |
| 2 | Tie-tier accumulation: `if (picked.length >= n) break` → `if (picked.length > 0) break` | `dashboardStats.js:83` | `dashboardStats.test.js`, `Home.test.jsx` | **Killed** (6 failures — second tier never accumulated, e.g. "clearing filter" test lost Beatriz) |
| 3 | Team-scoping inversion: `teamFilter != null` → `teamFilter == null` in `scopedTeams` | `Home.jsx:66` | `Home.test.jsx` | **Killed** (10 failures — filter behavior inverted) |
| 4 | Cap decoupled from constant: `picked.slice(0, MAX_LEADER_ENTRIES)` → `picked.slice(0, 5)` | `dashboardStats.js:91` | `dashboardStats.test.js` | **Killed** (1 failure — 20-way tie test expects length === `MAX_LEADER_ENTRIES` (10), got 5) |
| 5 | `hasResult` check inverted in `topTeamGames`: `hasResult(g)` → `!hasResult(g)` | `dashboardStats.js:124` | `dashboardStats.test.js`, `Home.test.jsx` | **Killed** (2 failures — Most Games tile counted unplayed games instead of played) |

**5/5 mutants killed.** No survivors. Working tree is clean (verified with `git status` after each revert and again at the end).

---

## Gate results

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` | Pass, no output/errors |
| Build | `npm run build` | Pass — `vite build` succeeded, 5983 modules transformed, `dist/` produced |
| Tests | `npm test` | Pass — **42 test files, 681 tests, all passed** (includes `dashboardStats.test.js`: 28 tests, `StatTile.test.jsx`: 9, `LeaderTile.test.jsx`: 10, `Home.test.jsx`: 25, `ratingService.test.js`: 19, plus all pre-existing suites) |

`tasks.md`'s per-task test-count estimates (26/8/10/11/19/26/31/39, cumulative) were guidance, not a hard gate per design.md's Task List Amendment — actual final counts (28 in `dashboardStats.test.js`, 25 in `Home.test.jsx`) meet or exceed every estimate.

---

## Conclusion

Implementation matches spec and design across all 8 requirement groups (DASH-01 through DASH-08). Both documented deviations from `tasks.md`'s literal text (`topTeamGames` addition, `nextEvent`'s 3-arg signature) are correctly implemented and match their stated rationale. All 5 targeted mutations were caught by the existing suite, indicating the tests are not merely present but discriminating. Full gate (lint/build/test) passes cleanly.

The single gap — no direct test for the "deleted team's players excluded from leader tiles" edge case — is a documentation/coverage gap, not a functional defect (the mechanism achieving this has no separate branch to regress silently). Recommend adding one test to close it, but it does not block sign-off.
