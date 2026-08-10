# Settings Tabs Polish Validation

**Date**: 2026-08-10
**Spec**: `.specs/features/31-settings-tabs-polish/spec.md`
**Diff range**: `main..HEAD` (`7afc558`, `bd78e02`, `6e761de`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `src/components/Tabs.jsx` restyled to a segmented control; `src/components/__tests__/Tabs.test.jsx` extended |
| T2   | ✅ Done | All `23`'s ARIA/keyboard ACs re-asserted against the restyled component in the same test file |
| T3   | ✅ Done | `src/pages/Settings.jsx` untouched (confirmed not needed); `src/pages/__tests__/Settings.test.jsx` gained a `vi.mock` spy-wrap of `Tabs` and 2 new tests |

---

## Spec-Anchored Acceptance Criteria

### P1: The selected tab looks selected (TABUI-01)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| WHEN the tab strip renders THEN it SHALL render as a segmented track with background+radius, and SHALL NOT rely on a border-bottom hairline (TABUI-01.1) | tablist has `bg-gray-100`/`rounded-lg`; no tab has `border-b-2` | `src/components/__tests__/Tabs.test.jsx:137-146` — `expect(tablist.className).toMatch(/bg-gray-100/)`, `.toMatch(/rounded-lg/)`, each tab `.not.toMatch(/border-b-2/)` | ✅ PASS |
| WHEN a tab is active THEN it SHALL carry a filled-pill class set distinct from inactive (TABUI-01.2) | active tab has `bg-white`+`shadow-sm`; inactive does not | `Tabs.test.jsx:148-157` — `expect(activeTab.className).toMatch(/bg-white/)`, `.toMatch(/shadow-sm/)`, inactive `.not.toMatch(...)` both | ✅ PASS |
| WHEN a tab is inactive THEN it SHALL carry no filled-pill background and SHALL show a hover state (TABUI-01.3) | inactive tab lacks `bg-white`; carries `hover:` class | `Tabs.test.jsx:148-157` (absence) + `Tabs.test.jsx:198-204` — `expect(...).toMatch(/hover:/)` | ✅ PASS |
| WHEN the active tab changes THEN both tabs SHALL keep the same font weight (TABUI-01.4) | neither state carries `font-semibold` | `Tabs.test.jsx:181-187` — `expect(tab.className).not.toMatch(/font-semibold/)` for every tab | ✅ PASS |
| WHEN a tab has keyboard focus THEN a focus ring SHALL be present on both active and inactive (TABUI-01.5) | both carry `focus:outline` class | `Tabs.test.jsx:189-196` — `expect(activeTab.className).toMatch(/focus:outline/)`, same for inactive | ✅ PASS |
| Switching swaps the class sets (Independent Test in spec) | active/inactive pill classes swap after a rerender with a new `active` prop | `Tabs.test.jsx:159-179` — one render, rerender with `active="advanced"`, re-checks both tabs each time | ✅ PASS |

**Status**: ✅ All P1 ACs covered

### P2: Nothing from `23` regresses (TABUI-02)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| `role="tablist"`, one `role="tab"` per entry, exactly one `tabpanel` (TABUI-02.1) | tablist present, 2 tabs, 1 panel | `Tabs.test.jsx:16-21` and `:49-53` | ✅ PASS |
| Active alone `aria-selected="true"`, inactive explicitly `"false"` (TABUI-02.2) | exact string values, not absence | `Tabs.test.jsx:23-34`, `:36-47` | ✅ PASS |
| Left/Right move focus and wrap both ends (TABUI-02.3) | focus moves to neighbour tab; wraps at both ends | `Tabs.test.jsx:93-101` (Right), `:103-111` (Right wrap), `:113-121` (Left wrap) | ✅ PASS |
| Inactive tabs carry `tabIndex={-1}` (TABUI-02.4) | active `tabIndex="0"`, inactive `"-1"` | `Tabs.test.jsx:206-217` | ✅ PASS |
| Clicking calls `onChange` with the id; component holds no state (TABUI-02.5) | `onChange` called with `"advanced"`; after click, prop-driven `active` still shows Profile selected (parent didn't re-render since it's a plain mock) | `Tabs.test.jsx:71-79` (call arg) + `:81-91` (no self-managed state) | ✅ PASS |

**Status**: ✅ All P2 ACs covered

### P3: The `?tab=` guard is independently proven (TABUI-03)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| Removing `TAB_IDS.includes` guard makes ≥1 test fail, proven by performing the mutation (TABUI-03.1) | mutation → red; independently re-performed by the Verifier | `src/pages/__tests__/Settings.test.jsx:269-281` — asserts `Tabs.mock.calls[...][0].active === "profile"` for bogus and missing `?tab=`. **Verifier re-ran the exact mutation** (`const activeTab = tabParam;` in `src/pages/Settings.jsx:206`) in a scratch state: exactly these 2 tests failed (`bogus`→received `"bogus"`, missing→received `null`), all 34 other Settings tests stayed green including the old `:248-258` fallback test. Mutation reverted, `git status` clean. | ✅ PASS |
| Unrecognised `?tab=` still renders Profile (TABUI-03.2) | Profile tab `aria-selected="true"`, reset button absent | `Settings.test.jsx:248-258` | ✅ PASS |

**Status**: ✅ All P3 ACs covered — **13/13 spec-anchored ACs matched, 0 spec-precision gaps**

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ------------ | ------- |
| 1 | `src/components/Tabs.jsx:50-52` | Swapped active/inactive pill class sets (`bg-white text-gray-900 shadow-sm` ↔ `text-gray-700 hover:bg-gray-200`) | ✅ Killed — 3 tests failed |
| 2 | `src/components/Tabs.jsx:23` | Flipped arrow-key delta (`ArrowRight` ⇄ `ArrowLeft` direction) | ❌ **Survived** — all 22 tests passed |
| 3 | `src/components/Tabs.jsx:46` | Removed `tabIndex={-1}` on inactive tabs (`tabIndex={0}` unconditionally) | ✅ Killed — 1 test failed |
| 4 (Settings, per spec's own T3 protocol) | `src/pages/Settings.jsx:206` | Removed `TAB_IDS.includes` allow-list guard | ✅ Killed — 2 tests failed |

**Sensor depth**: lightweight (default tier)
**Result**: 3/4 killed — mutation 2 survived

**Root cause of the survivor**: the test fixture (`TABS`) used throughout `Tabs.test.jsx` has exactly 2 tabs. With `tabs.length === 2`, `(currentIndex + delta + 2) % 2` yields the same result whether `delta` is `+1` or `-1` — moving to "the other tab" is direction-independent when there are only two of them. The existing wrap tests (`ArrowRight wraps from the last to the first`, `ArrowLeft wraps from the first to the last`) each test only one direction from one starting position, and neither can distinguish "correct direction" from "always go to the other tab." This is a genuine test-suite weakness, not a functional defect — the shipped code moves in the correct direction — but the P2 AC "WHEN Left or Right is pressed THEN focus SHALL move between tabs and **wrap at both ends**" is not fully direction-discriminating with only 2 fixture tabs. A 3-tab fixture (e.g. adding a `ArrowRight` then `ArrowRight` from `advanced` lands on the third tab, not back on `profile`) would kill this mutant.

---

## Code Quality

| Principle        | Status |
| ---------------- | ------ |
| Minimum code     | ✅ — Tabs.jsx diff is class-string-only plus a doc comment; no new abstractions |
| Surgical changes | ✅ — 4 files touched, all in scope (`Tabs.jsx`, `Tabs.test.jsx`, `Settings.test.jsx`, `STATE.md`); `Settings.jsx` correctly left untouched per T3's "modify only if needed" |
| No scope creep   | ✅ — no new settings content, no generic tab-system rework, no dark mode |
| Matches patterns | ✅ — Tailwind utility classes, `*Popup`/component conventions unaffected; doc comment style consistent with rest of repo |
| Spec-anchored outcome check (asserted values match spec) | ✅ — see table above, 13/13 |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ — component layer has 1:1 AC-to-test mapping; Settings integration layer covers happy (recognised tab), edge (missing/bogus tab), and the allow-list-removal proof |
| Every test maps to a spec requirement — no unclaimed tests | ✅ — all new/modified tests cite an AC in their name or are the edge cases listed in spec.md |
| Documented guidelines followed | `docs/README.md`/`CLAUDE.md` conventions (Tailwind-first styling, `*Popup`/`*Card` naming N/A here) — followed; no dedicated testing-style doc beyond the Test Coverage Matrix in tasks.md, which was followed |

---

## Edge Cases

- [x] Single tab renders active and survives an arrow press — `Tabs.test.jsx:219-235`
- [x] Long label does not truncate; strip keeps `overflow-x-auto` — `Tabs.test.jsx:237-254`
- [ ] ⚠️ Popup width (`30`'s reference-list manager consumes `Tabs`) — no dedicated test asserting the strip stays within a popup's width; relies on `Tabs.jsx` being unchanged in this respect (no fixed widths added) rather than an explicit regression test. Low risk (class-only diff, no width/positioning classes touched) but not independently proven.
- [x] Narrow viewport reachability — covered by the same `overflow-x-auto` class assertion (jsdom cannot simulate real viewport width; spec's Test Coverage Matrix explicitly accepts class-level assertions for this reason)

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: lint clean (0 errors/warnings), build succeeded, **1411 passed, 0 failed, 0 skipped** (67 test files)
- **Test count before feature** (main, worktree at `4700aa5`): **1400 passed**
- **Test count after feature**: **1411 passed**
- **Delta**: +11 new tests
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans (if issues found)

### Fix 1: Arrow-key direction mutant survives with the 2-tab fixture

- **Root cause**: `Tabs.test.jsx`'s shared `TABS` fixture has exactly 2 entries, so `ArrowRight`/`ArrowLeft` are mathematically indistinguishable (`+1 mod 2 == -1 mod 2`) — the existing wrap tests each check only single-direction movement from one starting tab, not that Right specifically goes forward and Left specifically goes backward.
- **Fix task**: Add one test using a 3-tab fixture that presses `ArrowRight` twice from the first tab and asserts focus lands on the **third** tab (not back on the first), and/or presses `ArrowLeft` once from the first tab and asserts focus lands on the **last** tab specifically (already partially covered, but only for the 2-tab case). A minimal addition: a 3-tab `ControlledTabs`-style render, `ArrowRight` from tab 1 → expect tab 2 focused (not tab 3), directly discriminating forward-vs-backward movement.
- **Priority**: Minor (no functional defect — the shipped keyboard behavior is correct; this only strengthens test discrimination, same category as the `23` gap this feature already closed for `Settings.jsx`)

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | ---------------- | ---------- |
| TABUI-01    | Pending           | ✅ Verified |
| TABUI-02    | Pending           | ⚠️ Verified with a Minor sensor gap (arrow-direction mutant survives with the 2-tab fixture; end-user behavior correct) |
| TABUI-03    | Pending           | ✅ Verified — mutation independently re-performed and confirmed |

---

## Summary

**Overall**: ⚠️ Issues (one Minor, non-blocking test-strength gap; feature is functionally complete and shippable)

**Spec-anchored check**: 13/13 ACs matched spec-defined outcomes, 0 spec-precision gaps
**Sensor**: 3/4 mutations killed (1 survived — arrow-key direction, Minor)
**Gate**: 1411 passed, 0 failed, 0 skipped (lint + build + test all green)

**What works**:
- Segmented-control restyle fully matches spec (background/radius track, filled pill, no font-weight shift, focus ring on both states, hover on inactive) — all class-level assertions verified against actual `Tabs.jsx` source.
- Hand-computed WCAG contrast claims in the doc comment independently recomputed and confirmed accurate (9.37:1 inactive, 17.74:1 active — both clear 4.5:1 AA).
- All of `23`'s ARIA/keyboard contract re-asserted and passing against the restyled component.
- `23`'s carried-forward `SETT-04.3` test-strength gap is genuinely closed: the Verifier independently re-performed the `TAB_IDS` guard-removal mutation and confirmed exactly the 2 new spy-based tests go red while the old fallback test (masked by `Tabs.jsx`'s own rescue) stays green — matching the implementer's claim precisely.
- Diff is surgical: only the 3 in-scope files plus `STATE.md` changed; `Settings.jsx` correctly left untouched.
- STATE.md's carried-forward open item (2) is marked resolved, consistent with the actual test changes.

**Issues found**:
1. Discrimination sensor mutation 2 (arrow-key direction flip) survived due to the 2-tab test fixture being direction-symmetric. Not a functional defect — recommend adding a 3-tab discriminating test (see Fix 1 above) in a follow-up, low-priority task.
2. Edge case "strip renders inside a popup (`30`) without forcing horizontal page scroll" has no dedicated test in this feature's scope — acceptable given the change is class-only and `30` already consumes `Tabs` as-is, but flagged for completeness.

**Next steps**: Both issues are Minor/non-blocking. Recommend a small follow-up task (not required to unblock merge) adding a 3-tab keyboard-direction test to `Tabs.test.jsx`. No re-verify cycle required — this does not constitute a FAIL.

---

## Follow-up (implementer, not the Verifier — added after the pass above)

Issue 1 (arrow-key direction mutant) was fixed in commit `f7d0c9c`: two tests added to `Tabs.test.jsx` using a 3-tab fixture, asserting `ArrowRight` from the first tab lands on the second (not the third) and `ArrowLeft` wraps to the third (not the second). Confirmed by re-flipping the same delta mutation locally (`e.key === "ArrowRight" ? -1 : 1`) — both new tests failed as expected — then reverting. Full gate re-run green at 1413 tests.

Issue 2 (popup-width edge case) is left as noted — no dedicated test added, since `Tabs.jsx`'s change here is class-string-only and `30-game-reference-manager` already exercises `Tabs` unchanged inside a popup.

This section is written by the implementer for transparency, not a second independent verification pass — the sensor result and PASS verdict above remain the Verifier's own, unedited.
