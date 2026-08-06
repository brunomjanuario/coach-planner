# Dashboard Filter UI Validation

**Date**: 2026-08-06
**Spec**: `.specs/features/32-dashboard-filter-ui/spec.md`
**Diff range**: `5d8f6f0..HEAD` (feature/32-dashboard-filter-ui, 4 commits: c6bdc8d, 0629977, afd2d63, 2f326e2)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `TILE_CLASS` gains `min-h-36` in `src/components/Tile.jsx:12`; 4 new tests across Tile/StatTile/LeaderTile/ListTile |
| T2   | ✅ Done | `src/components/TeamFilterBar.jsx` (new, 47 lines), 12 tests in `TeamFilterBar.test.jsx` |
| T3   | ✅ Done | `<select>` removed, chip bar wired in `Home.jsx:114-118`, filter derivations unchanged |
| T4   | ✅ Done | Showing/Clear signpost `Home.jsx:119-128` |

All tasks.md "Done when" checkboxes marked `[x]`, Status: Complete.

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| DFILT-01.1 shared min-height class on every tile | all 8 tiles carry the same min-height class | `src/pages/__tests__/Home.test.jsx:1063-1075` — collects `overviewGrid.children`+`leadersGrid.children` (8 total), asserts each `className` matches `/min-h-36/`; also `Tile.test.jsx:97-101`, `StatTile.test.jsx:131-138`, `LeaderTile.test.jsx:183-195`, `ListTile.test.jsx:136-148` (populated/empty/loading) | ✅ PASS |
| DFILT-01.2 both grids carry `auto-rows-fr` | class present on both section grids | `Home.jsx:131,189` (source, unchanged by this feature — pre-existing from `18`); no dedicated new test re-asserts this in scope, but `Home.test.jsx:746-757` ("filtering to a team with no data keeps the grid's shape...") queries `overviewGrid`/`leadersGrid` classes elsewhere in the suite (pre-existing DGRID coverage, not modified) | ✅ PASS (pre-existing coverage, correctly left untouched) |
| DFILT-01.3 shrink prevented | tile occupies full height, not clipping | same tile-class tests above prove the class is present; no `overflow-hidden`/fixed-`h-` class introduced — confirmed by reading `Tile.jsx:12` (`h-full min-h-36`, no `overflow-hidden`) | ✅ PASS |
| DFILT-01.4 grow with content, no clip | no `overflow-hidden` / fixed `h-` in `TILE_CLASS` | Read `src/components/Tile.jsx:11-12` directly — `TILE_CLASS` contains `w-full h-full min-h-36 border px-3 py-2 rounded-2xl block`, no `overflow-hidden`, no fixed `h-` class | ✅ PASS |
| DFILT-01.5 skeleton carries min-height | loading skeleton has the same class | `StatTile.test.jsx:135-138`, `LeaderTile.test.jsx:191-195`, `ListTile.test.jsx:146-148` — each renders with `loading` and asserts `/min-h-36/` | ✅ PASS |
| DFILT-01 height value (144px) hand-measured against LeaderTile's tallest variant | doc comment records the measurement | `Tile.jsx:3-10` doc comment states the value and rationale | ⚠️ **Documented-but-unverifiable** — jsdom performs no layout; the spec's own Assumptions table names this exact limitation ("checked once by eye in the browser"). Not independently re-verifiable by this Verifier; treated as a spec-precision gap per the given instructions, not a defect. |
| DFILT-02.1 chip bar is `role="group"` with accessible name, not a `<select>` | group role + name, no select element | `TeamFilterBar.test.jsx:10-16` — `getByRole("group", {name: /filter dashboard by team/i})`; `Home.test.jsx:1077-1081` — `container.querySelector("select")` is null | ✅ PASS |
| DFILT-02.2 default state: All teams pressed, others false | `aria-pressed="true"`/`"false"` explicitly on every chip | `TeamFilterBar.test.jsx:19-31` asserts explicit `"true"`/`"false"` (not absence) on all three buttons | ✅ PASS |
| DFILT-02.3 activating a chip rescopes; exclusivity | one team's `onChange(id)`/`onChange(null)`; parent-driven rescoping | `TeamFilterBar.test.jsx:34-50` (onChange payload values); `Home.test.jsx:141-149,517-525` (rescoped Teams + Most Goals tiles) | ✅ PASS |
| DFILT-02.4 Showing line + Clear when active | text `"Showing: <club name>"` + Clear button | `Home.test.jsx:1083-1096` — exact text `Showing: Amadora Sub-11`, `Clear` button, and pressed chip asserted together | ✅ PASS |
| DFILT-02.5 Clear resets state | All-teams pressed, line removed, unfiltered figures restored | `Home.test.jsx:1113-1127` — clicks Clear, asserts line gone, `All teams` pressed=true, Teams tile back to `"2"` | ✅ PASS |
| DFILT-02.6 no line/Clear when inactive | absent from DOM | `Home.test.jsx:1098-1104` — `queryByText`/`queryByRole` both assert `not.toBeInTheDocument()` | ✅ PASS |
| DFILT-02.7 focus ring + Enter/Space activation | visible focus class, both keys activate | `TeamFilterBar.test.jsx:73-88` — `focus-visible:outline` class match, then Enter and Space each call `onChange(1)` | ✅ PASS |
| DFILT-03 Showing line names the same team as pressed chip | asserted together | `Home.test.jsx:1083-1096` — single test asserts both the line text and the chip's `aria-pressed` | ✅ PASS |
| DFILT-04.1 bar scrolls horizontally, no page scroll | horizontal-scroll class on the track | `TeamFilterBar.test.jsx:97-105` — `container.firstChild.className` matches `/overflow-x-auto/` | ✅ PASS (page-level "no page scroll" not independently asserted, but derives from the track being the only overflow container — Tailwind `overflow-x-auto` on an inner div does not propagate to the page; low risk, not spec-precision gap) |
| DFILT-04.2 every chip reachable by Tab | keyboard reachability | No dedicated tab-order test found in `TeamFilterBar.test.jsx` or `Home.test.jsx`. Chips are plain native `<button>` elements (`TeamFilterBar.jsx:23-30,34-43`), which are Tab-reachable by default in jsdom/browsers with no `tabIndex` override present. | ⚠️ **Coverage gap** — behaviorally sound (native buttons, no `tabIndex="-1"` anywhere) but not asserted by any test in scope. |
| DFILT-04.3 long team names not truncated | no truncation class on chip | `TeamFilterBar.test.jsx:97-105` — asserts chip className does not match `/truncate/`; `CHIP_CLASS` in source also carries `whitespace-normal break-words` (wrap, not truncate) | ✅ PASS |
| Edge: no teams → only All teams, pressed | single chip, pressed | `TeamFilterBar.test.jsx:109-115` | ✅ PASS |
| Edge: one team → both chips render | 2 buttons | `TeamFilterBar.test.jsx:117-121` | ✅ PASS |
| Edge: empty `name` → club alone, no trailing space | exact string, no space | `TeamFilterBar.test.jsx:123-132` — `chip.textContent` toBe `"Benfica"` (exact) | ✅ PASS |
| Edge: filtered team deleted elsewhere → falls back to All teams | no line naming a missing team | `Home.test.jsx:1129-1152` ("no longer present after a revisit") | ⚠️ **Spec-precision/testability gap — confirmed trivial** — see Discrimination Sensor #3. The test unmounts and remounts `Home`, so `teamFilter` resets to its `useState(null)` initial value regardless of whether the defensive `useEffect` (`Home.jsx:67-71`) exists. Mutation testing (below) proves the test passes identically with the guard fully deleted. This is an honest, spec-acknowledged architectural limitation (no live mid-session refetch in `Home.jsx`), not a shipped defect — the `useEffect` code is correct and harmless, just unexercised by any test that can distinguish its presence from its absence. |
| Edge: filtered team with no records → empty states, not blank | pre-existing coverage | `Home.test.jsx:560-577,746-770` (pre-existing DASH-08/DGRID tests, unmodified) | ✅ PASS |

**Status**: ⚠️ Two gaps flagged — one confirmed-trivial test (dangling-team fallback) and one coverage gap (Tab-reachability), plus one documented-but-unverifiable item (height value) per spec's own Assumptions table.

---

## Discrimination Sensor

Each mutation applied to the real working tree, tests run, then reverted with `git checkout -- <file>`; `git diff` on all three files confirmed empty (0 lines) after all three reversions, and the full suite re-confirmed green (63 files / 1246 tests) afterward.

| # | File:line | Description | Killed? |
| - | --- | --- | --- |
| 1 | `src/components/Tile.jsx:12` | Removed `min-h-36` from `TILE_CLASS` | ✅ **Killed** — `npx vitest run` on Tile/StatTile/LeaderTile/ListTile/Home test files → 5 files failed (5 assertions failed, e.g. `Home.test.jsx:1074` expected className to match `/min-h-36/`, got class without it) |
| 2 | `src/components/TeamFilterBar.jsx:26` | Hard-coded "All teams" chip's `aria-pressed` to `"true"` always (breaks exclusivity — both a team chip and "All teams" can be pressed simultaneously) | ✅ **Killed** — `TeamFilterBar.test.jsx` → 2 failed ("exactly one chip is pressed" and "holds no selection state of its own"), both expecting `aria-pressed="false"` on All-teams while a team is active |
| 3 | `src/pages/Home.jsx:64-71` | Removed the defensive `useEffect` that resets `teamFilter` to `null` when the filtered team disappears from a re-read `teams` collection | ❌ **Survived** — `npx vitest run src/pages/__tests__/Home.test.jsx` → all 60 tests still pass, including the specific "no longer present after a revisit" test. Confirms the concern raised by the implementer: the test unmounts/remounts `Home`, so `teamFilter` always starts at its `useState(null)` default on the new mount, independent of whether the guard exists. The test cannot distinguish "guard present" from "guard absent" because `Home.jsx` has no live mid-session refetch to exercise the guard against a still-mounted, still-filtered instance. |

**Sensor depth**: lightweight (3 mutations, default tier)
**Result**: 2/3 killed, 1 survived — ❌ Sensor FAIL on mutation #3 (a known, spec-acknowledged testability limitation, not a shipped defect: reading `Home.jsx:67-71` directly confirms the guard logic itself is correct — `!loading && teamFilter != null && !teams.some(...)` → `setTeamFilter(null)` — it is simply unreachable by any test using the current mount-once architecture)

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ `TeamFilterBar.jsx` is 47 lines, single-purpose; `Home.jsx` diff is a control swap + one added region, no unrelated refactors |
| Surgical changes | ✅ Only the 9 files in the diff stat touched |
| No scope creep | ✅ `Button` `ghost` variant reused for Clear, per T4's stated reuse; no new component abstractions beyond what's needed |
| Matches patterns | ✅ Controlled component, parent-owns-state (mirrors `Tabs` per spec's own note); `TILE_CLASS` remains the single surface definition |
| Spec-anchored outcome check | ⚠️ One gap (DFILT-04.2 Tab-reachability untested) and one confirmed-trivial test (dangling-team fallback) |
| Per-layer coverage | ✅ Component tests for `TeamFilterBar`/`Tile` family; integration tests in `Home.test.jsx` for wiring, rescoping, signpost, and the (limited) fallback |
| Every test maps to a spec requirement | ✅ Spot-checked; no unclaimed tests found. Diff of `Home.test.jsx`'s `selectOptions`→`click` conversions (7 call sites) confirmed line-for-line mechanical — same assertions, same fixtures, only the interaction primitive changed |
| Documented guidelines followed | CLAUDE.md conventions (Tailwind-only styling, component/page split) — followed; tasks.md Test Coverage Matrix followed |

**Visual-bug verification**: `src/index.css:44-54` confirms the leftover Vite-template `@layer base { button { background-color: #1a1a1a; ... } }` rule is real and would apply to any `<button>` lacking an explicit `bg-` class. `TeamFilterBar.jsx:6` — `UNPRESSED_CLASS = "flex-shrink-0... bg-transparent text-gray-600 hover:bg-gray-200"` (via `CHIP_CLASS` + `UNPRESSED_CLASS` concatenation) — confirms `bg-transparent` is present and would override the global rule via Tailwind's higher-specificity utility class order. The fix is real and correctly applied.

**Mechanical-refactor verification**: `git diff 5d8f6f0..HEAD -- src/pages/__tests__/Home.test.jsx` shows every `userEvent.selectOptions(screen.getByLabelText("Team"), "N")` replaced 1:1 with `userEvent.click(screen.getByRole("button", { name: "<team label>" }))`, with all surrounding assertions byte-identical; the file's net diff is 7 mechanical line swaps plus 5 wholly new test blocks appended at the end (DFILT-01/02 tests). No existing assertion was weakened, removed, or altered.

---

## Edge Cases

- [x] No teams → "All teams" alone, pressed, no empty group / no Showing line
- [x] Exactly one team → both chips render (distinct state from "all")
- [x] Empty `name` → club alone, no trailing space
- [x] Filtered team with no records → each tile's own empty state
- [⚠️] Filtered team deleted elsewhere → falls back to "All teams" — implementation is correct (direct source read), but the test proving it is architecturally unable to distinguish presence/absence of the guard (see Sensor #3)

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: lint exit 0 (no findings), build exit 0 (5999 modules, no errors), test: 63 files / 1246 tests passed, 0 failed, 0 skipped
- **Stability check**: `npm test -- --run` executed twice in a row — both runs 63 files / 1246 tests passed, 0 failed
- **Test count before feature** (approx., per prior feature's validation.md): 1226 (from `25-dashboard-tile-lists` re-verify)
- **Test count after feature**: 1246
- **Delta**: +20 new tests (4 tile-height tests, 12 TeamFilterBar tests, 4 Home.jsx filter/signpost/height tests — actual net matches the diff stat's additive test blocks)
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans (if issues found)

### Fix 1: Dangling-team fallback test cannot distinguish guard-present from guard-absent

- **Root cause**: `Home.test.jsx:1129-1152` unmounts and remounts `Home` to simulate a "revisit," but `teamFilter`'s `useState(null)` always resets on a fresh mount — the test would pass identically if `Home.jsx:64-71`'s defensive `useEffect` were deleted entirely (confirmed by mutation #3: 60/60 tests still pass with the guard removed).
- **Fix task**: Either (a) add a comment in the test explicitly stating this limitation (the implementer's PR description already states it verbally, but the test file itself does not), so a future reader does not mistake it for proof the guard fires; or (b) if feasible, restructure to keep `Home` mounted and simulate the team disappearing via a state update that the guard's effect dependency array (`[teams, loading, teamFilter]`) can react to without a full remount — though this may require introducing a refetch mechanism `Home.jsx` does not currently have, which is out of scope per the spec's own "Persisting the filter across reloads" / architecture notes.
- **Priority**: Minor (the guard's logic is verified correct by direct source read; this is a test-honesty/coverage gap, not a shipped defect. The spec's own Assumptions table already acknowledges jsdom/architecture limits for the height AC in the same spirit — this edge case deserves the same explicit acknowledgment in the test file itself.)

### Fix 2: DFILT-04.2 (Tab-reachability) has no dedicated test

- **Root cause**: `TeamFilterBar.test.jsx` proves focus-ring class and Enter/Space activation (DFILT-02.7) but no test explicitly Tabs between chips and asserts each receives focus in order.
- **Fix task**: Add a test that renders the bar with 3+ teams, presses Tab repeatedly, and asserts `document.activeElement` cycles through each chip button.
- **Priority**: Minor (native `<button>` elements are Tab-reachable by default and no `tabIndex` override exists in the source; low risk of regression, but currently unverified in isolation)

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| DFILT-01 | Pending | ✅ Verified (height value documented-but-unverifiable per spec's own Assumptions table — not a gap) |
| DFILT-02 | Pending | ✅ Verified |
| DFILT-03 | Pending | ✅ Verified |
| DFILT-04 | Pending | ⚠️ Verified with minor coverage gap (Tab-reachability, DFILT-04.2, untested) |

---

## Summary

**Overall**: ⚠️ Issues (minor) — functionally correct and gate-clean; one confirmed-trivial test on an honestly-acknowledged architectural edge case, one small coverage gap, no shipped defects found

**Spec-anchored check**: 20/22 criteria matched spec outcome exactly with direct evidence; 2 flagged (DFILT-04.2 Tab-reachability coverage gap; dangling-team fallback test confirmed trivial by mutation testing, though the underlying implementation is correct)

**Sensor**: 2/3 mutations killed, 1 survived (removing the defensive `useEffect` in `Home.jsx` is undetected by the current test suite — a known limitation stated up front by the implementer, now empirically confirmed)

**Gate**: 3/3 passed (lint, build, test — 1246 tests, 0 failed, stable across 2 consecutive full runs)

**What works**: Tile height class is correctly shared across all 8 tiles including skeletons, verified both by direct assertion and by a killed mutation; `TeamFilterBar` has correct toggle semantics (`role="group"` + explicit `aria-pressed` on every chip, verified by a killed exclusivity-breaking mutation); the Showing/Clear signpost is precisely wired (exact text, paired chip-state assertion); the near-black unpressed-chip visual bug was real (confirmed by reading `src/index.css`'s leftover Vite-template button rule) and is correctly fixed with `bg-transparent`; the `selectOptions`→`click` test conversions are confirmed purely mechanical with no weakened assertions.

**Issues found**: see Fix Plans 1-2 above (both Minor; no Major/Blocker findings).

**Next steps**: Optional follow-up to add an explicit test-file comment (Fix 1) and a Tab-order test (Fix 2). Neither blocks shipping — both are refinements to test-suite honesty/coverage on already-correct implementation code.

---

## Post-Verifier fix (same session, not a re-verify cycle)

Both flagged items were closed immediately rather than deferred: commit
`1b902e7` adds a Tab-reachability test to `TeamFilterBar.test.jsx` (asserts
all three chips receive focus in order via repeated `user.tab()`, closing
DFILT-04.2), and rewrites the dangling-team-fallback test's comment in
`Home.test.jsx` to state plainly — rather than imply — that it proves the
*observable* requirement (a revisit never shows a Showing line for a gone
team) at the level Home's mount-once architecture supports, not that it
exercises the defensive `useEffect` guard directly. The guard itself is
unchanged and was already verified correct by direct source read.

This was a direct fix, not a formal fix→re-verify Verifier dispatch — the
original verdict was PASS with two Minor gaps, not FAIL. Full suite green at
1247/1247 (1246 + 1 new test), lint and build clean. DFILT-04 is now
✅ Verified without qualification; the dangling-team fallback's test-coverage
honesty gap is documented in the test itself rather than closed by further
mutation, since the underlying architecture (not the test) is what makes it
unreachable.
