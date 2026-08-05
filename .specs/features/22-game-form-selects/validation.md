# Game Form Selects Validation

**Date**: 2026-08-05
**Spec**: `.specs/features/22-game-form-selects/spec.md`
**Diff range**: `main...feature/22-game-form-selects` (commits `676c54e`..`d211ad9`; `ba63330` is docs-only, skipped)
**Verifier**: independent sub-agent (author ≠ verifier) — iteration 2 of the fix→re-verify loop, re-verifying fix commit `d211ad9` against the prior FAIL report (`69c8b91`, 4 ranked gaps)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | unchanged since iteration 1 |
| T2   | ⚠️ Partial | Opponent select behavior now correctly documented in spec.md and tested, but `tasks.md:96`'s "Done when" bullet still reads "An empty opponents list **disables** the select" — never corrected, now contradicts both the shipped behavior and the just-updated spec.md wording. Doc-hygiene only; not a behavior or test gap. |
| T3   | ✅ Done | unchanged |
| T4   | ✅ Done | unchanged |

---

## Spec-Anchored Acceptance Criteria (the 4 gaps from iteration 1)

| # | Gap (iteration 1) | Spec-defined outcome (post-fix) | `file:line` + assertion | Result |
|---|---|---|---|---|
| 1 | GSEL-01.4 disabled-state contradiction | Select SHALL remain enabled when the opponents list is empty (only loading disables it); form points at manager | `.specs/features/22-game-form-selects/spec.md:64` — AC text reworded to "SHALL remain enabled ... so 'Add new…' is reachable"; Assumptions table row (`spec.md:42`) reworded with supersession note. Test: `src/components/__tests__/GameSavePopup.test.jsx:280-294` — `expect(opponentSelect()).not.toBeDisabled()` (line 290) added to the existing empty-list test, alongside the unchanged option-list and pointer-text assertions | ✅ RESOLVED — spec wording, code behavior, and test now agree; GSEL-02.6 Assumptions/AC text (`spec.md:88`) reworded symmetrically |
| 2 | Case-only-match value unasserted (opponent) | Select's displayed value SHALL be the list entry's exact casing, not blank/raw | `GameSavePopup.test.jsx:315-326` — `expect(opponentSelect()).toHaveValue("Benfica")` added (line 325) to the existing case-match test, alongside the pre-existing option-count assertion | ✅ RESOLVED — confirmed empirically via the discrimination-sensor re-run below |
| 3 | Case-only-match had zero coverage (competition) | Same guarantee as opponent, by symmetry of shared `toOptions`/`*SelectValue` logic | `GameSavePopup.test.jsx:328-337` — new test `"a stored competition matching a list entry only by case renders as that entry, not a second option (edge case)"`: asserts option count via `options.filter(...).toHaveLength(1)` (line 335) AND `expect(competitionSelect()).toHaveValue("Cup")` (line 336) | ✅ RESOLVED — closes the zero-coverage gap with a value-level assertion, not just a weak one |
| 4 | Untouched-close test skipped competition field | Closing the manager without adding anything SHALL leave every field, including competition, unchanged | `GameSavePopup.test.jsx:474` — `await user.selectOptions(competitionSelect(), "Cup")` added before opening the manager; `GameSavePopup.test.jsx:484` — `expect(competitionSelect()).toHaveValue("Cup")` added after closing it, alongside the pre-existing team/opponent/date/isHome assertions | ✅ RESOLVED — all 5 fields now asserted |

**Status**: ✅ All 4 iteration-1 gaps closed with spec-precision-matching assertions (not weaker/unrelated ones).

**New/residual observation (not one of the 4 gaps, informational only)**: `tasks.md:96`'s T2 "Done when" checkbox still reads "An empty opponents list disables the select and points at the manager (AC GSEL-01.4)" — the original iteration-1 Fix 1 plan called for correcting this bullet alongside the spec.md wording; the fix commit only touched `spec.md` and the test file (confirmed via `git show --stat d211ad9`), so this line is now stale relative to both the shipped behavior and the corrected spec.md. Cosmetic/doc-hygiene — does not affect any AC, test, or runtime behavior.

---

## Discrimination Sensor (targeted re-run for gap #2)

Scratch mutation only, real tree never left dirty. `git status --porcelain` was clean before and after.

| # | File:line | Mutation | Killed? |
|---|---|---|---|
| 1 (re-run) | `src/components/GameSavePopup.jsx:180-183` (`opponentSelectValue`) | Changed the case-insensitive match `option.value.toLowerCase() === formData.opponent.toLowerCase()` to an exact match `option.value === formData.opponent`, so a case-variant legacy value falls back to the raw stored string instead of the list entry's casing — the exact mutation that survived in iteration 1 | ✅ **Killed** — `npx vitest run src/components/__tests__/GameSavePopup.test.jsx` → 1 failed / 28 passed: `"a stored opponent matching a list entry only by case renders as that entry, not a second option (edge case)"` failed at line 325 (`expect(opponentSelect()).toHaveValue("Benfica")`, received `""`). Mutation reverted via `git checkout -- src/components/GameSavePopup.jsx`; `git status --porcelain` confirmed clean before and after. |

**Sensor depth**: targeted re-run (1 mutation, the specific mutant that survived iteration 1); iteration 1's other two mutations (`selectOptions.js:16`, `handleCloseOpponentsManager` auto-select) were already killed and are unaffected by this fix commit (neither file was touched), so they were not re-run.
**Result**: 1/1 killed — previously-surviving mutant is now caught. Combined with iteration 1's sensor run (2/3 killed), the feature's discrimination coverage is now 3/3.

---

## Code Quality / Scope Check

| Principle | Status |
|---|---|
| Minimum code | ✅ — 21 lines added, 4 removed, across exactly 2 files |
| Surgical changes | ✅ |
| No scope creep | ✅ — `git show --stat d211ad9` touches only `.specs/features/22-game-form-selects/spec.md` and `src/components/__tests__/GameSavePopup.test.jsx`; no production logic changed, matching the commit message's three claims exactly |
| Matches patterns | ✅ — new test follows the existing case-match test's structure/comment style |
| Spec-anchored outcome check | ✅ — all 4 fixes assert the exact spec-defined outcome (values, not just presence/count) |
| Every test maps to a spec requirement | ✅ — no unclaimed tests found |
| Documented guidelines followed | tasks.md Test Coverage Matrix — followed for tests; T2's stale checkbox not corrected (see residual observation above) |

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: lint clean, build succeeded, **1057/1057 tests passed**, 0 failed, 0 skipped
- **Test count before this fix commit**: 1056 (iteration 1 baseline)
- **Test count after**: 1057 (+1 new test: the competition case-match test; the other 3 fixes strengthened existing tests' assertions rather than adding new tests)
- **Delta**: +1, consistent with the fix commit's claims (3 assertion additions to existing tests + 1 new test)

---

## Requirement Traceability Update

| Requirement | Previous Status (iteration 1) | New Status |
|---|---|---|
| GSEL-01 | ⚠️ Needs Fix | ✅ Verified |
| GSEL-02 | ⚠️ Needs Fix | ✅ Verified |
| GSEL-03 | ⚠️ Needs Fix | ✅ Verified |
| GSEL-04 | ⚠️ Needs Fix | ✅ Verified |
| GSEL-05 | ✅ Verified | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 4/4 iteration-1 gaps closed with spec-precision-matching assertions; 0 new coverage gaps introduced
**Sensor**: 1/1 targeted re-run killed (previously-surviving mutant now caught); cumulative 3/3 across both iterations
**Gate**: 1057 passed, 0 failed, 0 skipped; lint clean; build succeeded

**What works**: All 4 gaps from the iteration-1 FAIL report are closed. GSEL-01.4/GSEL-02.6 spec wording now matches the shipped, deliberately-enabled empty-list behavior with an explicit supersession note, and is now backed by a `not.toBeDisabled()` assertion. The case-only-match edge case is now value-asserted for both opponent and competition, and the discrimination-sensor mutation that previously survived is now killed. The untouched-close test covers all 5 form fields.

**Issues found**: None blocking. One informational/cosmetic residual: `tasks.md:96`'s T2 "Done when" bullet text ("disables the select") was not updated to match the corrected spec.md wording — does not affect any AC, test, or runtime behavior, and was outside the fix commit's stated scope.

**Next steps**: None required to ship. Optionally, a trivial follow-up could reword `tasks.md:96` for documentation consistency, but this does not block PASS.
