# Competitions Validation

**Date**: 2026-08-05
**Spec**: `.specs/features/20-competitions/spec.md`
**Diff range**: `main...feature/20-competitions` (5 feature commits: `8ce3a75`, `ff55ecb`, `35d247d`, `08d806d`, `15d2d63`; plus one docs-only commit `f42b966` marking status, excluded from review)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `competitionService.js` + `competitionService.test.js` (23 tests) |
| T2   | ✅ Done | `store.js` v1→v2 migration + `store.test.js` migration block (8 tests) |
| T3   | ✅ Done | `CompetitionsPopup.jsx` + its test file (17 tests) |
| T4   | ✅ Done | Rename cascade in `competitionService.update` + component test |
| T5   | ✅ Done | Delete confirmation + Games page wiring, `Games.test.jsx` "Competitions manager" block (6 tests) |

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
|---|---|---|---|
| COMP-01.1 fresh install has `competitions` collection | non-empty array matching seed | `src/services/__tests__/competitionService.test.js:29-33` — `expect(competitions).toEqual(seed.competitions)` | ✅ PASS |
| COMP-01.2 `getAll` returns a copy | mutating result doesn't affect next read | `competitionService.test.js:50-56` — pushes then re-reads, `expect(second.find(...)).toBeUndefined()` | ✅ PASS |
| COMP-01.3 create assigns `newId()` | string id, non-empty | `competitionService.test.js:60-66` — `expect(typeof created.id).toBe("string")` | ✅ PASS |
| COMP-01.4 duplicate rejected case-insensitively | `ValidationError` for exact/case/whitespace variants | `competitionService.test.js:80-99` — three separate `rejects.toThrow(ValidationError)` | ✅ PASS |
| COMP-01.5 empty/whitespace name rejected | `ValidationError` | `competitionService.test.js:111-121` | ✅ PASS |
| COMP-01.6 reset clears and re-seeds | competitions collection reset to seed, not left as-is | `competitionService.test.js:35-46` — sets custom data, calls `reset()`, asserts equals `seed.competitions` | ✅ PASS |
| COMP-02.1 migration derives 1 competition/distinct name | exact set of names | `store.test.js:73-82` — `expect(...).toEqual(["Cup","District League"])` | ✅ PASS |
| COMP-02.2 case/whitespace variants collapse | length 1, canonical name kept | `store.test.js:84-95` — `toHaveLength(1)`, `name` is trimmed/first-seen form | ✅ PASS |
| COMP-02.3 null/undefined/empty contribute nothing | only non-empty names appear | `store.test.js:97-109` — `toEqual(["Cup"])` | ✅ PASS |
| COMP-02.4 migration does not modify games | games byte-identical | `store.test.js:111-121` — `expect(getCollection("games")).toEqual(games)` | ✅ PASS |
| COMP-02.5 version stored, no re-run/duplicate | version "2", second load stable | `store.test.js:123-134` — checks `schemaVersion === "2"` and `afterSecondLoad` equals `afterFirstLoad`, length 1 | ✅ PASS |
| COMP-03.1 manager lists every competition | all names visible | `CompetitionsPopup.test.jsx:24-34`; also `Games.test.jsx:1003-1012` | ✅ PASS |
| COMP-03.2 submit adds and updates list without reload | new item appears, `getAll` re-called | `CompetitionsPopup.test.jsx:46-65` — `getAllSpy` called twice, item rendered | ✅ PASS |
| COMP-03.7 empty list invites first entry | invitation text shown | `CompetitionsPopup.test.jsx:36-44` | ✅ PASS |
| COMP-03.8 rejected name explains and keeps value | error text + input retains typed value | `CompetitionsPopup.test.jsx:87-106` — asserts message and `expect(input).toHaveValue("Cup")` | ✅ PASS |
| COMP-04.3 rename cascades to every matching game, leaves non-matching alone | 2 matched games renamed, 1 untouched | `competitionService.test.js:152-171` — asserts all three individually | ✅ PASS |
| COMP-04 case-insensitive cascade match (mirrors migration) | game differing by case is updated | `competitionService.test.js:173-187` | ✅ PASS |
| COMP-04 games with no competition untouched | `competition` stays `null` | `competitionService.test.js:189-203` | ✅ PASS |
| COMP-04 rename is awaited before list re-reads (AD-004) | `getAll` called again after `update` resolves | `CompetitionsPopup.test.jsx:194-215` — `getAllSpy` called twice, new name rendered | ✅ PASS |
| COMP-05.4 delete confirmation names game count | exact count, incl. 0 | `Games.test.jsx:1014-1029` (count=2) and `:1031-1050` (count=0) — regex asserts exact number in message | ✅ PASS |
| COMP-05.5 confirmed delete removes competition, games' stored strings unchanged | competition gone from list; 2 games still carry old string | `Games.test.jsx:1052-1076` — asserts competition absent AND `games.filter(...).toHaveLength(2)` | ✅ PASS |
| COMP-05.6 cancel changes nothing | competition still present, list unchanged | `Games.test.jsx:1078-1097` | ✅ PASS |

**Status**: ✅ All ACs covered — no spec-precision gaps found; every criterion in spec.md that defines a precise outcome (exact count, exact value, exact state) is asserted on that exact value, not merely "an assertion exists".

---

## Edge Cases (spec.md)

| Edge case | Handled | Evidence |
|---|---|---|
| Leading/trailing whitespace trimmed on store | ✅ | `competitionService.test.js:75-78` |
| Rename collision rejected with same message as duplicate create | ✅ | `competitionService.test.js:125-132`, `:205-221` (asserts games unchanged too) |
| Pure case-change rename allowed and cascades | ✅ | `competitionService.test.js:134-143`, `:223-232` |
| Competition deleted while game form open must not crash | N/A — correctly out of scope; spec explicitly assigns this to feature `22` (game form), not `20` | — |
| Storage-quota error surfaces on create rather than appearing to succeed | ✅ | `CompetitionsPopup.test.jsx:108-127` |
| Long name wraps rather than overflowing | ✅ | `CompetitionsPopup.test.jsx:129-139` — asserts `break-words` class |

---

## Discrimination Sensor

Run in scratch state: real files edited in place, tests run, then restored via `cp` from a pre-mutation backup (`git status` confirmed clean before and after each mutation; no working-tree diff survived).

| # | File:line | Description | Killed? |
|---|---|---|---|
| 1 | `src/services/competitionService.js` (rename cascade filter) | Flipped case-insensitive cascade match (`normalize(game.competition) === normalizedOld`) to a case-sensitive exact match (`game.competition === oldName`) | ✅ Killed — `competitionService.test.js` "cascades to a game whose stored name differs only by case" failed (expected `"Cup Renamed"`, got `"cup"`) |
| 2 | `src/services/competitionService.js` (`create`) | Removed the `assertNoDuplicate(...)` call, allowing duplicate names to be created | ✅ Killed — 4 tests failed in `competitionService.test.js` (exact/case/whitespace duplicate rejection + "does not persist a rejected duplicate") |
| 3 | `src/services/store.js` (migration `MIGRATIONS[2]`) | Changed the dedup key from `trimmed.toLowerCase()` to `trimmed` (case-sensitive), breaking case-insensitive collapse | ✅ Killed — `store.test.js` "collapses names differing only by case or surrounding whitespace" failed (expected length 1, got 2) |

**Sensor depth**: lightweight (3 mutations, standard feature)
**Result**: 3/3 killed — ✅ PASS

---

## Code Quality

| Principle | Status |
|---|---|
| Minimum code | ✅ — service, migration, popup, and page wiring only; no speculative abstractions |
| Surgical changes | ✅ — `Games.jsx` diff is limited to the button, state, and popup mount |
| No scope creep | ✅ — game-form consumption of the list explicitly deferred to feature `22` per spec's Out of Scope table |
| Matches patterns | ✅ — `*Popup` naming, `PopupShell`/`ConfirmationPopup` reuse, service returns copies (AD-004), `newId()` (AD-003) |
| Spec-anchored outcome check | ✅ — see AC table above |
| Per-layer coverage (service 1:1 ACs; component render+interaction; page integration) | ✅ |
| Every test maps to a spec AC, edge case, or Done-when item | ✅ — spot-checked; no stray/unclaimed tests found |
| Documented guidelines followed | AD-002 (localStorage store), AD-003 (`newId()`), AD-004 (services return copies), AD-010 (competitions not a foreign key) — all followed |

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: lint clean, build succeeds (`dist/` produced, no errors), **975 passed, 0 failed** (53 test files)
- **Test count on `main` (baseline)**: 923 tests, 51 files
- **Test count on `feature/20-competitions`**: 975 tests, 53 files
- **Delta**: +52 new tests, 0 removed — no test-count regression
- **Skipped tests**: none
- **Failures**: none

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
|---|---|---|
| COMP-01 | Tasks: Done | ✅ Verified |
| COMP-02 | Tasks: Done | ✅ Verified |
| COMP-03 | Tasks: Done | ✅ Verified |
| COMP-04 | Tasks: Done | ✅ Verified |
| COMP-05 | Tasks: Done | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 21/21 ACs matched spec-defined outcome; 0 spec-precision gaps
**Sensor**: 3/3 mutations killed
**Gate**: lint clean, build clean, 975/975 tests passed (+52 vs. main, 0 regressions)

**What works**: Collection + service with duplicate/empty validation (COMP-01), v1→v2 migration deriving and deduping competitions from stored games without touching game records (COMP-02), manager popup with list/create/empty/error states (COMP-03), case-insensitive rename cascade awaited before re-read (COMP-04), and delete behind a counted, cancellable confirmation that leaves games' stored competition strings untouched (COMP-05). All three targeted fault injections (case-sensitive cascade, skipped duplicate check, case-sensitive migration dedup) were caught by the existing test suite.

**Issues found**: none

**Next steps**: none — feature is ready to merge as verified. Minor non-blocking observation: task T2's "Done when" line says "Test count: 10+ tests pass" but the migration-specific `describe` block in `store.test.js` has 8 tests (the file's total is 20 once non-migration tests are counted); this is a task-tracking granularity note, not a spec/AC gap, and does not affect the PASS verdict.
