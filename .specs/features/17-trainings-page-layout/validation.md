# Trainings Page Layout Validation

**Date**: 2026-08-04
**Spec**: `.specs/features/17-trainings-page-layout/spec.md`
**Diff range**: `debbc148f44a4c6ef47b6ebc60d67d2c3cf7908e..HEAD` (180ea64, 35963e8, 97b09cb)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `splitTrainings(trainings, now)` moved into `src/lib/trainingDisplay.js`, `now` injected, invalid-day handling and non-mutation verified by 11 new unit tests. |
| T2   | ✅ Done | `h-screen` and both per-list `overflow-y-auto` removed from `src/pages/Trainings.jsx`; section headings carry counts. |
| T3   | ✅ Done | Team filter column reworked to `w-full md:w-56 md:flex-shrink-0`, layout row `flex-col md:flex-row`; content column carries only `flex-1`. |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| TLAY-01.1 every training renders, no per-section cap | rendered count == data length in both sections | `src/pages/__tests__/Trainings.test.jsx:1339-1356` — `expect(within(getFutureList()).getAllByRole("listitem")).toHaveLength(12)`; `:1358-1376` — past length 14 (2 seed + 12 created) | ✅ PASS |
| TLAY-01.2/01.3 no `h-screen`, no per-list `overflow-y-auto` | both absent from DOM | `src/pages/__tests__/Trainings.test.jsx:1378-1392` — `expect(container.querySelector(".h-screen")).not.toBeInTheDocument()`; `getFutureList().className` / `getPastList().className` and their inner `<ul>` not matching `/overflow-y-auto/` | ✅ PASS |
| TLAY-01.4 heading shows count when non-empty | exact heading text with count | `src/pages/__tests__/Trainings.test.jsx:1394-1402` — `getByRole("heading", { name: "Next Trainings (0)" })`, `"Past Trainings (2)"` | ✅ PASS |
| TLAY-01.5 empty section shows message + zero count | existing message + `(0)` in heading | `src/pages/__tests__/Trainings.test.jsx:1405-1419` — headings `"Past Trainings (0)"`/`"Next Trainings (0)"` plus `"No past trainings."`/`"No upcoming trainings."` | ✅ PASS |
| TLAY-02 counts reflect section size | number, not just heading presence | same as TLAY-01.4/01.5 citations above, and regression guard `:1656-1671` | ✅ PASS |
| TLAY-03.1 desktop: fixed narrow column, content takes remaining width | `md:w-56` on filter, `flex-1` (no `flex-3`) on content | `src/pages/__tests__/Trainings.test.jsx:1533-1544` — `teamsColumn.className` matches `/\bw-full\b/` and `/\bmd:w-56\b/`; `:1625-1632` — content column matches `/\bflex-1\b/`, not `/\bflex-3\b/` | ✅ PASS |
| TLAY-03.2 narrow width: filter stacks above content | `flex-col` default, `md:flex-row` override | `src/pages/__tests__/Trainings.test.jsx:1541-1543` — `layoutRow.className` matches `/\bflex-col\b/` and `/\bmd:flex-row\b/` | ✅ PASS (class-presence assertion — jsdom computes no layout, per Test Coverage Matrix note; visual result is the self-reported manual check, see Code Quality) |
| TLAY-03.3 selecting a team filters sections + counts | counts change to filtered values | `src/pages/__tests__/Trainings.test.jsx:1562-1576` — `"Past Trainings (2)"` unchanged, `"Next Trainings (0)"` after selecting Amadora | ✅ PASS |
| TLAY-03.4 clicking selected team again clears filter | counts restore to unfiltered values | `src/pages/__tests__/Trainings.test.jsx:1578-1596` — `"Past Trainings (0)"` then back to `"Past Trainings (2)"` | ✅ PASS |
| TLAY-03.5 / TLAY-04 no element carries both `flex-1` and `flex-3` | assert against rendered class list of every element | `src/pages/__tests__/Trainings.test.jsx:1546-1560` — iterates `container.querySelectorAll("*")`, `expect(hasFlex1 && hasFlex3).toBe(false)` for each | ✅ PASS |
| TLAY-05.1 past ordered most-recent-first | exact id order, most recent first | `src/lib/__tests__/trainingDisplay.test.js:134-142` — `expect(past.map((t) => t.id)).toEqual(["mar", "feb", "jan"])` | ✅ PASS |
| TLAY-05.2 upcoming ordered soonest-first | exact id order, soonest first | `src/lib/__tests__/trainingDisplay.test.js:124-132` — `expect(upcoming.map((t) => t.id)).toEqual(["soon", "later", "latest"])` | ✅ PASS |
| TLAY-05.3 invalid date lands in past, valid ordering undisturbed | full resulting order asserted, not just membership | `src/lib/__tests__/trainingDisplay.test.js:164-172` — `expect(past.map((t) => t.id)).toEqual(["feb", "jan", "invalid"])`; multi-invalid case `:174-184` | ✅ PASS |

**Status**: ✅ All ACs covered (no spec-precision gaps found; TLAY-03.2's outcome is layout-visual and spec + Test Coverage Matrix both explicitly accept class-presence assertion plus a recorded manual check as the coverage strategy for this feature).

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `src/lib/trainingDisplay.js:52` | Flipped upcoming sort comparator `toTime(a.day) - toTime(b.day)` → `toTime(b.day) - toTime(a.day)` (soonest-first → latest-first) | ✅ Killed — `trainingDisplay.test.js` "orders upcoming trainings soonest first (AC TLAY-05.2)" failed with `["latest","later","soon"]` vs expected `["soon","later","latest"]` |
| 2 | `src/pages/Trainings.jsx` (Past Trainings heading) | Removed the count from the "Past Trainings" heading JSX, reverting to plain `Past Trainings` | ✅ Killed — 8 tests in `Trainings.test.jsx` failed, including the count-heading and regression-guard tests |
| 3 | `src/pages/Trainings.jsx` (content column) | Re-added `flex-3` alongside `flex-1` on the content column div | ✅ Killed — 2 tests failed: "no element carries both flex-1 and flex-3 (AC TLAY-03.5)" and "the content column takes the remaining width without also carrying flex-3 (AC TLAY-03.1)" |

**Sensor depth**: lightweight (3 mutations, default tier)
**Result**: 3/3 killed — PASS ✅

All mutations were applied and reverted via `git checkout -- <file>` against the real working tree, verified clean (`git status --porcelain` empty) before and after each mutation and at the end of the sensor pass.

---

## Code Quality

| Principle | Status |
| --- | --- |
| No features beyond what was asked | ✅ |
| No abstractions for single-use code | ✅ |
| No unnecessary "flexibility" added | ✅ |
| Only touched files required for task | ✅ — only `src/lib/trainingDisplay.js`, `src/lib/__tests__/trainingDisplay.test.js`, `src/pages/Trainings.jsx`, `src/pages/__tests__/Trainings.test.jsx` changed |
| Didn't "improve" unrelated code | ✅ |
| Matches existing patterns/style | ✅ — `fixedNow()` pattern follows the existing `datetime.test.js` convention per commit 180ea64's own note |
| Would senior engineer approve? | ✅ |
| Tests map to acceptance criteria and are non-shallow | ✅ — spot-checked P1 "Every training is reachable": TLAY-01.1/01.2/01.3/01.5 all assert exact DOM state, not just presence |
| Spec-anchored outcome check | ✅ — see table above, no vague assertions found |
| Per-layer Coverage Expectation met | ✅ — pure logic (`splitTrainings`) has 1:1 AC mapping in `trainingDisplay.test.js`; page-level integration tests cover every AC + every listed edge case |
| Every test in scope maps to a spec AC, edge case, or Done-when criterion | ✅ — reviewed all new/changed tests in both files; no unclaimed additions found |
| Documented project quality/testing guidelines followed | tasks.md Test Coverage Matrix (pure logic → unit, pages → integration) — followed |

**`fixedNow()` pattern check**: `src/lib/__tests__/trainingDisplay.test.js:120-122` defines `fixedNow()` as a function, called inside each test body (e.g. `:129`, `:139`, `:145`), not as a `describe`-scope `const now = new Date(...)`. This correctly avoids the TZ-collection-order bug the author's commit message for 180ea64 describes self-catching (a `const` at describe-scope evaluates during collection, before `beforeAll` sets `process.env.TZ`, producing an inconsistent offset against in-test-body dates). Verified by inspection — the fix is applied correctly and consistently across all 11 `splitTrainings` tests.

**Manual check disclosure**: T3's Done-when item "the page has one vertical scrollbar at 1280×800 and at 480×800" is recorded in commit 97b09cb's body as a self-reported manual check ("Manual check: at both 1280x800 and 480x800, DOM inspection confirms zero elements with scrollHeight > clientHeight..."). This verifier did not and could not independently re-run a browser to confirm this claim — it is treated here as a self-reported manual check, not as independently-verified automated coverage. The automated coverage for the responsive/no-nested-scroll goal is class-presence-only (`Trainings.test.jsx:1533-1544`, `:1615-1623`), consistent with the Test Coverage Matrix's explicit note that jsdom computes no layout and the visual result is a recorded manual check (candidate lesson L-003).

---

## Edge Cases

- [x] No teams at all → "No teams yet." state + disabled add button: `Trainings.test.jsx:1646-1654`
- [x] Unassigned trainings stay above others, uncapped: `Trainings.test.jsx:1421-1443`
- [x] Filter message / deep-link error stays visible after layout change: `Trainings.test.jsx:1504-1511`, `:1513-1531`
- [x] Create/edit/delete update counts without reload: `Trainings.test.jsx:1445-1463` (create), `:1465-1481` (delete), `:1483-1502` (edit moves section + updates both counts)
- [x] Every training belongs to a filtered-out team → both sections empty with zero counts: `Trainings.test.jsx:1598-1613`

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: 841 passed, 0 failed, 0 skipped (48 test files)
- **Test count before feature**: `trainingDisplay.test.js` 14, `Trainings.test.jsx` 66 (verified via `git show debbc148:<path> | grep -c`)
- **Test count after feature**: `trainingDisplay.test.js` 25, `Trainings.test.jsx` 87
- **Delta**: +11 (`trainingDisplay.test.js`), +21 (`Trainings.test.jsx`) — no deletions, no weakened assertions found
- **Skipped tests**: none
- **Failures**: none

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| TLAY-01 | Pending | ✅ Verified |
| TLAY-02 | Pending | ✅ Verified |
| TLAY-03 | Pending | ✅ Verified |
| TLAY-04 | Pending | ✅ Verified |
| TLAY-05 | Pending | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 14/14 criteria matched spec-defined outcomes (0 spec-precision gaps; TLAY-03.2's visual-stacking outcome is explicitly scoped by the Test Coverage Matrix to class-presence assertion + manual check, not a gap)

**Sensor**: 3/3 mutations killed

**Gate**: 841 passed, 0 failed

**What works**: All three tasks are complete and match the spec. `splitTrainings` correctly orders both buckets, injects `now`, and sends invalid dates to the end of `past` without disturbing valid ordering. The page no longer has `h-screen` or per-list `overflow-y-auto`; every loaded training renders; section headings carry accurate, live-updating counts. The team filter column is a fixed `md:w-56` sidebar that stacks above content below the `md` breakpoint, and the `flex-1`/`flex-3` conflict is gone with an automated regression guard (`Trainings.test.jsx:1546-1560`) asserting no element ever carries both classes again.

**Issues found**: None requiring a fix task. One disclosure only: the "one vertical scrollbar at 1280×800 and 480×800" claim in commit 97b09cb is self-reported, not independently re-verified by this verifier (browser re-run is outside this verifier's tooling) — flagged for visibility, not as a gap, since the spec's own Test Coverage Matrix designates this a manual-check item.

**Next steps**: None required. Feature ready to merge.
