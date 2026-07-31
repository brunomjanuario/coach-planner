# Persistence Layer Validation

**Date**: 2026-07-31
**Spec**: `.specs/features/01-persistence-layer/spec.md`
**Diff range**: `fc613ea..9d4dc84` (feature/01/persistence-layer, 21 commits)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `src/lib/storage.js` — read/write/remove, date revival, quota + unavailability + corruption handling. 10/10 tests pass. Quota test uses a mocked `DOMException("QuotaExceededError")`; independently re-verified against jsdom's real quota-exceeded shape (see Sensor/empirical section below) — matches exactly (`DOMException`, `name==="QuotaExceededError"`, `code===22`). |
| T2   | ✅ Done | `src/lib/id.js` — `crypto.randomUUID()` + timestamp/counter fallback. 4/4 tests pass, incl. 10,000-distinct-values test. |
| T3   | ✅ Done | `src/model/seed.js` — `createSeed()` factory, fresh graph per call. `mock.js` deletion correctly deferred to T7 (documented `SPEC_DEVIATION`, justified — deleting early would have broken the build gate before T5-T7 stopped importing it). |
| T4   | ✅ Done | `src/services/store.js` — seed-on-first-run, per-collection get/set, schema version + identity migration hook, `reset()`. 12/12 tests pass. |
| T5   | ✅ Done | `teamService` team methods migrated to store; `NotFoundError` typed; `fetch`/`API_URL` removed; `TeamPopup.jsx`'s `Math.random()` id removed per design.md's corrected scope. |
| T6   | ✅ Done | `teamService` player methods migrated; `PlayerPopup.jsx`'s `Math.random()` id removed. Player id global uniqueness verified by test. |
| T7   | ✅ Done | `trainingService` migrated; three broken `fetch` methods gone; `mock.js` deleted (last import removed); `TrainingSavePopup.jsx`'s top-level training id `Math.random()` removed (exercise-array `Date.now()` ids correctly left alone per design.md, deferred to `04-training-form`). |
| T8   | ✅ Done | `Teams.jsx` refresh wiring; `TeamCard`/`PlayerCard` gained `onUpdated` (edit path) distinct from `onClose` (delete path) — verified this distinction empirically via the discrimination sensor (see below). |
| T9   | ✅ Done | `Trainings.jsx` — create refresh preserves active team filter; `splitTrainings` extracted; `filterTranings` → `filterTrainings` typo fixed; two mount effects consolidated. |
| T10  | ✅ Done | `Settings.jsx` — "Reset demo data" button + `ConfirmationPopup` + `store.reset()`. This was the task mid-commit at the interruption; re-inspected carefully — commit `22f021c` is complete and self-consistent (component + test file committed together), and the wrap-up commit `9d4dc84` only touches `spec.md`/`tasks.md` bookkeeping. No half-applied state found. |

All 10 tasks verified complete against actual repo state (not the checkboxes).

---

## Spec-Anchored Acceptance Criteria

### P1: Durable data

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| Create/reload → still listed | Subsequent read includes the created record | `src/services/__tests__/teamService.test.js:58-68` — `all.find((t) => t.id === created.id)).toEqual(created)`; `trainingService.test.js:44-57` same pattern | ✅ PASS |
| Update/reload → shows updated values | Re-read reflects new values, not originals | `teamService.test.js:70-81` — `reread.name` === `"Renamed FC"` | ✅ PASS |
| Delete/reload → not listed | Re-read excludes the deleted record | `teamService.test.js:101-108` — `all.find(...)).toBeUndefined()`; `trainingService.test.js:115-122` same | ✅ PASS |
| No stored data → seed + persist | `getCollection` returns `createSeed()` data; schema key written | `store.test.js:6-15` — `expect(getCollection("teams")).toEqual(seed.teams)`; schema key `=== "1"` | ✅ PASS |
| Stored data present → not overwritten | A prior write survives a subsequent `getCollection` call | `store.test.js:17-23` — custom team survives re-read | ✅ PASS |

### P1: Correct re-render on mutation

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| Two reads not reference-identical | `first !== second` (by reference) | `store.test.js:31-36` — `expect(first).not.toBe(second)`; also `teamService.test.js:16-21`, `trainingService.test.js:16-21` | ✅ PASS |
| Mutating a returned object doesn't affect the store | A push/mutation on the result is invisible on the next read | `store.test.js:38-46` — mutates `first`, asserts `second` unaffected | ✅ PASS |
| Player added → list grows without refresh | New player visible in the rendered list post-submit, no reload | `src/pages/__tests__/Teams.test.jsx:86-106` — `findByText("99 TestPlayer")` | ✅ PASS |
| Training created → list shows it without refresh | New training visible in rendered list post-submit | `src/pages/__tests__/Trainings.test.jsx:117-133` — future list has 1 item | ✅ PASS |

### P1: Date fidelity

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| `day` is `Date` after save/reload | `reread.day instanceof Date`, exact ISO value preserved | `trainingService.test.js:59-70` — `expect(reread.day).toBeInstanceOf(Date)` + `toISOString()` match. Independently re-verified live (see below) | ✅ PASS |
| Reloaded training compares correctly with `new Date()` | Future-dated training still `>= new Date()` after reload | `trainingService.test.js:72-83` — `reread.day >= new Date()).toBe(true)`; also exercised at page level in `Trainings.test.jsx:117-133` (future bucket) | ✅ PASS |
| Malformed date string → invalid-date marker, not crash | `read()` does not throw; field is an `Invalid Date` | `storage.test.js:40-50` — `expect(() => read(...)).not.toThrow()`; `Number.isNaN(result.day.getTime())).toBe(true)` | ✅ PASS |

### P2: Reset to demo data

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| Reset clears `coachplanner:v1:*` and re-seeds | Post-reset collections equal `createSeed()` output | `store.test.js:67-73` — `expect(getCollection("teams")).toEqual(seed.teams)`; `Settings.test.jsx:34-49` at UI level | ✅ PASS |
| Requires explicit confirmation first | A single click does not mutate data; popup must be present | `Settings.test.jsx:17-32` — after one click, `teamService.getAll()` still has the pre-reset 3 teams, popup text visible | ✅ PASS |
| Auth session untouched after reset | `localStorage["user"]` unchanged by `reset()` | `store.test.js:75-84` — direct `localStorage.getItem("user")` check; `Settings.test.jsx:51-62` at UI level | ✅ PASS |

**Status**: ✅ All 15 story-level ACs covered with exact-outcome assertions. No spec-precision gaps found — every AC in spec.md defines a precise, testable outcome and the corresponding test targets that exact outcome (reference identity, exact ISO string, exact array membership, exact localStorage value).

---

## Discrimination Sensor

Ran in the isolated worktree's own working tree (already scratch by construction — never pushed/merged). Each mutation applied, tests run, mutant confirmed killed, then the file was restored byte-for-byte from a pre-mutation backup and `git status --short` confirmed clean before moving to the next.

| # | File:line | Description | Tests run | Killed? |
| - | --- | --- | --- | --- |
| 1 | `src/services/store.js:39` (`getCollection`) | Added an in-memory cache keyed by collection name so repeated calls return the same array reference instead of re-parsing | `store.test.js`, `teamService.test.js` | ✅ Killed — 9/31 tests failed (reference-identity + mutation-isolation + delete-persistence tests all failed once the cache masked fresh reads) |
| 2 | `src/lib/storage.js:43` (`reviveDateFields`) | Reduced to `(parsed) => parsed` — no date revival | `storage.test.js`, `store.test.js`, `trainingService.test.js` | ✅ Killed — 6/35 tests failed, incl. the AC PERSIST-05.1/05.2 tests directly |
| 3 | `src/services/store.js:50` (`reset`) | Added `localStorage.removeItem("user")` inside `reset()` | `store.test.js`, `Settings.test.jsx` | ✅ Killed — 2/17 tests failed (`reset() leaves the auth session's user key untouched`, and the Settings UI equivalent) |
| 4 | `src/components/TeamCard.jsx:45` (edit popup's `onClose`) | Changed the edit-save callback from `onUpdated()` to `onClose()` — collapses the edit-vs-delete distinction | `Teams.test.jsx` | ✅ Killed — `editing the selected team's details updates the list and the edit panel without losing the selection` timed out/failed (edit now cleared the selection instead of refreshing it) |

**Sensor depth**: lightweight (4 targeted mutations, default tier)
**Result**: 4/4 killed — ✅ PASS. All mutations reverted; `git status --short` clean; full suite re-run green (83/83) after each revert and at the end.

---

## Independent Empirical Checks (beyond reading the tests)

Two claims from `design.md`/`tasks.md` were re-derived live rather than taken on faith, using throwaway test files created in `src/__tests__/` and deleted immediately after (never committed — confirmed via `git status --short` before/after):

1. **Copy semantics (PERSIST-03)**: called `getCollection("teams")` twice, confirmed `a !== b`, then pushed a fake record and mutated a field on `a`, then read a third time (`c`) and confirmed neither the pushed record nor the mutation was visible in `c`. Passed.
2. **Date fidelity (PERSIST-05)**: created a training with `day = now + ~28h` through `trainingService.create`, re-read it via `getById`, confirmed `reread.day instanceof Date === true` and `reread.day >= new Date() === true`. Passed.
3. **Quota-exceeded shape (T1's flagged risk)**: wrote a real script that fills `localStorage` with ~20MB of data until it throws (no mocking). jsdom's actual thrown error: `DOMException`, `name === "QuotaExceededError"`, `code === 22`, message `"The 5000000-code unit storage quota has been exceeded."`. This exactly matches the shape the committed test mocks (`new DOMException("quota exceeded", "QuotaExceededError")`, asserted via `err instanceof DOMException && (err.name === "QuotaExceededError" || err.code === 22)` in `storage.js:15-20`). The implementer's claimed empirical verification is corroborated — the test uses a deliberate, accurate mock of the real behavior rather than an assumed shape, which is reasonable engineering practice (not exercising a real 5MB write on every test run).

---

## Edge Cases (spec.md)

| Edge case | Status | Evidence |
| --- | --- | --- |
| `localStorage` unavailable → in-memory fallback, warn once | ✅ Tested | `storage.test.js:76-87` (fallback works), `:89-103` (warns exactly once across multiple calls) |
| Write exceeds quota → typed error, prior data intact | ✅ Tested | `storage.test.js:52-74` — `StorageQuotaError` with `.collection`, and prior data confirmed intact after |
| Corrupt JSON → re-seed, log warning, no crash | ⚠️ Partially tested | `storage.test.js:32-38` tests `storage.read()`'s corrupt-JSON behavior (returns `null`, warns once) directly. There is no dedicated test exercising the composed path (`store.ensureSeeded` treating a corrupt stored value as first-run and re-seeding) — this is a plausible-by-construction consequence of `storage.read` returning `null` uniformly for "absent" and "corrupt" combined with `ensureSeeded`'s `storedVersion !== null` check, not a directly asserted behavior at the store layer. Not a spec violation — genuinely correct by the code's own logic — but flagged as a coverage gap one level up from where it's proven. |
| Old schema version → migration hook (identity for v1) | ⚠️ Partially tested | `store.test.js:60-65` tests the hook is a no-op *at* v1 (there is no v0/v2 to actually migrate *from* yet, since v1 is the first version — the "older version" case is not constructible today). The hook exists, is real code (not a comment), and is exercised on every `ensureSeeded()` call. This is the maximum testable coverage until a v2 collection is introduced by a later feature. |
| Concurrent tabs → last write wins, undocumented as unprevented | N/A by design | Spec explicitly says "documented, not prevented" — no test expected or found. Correctly out of scope. |
| Unknown lookup id → `null` (read) / `NotFoundError` (write), never bare `TypeError` | ✅ Tested | `teamService.test.js:29-32` (`getById` → `null`), `:83-87`, `:144-148`, `:190-200` (all write paths → `NotFoundError`); `trainingService.test.js:29-32`, `:109-113` same pattern |

---

## Code Quality

| Principle | Status |
| --- | --- |
| No features beyond what was asked | ✅ — no speculative abstractions; caching deliberately *not* added (see design.md's Approach Exploration) |
| No abstractions for single-use code | ✅ |
| No unnecessary "flexibility" added | ✅ — `DATE_FIELDS` registry is the one piece of extensibility, and it's spec-required (future `games`/`ratings` collections) |
| Only touched files required for task | ✅ — full diff (`fc613ea..9d4dc84`) matches T1-T10's `Where` fields plus exactly the task-scope corrections `design.md` calls out (`TeamPopup.jsx`, `PlayerPopup.jsx`, `TrainingSavePopup.jsx` for id cleanup; `TeamCard.jsx`/`PlayerCard.jsx` for `onUpdated`) — no extra files |
| Didn't "improve" unrelated code | ✅ — e.g. `TrainingSavePopup`'s dead unused `onSubmit` prop and the exercise-array `Date.now()` ids were correctly left untouched (both documented, both out of this feature's scope) |
| Matches existing patterns/style | ✅ — Tailwind-only in touched files, `*Popup`/`*Card` naming preserved, async service signatures unchanged |
| Would senior engineer approve? | ✅ |
| Tests map to acceptance criteria and are non-shallow | ✅ — spot-checked P1 Date fidelity story in full; every assertion targets an exact value (ISO string, boolean comparison, array membership), not just "is truthy" |
| Spec-anchored outcome check | ✅ — see AC table above, no gaps |
| Per-layer Coverage Expectation met | ✅ — `src/lib`/`src/services` unit tests cover all branches 1:1 to ACs; `src/pages` integration tests cover happy + edge + error paths (e.g. `getAll` rejection handling tested in both `Teams.test.jsx:38-52` and `Trainings.test.jsx:48-63`) |
| Every test maps to a spec AC/edge case/Done-when — no unclaimed tests | ✅ — reviewed all 9 test files; every test title traces to an AC, edge case, or a task's Done-when bullet |
| Documented guidelines followed | `CLAUDE.md`, `docs/` — no formal testing standard documented; strong defaults applied per `tasks.md`'s own Test Coverage Matrix, followed correctly |

**Minor observation (not an AC gap, not filed as a lesson)**: `PlayerCard`'s delete path (`onClose={() => setSelectedPlayer(null)}` in `Teams.jsx:147`) has no dedicated test confirming player deletion clears `selectedPlayer`, unlike the symmetric, explicitly-tested team-deletion case (`Teams.test.jsx:150-162`). The code path is trivial and symmetric with the tested team case, and T8's Done-when list only names "the selected **team**" for this bullet — so this is not a spec/AC gap, just a slightly thinner test than the team equivalent.

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test` (run from a fresh `npm install` in the isolated worktree)
- **Result**: lint 0 errors, build succeeded (`dist/` produced, 1.58s), tests 83 passed, 0 failed, 0 skipped
- **Test count before feature** (at `fc613ea`): 3 (`Sidebar.test.jsx` only, from `00-test-harness`)
- **Test count after feature**: 83
- **Delta**: +80 new tests across 8 new test files
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

None. No surviving mutants, no failed ACs, no spec-precision gaps.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| PERSIST-01 | Implementing | ✅ Verified |
| PERSIST-02 | Implementing | ✅ Verified |
| PERSIST-03 | Implementing | ✅ Verified |
| PERSIST-04 | Implementing | ✅ Verified |
| PERSIST-05 | Implementing | ✅ Verified |
| PERSIST-06 | Implementing | ✅ Verified |
| PERSIST-07 | Implementing | ✅ Verified |
| PERSIST-08 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 15/15 story ACs matched spec outcome, 0 spec-precision gaps
**Sensor**: 4/4 mutations killed
**Gate**: 83 passed, 0 failed, 0 skipped

**What works**: Full CRUD durability across teams/players/trainings via localStorage; genuine copy semantics (fresh `JSON.parse` per read, empirically confirmed non-reference-identical and mutation-isolated); `Date` fidelity through the storage round trip (empirically confirmed `instanceof Date` and correct future-bucket sort); zero `Math.random()` remaining anywhere in `src/` (grep-confirmed); `onUpdated` vs `onClose` correctly kept distinct on `TeamCard`/`PlayerCard` (edit refreshes without clearing selection, delete clears it — sensor-confirmed this is load-bearing, not incidental); `store.reset()` never touches the `user` auth key (sensor-confirmed); reset requires explicit confirmation before mutating anything.

**Issues found**: None blocking. Two minor coverage thinnesses noted (corrupt-JSON re-seed path tested only at the storage layer, not composed through the store layer; player-deletion selection-clearing untested) — both are plausible-by-construction from already-tested lower-level behavior, not spec gaps, and not worth a fix task.

**Next steps**: None required. Feature is ready to merge.
