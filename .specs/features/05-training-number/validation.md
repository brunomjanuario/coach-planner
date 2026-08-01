# Training Number Validation

**Date**: 2026-08-01
**Spec**: `.specs/features/05-training-number/spec.md`
**Diff range**: `main..HEAD` (47794d0, 9c1bc7d, 10a6319, c192e83)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `src/lib/trainingNumber.js` — 12 tests (task doc estimated 13; harmless planning-estimate mismatch, all ACs covered) |
| T2   | ✅ Done | `trainingService.getAllNumbered` — 25 tests total (18 pre-existing + 7 new; task doc estimated 20, harmless mismatch) |
| T3   | ✅ Done | `src/pages/Trainings.jsx` row rendering |
| T4   | ✅ Done | `src/components/TrainingDetailsPopup.jsx` heading |

---

## Spec-Anchored Acceptance Criteria

### P1: Sequential numbering

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| TNUM-01.1: team's trainings numbered from 1 ascending `day` | numbers 1..N in day order | `src/lib/__tests__/trainingNumber.test.js:5-17` — `expect(result.find(t=>t.id==="a").number).toBe(1)` etc. | ✅ PASS |
| TNUM-01.2: same-`day` ties broken deterministically by id | stable order across runs, keyed by id | `src/lib/trainingNumber.js:27` `String(a.id).localeCompare(String(b.id))`; asserted in `trainingNumber.test.js:33-43` and `:45-55` (`expect(first.map(...)).toEqual(second.map(...))`) | ✅ PASS |
| TNUM-01.3: inserting an earlier training renumbers later ones | later numbers shift up by 1 | `src/lib/__tests__/trainingNumber.test.js:57-76` — `expect(after.find(t=>t.id==="new").number).toBe(1)` … `.toBe(4)` | ✅ PASS |
| TNUM-01.4: deleting a training closes the gap | numbers stay contiguous | `src/lib/__tests__/trainingNumber.test.js:78-89` — `expect(afterDelete.find(t=>t.id==="c").number).toBe(2)` | ✅ PASS |
| TNUM-01.5: training with no team → no number | `number: null` (UI renders "—") | `src/lib/trainingNumber.js:36` `numberById.get(training.id) ?? null`; `trainingNumber.test.js:91-107`; UI `src/pages/__tests__/Trainings.test.jsx:705-718` — `expect(row).toHaveTextContent("Training #—")` | ✅ PASS (unassigned/`teamId: null` case). ⚠️ **Dangling-teamId case at service layer is NOT independently tested — see Discrimination Sensor mutant 2.** |
| TNUM-01.6: team with no trainings → empty list, no error | `[]`, not `undefined` | `src/lib/__tests__/trainingNumber.test.js:109-113` — `expect(result).toEqual([])` | ✅ PASS |

### P1: Readable training rows

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| TNUM-04.1: row shows `Training #N`, locale date/time, duration in minutes | exact format | `src/pages/Trainings.jsx:34-37` (`trainingRowLabel`); `src/pages/__tests__/Trainings.test.jsx:646-654` — `expect(row.textContent).toMatch(/^Training #\d+ · .+ · \d+ min$/)` | ✅ PASS |
| TNUM-04.2: no raw id in row | no UUID-shaped string anywhere in list | `src/pages/__tests__/Trainings.test.jsx:657-674` — `expect(getPastList().textContent).not.toMatch(uuidPattern)` | ✅ PASS |
| TNUM-04.3: invalid `day` → "Invalid date", no crash | literal string "Invalid date" | `src/pages/Trainings.jsx:28-31` (`formatDay`); `src/pages/__tests__/Trainings.test.jsx:694-703` — `expect(await screen.findByText(/Invalid date/)).toBeInTheDocument()` | ✅ PASS |
| TNUM-05.1: details popup heading shows training number | heading present is `Training #N` | `src/components/TrainingDetailsPopup.jsx:10-13`; `src/components/__tests__/TrainingDetailsPopup.test.jsx:72-78` — `expect(screen.getByRole("heading",{name:"Training #7"})).toBeInTheDocument()` | ✅ PASS |

**Status**: ✅ All 5 requirement IDs (TNUM-01…05) have direct-hit evidence. One narrower sub-case (dangling/unknown `teamId` at the service layer) has no dedicated assertion — flagged as a gap below, confirmed by a surviving mutant, not merely a documentation nit.

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `src/lib/trainingNumber.js:30` | Off-by-one: `numberById.set(training.id, index + 1)` → `index` (numbering starts at 0) | ✅ Killed — 7/12 tests in `trainingNumber.test.js` failed |
| 2 | `src/services/trainingService.js:30-33` | Removed the teamId-validity check: `teamId: teamIds.has(training.teamId) ? training.teamId : null` → `teamId: training.teamId` (dangling/unknown teamIds no longer sanitized to null before numbering) | ❌ **Survived** — full suite still 220/220 green |
| 3 | `src/components/TrainingDetailsPopup.jsx:11-13` | Broke the null-fallback: both branches of the ternary now render `` `Training #${training.number}` `` (would render "Training #null") | ✅ Killed — `TrainingDetailsPopup.test.jsx` failed (`getByRole("heading",{name:"Training Details"})` not found) |

**Sensor depth**: lightweight (3 mutations, default tier)
**Result**: 2/3 killed — ❌ FAIL (one surviving mutant)

All mutations were reverted with `git checkout --` immediately after observing results; working tree is clean (verified via `git status --short`).

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — `trainingNumber.js` is a small pure function, no unrequested abstraction |
| Surgical changes | ✅ — only the 4 files named in tasks.md (+ their test files) touched |
| No scope creep | ✅ — no unrelated refactors observed in the diff |
| Matches patterns | ✅ — service stays async/mutate-in-place style; page keeps `useState`/`useEffect` pattern; popup keeps existing markup |
| Spec-anchored outcome check (asserted values match spec) | ✅ for 4/5 requirement IDs; ⚠️ for TNUM-01.5's dangling-teamId sub-case (see gap) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ⚠️ — domain logic (`trainingNumber.js`) has 1:1 AC coverage; the service layer's dangling-teamId → null path is exercised implicitly through `numberTrainings` unit tests but has no dedicated `trainingService` assertion, so the mutation at that seam survived |
| Every test maps to a spec requirement — no unclaimed tests | ✅ — spot-checked; all new tests carry an AC/edge-case tag in their description |
| Documented guidelines followed | `CLAUDE.md`, `docs/04-data-model.md` — no dedicated testing-standards doc; strong defaults applied, consistent with prior features (`01`, `03`, `04`) |

---

## Edge Cases

- [x] Future-only view keeps team-wide numbers, doesn't restart at 1 — `src/services/__tests__/trainingService.test.js:214-227`, `src/pages/__tests__/Trainings.test.jsx:720-737`
- [ ] Same training shows the same number in calendar and trainings list — **NOT handled/testable**: `src/pages/Calendar.jsx` renders hard-coded `mockEvents` unconnected to `trainingService` (pre-existing rough edge per `CLAUDE.md`); this feature does not wire Calendar to numbered trainings, so the edge case is structurally unaddressed. It's a pre-existing architectural gap outside this feature's touched files, not a regression introduced here, but the spec still lists it as in-scope for TNUM without noting it in the Out-of-Scope table.
- [x] Reassigned team A → B takes a number from B's sequence on next read — `src/services/__tests__/trainingService.test.js:265-275`
- [x] 100+ trainings number correctly — `src/lib/__tests__/trainingNumber.test.js:139-162`, `src/services/__tests__/trainingService.test.js:248-263`. ⚠️ The narrower "computation is not re-run per row" performance claim is structurally true (`numberTrainings` is called once per `getAllNumbered` call, not per rendered row) but has no test asserting call count — spec-precision gap, low severity.

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: lint clean (0 errors/warnings); build succeeded (`vite build`, 5959 modules); tests 220 passed, 0 failed, 0 skipped
- **Test count before feature** (main): 220 − (12 + 7 + 10 + 2) new = 189 (by diff accounting: 12 new in trainingNumber.test.js, 7 new in trainingService.test.js, ~10 net-new/modified in Trainings.test.jsx, 2 new in TrainingDetailsPopup.test.jsx)
- **Test count after feature**: 220
- **Delta**: +31 tests net across the 4 touched test files (matches the diff `+` line counts; no test deletions observed)
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

### Fix 1: No test covers dangling/unknown `teamId` sanitization inside `trainingService.getAllNumbered`

- **Root cause**: `trainingService.js:30-33` sanitizes a training's `teamId` to `null` before numbering only when it doesn't match a real team (dangling reference, per `TTA-05`/`AD-006` reasoning), but no `trainingService.test.js` test creates a training with a dangling/unknown `teamId` and asserts `getAllNumbered()` returns `number: null` for it. Confirmed empirically: removing the `teamIds.has(...)` check left all 220 tests green.
- **Fix task**: Add a test to `src/services/__tests__/trainingService.test.js` (near the existing `getUnassigned` dangling-reference test) that creates a training with `teamId: "no-such-team"`, calls `trainingService.getAllNumbered()`, and asserts `.find(t => t.id === created.id).number` is `null`.
- **Priority**: Minor (the behavior is almost certainly correct — it mirrors the already-tested `getUnassigned` dangling-ref path and the `trainingNumber.js` unit tests — but the assertion gap is real and the mutation sensor proves it's currently unguarded at this specific seam).

### Fix 2 (optional, lower priority): Calendar/Trainings number-parity edge case is structurally unaddressed

- **Root cause**: `src/pages/Calendar.jsx` renders `mockEvents`, not `trainingService` data — a pre-existing rough edge documented in `CLAUDE.md`, not introduced by this feature.
- **Fix task**: Out of scope for this feature as implemented; recommend either amending `05-training-number/spec.md`'s Out-of-Scope table to explicitly exclude Calendar parity (since Calendar has no training wiring at all), or opening a follow-up feature to connect Calendar to `trainingService`.
- **Priority**: Minor/documentation — does not block this feature; flagging so the spec's edge-case list stays honest.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| TNUM-01 | Pending | ⚠️ Verified with a gap (dangling-teamId sub-case untested) |
| TNUM-02 | Pending | ✅ Verified |
| TNUM-03 | Pending | ✅ Verified |
| TNUM-04 | Pending | ✅ Verified |
| TNUM-05 | Pending | ✅ Verified |

---

## Summary

**Overall**: ⚠️ Issues

**Spec-anchored check**: 5/5 requirement IDs traced to file:line evidence; 1 narrower sub-case (dangling `teamId` at the service layer) lacks a dedicated assertion
**Sensor**: 2/3 mutations killed, 1 survived
**Gate**: 220 passed, 0 failed, 0 skipped; lint and build clean

**What works**: Numbering logic (ordering, tie-break, insert/delete renumbering, empty/null handling, 100+ scale) is solid and well-tested at the pure-function layer. Service-level future-only filtering and cross-team reassignment are correctly implemented and tested. UI rendering (readable rows, no UUID/no GMT, invalid-date fallback, popup heading with null fallback) is fully covered and passed all mutation checks aimed at it.

**Issues found**:
1. `trainingService.getAllNumbered`'s dangling-teamId sanitization has no dedicated test — add one test per Fix 1 above.
2. The spec's "calendar and trainings list show the same number" edge case is structurally unaddressed because Calendar is unconnected to training data — a pre-existing, out-of-feature limitation; recommend a spec/documentation update per Fix 2.

**Next steps**: Route Fix 1 to an implementer as a small test-only addition; re-verify with a 4th mutation targeting the same seam to confirm it now kills. Fix 2 is a documentation/spec decision for the user, not a code change.
