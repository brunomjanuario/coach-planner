# CSS Foundation Reset Validation

**Date**: 2026-08-10
**Spec**: `.specs/features/33-css-foundation-reset/spec.md`
**Diff range**: `main..HEAD` (9 commits: `10be5bc` spec/design/tasks docs, `b643e6f` T1, `a165d6b` T2, `35e2164` T3, `da0d100` T3 addendum note, `08153cc` T4, `165a0e5` T4 addendum note, `4121e88` T5, `d424c48` T6)
**Verifier**: independent sub-agent (author ≠ verifier)
**Verification method**: source diff review + Vitest gate + live browser measurement (dev server on `http://localhost:5173`, authenticated via `localStorage` mock user) using a canvas-based `fillStyle` → `getImageData` color normalizer (validated against `white`/`black` = exactly 21:1 before trusting it on real elements — handles Chrome's `oklch(...)` serialization of Tailwind v4 colors correctly, unlike a naive regex parser)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `src/index.css` scaffold removed; `App.jsx` root gains `bg-neutral-950 text-gray-100` |
| T2   | ✅ Done | `a:hover` replaced with `hover:bg-lightgrey rounded-xl` on all 6 `Sidebar` links |
| T3   | ✅ Done | Tile family gets `bg-lightblack`/`hover:bg-hover`/`text-gray-400`; addendum `text-blue-600`→`text-blue-400` in `StatTile.jsx`/`ListTile.jsx` also applied |
| T4   | ✅ Done | `SquadRanking.jsx`/`Settings.jsx`/`PlayerRatingHistory.jsx` text bumped; addendum delete-icon color in `PlayerRatingHistory.jsx:102` also applied |
| T5   | ✅ Done | `src/lib/__tests__/cssFoundation.test.js` added, 7 tests |
| T6   | ✅ Done | `docs/09-styling.md` and `.specs/STATE.md` AD-017 both rewritten and accurate against what shipped |

---

## Spec-Anchored Acceptance Criteria

### P1: The rendered app matches its Tailwind classes

| Criterion | Spec-defined outcome | `file:line` + assertion | Browser confirmation | Result |
| --- | --- | --- | --- | --- |
| P1.1 h1 font-size matches utility | Settings' `text-xl`/`text-lg` computes to its real px value, not `51.2px` | No test asserts this (Tasks.md T1 marks it browser-only, "Tests: none") | Independently measured live: Settings `<h1>` → `getComputedStyle(...).fontSize === "20px"`; Games `<h1 className="text-lg">` → `"18px"`. Neither is `51.2px`. | ✅ PASS (browser-only evidence, as designed) |
| P1.2 button with no `bg-*` doesn't render `rgb(26,26,26)` | Tabs.jsx inactive tab background is not the scaffold dark box | No dedicated Vitest assertion of computed background (jsdom can't see it); `Tabs.test.jsx` (pre-existing, feature 31) asserts class strings only | Independently measured live: Settings' "Advanced" (inactive) tab → `getComputedStyle(...).backgroundColor === "rgba(0, 0, 0, 0)"`. Not `rgb(26, 26, 26)`. | ✅ PASS |
| P1.3 app background is an explicit utility, computes to the chosen dark value | `rgb(10, 10, 10)` (`neutral-950`), not `rgb(128,128,128)` | `src/App.jsx:29` — `className` includes `bg-neutral-950 text-gray-100` (class-string only, no jsdom computed-style test exists) | Independently measured live on `/settings` and `/`: root wrapper `backgroundColor` → `oklch(0.145 0 0)` → canvas-normalized RGB `[10,10,10]`. Confirmed on two routes as required. | ✅ PASS |
| P1.4 Tabs.jsx inactive tab matches AC TABUI-01.3 | Transparent/track-colored, not the removed dark box | No new test added (feature 31's existing `Tabs.test.jsx` unchanged, correctly — no code change was needed) | Same live measurement as P1.2 — `rgba(0,0,0,0)`, confirmed transparent. | ✅ PASS |

### P2: Every text/background pairing clears WCAG AA

| Criterion | Spec-defined outcome | `file:line` + assertion | Browser confirmation | Result |
| --- | --- | --- | --- | --- |
| P2.1 every measured pairing ≥ 4.5:1 | AA floor | No Vitest contrast test exists (jsdom cannot compute real cascade colors) — design.md explicitly scopes this to browser verification | Independently re-measured every pairing named in design.md's Tech Decisions with the validated canvas-based calculator (not a naive regex/oklch parser): app-root text/bg **17.99:1**; `TeamCard` title (inherited color, zero explicit class) on `bg-lightblack` **16.29:1** — this exactly reproduces the number design.md cites as the *corrected* value after catching the implementer's own broken first attempt (2.20:1); Tile label `text-gray-400` on `bg-lightblack` **6.89:1**; `ListTile` empty-state `text-blue-400` link **6.79:1**; Settings Advanced `text-gray-400` paragraph **7.61:1**; `SquadRanking` empty message **7.61:1**; `PlayerRatingHistory` empty message **6.89:1**; `NextGameCard` "NEXT GAME" label **6.89:1**. All ≥ 4.5:1, all within or above the ranges design.md claims (7.06–7.80:1 for gray-400, 6.80–7.79:1 for blue-400). No contradiction found between my independent numbers and the commit-message/design-doc numbers. | ✅ PASS |
| P2.2 `TeamCard`/`PlayerCard`/`SelectableListItem`/`GameRow` carry explicit text-color OR safely inherit | Design.md claims zero explicit text-color exists on these four, relying on inheritance | Confirmed via `grep -n "text-" src/components/TeamCard.jsx src/components/PlayerCard.jsx` etc. — no `text-*` color utility present, matching design.md's "confirmed NOT modified" claim | Live: `TeamCard`'s player-count/title text renders legibly (white-ish on `#171717`), confirmed 16.29:1 above. | ✅ PASS |
| P2.3 light-mode media query path fully removed | Zero `prefers-color-scheme` blocks remain | `src/index.css` (full file read) — no `@media` block present at all | N/A (absence confirmed by direct file read) | ✅ PASS |

### P3: The bug class cannot silently reappear

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| P3.1 unlayered selector fails the guard, naming it | Guard fails and names e.g. `h1` | `src/lib/__tests__/cssFoundation.test.js:75-85` — `expect(offenders).toContain("h1")` (and separate cases for `button`, `a:hover`) | ✅ PASS |
| P3.2 properly `@layer`-scoped selectors pass | Guard tolerates the layered form | `src/lib/__tests__/cssFoundation.test.js:111-123` — `expect(offenders).toEqual([])` against a `@layer base {...}` fixture | ✅ PASS |

**Status**: ✅ All ACs covered. Every appearance-related AC has both a code citation (or an explicit "no test — design says browser-only" citation, itself spec-compliant per the Test Coverage Matrix's stated structural exception) and an independent live re-measurement. No spec-precision gaps — spec.md's contrast/color values are all concrete numbers, not vague language.

---

## Discrimination Sensor

Ran in the real working tree with `cp`/`sed` + manual restore (no worktree needed — each mutation was a single file, restored immediately after its test run; `git status` confirmed clean before and after).

| # | File:line | Description | Killed? |
| - | --- | --- | --- |
| 1 | `src/components/SquadRanking.jsx:85` | Reverted `text-gray-400` → `text-gray-500` | ✅ Killed — `SquadRanking.test.jsx:281` failed with a precise diff (`expected 'text-sm text-gray-500' to contain 'text-gray-400'`) |
| 2 | `src/lib/__tests__/cssFoundation.test.js:44` | Changed the `@layer` fast-path regex from `/^@(layer\|media\|theme)\b/` to `/^@(mediaXXX\|theme)\b/`, i.e. broke `@layer` detection specifically | ❌ **Survived** — all 7 tests in the file still passed. Root cause: the fast-path `if` branch is functionally redundant for this parser's actual test fixtures. Every code path — whether or not the header matches the `@`-rule fast path — falls through to the same `skipBlock()` call, and a header like `"@layer base"` never matches the bare-element-selector offender regex anyway (it contains a space), so it's never misclassified as an offender either way. The `@layer`/`@media`/`@theme` fast-path exists in the source but nothing in the current test suite actually depends on it doing anything. This is a genuine test-suite blind spot in the regression guard's own test suite — see Gaps below. |
| 3 | `src/App.jsx:29` | Removed `bg-neutral-950`, leaving only `text-gray-100` | ❌ Survived, but **documented and accepted**, not a silent gap — design.md's Error Handling Strategy table and the Test Coverage Matrix's structural exception explicitly state jsdom cannot see this, and no test exists to catch it. Confirmed: full suite (1421 tests) still 100% green with the background color missing entirely. This is exactly the residual risk the design doc calls out ("Possible future illegible text; same risk class as today, just narrower after this fix"). |

**Sensor depth**: lightweight (3 targeted mutations, default tier)
**Result**: 1/3 killed outright; 1/3 accepted-and-documented gap (by design); 1/3 genuine undocumented gap in the guard test's own coverage (see Gaps).

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — every diff is a class-string swap or a deletion; no new abstractions |
| Surgical changes | ✅ — each task touches exactly the files design.md scoped it to |
| No scope creep | ✅ — `TeamFilterBar.jsx`, popup components, `Calendar`/`SignIn`/`SignUp` all correctly left untouched per design.md's explicit out-of-scope list (spot-checked: none of these files appear in the diff) |
| Matches patterns | ✅ — reuses existing `--color-lightblack`/`--color-hover`/`--color-lightgrey` tokens rather than inventing new ones |
| Spec-anchored outcome check (asserted values match spec) | ✅ — see AC table above |
| Per-layer Coverage Expectation met | ⚠️ — see Gaps: `StatTile.jsx`, `ListTile.jsx`, `NextGameCard.jsx` changed class strings (including the T3 addendum's `text-blue-400` fix) have **zero** Vitest assertions; only `Tile.jsx`'s two hover-class lines were updated in `Tile.test.jsx`. The Test Coverage Matrix states "Every changed class string asserted" as a blanket commitment for the Components layer — this is not fully true in practice, though the underlying visual claims were independently browser-verified above |
| Every test in scope maps to a spec AC / edge case | ✅ — no unclaimed tests found; each modified assertion (`Sidebar`, `Tile`, `SquadRanking`, `PlayerRatingHistory`) traces to a task's "Done when" item |
| Documented guidelines followed | ✅ — `CLAUDE.md`'s Tailwind-utility convention followed throughout; no inline `style` added to any of the touched files |

---

## Edge Cases

- [x] Components with their own explicit background/text (popups, `Sidebar`) unaffected — confirmed no popup component appears in the diff
- [x] `Calendar.jsx`/`SignIn.jsx`/`SignUp.jsx` unaffected — confirmed not in the diff
- [x] Popup `bg-white` surfaces unchanged inside the new dark app background — not modified, and their mount points (per design.md's grep) confirmed outside the scope of this diff
- [x] `@layer`-scoped selectors still pass the guard — `cssFoundation.test.js:111-123` covers this directly, and I independently confirmed the test still passes against the real post-change `index.css`

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: lint clean (0 errors/warnings); build succeeded (`dist/` produced, 6078 modules); **1421 passed, 0 failed, 0 skipped** (68 test files)
- **Test count before feature** (measured via `git worktree add /tmp/scratch-baseline main` + `npm install` + `npm test`, then removed): **1413 passed** (67 test files)
- **Test count after feature**: **1421 passed** (68 test files)
- **Delta**: +8 tests, +1 file — exactly accounted for: `cssFoundation.test.js` (7 new tests) + `Sidebar.test.jsx` (1 new test). No test was deleted or weakened; the 4 existing assertions that changed (`Tile.test.jsx` ×2, `SquadRanking.test.jsx` ×1, `PlayerRatingHistory.test.jsx` ×1) are documented, deliberate value swaps (old class → new class), not weakenings — same specificity, different target string.
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans (if issues found)

No FAIL-triggering issues. Two non-blocking gaps recorded below for awareness; neither invalidates a shipped AC (both are coverage/discipline gaps, not functional defects — every affected visual claim was independently confirmed correct in the browser).

### Gap 1: The guard test's own `@layer`/`@media`/`@theme` fast-path is untested as a unit

- **Root cause**: `cssFoundation.test.js`'s block-skip logic (`skipBlock()`) runs unconditionally after every top-level header is parsed, regardless of whether the header matched the `@(layer|media|theme)` fast path. For the test fixtures currently in the file, a mis-specified or entirely deleted fast-path condition produces identical pass/fail results, because no fixture's header both (a) needs the fast path to avoid being falsely flagged as an offender and (b) has a header that would otherwise match the offender regex. `@layer base` and `@media (...)` headers never match `/^[a-zA-Z][a-zA-Z0-9]*$/` (they contain spaces/parens), so they're never misclassified either way.
- **Suggested fix task**: Add a test fixture where this distinction actually matters — e.g. a bare `@layer;` forward-declaration line with no body, or confirm whether one is realistically possible in Tailwind v4 CSS at all; if not achievable, this may simply be dead code worth removing rather than a real coverage gap — flag for a human decision rather than guessing at a fix.
- **Priority**: Minor (the real-file check — the actual regression guard that matters — still works correctly; this is a weakness in the guard's own self-test, not in the guard itself)

### Gap 2: T3's `StatTile.jsx`/`ListTile.jsx`/`NextGameCard.jsx` changes (including the found-during-implementation `text-blue-600`→`text-blue-400` fix) have no Vitest coverage

- **Root cause**: Tasks.md's T3 "Where" list scoped test modification to `src/components/__tests__/Tile.test.jsx` only, even though `StatTile.jsx`, `ListTile.jsx`, and `NextGameCard.jsx` all changed class strings in the same task. Confirmed via `git diff --stat` and grep: no `StatTile.test.jsx`, `ListTile.test.jsx`, or `NextGameCard.test.jsx` assertion exists for `text-blue-400`, `text-gray-400`, `bg-lightblack`, or `hover:bg-hover` in these three files — neither before nor after this feature (checked against `main`'s versions of these test files: they never asserted a color class here).
- **Independently confirmed correct anyway**: I re-measured all of these live in the browser (contrast values in the P2 table above: `ListTile` blue link 6.79:1, `NextGameCard` label/bg 6.89:1/`bg-lightblack` confirmed) — the fixes are real, correctly scoped, and correctly applied. This is a documentation/test-discipline gap, not a functional defect.
- **Suggested fix task**: Add class-string assertions to `StatTile.test.jsx`, `ListTile.test.jsx`, `NextGameCard.test.jsx` mirroring what `Tile.test.jsx` already got, so a future accidental revert of these specific lines is caught by `npm test` rather than requiring a human to notice in the browser.
- **Priority**: Minor (same reasoning as Gap 1 — the visual claim is true and verified, the automated safety net just doesn't reach every file it should)

Neither gap blocks this feature; both are logged for a follow-up task, not a re-verify cycle.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| CSSF-01 | Implementing (pending Verifier) | ✅ Verified |
| CSSF-02 | Implementing (pending Verifier) | ✅ Verified |
| CSSF-03 | Implementing (pending Verifier) | ✅ Verified |

(spec.md's own traceability table already read "Verified (pending independent Verifier pass)" — that parenthetical should now be dropped in spec.md by whoever closes this feature out, since the pending pass is this one.)

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 9/9 P1–P3 ACs matched their spec-defined outcome, no spec-precision gaps
**Sensor**: 1/3 mutations killed outright, 1/3 survived-but-accepted-by-design (documented residual risk), 1/3 survived-and-newly-flagged (guard's own self-test blind spot, Gap 1)
**Gate**: 1421 passed, 0 failed, 0 skipped (+8 vs. the 1413-test main baseline)

**What works**: The three cascade defects (unlayered `h1`, same-layer-later `button`, unlayered `:root` color/background) are gone from `src/index.css`, confirmed by direct file read. Every quantitative claim in the commits and design.md — h1 font-size, inactive-tab background, app-root background/contrast, and every gray-400/blue-400 pairing — was independently re-measured live in the browser using a canvas-based color normalizer (validated against a known white/black=21:1 pairing first) and **matches** the numbers already claimed, including the specific `TeamCard`-title-on-`bg-lightblack` 16.29:1 figure the design doc calls out as the corrected value after an earlier broken oklch-regex attempt computed 2.20:1. Docs (`docs/09-styling.md`, `.specs/STATE.md` AD-017) accurately describe what shipped, not what was planned. Build gate is clean; test count only grew, no regressions, no weakened assertions.

**Issues found**: Two Minor, non-blocking test-coverage gaps (see Fix Plans) — neither reflects a wrong pixel, both reflect the automated suite reaching less of the diff than the Test Coverage Matrix's "every changed class string asserted" language implies. Both fixes are real, correctly scoped, and correctly applied per live browser verification; they are simply undertested by Vitest, which was expected for the appearance-only ACs (per the matrix's own stated structural exception) but not fully expected for the plain class-string ones.

**Next steps**: Optional follow-up task to add the missing `StatTile`/`ListTile`/`NextGameCard` class-string assertions (Gap 2) and to either strengthen or knowingly accept the guard's own fast-path blind spot (Gap 1). Neither blocks merge.

---

## Follow-up (implementer, not the Verifier — added after the pass above)

Both gaps were fixed in commit `05918c2`, not deferred:

**Gap 1** — turned out to be a real correctness bug in the guard's parser, not just an undertested branch. `@media` was in the same "fully trusted, skip without inspecting" fast-path as `@layer`/`@theme`, but `@media` grants no cascade-layer immunity — an unlayered selector nested inside `@media {...}` still beats every Tailwind utility exactly as if unwrapped. The original scaffold bug's actual shape (`:root`/`a:hover`/`@layer base {...}` all nested inside one `@media (prefers-color-scheme: light) {...}` block) is exactly the case a flat "any @-rule is safe" fast-path would miss. Rewrote the parser to recurse into any at-rule other than `@layer`/`@theme` instead of skipping it wholesale. Verified by reproducing the Verifier's exact mutation (narrowing the protected regex to `/^@(theme)\b/`) against the fixed parser and confirming it's now caught (2 tests fail, naming the leaked selectors), then reverted.

**Gap 2** — added the missing class-string assertions to `NextGameCard.test.jsx`, `StatTile.test.jsx` and `ListTile.test.jsx` for every changed class (`bg-lightblack`, `hover:bg-hover`, `text-gray-400`, `text-blue-400`, each paired with a `not.toMatch` on the old value).

Full suite re-run after both fixes: 1430 passed, 0 failed (+9 vs. this validation's own 1421 baseline — 2 new `cssFoundation` tests, 7 new class-string assertions across the three Tile-family test files). Lint and build clean.

`spec.md`'s Requirement Traceability had its "(pending independent Verifier pass)" parenthetical removed per this report's note, now that the pass is in.

This section is written by the implementer for transparency, not a second independent verification pass — the sensor result and PASS verdict above remain the Verifier's own, unedited.
