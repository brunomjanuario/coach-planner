# Games & League Table Validation

**Date**: 2026-08-01
**Spec**: `.specs/features/07-games-league-table/spec.md`
**Diff range**: `main...feat/07-games-league-table` (11 commits: design doc + T1–T10)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
|------|---------|-------|
| T1   | ✅ Done | Game shape + collection registered, seed has 1 scheduled + 1 played game |
| T2   | ✅ Done | `gameResult.js` + `gameService.js`, 8+21 tests (21 not 18 — extra coverage, no gap) |
| T3   | ✅ Done | `GameSavePopup.jsx`, 12 tests (spec said 13; one fewer, no functional gap found) |
| T4   | ✅ Done | `GameRow.jsx`, 11 tests |
| T5   | ✅ Done | `Games.jsx` list/filter, folded into later commits |
| T6   | ✅ Done | `GameResultPopup.jsx` + wiring, 15 component tests |
| T7   | ✅ Done | `standings.js`, 19 tests |
| T8   | ✅ Done | `LeagueTable.jsx`, 9 tests |
| T9   | ✅ Done | `standingsService.js` + `RivalRowPopup.jsx`, 14+10 tests |
| T10  | ✅ Done | Table wired into `Games.jsx`, 25 page tests total. Includes an added "Delete Game" control in `GameResultPopup.jsx` (not in T10's literal file list) — see Code Quality section for justification. |

All tasks committed atomically, one commit per task, matching `tasks.md`'s commit messages.

---

## Spec-Anchored Acceptance Criteria

### P1: Schedule a fixture

| Criterion | Spec-defined outcome | file:line + assertion | Result |
|---|---|---|---|
| Submit persists team/opponent/date/home-away/competition | all 5 fields present on persisted record | `src/components/__tests__/GameSavePopup.test.jsx:106-129` — `expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({teamId:2, opponent:"Benfica", isHome:false, competition:"District League"}))` + `date instanceof Date` | ✅ PASS |
| No team → block | submission blocked, message shown | `GameSavePopup.test.jsx:53-67` — `expect(createSpy).not.toHaveBeenCalled()` + `"Please select a team."` | ✅ PASS |
| Empty opponent → block | blocked, message | `GameSavePopup.test.jsx:69-104` (empty and whitespace-only) | ✅ PASS |
| id via `newId()` | string id, non-empty | `src/services/__tests__/gameService.test.js:40-53` — `expect(typeof created.id).toBe("string")` | ✅ PASS |
| Created with no result | `usScore:null, themScore:null` even if caller supplies values | `gameService.test.js:55-68` | ✅ PASS |
| Reload still lists it | persists through storage round-trip | `gameService.test.js:11-22` (getAll uses real localStorage-backed store, non-reference-identical across calls) | ✅ PASS (via store persistence layer, not a literal reload simulation) |

### P1: List fixtures and results

| Criterion | Spec-defined outcome | file:line + assertion | Result |
|---|---|---|---|
| Upcoming/Played split | scheduled vs. `hasResult` | `src/pages/__tests__/Games.test.jsx:59-67` | ✅ PASS |
| Team filter narrows | only that team's games | `Games.test.jsx:69-85` | ✅ PASS |
| Clear filter restores all | full list returns | `Games.test.jsx:87-109` | ✅ PASS |
| Empty list → empty state | specific message text | `Games.test.jsx:178-200` — `"No upcoming games."` / `"No played games."` | ✅ PASS |
| Row shows opponent/date/home-away | rendered text | `src/components/__tests__/GameRow.test.jsx:16-40` | ✅ PASS |
| Played row shows scoreline | `"2–1"` text | `GameRow.test.jsx:48-54` | ✅ PASS |

### P1: Record a result

| Criterion | Spec-defined outcome | file:line + assertion | Result |
|---|---|---|---|
| Result entry moves game to Played | both scores persisted, list membership changes | `Games.test.jsx:299-319` | ✅ PASS |
| Negative/non-numeric → block | message shown, `onSubmit` not called | `src/components/__tests__/GameResultPopup.test.jsx:76-108` | ✅ PASS |
| Outcome derived, not asked | win/draw/loss from scores via `deriveOutcome` | `src/lib/__tests__/gameResult.test.js:27-37`; `GameRow.test.jsx:56-67` (bogus stored `outcome` field ignored) | ✅ PASS |
| Edit result updates in place, recomputes | new scores + new outcome | `GameResultPopup.test.jsx:146-157`; `Games.test.jsx:341-364` | ✅ PASS |
| Clear returns to Upcoming | game reappears in Upcoming | `GameResultPopup.test.jsx:134-144`; `Games.test.jsx:366-382` | ✅ PASS |

### P2: League standings

| Criterion | Spec-defined outcome | file:line + assertion | Result |
|---|---|---|---|
| Our row computed (P/W/D/L/GF/GA/GD/Pts) | exact figures | `src/lib/__tests__/standings.test.js:33-52` | ✅ PASS |
| 3/1/0 points | `row.points === 3+1+0` | `standings.test.js:54-64` | ✅ PASS |
| Rows sorted pts→GD→GF→name | ordered name lists | `standings.test.js:197-240` | ✅ PASS |
| Our row highlighted + position | `bg-blue-500` class + position cell | `src/components/__tests__/LeagueTable.test.jsx:53-65` | ✅ PASS |
| Recompute on add/edit/delete result | table cells update, no reload | `Games.test.jsx:427-492` (add, clear, delete all covered) | ✅ PASS |
| No played games → zero row, not omitted | `{played:0,...,points:0}` exact object | `standings.test.js:85-100` | ✅ PASS |

### P2: Maintain rival rows

| Criterion | Spec-defined outcome | file:line + assertion | Result |
|---|---|---|---|
| Rival row persists 7 fields | matches input object | `src/services/__tests__/standingsService.test.js:34-40` | ✅ PASS |
| Points/GD derived, not accepted | `created.points`/`goalDifference` undefined even if supplied as 999 | `standingsService.test.js:48-55` | ✅ PASS |
| W+D+L≠P → block, message names discrepancy | `ValidationError`, message matches `/4.*5|5.*4/` | `standingsService.test.js:57-67`; `src/components/__tests__/RivalRowPopup.test.jsx:88-108` (exact message `"Won, drawn and lost (4) must add up to played (5)."`) | ✅ PASS |
| Edit/delete re-sorts | new position order in table | `Games.test.jsx:494-521` | ✅ PASS |

**Status**: ✅ All 27 traceable ACs covered with spec-matching outcomes. No spec-precision gaps found — every AC in spec.md defines a checkable outcome and tests target it directly.

---

## Discrimination Sensor

| # | File:line | Mutation | Killed? |
|---|---|---|---|
| 1 | `src/lib/gameResult.js:15` | `hasResult`: `&&` → `||` (null-vs-zero guard inverted) | ✅ Killed — `gameResult.test.js` fails 2/8 |
| 2 | `src/lib/standings.js:78-82` | `sortStandings`: swapped primary/secondary comparator order (goalDifference checked before points) | ❌ **Survived** — `standings.test.js` still 19/19 green |
| 3 | `src/lib/standings.js:39` | `computeOurRow`: `points: won*3 + drawn` → `won*3 + drawn*3` | ✅ Killed — `standings.test.js` fails 2/19 |

**Sensor depth**: lightweight (default tier)
**Result**: 2/3 killed — ⚠️ one gap found

**Root cause of the survivor**: every existing `sortStandings` test varies exactly one tiebreak factor at a time (points differ with goalDifference tied at 0, or goalDifference differs with points tied). No test has two rows where **points and goalDifference actively disagree** on the ranking (e.g. row A: 5 pts / GD −2 vs. row B: 4 pts / GD +5) — the one scenario that would prove points outranks goalDifference, per AC GAME-07.3 ("sorted by points, **then** goal difference"). All working tree changes were reverted after this test (`git status` clean).

---

## Code Quality

| Principle | Status |
|---|---|
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ (see T10 note below) |
| Matches patterns | ✅ — mirrors `TrainingSavePopup`/`ConfirmationPopup` conventions throughout |
| Spec-anchored outcome check | ✅ |
| Per-layer coverage (domain 1:1 ACs; routes happy+edge+error) | ✅ |
| Every test maps to a spec AC/edge case | ✅ — spot-checked all 6 test files, no orphan tests found |
| Documented guidelines followed | `CLAUDE.md`, `design.md` conventions — followed |

**T10 "Delete Game" control — scope assessment**: `GameResultPopup.jsx` gained an `onDelete` prop and a "Delete Game" button (reusing `ConfirmationPopup`, same pattern as the trainings-delete flow from commit `5329066`) that was not in T10's literal file list. This is judged a **genuinely necessary minimal addition, not scope creep**: T10's Done-when explicitly requires "Deleting a played game removes its contribution from the standings" and no earlier task (T1–T9) built any delete-game UI affordance — `GameRow` only supports `onSelect` into the result popup. Without this control the edge case would be untestable end-to-end and the spec's "Deleting a game with a result: Allowed, with confirmation" assumption would be unimplementable. The addition is scoped tightly: one button, gated on `onDelete` being passed (`GameResultPopup.test.jsx:173-179` confirms it doesn't render without the prop), reuses the existing `ConfirmationPopup` component rather than inventing new UI, and is exercised at both the component level (4 tests: renders conditionally, confirms, cancels, calls callback) and the page/integration level (1 test: standings recompute after delete). Verdict: justified, not creep.

---

## Edge Cases

- [x] Team deleted → game surfaces as unassigned: `Games.test.jsx:225-257` (null and dangling `teamId`)
- [x] Two games share a date → deterministic order: `gameService.test.js:255-276`
- [x] 0–0 treated as recorded draw, not absent: `gameResult.test.js:9-10,31-33`; `standings.test.js:75-83`; `GameRow.test.jsx:70-77`; `gameService.test.js:117-130,179-194`; `Games.test.jsx:321-339`
- [x] Rival row duplicating our team name → warns, not blocks: `RivalRowPopup.test.jsx:173-195`
- [x] Played game deleted → standings recompute: `Games.test.jsx:471-492`
- [x] Very long opponent name → wraps, doesn't break layout: `GameRow.test.jsx:79-87` (`break-words` class asserted)
- [x] GF/GA equal across two rows with equal points → deterministic next tiebreak: `standings.test.js:220-252` — **but see Sensor gap**: coverage exists for the GF/name tiebreak chain in isolation; the points-vs-GD priority itself is under-tested (mutant 2 survived)

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: 401 passed, 0 failed, 0 skipped (26 test files)
- **Test count before feature**: not independently re-derivable from git history without checking out `main`; implementers' claimed total of 401 on this branch is confirmed exactly by re-running the gate.
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

### Fix 1: `sortStandings` tiebreak-priority mutant survived

- **Root cause**: No test in `src/lib/__tests__/standings.test.js` has two rows whose points and goalDifference orderings **conflict** (e.g. higher points but lower GD vs. lower points but higher GD). Every current test varies one tiebreak level at a time with the others tied, so a comparator that checked goalDifference before points still passes all 19 assertions.
- **Fix task**: Add one test to `standings.test.js`'s `sortStandings` describe block: rows `{name:"A", points:4, goalDifference:5, goalsFor:0}` and `{name:"B", points:5, goalDifference:-2, goalsFor:0}`; assert `sortStandings([A,B]).map(r=>r.name)` equals `["B","A"]` (points wins despite worse goal difference).
- **Priority**: Minor (the implementation is correct per code inspection — `points` is checked first in `standings.js:79` — this is a test-coverage gap, not a functional bug)

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
|---|---|---|
| GAME-01 | Pending | ✅ Verified |
| GAME-02 | Pending | ✅ Verified |
| GAME-03 | Pending | ✅ Verified |
| GAME-04 | Pending | ✅ Verified |
| GAME-05 | Pending | ✅ Verified |
| GAME-06 | Pending | ✅ Verified |
| GAME-07 | Pending | ✅ Verified |
| GAME-08 | Pending | ✅ Verified |
| GAME-09 | Pending | ✅ Verified |
| GAME-10 | Pending | ✅ Verified |

---

## Summary

**Overall**: ⚠️ Issues (one minor test-coverage gap; implementation itself is correct)

**Spec-anchored check**: 27/27 ACs matched spec outcome, 0 spec-precision gaps
**Sensor**: 2/3 mutations killed, 1 survived
**Gate**: 401 passed, 0 failed

**What works**: Every P1/P2 AC and every listed edge case has direct, spec-matching test evidence. The null-vs-zero guard (`hasResult`/`deriveOutcome`) is used consistently everywhere a "has result"/outcome check is needed — no inline `usScore`/`themScore` comparisons found outside `lib/gameResult.js` itself. `computeOurRow`'s points/goalDifference derivation is correctly implemented and killed its targeted mutant. The T10 "Delete Game" addition is justified, minimal, and tested.

**Issues found**: `sortStandings`'s points-before-goalDifference priority is implemented correctly but not proven by a test with genuinely conflicting tiebreak signals — see Fix 1.

**Next steps**: Add the one test described in Fix 1. This is a lightweight, low-risk addition; re-verification after the fix should be a formality (implementation code does not need to change).

---

## Re-verification (2026-08-01)

**Verifier**: independent sub-agent, fresh session (re-verification pass, iteration 2)
**Scope**: narrow — confirm Fix 1 closes the single reported gap; no full re-review performed.

**Fix commit**: `1ae5118` — `test(standings): cover points-over-goal-difference tiebreak priority` — adds `"prioritizes points over goal difference when the two signals conflict (AC GAME-07.3)"` to `src/lib/__tests__/standings.test.js` (rows `{name:"A", points:4, goalDifference:5}` vs `{name:"B", points:5, goalDifference:-2}`, asserting `["B","A"]`).

**Checks performed**:
1. Confirmed the new test exists at the expected location, right after the "orders rows by points descending" test, and genuinely conflicts the two tiebreak signals (A has worse points but better GD; B has better points but worse GD) — this is exactly the scenario the original gap called for.
2. Re-ran the previously-surviving mutation: swapped the `points` and `goalDifference` checks in `sortStandings` (`src/lib/standings.js`) so goalDifference is checked first. Ran `npx vitest run src/lib/__tests__/standings.test.js` — result: 1 failed / 19 passed, and the single failure was exactly the new conflicting-signal test (`expected ['A','B'] to deeply equal ['B','A']`). Mutant is now killed. Reverted with `git checkout -- src/lib/standings.js`; `git status` confirmed clean immediately after.
3. Ran the full Build gate: `npm run lint && npm run build && npm test`. Lint: clean. Build: succeeded (`vite build`, 5969 modules). Tests: **402 passed, 0 failed, 0 skipped** (26 test files) — one more than the prior 401, matching the one new test added.
4. Did not re-review the other 27 ACs, other edge cases, or code quality — out of scope for this pass per the original report's "Next steps," which stated the implementation code itself needed no change.

**Verdict**: ✅ **PASS** — the single reported gap (mutant 2: `sortStandings` tiebreak-priority) is closed. Discrimination sensor now 3/3 killed. Gate green at 402 tests. No regressions, no other files touched, working tree clean (aside from this validation.md update).
