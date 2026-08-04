# Training Card Validation

**Date**: 2026-08-04
**Spec**: `.specs/features/16-training-card/spec.md`
**Diff range**: `ca215185f2b60e5c59ca03a55eddfcef9efa3d47..HEAD` (main..feature/16-training-card, 4 commits)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `src/lib/trainingDisplay.js` adds `formatTrainingDate`/`exerciseSummary`; 14 tests in `src/lib/__tests__/trainingDisplay.test.js` (matrix required 12+) |
| T2   | ✅ Done | `src/components/TrainingCard.jsx` added; 17 tests in `src/components/__tests__/TrainingCard.test.jsx` (matrix required 16+) |
| T3   | ✅ Done | Future/past lists in `src/pages/Trainings.jsx` render `TrainingCard`; supporting tests added/adapted in `src/pages/__tests__/Trainings.test.jsx` |
| T4   | ✅ Done | Unassigned list renders `TrainingCard` + `<select>`; `trainingRowLabel`/local `formatDay` deleted — `grep -r "trainingRowLabel" src` returns nothing |

---

## Spec-Anchored Acceptance Criteria

### P1: A scannable training card

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1. Card shows number, date/time, duration, team | number badge, formatted date, "N min", team name all rendered | `src/components/__tests__/TrainingCard.test.jsx:22-39` — `expect(screen.getByText("Training #3"))`, `.getByText("Tue 5 Jan, 16:00")`, `.getByText("40 min")`, `.getByText("Amadora Sub-11")` | ✅ PASS |
| 2. Card shows exercise count | count present in summary text | `TrainingCard.test.jsx:38` — `expect(screen.getByText("3 exercises · 40 min planned"))`; unit-level `src/lib/__tests__/trainingDisplay.test.js:84-96` | ✅ PASS |
| 3. No exercises → explicit text, not empty slot | text is `"No exercises"`, distinct from `"N exercises · 0 min planned"` | `TrainingCard.test.jsx:41-45` — `expect(screen.getByText("No exercises"))`; `trainingDisplay.test.js:58-64,105-114` (zero-min case asserted distinct via `.not.toBe("No exercises")`) | ✅ PASS |
| 4. Planned ≠ scheduled → show planned total alongside | mismatch → `"... planned of {duration}"`; match → no `"of N"` suffix | `TrainingCard.test.jsx:47-60` (mismatch: `"3 exercises · 40 min planned of 90"`) and `:62-76` (match: `queryByText(/of 40/)` absent) — both directions asserted | ✅ PASS |
| 5. Invalid `day` → "Invalid date", other fields still render | exact string `"Invalid date"`; number/duration/team still present | `TrainingCard.test.jsx:90-97` — asserts `"Invalid date"`, `"Training #3"`, `"90 min"`, `"Amadora Sub-11"` all present; `trainingDisplay.test.js:37-47` (Date object, string, missing day all → `"Invalid date"`) | ✅ PASS |
| 6. No valid team → "Unassigned" | exact string `"Unassigned"` | `TrainingCard.test.jsx:78-82` — `expect(screen.getByText("Unassigned"))` when `teamName: null` | ✅ PASS |
| 7. No number → "—" placeholder | exact string `"Training #—"` | `TrainingCard.test.jsx:84-88` — `expect(screen.getByText("Training #—"))` | ✅ PASS |

### P1: Keyboard and pointer parity

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1. Card is a focusable control | real `<button>`, reachable by Tab | `TrainingCard.test.jsx:99-103` (`tagName === "BUTTON"`), `:137-144` (`user.tab()` → `toHaveFocus()`) | ✅ PASS |
| 2. Enter/Space fires open | `onSelect` called via keyboard, not just click | `TrainingCard.test.jsx:115-124` (Enter), `:126-135` (Space) — both via `user.keyboard`, not `.click()`; integration: `src/pages/__tests__/Trainings.test.jsx:883-896` (Enter opens popup) | ✅ PASS |
| 3. Click opens same popup as today | popup opens for the exact training clicked (by id) | `TrainingCard.test.jsx:105-113` (`onSelect` called once); `Trainings.test.jsx:792-813` and `:826-847` (click resolves to the created training's id in both past and future lists) | ✅ PASS |
| 4. Visible focus indicator | a focus-outline class present | `TrainingCard.test.jsx:146-150` — `className` matches `/focus:outline/` | ✅ PASS |
| 5. Accessible name identifies number, date, team | exact `aria-label` composed of all three | `TrainingCard.test.jsx:152-159` — `getByRole("button", {name: "Training #3, Tue 5 Jan, 16:00, Amadora Sub-11"})`; `Trainings.test.jsx:849-859` (`toHaveAccessibleName(/Training #/)` and `/Amadora Sub-11/`) | ✅ PASS |

### P2: One card everywhere a training is listed

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1. Upcoming list uses `TrainingCard` | rendered items are `<button>`s (card's root element) | `Trainings.test.jsx:735-749` — `within(getFutureList()).getAllByRole("button")` has length 1 after create | ✅ PASS |
| 2. Past list uses `TrainingCard` | same | `Trainings.test.jsx:724-733` — `within(getPastList()).getAllByRole("button")` length 2 | ✅ PASS |
| 3. Unassigned list uses `TrainingCard` + team-assignment control alongside | both a button (card) and a combobox (`<select>`) present per row | `Trainings.test.jsx:509-523` — `within(row).getByRole("button")` and `within(row).getByRole("combobox")` both present | ✅ PASS |
| 4. `trainingRowLabel` helper is gone | `grep trainingRowLabel src` returns nothing | Confirmed via `grep -r "trainingRowLabel" src` → no matches (verifier ran independently) | ✅ PASS |

**Status**: ✅ All ACs covered, no spec-precision gaps.

---

## Edge Cases

| Edge case | `file:line` + assertion | Result |
| --- | --- | --- |
| Null exercise duration → 0, not NaN | `src/lib/__tests__/trainingDisplay.test.js:98-103` — `expect(result.plannedMinutes).toBe(0)` and `.not.toBeNaN()` | ✅ PASS |
| Long team name wraps, not overflows | `TrainingCard.test.jsx:178-185` — team node's `className` contains `"break-words"` | ✅ PASS |
| Past training gets muted treatment, stays readable | `TrainingCard.test.jsx:161-168` — `bg-lightgrey`/`text-gray-300` present, `bg-lightblack` absent (no white-on-light pairing) | ✅ PASS |
| Unassigned list's `<select>` is independently operable and does not trigger the card's click | `Trainings.test.jsx:525-544` — after `selectOptions`, asserts the details popup did NOT open (`queryByRole("button", {name: "Close"})` absent, no `Training #` heading) — asserts absence of the popup, not just that assignment happened, matching T4's "Done when" wording | ✅ PASS |
| Stable React key for the same training across lists/re-renders | `Trainings.test.jsx:247-259` (no key warnings, initial render), `:694-710` (Unassigned bucket), `:861-881` (future/past lists across a team-filter re-render) — all assert `console.error` was never called with `'unique "key" prop'` | ✅ PASS |

---

## Discrimination Sensor

Ran in the real working tree, each mutation applied via `Edit`, tested, then reverted with `git checkout --` (confirmed clean via `git status --porcelain` before and after each). No stash needed since the tree was clean at the start of the session.

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `src/components/TrainingCard.jsx:15` | Changed `mismatch = summary.count > 0 && summary.plannedMinutes !== training.duration` → `mismatch = summary.count > 0` (always shows the "of N" suffix, even on a match) | ✅ Killed — 2/17 tests failed in `TrainingCard.test.jsx` (the "match does not repeat the duration" test) |
| 2 | `src/components/TrainingCard.jsx:19,34` | Changed the card's root element from `<button type="button">` to `<div>` (keyboard handling lost) | ✅ Killed — 9/17 tests failed in `TrainingCard.test.jsx` (button-role queries, Enter/Space keyboard-activation tests, focus tests all failed) |
| 3 | `src/pages/Trainings.jsx:30-33` | `teamNameFor` changed to always `return null` regardless of a valid `teamId` match (bypassing the `team.find` result) | ✅ Killed — 2/66 tests failed in `Trainings.test.jsx` ("a training with a valid teamId resolves to the team's club + name on its card" and "a past card's accessible name identifies it by number, date and team") |

**Sensor depth**: lightweight (3 targeted mutations, default tier)
**Result**: 3/3 killed — PASS ✅

---

## Code Quality

| Principle | Status | Notes |
| --- | --- | --- |
| Minimum code | ✅ | T1/T2 are new, single-purpose modules; T3/T4 are surgical replacements of the existing `<li onClick>` markup with `<TrainingCard>` |
| Surgical changes | ✅ | Only the 4 files named in scope were touched (plus their test files) |
| No scope creep | ✅ | No unrelated refactors; `GameRow.jsx`'s similar `formatDay` comment (unrelated component, out of scope per spec's Out-of-Scope table) was left untouched |
| Matches patterns | ✅ | `TrainingCard` follows the `*Card` naming convention and the `SelectableListItem` focusable-button pattern the spec explicitly calls out to reuse |
| Spec-anchored outcome check (asserted values match spec) | ✅ | See AC table above — every asserted string/class matches the spec's literal wording (e.g., `"No exercises"`, `"Unassigned"`, `"Training #—"`) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ | `trainingDisplay.js` — every branch (valid/invalid date, empty/zero/N exercises, null duration) is unit-tested; `TrainingCard.jsx` — every AC-defined interaction plus empty/invalid states covered; `Trainings.jsx` — all three lists' render, click-to-open, keyboard-open, and non-trigger-on-select paths covered |
| Every test maps to a spec requirement — no unclaimed tests | ✅ | Spot-checked the diff of `Trainings.test.jsx` (see Test-Adaptation Review below); no new test lacks a spec/AC/edge-case tag or an obvious regression-guard purpose |
| Documented guidelines followed | ✅ | `CLAUDE.md` conventions (Tailwind-only styling, `*Card`/`*Popup` naming, pages own data fetching) — all followed |

### Test-Adaptation Review (requested focus)

Diffed `src/pages/__tests__/Trainings.test.jsx` line-by-line against the pre-feature version (`ca21518`):

- **`screen.findByText("Amadora Sub-11")` → `screen.findByRole("button", {name: "Amadora Sub-11"})`** (≈25 call sites): confirmed legitimate. `TrainingCard`'s new `aria-label` is `"Training #N, <date>, Amadora Sub-11"`, a different accessible name than the team selector's exact `"Amadora Sub-11"`, so `getByRole("button", {name: "Amadora Sub-11"})` is required for an exact match and is *more* precise than the old plain-text lookup, not less. No assertion values changed — every site still just waits for the team list to load.
- **`screen.findByText("Unassigned")` → `screen.getByRole("heading", {name: "Unassigned"})`** (≈9 call sites): legitimate. Cards inside the Unassigned bucket can themselves render the literal text `"Unassigned"` (AC TCARD-01.6), so the bare `findByText` became ambiguous once cards render there; scoping to the `<h2>` heading is the only way to keep the original intent ("has the bucket appeared").
- **`user.click(row)` → `user.click(within(row).getByRole("button"))`** (≈11 call sites in click/edit/delete flows): legitimate. The interactive element is now the nested `<button>` inside the `<li>`, not the `<li>` itself (AC TCARD-03 requires a real button). The downstream assertions (popup opens, correct training id, Edit/Delete/Save flows) are byte-for-byte unchanged — only the click target got more specific.
- **TNUM-04.1 rewrite** (`Trainings.test.jsx:712-722`): old test asserted a single-line concatenated regex `/^Training #\d+ · .+ · \d+ min$/` — the exact format TCARD-01/05 explicitly retires per the spec's Problem Statement. New test asserts `/^Training #\d+/` and `/\d+ min/` as two separate `.toMatch()` checks against `row.textContent`, since the card now renders these as separate DOM nodes rather than one concatenated string. This is a direct, spec-mandated consequence of the format change (title renamed to note "superseded by TCARD-01/05's structured card"), not a silent weakening — no precision was lost since the new assertions still pin the exact `"Training #N"` and `"N min"` substrings.

No adaptation found that altered an asserted *value* — only query specificity/target changed, always in the direction of more precision, consistent with the new DOM structure.

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: 48 test files passed, 809 tests passed, 0 failed, 0 skipped. Lint clean. Build succeeded (`vite build`, 5986 modules, no errors).
- **Test count before feature** (per task prompt baseline): `trainingDisplay.test.js` did not exist (0), `TrainingCard.test.jsx` did not exist (0), `Trainings.test.jsx` had 54 tests.
- **Test count after feature**: `trainingDisplay.test.js` = 14, `TrainingCard.test.jsx` = 17, `Trainings.test.jsx` = 66.
- **Delta**: +14, +17, +12 respectively (+43 new/net tests across the three files; no test was deleted without replacement — the one removed TNUM-04.1 assertion was replaced in place by a stricter-scoped equivalent, see Test-Adaptation Review).
- **Skipped tests**: none.
- **Failures**: none.

---

## Fix Plans

None — no gaps found.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| TCARD-01 | Pending | ✅ Verified |
| TCARD-02 | Pending | ✅ Verified |
| TCARD-03 | Pending | ✅ Verified |
| TCARD-04 | Pending | ✅ Verified |
| TCARD-05 | Pending | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 16/16 ACs matched spec outcome (5 TCARD-01 items + 5 TCARD-03/keyboard items... actually 7+5+4 = 16 total AC sub-criteria across TCARD-01, TCARD-03(keyboard story), TCARD-04), 0 spec-precision gaps. All 5 edge cases from spec.md covered.

**Sensor**: 3/3 mutations killed.

**Gate**: 809 passed, 0 failed, 0 skipped.

**What works**: Full card content/formatting (number, date, duration, team, exercise summary, mismatch hint), keyboard+pointer parity with a real `<button>` and visible focus ring, all three lists (future/past/unassigned) now render the single shared `TrainingCard`, and `trainingRowLabel`/local `formatDay` are fully removed. The unassigned list's `<select>` correctly does not trigger the card's own click.

**Issues found**: none.

**Next steps**: none — feature is ready to merge.
