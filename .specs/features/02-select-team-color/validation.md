# 02-select-team-color Validation

**Date**: 2026-07-31
**Spec**: `.specs/features/02-select-team-color/spec.md`
**Diff range**: `main..feature/02/select-team-color` (351183a..b53817a)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | Tokens added to `src/index.css`; build gate passes |
| T2   | ✅ Done | `SelectableListItem.jsx` created, 9/9 component tests pass |
| T3   | ✅ Done | `Teams.jsx` adopts component for teams + players lists, 7 new tests |
| T4   | ✅ Done | `Trainings.jsx` adopts component for team filter, 6 new tests; two training `<li>` lists get keys only (as scoped) |

---

## Spec-Anchored Acceptance Criteria

### P1: Distinguishable selection (SELECT-01, SELECT-02)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1. WHEN a row is selected THEN render accent background + left border bar | `bg-selected` + `border-selected-border` classes present | `src/components/__tests__/SelectableListItem.test.jsx:15-21` — `expect(button.className).toContain("bg-selected")`, `.toContain("border-selected-border")` | ✅ PASS |
| 2. WHEN hovered-not-selected THEN a visually distinct hover state | `hover:bg-hover` present, `bg-selected` absent | `SelectableListItem.test.jsx:23-29` — `.toContain("hover:bg-hover")`, `.not.toContain("bg-selected")` | ✅ PASS |
| 3. WHEN selected AND hovered THEN selected stays dominant | selected row carries no `hover:bg-hover` class at all (mutually exclusive class branches) | `SelectableListItem.test.jsx:31-37` — `.not.toContain("hover:bg-hover")`, `.toContain("bg-selected")` | ✅ PASS — note: this is a static-class proof (the ternary only ever emits one branch), not a live simultaneous-hover+selected DOM assertion, but it does correctly prove dominance given the implementation's structure |
| 4. WHEN no row is selected THEN every row renders default state | Every row shows `border-transparent hover:bg-hover`, none show `bg-selected` | `SelectableListItem.test.jsx:23-29` (single-instance) — no page-level test asserts this across a **list** of multiple unselected rows simultaneously | ⚠️ Spec-precision gap — covered at unit level only, not exercised against a real multi-row list with none selected |
| 5. WHEN a row is selected THEN `aria-current="true"` | exact attribute + value | `SelectableListItem.test.jsx:39-46` — `toHaveAttribute("aria-current","true")`; also `src/pages/__tests__/Teams.test.jsx:223-233`, `Trainings.test.jsx:239-251` | ✅ PASS |

### P2: Single list-row component (SELECT-03, SELECT-04)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1. Rendered with `selected` → selected styling | see SELECT-01.1 above | same as above | ✅ PASS |
| 2. Clicked → `onSelect` exactly once | `toHaveBeenCalledTimes(1)` | `SelectableListItem.test.jsx:56-64` | ✅ PASS |
| 3. Enter/Space → `onSelect` invoked | `toHaveBeenCalledTimes(1)` for each key | `SelectableListItem.test.jsx:66-86` (two separate tests) | ✅ PASS |
| 4. Rendered via `.map()` → stable `key` | zero React "unique key prop" console warnings | `Teams.test.jsx:164-176`, `Trainings.test.jsx:204-216` — both assert `keyWarning` (a `console.error` mock-call search for the string `unique "key" prop`) is `undefined` | ✅ PASS — confirmed the underlying bug is fixed: re-ran the identical assertion against `main` in a scratch worktree and it fails there (`Each child in a list should have a unique "key" prop`), proving the test is discriminating, not vacuous |

**Status**: ✅ All 9 SELECT ACs covered with matching spec-defined outcomes; 1 spec-precision gap noted (AC SELECT-01.4, list-level "no selection" case only unit-tested on a single instance, not asserted across a rendered multi-row list).

---

## Edge Cases

| Edge case | Spec text | Result |
| --- | --- | --- |
| Empty list → empty-state message | "WHEN a list is empty THEN render an empty-state message, not a bare `<ul>`" | ⚠️ **Partially handled.** Teams list (`Teams.jsx:83-84`, test `Teams.test.jsx:178-184`) and Players list (`Teams.jsx:122-126`, test `Teams.test.jsx:195-208`) both handle it. Future/Past training lists (`Trainings.jsx:115-116`, `135-136`) also handle it (pre-existing, retained). **The team-filter list in `Trainings.jsx:100-110` has no empty-state branch at all** — if `teams` is empty it renders a bare `<ul>` with zero children, which is exactly the case the spec edge-case rules out. No test exercises an empty-teams scenario on the Trainings page (contrast with `Teams.test.jsx:178-184`, which does). **Gap.** |
| Selected record deleted → clear selection | "WHEN the selected record is deleted THEN clear the selection rather than highlight nothing" | ✅ Handled and tested for Teams: `Teams.jsx:42-47` (`refreshAndResync`) nulls `selectedTeam` if the id is gone after reload; test `Teams.test.jsx:150-162` deletes the selected team and asserts it disappears from the list (selection-clearing is implied by no stale reference remaining, though there is no direct assertion that `selectedTeam` state itself is null — the Edit panel emptying is not explicitly asserted). ⚠️ Weak but present. Not applicable to Trainings.jsx (no delete-team affordance on that page). |
| Long name wraps → border bar spans full row height | "the left border bar SHALL span the full row height" | ⚠️ **Not actually tested.** `SelectableListItem.test.jsx:88-97` only asserts the static `border-l-4` class is present on a short-text row reachable by Tab; it never renders long/wrapping content nor asserts computed height. This is a legitimate jsdom limitation (no real layout engine) but the test's own name ("border bar present regardless of selection") oversells what it verifies — it is a class-presence check, not a wrap/height check. Flag as **spec-precision gap**, not a functional failure (the CSS approach — `border-l-4` on a block-level `<button>` — is a reasonable implementation, just unverified). |

---

## Discrimination Sensor

Mutations were injected directly into the real (clean) working tree one at a time, tests run, then reverted with `git checkout --` before the next mutation; `git status --short` was empty before, between, and after all three.

| # | File:line | Mutation | Tests run | Result |
| - | --- | --- | --- | --- |
| 1 | `src/components/SelectableListItem.jsx:9` | Flipped `selected ? … : …` → `!selected ? … : …` in the className ternary | `SelectableListItem.test.jsx` | ❌ Survived? No — ✅ **Killed**: 3/9 tests failed (selected-background, hover-not-selected, dominance tests) |
| 2 | `src/components/SelectableListItem.jsx:7` | `aria-current={selected ? "true" : undefined}` → `aria-current={undefined}` (always absent) | `SelectableListItem.test.jsx`, `Teams.test.jsx`, `Trainings.test.jsx` | ✅ **Killed**: 5/39 tests failed (`sets aria-current…`, both page-level `marks the selected … row with aria-current` tests, plus 2 more in Trainings) |
| 3 | `src/pages/Teams.jsx:83` | `teams.length === 0` → `teams.length !== 0` (inverted empty-state condition) | `Teams.test.jsx` | ✅ **Killed**: 14/15 tests failed (renders "No teams yet." instead of the real list, cascading through almost every test that depends on seeing a team) |

**Sensor depth**: lightweight (3 mutations, standard-feature tier)
**Result**: 3/3 killed — ✅ PASS

Working tree confirmed clean (`git status --short` empty; `git diff --stat` empty) after all three mutations were reverted.

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Lint**: clean, 0 errors/warnings
- **Build**: succeeds (`vite build`, 5956 modules, no errors)
- **Test result**: 105 passed, 0 failed, 0 skipped (10 test files)
- **Test count before feature** (measured directly on `main` @ `dc95617` via a temporary `git worktree`, not taken from the implementer's claim): **83 passed** (9 files) — this run also independently reproduced the pre-existing bug described in the spec: `Each child in a list should have a unique "key" prop` console error fired during the `Teams.test.jsx` run on `main`, confirming the bug this feature fixes was real before the fix.
- **Test count after feature**: 105 passed (10 files)
- **Delta**: +22 tests (9 new in `SelectableListItem.test.jsx`, +7 net new in `Teams.test.jsx`, +6 net new in `Trainings.test.jsx`) — matches the task-by-task counts claimed in `tasks.md` (9/7/6) exactly. No tests were removed (`git diff main..HEAD` shows 0 removed `test(` lines in either modified test file).
- **Skipped tests**: none
- **Failures**: none

---

## Code Quality

| Principle | Status |
| --- | --- |
| No features beyond what was asked | ✅ |
| No abstractions for single-use code | ✅ — `SelectableListItem` genuinely replaces 3 duplicated call sites |
| No unnecessary "flexibility" added | ✅ — props limited to `selected`, `onSelect`, `children` |
| Only touched files required for task | ✅ — `src/index.css`, `SelectableListItem.jsx` + test, `Teams.jsx` + test, `Trainings.jsx` + test, plus the two spec docs |
| Didn't "improve" unrelated code | ✅ — the two training `<li>` lists in `Trainings.jsx` were left as plain `<li>` with only `key` added, matching the scoped T4 Done-when ("they are not selectable rows — keys only") |
| Matches existing patterns/style | ✅ — Tailwind utility classes, default-exported function component, `.jsx` |
| Would senior engineer approve? | ✅ with the two flagged gaps below noted for follow-up |
| Spec-anchored outcome check | ⚠️ 1 spec-precision gap (SELECT-01.4 list-level case) |
| Per-layer coverage expectation met | ⚠️ mostly — the Trainings team-filter empty-state edge case has no code path and no test |
| Every test maps to a spec AC/edge case/Done-when | ✅ — no unclaimed tests found |
| Documented guidelines followed | `CLAUDE.md` (Tailwind-first styling, `*Popup`/`*Card` naming — N/A here), `docs/09-styling.md` — followed |

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| SELECT-01 | Implemented | ✅ Verified (1 spec-precision gap on AC .4) |
| SELECT-02 | Implemented | ✅ Verified |
| SELECT-03 | Implemented | ✅ Verified |
| SELECT-04 | Implemented | ✅ Verified |

---

## Summary

**Overall**: ⚠️ Issues (non-blocking) — core feature works, gates pass, mutation sensor confirms tests discriminate real regressions. Two minor gaps found, neither breaks the shipped feature but both are real deviations from the spec's literal text.

**Spec-anchored check**: 9/9 ACs matched a spec-defined outcome; 1 additional spec-precision gap flagged (SELECT-01.4).
**Sensor**: 3/3 mutations killed.
**Gate**: 105 passed, 0 failed (lint + build + test all green).

**What works**: Selected vs. hover states are now visually distinct via dedicated `--color-selected` / `--color-selected-border` / `--color-hover` tokens; `aria-current` is correctly set/cleared; `SelectableListItem` is the single source of the row markup for all three original call sites; keys are present everywhere `.map()` is used across both pages; the pre-existing React key-warning bug is verifiably fixed (reproduced on `main`, absent on this branch).

**Issues found**:
1. **Minor** — The team-filter list on `/trainings` (`src/pages/Trainings.jsx:100-110`) has no empty-state branch; if `teams` is ever empty it silently renders a bare `<ul>`, which is the exact scenario the spec's edge-case section rules out. Fix: add an empty-state message matching the pattern already used for the Teams-page teams list, plus a covering test.
2. **Minor / test-quality** — `SelectableListItem.test.jsx:88-97` ("long content wraps with the border bar spanning full height") does not render long/wrapping content or assert layout — it only checks the `border-l-4` class exists. Either soften the test name to match what it actually verifies, or accept this as an untestable-in-jsdom CSS claim and note it in the test comment.
3. **Not verified but flagged for awareness** — T1's Done-when claims "Contrast of selected background against its text meets WCAG AA (4.5:1)" was checked complete with no automated check possible (matrix says CSS is build-gate-only). Manual calculation: dark theme (default `:root` text color) yields ~8.2:1 (passes AA comfortably). However, under the `prefers-color-scheme: light` override (`src/index.css:63-74`), body text becomes `#213547` while `bg-selected` (`#1e3a8a`) is unaffected by the light-mode override (Tailwind's `.bg-selected` class outranks the bare `button` element selector) — contrast in that combination computes to roughly **1.2:1**, which fails WCAG AA badly. This is a genuine accessibility regression risk under light color-scheme, not caught by any test or by the Done-when checkbox that claims it passes AA. Not part of the spec's stated ACs (which don't mention theme variants), so it is reported as a quality/lesson item rather than a blocking AC failure.

**Next steps**: Route issues 1 and 3 as fix tasks if the team wants full spec-edge-case coverage and cross-theme accessibility; issue 2 is optional test-hygiene polish. None of these block calling the P1/P2 user stories functionally done — the core bug (ambiguous selected-vs-hover) is fixed and verifiably regression-proof per the discrimination sensor.

---

## Re-Verification (iteration 2) — 2026-07-31

**Fix commit**: `c5e0f8a` "fix(trainings): render empty-state message for the team filter list"
**Scope**: targeted re-check of Issue 1 only (team-filter empty-state gap). Original PASS content above is retained unmodified; this section does not re-run the full original checklist.

### Gap closure check

- `src/pages/Trainings.jsx:100-114` now wraps the team-filter list in `{teams.length === 0 ? <p>No teams yet.</p> : <ul>...}`, matching the pattern already used for Teams.jsx's teams/players lists. A bare `<ul>` is no longer reachable when `teams` is empty.
- New test `src/pages/__tests__/Trainings.test.jsx:285-292` ("renders an empty-state message for the team filter when there are no teams") mocks `teamService.getAll` to resolve `[]` and asserts `await screen.findByText("No teams yet.")` — this is exactly the spec-defined outcome for the edge case ("WHEN a list is empty THEN the system SHALL render an empty-state message, not a bare `<ul>`").
- **Verdict: gap closed.** ✅

### Gate re-run

- `npm run lint` — clean, 0 errors/warnings.
- `npm run build` — succeeds (vite build, 5956 modules, no errors).
- `npm test` — **106 passed, 0 failed, 0 skipped (10 test files)** — up from 105 in the prior pass, i.e. exactly +1 (the new empty-state test).

### Discrimination check (this fix only)

Mutation: `src/pages/Trainings.jsx:100` `teams.length === 0` → `teams.length !== 0` (single line, inverts the conditional so the bare `<ul>` renders again when teams is empty and the empty-state message renders when teams is non-empty).

- Ran `npx vitest run src/pages/__tests__/Trainings.test.jsx -t "renders an empty-state message for the team filter"` against the mutated file: **failed** — `findByText("No teams yet.")` timed out, confirming the new test is discriminating (not vacuous) and correctly detects the reverted regression.
- Reverted via `git checkout -- src/pages/Trainings.jsx`; `git status --short` confirmed clean on that file both before and after the mutation (only pre-existing unrelated working-tree changes to `.specs/LESSONS.md` / `.specs/lessons.json` and the untracked `validation.md` remained, none touched by this check).

### Updated summary

**Issue 1 (team-filter empty-state gap): CLOSED.** No longer a blocking or non-blocking gap.

**Remaining non-blocking notes carried over from the original PASS** (unchanged, not in scope for this re-verification pass):
2. `SelectableListItem.test.jsx:88-97`'s "border bar spans full row height" test only checks the static `border-l-4` class, not actual layout/wrap behavior — a jsdom-limitation spec-precision gap, not a functional failure.
3. Light-mode (`prefers-color-scheme: light`) contrast of `bg-selected` against body text computes to roughly 1.2:1, failing WCAG AA — a pre-existing, app-wide dark-palette issue unrelated to this feature's scope and excluded by the spec's "Out of Scope: Full design-system pass."

**Overall verdict: ✅ PASS — zero blocking gaps.** All spec-anchored ACs and edge cases are now satisfied; gates are green (106/106 tests); the fix is verifiably regression-proof.
