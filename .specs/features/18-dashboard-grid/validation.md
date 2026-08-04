# Dashboard Grid Validation

**Date**: 2026-08-04
**Spec**: `.specs/features/18-dashboard-grid/spec.md`
**Diff range**: `7a4a7e5..HEAD` (4 commits: cc11550, acea8dd, 64df081, 9274b22)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `src/components/Tile.jsx` + `src/components/__tests__/Tile.test.jsx` added, 11 tests |
| T2   | ✅ Done | `StatTile.jsx`/`LeaderTile.jsx` render through `Tile`; both local `TILE_CLASS` copies removed |
| T3   | ✅ Done | `Home.jsx` groups tiles into `<section>` blocks with `<h2>` Overview/Leaders headings |
| T4   | ✅ Done | Both sections' grids carry `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 auto-rows-fr gap-4` |

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| DGRID-01.1 tile row full height | row's tiles occupy full row height | `src/pages/__tests__/Home.test.jsx:624-636` — grid className matches `auto-rows-fr` | ✅ PASS |
| DGRID-01.2 short content still fills cell | `h-full` on tile surface | `src/components/__tests__/Tile.test.jsx:22-26` — `parentElement.className` matches `h-full`; also `StatTile.test.jsx:93-97`, `LeaderTile.test.jsx:131-140` | ✅ PASS |
| DGRID-01.3 large width → 4 cols, no empty cell | `lg:grid-cols-4` class, 4 children/section | `Home.test.jsx:634` (`lg:grid-cols-4`) + `Home.test.jsx:638-646` (`children` length 4 each) | ✅ PASS (class-presence proxy per tasks.md matrix note; visual confirmation is the self-reported manual check) |
| DGRID-01.4 medium → 2 cols; small → 1 | `md:grid-cols-2`, `grid-cols-1` | `Home.test.jsx:632-633` | ✅ PASS (class-presence proxy) |
| DGRID-01.5 consistent gap | `gap-10` replaced, gap matches padding | `Home.test.jsx:648-655` — asserts `not.toMatch(/gap-10/)` and `toMatch(/gap-4/)` | ✅ PASS |
| DGRID-02 (columns 1/2/4, no holes) | same as DGRID-01.3/01.4 + DGRID-02.3 | see above + `Home.test.jsx:638-646` | ✅ PASS |
| DGRID-03.1 Overview = Teams/Training/Games/Next Event | exact membership, positive + negative | `Home.test.jsx:95-109` — asserts all 4 present in `overviewGrid`, all 4 Leaders labels absent, `children` length 4 | ✅ PASS |
| DGRID-03.2 Leaders = Most Goals/Games/Cards/Top Rated | exact membership, positive + negative | `Home.test.jsx:111-125` — mirror of above for `leadersGrid` | ✅ PASS |
| DGRID-03.3 heading is a real heading element | `<h2>`/heading role, exactly two | `Home.test.jsx:127-132` (count = 2) and `:148-154` (`tagName` matches `H[1-6]`) | ✅ PASS |
| DGRID-03.4 filter sits above both sections, applies to both | filter precedes sections in DOM order; recomputes both | `Home.test.jsx:156-166` (DOM position) + `:134-146` (recompute in both sections) | ✅ PASS |
| DGRID-04.1 shared surface renders label row + body | single definition | `Tile.test.jsx:15-20`; consumed by `StatTile.test.jsx:93-97`, `LeaderTile.test.jsx:131-140` | ✅ PASS |
| DGRID-04.2 single shared definition | one `Tile` module used by both | `src/components/StatTile.jsx:2`, `src/components/LeaderTile.jsx:1` import `Tile`; no local class strings (see 04.5) | ✅ PASS |
| DGRID-04.3 loading/empty same surface as populated | identical surface class string | `StatTile.test.jsx:99-119` (loading vs populated, empty vs populated — `toBe`); `LeaderTile.test.jsx:142-172` (same pattern) | ✅ PASS — genuine class-string equality, not just text presence |
| DGRID-04.4 interactive focus/hover from shared def | shared classes present on Link/button variants | `Tile.test.jsx:59-73`; `StatTile.test.jsx:121-130` (interactive class `toContain`s plain class) | ✅ PASS |
| DGRID-04.5 `TILE_CLASS` in exactly one module | grep-based, source-reading test | `LeaderTile.test.jsx:174-182` — reads real `StatTile.jsx`/`LeaderTile.jsx`/`Tile.jsx` source via `fs.readFileSync`, asserts absence/presence of `TILE_CLASS\s*=` | ✅ PASS — confirmed non-tautological: manually re-introducing `TILE_CLASS` into `StatTile.jsx` would fail `not.toMatch` (verified by code inspection of the regex and file reads; grep pattern is anchored to an assignment, not just the substring) |
| DGRID-05.1 (loading/empty/populated same height) | see DGRID-04.3 | same as above | ✅ PASS |
| DGRID-05.2 loading holds populated height | `toBe`-equal class strings | `StatTile.test.jsx:99-108`, `LeaderTile.test.jsx:142-156` | ✅ PASS |
| DGRID-05.3 empty holds populated height | `toBe`-equal class strings | `StatTile.test.jsx:110-119`, `LeaderTile.test.jsx:158-172` | ✅ PASS |
| Edge: fresh install, all 8 tiles empty, signposts intact | equal height, links present | `Home.test.jsx:657-680` — 7×"No data yet" + "No upcoming events", both signpost `href`s, 4+4 children | ✅ PASS |
| Edge: uneven leader entry counts still fill row | Both tiles render through the identical Tile surface class | `Home.test.jsx` — "a leader tile with three entries and its neighbour with one both fill the row height via the shared surface" — asserts 3 vs 1 `listitem`s and `toBe`-equal surface className (gap closed in `611b4cf`) | ✅ PASS |
| Edge: long Next Event value wraps, doesn't widen column | `break-words` present on both the value and breakdown lines | `Home.test.jsx` — asserts `break-words` on both the date value (`text-2xl font-semibold break-words`) and the breakdown line (gap closed in `611b4cf`) | ✅ PASS |
| Edge: team filter with no data keeps grid shape | 4+4 children, empty states | `Home.test.jsx:698-719` | ✅ PASS |
| Edge: no layout shift loading→loaded | 4+4 children present while loading, `auto-rows-fr` present | `Home.test.jsx:682-696` | ✅ PASS |

**Status**: ✅ All ACs and edge cases covered (2 gaps closed in fix commit `611b4cf`)

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ------------ | ------- |
| 1 | `src/components/Tile.jsx:23-37` | Flipped href/onClick precedence so `onClick` wins instead of `href` | ✅ Killed — `Tile.test.jsx` "passing both href and onClick is a defined outcome: href wins" failed |
| 2 | `src/pages/Home.jsx:105` | Removed `auto-rows-fr` from the Overview grid's className | ✅ Killed — 2 `Home.test.jsx` tests failed (`auto-rows-fr` assertion, loading-no-reflow test) |
| 3 | `src/pages/Home.jsx:126-141` | Moved the "Next Event" `StatTile` from the Overview section into the Leaders section | ✅ Killed — 6 `Home.test.jsx` tests failed (section-membership, children-count assertions) |

**Sensor depth**: lightweight (3 mutations, default tier)
**Result**: 3/3 killed — PASS ✅

All mutations were injected directly in the real working tree, tested, then reverted with `git checkout -- <file>`; `git status --porcelain` was empty both before and after each mutation and at the end of the sensor pass.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — `Tile.jsx` is a small, focused wrapper; no speculative props beyond `label/note/children/href/onClick` |
| Surgical changes | ✅ — only the 4 in-scope files plus their test files touched |
| No scope creep | ✅ — `LeaderTile` was not given interactivity it doesn't need per spec Goals |
| Matches patterns | ✅ — follows existing `*Card`/component conventions, Tailwind-only styling |
| Spec-anchored outcome check | ✅ — gaps closed in `611b4cf` |
| Per-layer Coverage Expectation met | ✅ — component tests cover loading/empty/populated/interactive variants; integration tests cover section structure, membership, filter behavior |
| Every test maps to a spec requirement | ✅ — spot-checked; no stray/unclaimed tests found |
| Documented guidelines followed | `CLAUDE.md` (Conventions section) — Tailwind-only styling, `*Card`/`*Popup` naming N/A here, components default-exported — all followed |

---

## Edge Cases

- [x] Fresh install / all-empty: all eight tiles render empty states with signposting links intact
- [x] Leader tile with 3 entries vs neighbour with 1 entry still fills row height (gap closed in `611b4cf`)
- [x] Long Next Event value wraps — asserted on both the value and breakdown lines (gap closed in `611b4cf`)
- [x] Team filter selects team with no data: grid keeps shape, empty states shown
- [x] Data loading: grid does not shift layout as tiles resolve

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: lint 0 errors, build succeeded (`dist/` produced), test 872 passed, 0 failed, 0 skipped, in 49 files
- **Test count before feature**: Tile.test.jsx: 0 (new), StatTile.test.jsx: 9, LeaderTile.test.jsx: 10, Home.test.jsx: 26 (45 total in scope)
- **Test count after feature**: Tile.test.jsx: 11, StatTile.test.jsx: 13, LeaderTile.test.jsx: 14, Home.test.jsx: 38 (76 total in scope)
- **Delta**: +31 new tests in scope (+11 Tile, +4 StatTile, +4 LeaderTile, +12 Home); full suite 872 tests, no regressions
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans (if issues found)

### Fix 1: Long Next Event value edge-case test targets the wrong line

- **Root cause**: `Home.test.jsx:721-741` lengthens the opponent/team names (which lengthen the **breakdown** line) rather than lengthening/mocking a scenario where the primary **value** line (`upcoming.date.toLocaleString()`) is long. The test only asserts `break-words` on the breakdown div, leaving `StatTile.jsx:58`'s `break-words` on the value div unexercised by a genuinely long value.
- **Fix task**: Add an assertion in the same test (or a new one) that also checks the value div (`text-2xl font-semibold break-words`, holding the date-time) carries `break-words`, e.g. `within(getTile("Next Event")).getByText(/\d{1,2}\/\d{1,2}\/\d{4}/).className` matches `/break-words/`. This directly exercises the spec's own example ("a locale-formatted date-time").
- **Priority**: Minor — behavior is almost certainly correct (both lines share the class from the same component), but the specific spec-cited scenario is untested.

### Fix 2: No Home-level test pairs uneven leader-tile entry counts

- **Root cause**: The "leader tile shows three entries and its neighbour shows one, both still fill row height" edge case is covered structurally (Tile always applies `h-full`) but not by a Home.jsx test that renders two `LeaderTile`s with differing entry counts side by side and compares their surface class/height.
- **Fix task**: Add a `Home.test.jsx` test mocking data so one leader tile (e.g. Most Goals) has 3 entries and another (e.g. Most Games) has 1, then assert both tiles' surface `className` are equal (mirroring the `toBe`-equality pattern already used for loading/empty/populated).
- **Priority**: Minor — same structural guarantee as Fix 1, just missing a direct assertion at the integration layer.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| DGRID-01 | Pending | ✅ Verified |
| DGRID-02 | Pending | ✅ Verified |
| DGRID-03 | Pending | ✅ Verified |
| DGRID-04 | Pending | ✅ Verified |
| DGRID-05 | Pending | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 22/22 criteria/edge-cases matched spec outcome exactly (2 gaps closed in fix commit `611b4cf`)

**Sensor**: 3/3 mutations killed

**Gate**: 873 passed, 0 failed, 0 skipped (after fix commit)

**What works**: Shared `Tile` surface with a non-tautological grep-based single-declaration test; genuine `toBe`-equality assertions proving loading/empty/populated surfaces are byte-identical; exact section-membership tests with both positive and negative assertions; responsive grid classes and gap change verified; all `11`/DASH regression tests for tile data binding still pass unmodified in behavior; long-value wrapping and uneven-entry-count edge cases now directly asserted.

**Issues found**: none remaining.

**Next steps**: none — feature complete.
