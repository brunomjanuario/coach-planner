# Opponents (21-opponents) Validation

**Date**: 2026-08-05
**Spec**: `.specs/features/21-opponents/spec.md`
**Diff range**: `feature/20-competitions..feature/21-opponents` (5 feature commits + 1 docs-only commit, skipped)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | Collection + service, `src/services/opponentService.js` |
| T2   | ✅ Done | Migration registered at v3 (`src/services/store.js`) |
| T3   | ✅ Done | `src/components/OpponentsPopup.jsx` |
| T4   | ✅ Done | Rename cascade, standings independence |
| T5   | ✅ Done | Delete + counted confirmation + Games page wiring |

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| OPP-01.1 fresh install includes `opponents` | seed `opponents` = `[{Benfica},{Sporting}]` matching seed games | `src/services/__tests__/opponentService.test.js:22-26` — `expect(seed.opponents.map(o=>o.name)).toEqual(gameOpponentNames)` | ✅ PASS |
| OPP-01.2 `getAll` returns a copy | mutating result doesn't affect later read | `opponentService.test.js:49-55` — push then re-read, `expect(second.find(...)).toBeUndefined()` | ✅ PASS |
| OPP-01.3 create assigns `newId()` | string id, non-empty | `opponentService.test.js:59-65` — `expect(typeof created.id).toBe("string")` | ✅ PASS |
| OPP-01.4 reject case/whitespace duplicate | `ValidationError` thrown, nothing persisted | `opponentService.test.js:79-104` — separate exact/case/whitespace variants + non-persistence check | ✅ PASS |
| OPP-01.5 reject empty/whitespace-only name | `ValidationError` thrown | `opponentService.test.js:106-112` | ✅ PASS |
| OPP-01.6 reset clears + reseeds | `getAll()` after `reset()` equals `createSeed().opponents` | `opponentService.test.js:34-45` | ✅ PASS |
| OPP-02.1 migration derives one opponent per distinct name | `["Benfica","Porto"]` (sorted) | `store.test.js:177-186` | ✅ PASS |
| OPP-02.2 case/whitespace variants collapse | length 1, name "Benfica" | `store.test.js:188-199` | ✅ PASS |
| OPP-02.3 null/undefined/empty opponent contributes nothing | only `["Porto"]` survives | `store.test.js:201-213` | ✅ PASS |
| OPP-02.4 migration doesn't modify games | `getCollection("games")` unchanged | `store.test.js:215-225` | ✅ PASS |
| OPP-02.5 second load doesn't re-run/duplicate | same result, length 1 | `store.test.js:227-236` | ✅ PASS |
| OPP-02.6 migration registered at next unused version (v3) | `schemaVersion === "3"`, `SCHEMA_VERSION = 3` in `store.js:6` | `store.test.js:238-244` — `expect(localStorage.getItem(...)).toBe("3")`; also composition test at `store.test.js:246-262` (v1 → v3 via both migrations) | ✅ PASS |
| OPP-03.1 manager lists every opponent | Benfica + Porto both rendered | `OpponentsPopup.test.jsx:24-34` | ✅ PASS |
| OPP-03.2 submit adds and shows without reload | new item visible, `create` called with typed name, `getAll` called twice | `OpponentsPopup.test.jsx:46-65` | ✅ PASS |
| OPP-03.3 rename cascades to games | matching games updated, non-matching untouched | `opponentService.test.js:140-153` | ✅ PASS |
| OPP-03.4 delete confirmation names game count | message contains exact count | `Games.test.jsx:1150-1163` (`/1 game use this opponent/`) | ✅ PASS |
| OPP-03.5 confirmed delete removes opponent, games unchanged | opponent gone, 1 game still has stored name "Benfica" | `Games.test.jsx:1184-1202` | ✅ PASS |
| OPP-03.6 cancelled delete changes nothing | opponent still present after cancel | `Games.test.jsx:1204-1219` | ✅ PASS |
| OPP-03.7 empty list shows invitation | exact copy "No opponents yet. Add your first one below." | `OpponentsPopup.test.jsx:36-44` | ✅ PASS |
| OPP-03.8 rejected name shows reason, keeps typed value | error text rendered, input retains "Porto" | `OpponentsPopup.test.jsx:87-106` | ✅ PASS |
| Edge: leading/trailing whitespace trimmed | stored name has no surrounding whitespace | `opponentService.test.js:74-77` | ✅ PASS |
| Edge: colliding rename rejected before write | `ValidationError`, games collection unchanged | `opponentService.test.js:177-191` | ✅ PASS |
| Edge: pure-case rename allowed and cascades | name updates to new case, game's opponent follows | `opponentService.test.js:125-131`, `193-202` | ✅ PASS |
| Edge: opponent/standings rival-row independence | standings collection **unchanged** (deep equal) after rename; row still named "Porto" | `opponentService.test.js:155-175` — this is opponents-specific (not present in `20`'s test suite); genuinely exercised (see sensor mutation 4 below, which flips this to touched and the test catches it) | ✅ PASS |
| Edge: delete while form open doesn't crash | out of scope for `21` (owned by `22`) | — | N/A (correctly deferred per spec) |
| Edge: storage-quota surfaces error on create | error text `/storage quota exceeded/i` rendered, list state preserved | `OpponentsPopup.test.jsx:108-127` | ✅ PASS |
| T4 "rename awaited before list re-reads" (AD-004) | `update` resolves before second `getAll` fires; list shows new name | `OpponentsPopup.test.jsx:194-215` | ✅ PASS |
| T5 "zero-count delete states zero, not blank" | message contains "0 games use this opponent" | `Games.test.jsx:1165-1182` | ✅ PASS |
| T5 header holds both controls without disturbing add-game button/layout | Competitions + Opponents buttons + `.bg-blue-500` add button all present | `Games.test.jsx:1139-1148` | ✅ PASS |
| T3 20-item list scroll regression (POPUP-02) | scroll container excludes form/Add button, Add button still present | `OpponentsPopup.test.jsx:260-279` | ✅ PASS |
| T2 store two versions behind runs both migrations | ends at v3, opponents = `["Benfica","Porto"]`, competitions = `["Cup","League"]` | `store.test.js:246-262` | ✅ PASS |
| T2 fresh install seeds directly, no migration run | `getCollection("opponents")` equals `createSeed().opponents` | `store.test.js:264-269` | ✅ PASS |

**Status**: ✅ All ACs covered — 0 spec-precision gaps found. Every criterion in spec.md's three P1 stories and all listed edge cases (save the one explicitly deferred to feature `22`) trace to a specific assertion matching the spec-defined outcome.

---

## Discrimination Sensor

All mutations applied to the real tree in sequence, tested, then reverted via `git checkout --`; `git status --short` confirmed clean before and after each.

| # | File:line | Description | Killed? |
| - | --- | --- | --- |
| 1 | `src/services/opponentService.js` (`normalize`) | Made duplicate-name match case-**sensitive** (`normalize` stopped lowercasing) | ✅ Killed — 2 tests failed (`opponentService.test.js:84-87` case-duplicate reject, `:96-104` non-persistence) |
| 2 | `src/services/opponentService.js` (`create`) | Removed the `assertNoDuplicate(...)` call from `create`, so duplicate names are silently accepted | ✅ Killed — 4 tests failed (exact, case, whitespace duplicate rejection + non-persistence) |
| 3 | `src/services/store.js` (`distinctGameFieldValues`) | Made the migration dedup key case-sensitive (`key = trimmed` instead of `trimmed.toLowerCase()`) | ✅ Killed — 2 tests failed: `store.test.js:93` (competitions dedup, shared helper) and `store.test.js:197` (opponents dedup, AC OPP-02.2) |
| 4 | `src/services/opponentService.js` (`update`) | Made the rename cascade also update a standings row sharing the old name (added a `standingsService.update` call inside the rename cascade) | ✅ Killed — `opponentService.test.js:173` ("does not touch a standings rival row sharing the old name") failed: standings row's name changed to "FC Porto" when it should have stayed "Porto" |

**Sensor depth**: lightweight (4 targeted mutations; one extra beyond the 1–3 default because the rival-row-independence boundary is the feature's most distinctive and highest-risk new behavior)
**Result**: 4/4 killed — PASS ✅

---

## Code Quality

| Principle | Status |
| --- | --- |
| No features beyond what was asked | ✅ — scope matches T1-T5, no game-form wiring (correctly deferred to `22`) |
| No abstractions for single-use code | ✅ |
| No unnecessary "flexibility" added | ✅ |
| Only touched files required for task | ✅ — `opponentService.js`, `store.js`, `seed.js`, `OpponentsPopup.jsx`, `Games.jsx`, and their tests |
| Didn't "improve" unrelated code | ✅ |
| Matches existing patterns/style | ✅ — mirrors `CompetitionsPopup.jsx`/`competitionService.js` structure; duplication is explicitly permitted by spec's executor note since `20` hasn't merged to `main` |
| Would senior engineer approve? | ✅ |
| Tests map to ACs and are non-shallow | ✅ — spot-checked P1 "Manage opponents" story end-to-end (create/rename/delete/cancel/empty/error) across service, component and page test layers |
| Spec-anchored outcome check | ✅ — see AC table above |
| Per-layer coverage: domain 1:1 AC mapping; routes/e2e happy+edge+error | ✅ — service layer covers every branch (create/update/delete × valid/duplicate/missing/case); page layer covers happy, zero-count, cancel |
| Every test in scope maps to a spec AC/edge case/Done-when item | ✅ — no unclaimed tests found; every test name/comment cites an AC or edge case |
| Documented guidelines followed | ✅ — AD-003 (`newId()`), AD-004 (copy semantics + await-before-reread), AD-010/AD-008 (opponent vs. standings model independence), `.specs/STATE.md` |

---

## Edge Cases

- [x] Leading/trailing whitespace trimmed on store
- [x] Colliding rename rejected before anything written
- [x] Pure-case rename allowed and cascades
- [x] Opponent/rival-row independence (rename doesn't touch standings) — verified both by direct test and by discrimination sensor mutation 4
- [ ] Delete while game form is open doesn't crash — out of scope for `21`, correctly deferred to `22` per spec's Out-of-Scope table
- [x] Storage-quota failure on create surfaces the error

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: lint clean (0 errors/warnings), build succeeded (`dist/` produced, 1.57s), tests: **1026 passed, 0 failed** across 55 test files
- **New test files/additions for this feature**: `opponentService.test.js` (+222 lines, 22 tests), `store.test.js` (+119 lines, opponents describe block: 9 tests), `OpponentsPopup.test.jsx` (+279 lines, 16 tests), `Games.test.jsx` (+96 lines, "Opponents manager (feature 21)" block: 6 tests) — 707 lines / ~53 new assertions of test code added on top of `20-competitions`
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

None — no gaps found.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| OPP-01 | Done (self-reported) | ✅ Verified |
| OPP-02 | Done (self-reported) | ✅ Verified |
| OPP-03 | Done (self-reported) | ✅ Verified |
| OPP-04 | Done (self-reported) | ✅ Verified |
| OPP-05 | Done (self-reported) | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 27/27 ACs and listed edge cases matched their spec-defined outcome (1 edge case correctly out of scope, deferred to `22`); 0 spec-precision gaps
**Sensor**: 4/4 mutations killed
**Gate**: lint clean, build clean, 1026/1026 tests passed

**What works**: Collection, service (create/update/delete with validation), v2→v3 migration (composes correctly with `20`'s v1→v2 when a store is two versions behind), manager popup (list/create/rename/delete/empty/error/scroll states), Games page wiring, and — the feature's distinguishing behavior — genuine independence between an opponent and a same-named standings rival row (proven both by a dedicated test and by a discrimination-sensor mutation that the test catches).

**Issues found**: none

**Next steps**: none — feature is ready to merge pending `20-competitions`'s own merge (this branch was forked from it).
