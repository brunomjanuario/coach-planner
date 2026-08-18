# Backend Integration Validation

**Date**: 2026-08-18
**Spec**: `.specs/features/39-backend-integration/spec.md`
**Diff range**: `c5eac99..main` (HEAD `adaced1`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | Error types added — `src/lib/errors.js`, `src/lib/__tests__/errors.test.js` |
| T2   | ✅ Done | `src/lib/tokenStore.js` |
| T3   | ✅ Done | `src/lib/dates.js` |
| T4   | ✅ Done | `.env.example` present, `.env` gitignored |
| T5   | ✅ Done | `src/lib/apiClient.js` |
| T6   | ✅ Done | `AuthContext` sign-up/sign-in/sign-out rewired |
| T7   | ✅ Done | Boot-time silent refresh + profile/password |
| T8   | ✅ Done | Wiring confirmed; T8a superseded manual-only claim with automated tests |
| T8a  | ✅ Done | `App.test.jsx`/`Settings.test.jsx` rewritten against real `AuthContext` |
| T9   | ✅ Done | `teamService` → API, cascade calls removed |
| T10  | ✅ Done | `trainingService` → API, `trainingNumber.js` deleted |
| T11  | ✅ Done | `gameService` → API, `?status=` querystring |
| T12  | ✅ Done | `standingsService` rival-row CRUD → API |
| T13  | ✅ Done | `cardService`/`ratingService` → API, cascade helpers deleted from exports |
| T14  | ✅ Done | `competitionService`/`opponentService` → API, single-PATCH cascade |
| T15  | ✅ Done | `store.js`, `model/mock.js`, `store.test.js` deleted |
| T16  | ✅ Done | Docs + CLAUDE.md updated to describe real API |
| T17  | ✅ Done | `standingsService.getTable`, `Games.jsx` renders server table, `lib/standings.js` deleted |
| T18  | ✅ Done | spec.md amended (F5 AC8, F6 AC9); `.specs/STATE.md`/`README.md` not re-checked in depth (out of this feature's code-diff scope) but spec.md amendment itself verified correct |
| T19  | ✅ Done | `src/test/fakeApi.js` + `fakeApi.test.js`, stateful at the `apiFetch` seam |
| T20  | ✅ Done | `Settings.test.jsx` migrated, dead reset-demo-data tests removed (sanctioned deletion) |
| T21  | ✅ Done | `GameCardsSection.test.jsx`, `GameResultPopup.test.jsx` |
| T22  | ✅ Done | `PlayerCard.test.jsx`, `PlayerRatingHistory.test.jsx` |
| T23  | ✅ Done | `SquadRanking.test.jsx`, `SquadRatingPopup.test.jsx` |
| T24  | ✅ Done | `Games.test.jsx`, `Home.test.jsx` — league table moved to server-computed shape |
| T25  | ✅ Done | `Teams.test.jsx`, `Trainings.test.jsx` |
| T26  | ✅ Done | `TeamCard.test.jsx`, `ReferenceListsPopup.test.jsx`, `TrainingDetailsPopup.test.jsx`, `TrainingSavePopup.test.jsx` (incl. the `test.skip` rewrite via `fakeApi.forceFailure`) |
| T27  | ✅ Done | Full-suite green re-confirmed independently (see Gate Check) |

All 27 tasks confirmed done by direct inspection of source/tests, not just the tasks.md checkmarks.

---

## Spec-Anchored Acceptance Criteria

### F1: Shared HTTP client

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: bearer header attached | `Authorization: Bearer <token>` on authenticated requests | `src/lib/__tests__/apiClient.test.js:60-67` — asserts header present/absent | ✅ PASS |
| AC2: token-expired 401 → one refresh + one retry | refresh called once, original request retried, result returned | `apiClient.test.js:69-85` — `toHaveBeenCalledTimes(3)`, retry carries new token | ✅ PASS |
| AC2b: concurrent 401s dedupe to one refresh | exactly 1 `/auth/refresh` call across 2 concurrent requests | `apiClient.test.js:87-114` — `expect(refreshCalls).toHaveLength(1)` | ✅ PASS (confirmed via mutation — see Sensor #4) |
| AC3: refresh failure → sign-out, not raw error | tokens cleared, `AuthError` thrown, auth-failure handler notified | `apiClient.test.js:116-137` | ✅ PASS |
| AC4: RFC 9457 → typed errors | 404→NotFound, 400→Validation(+errors), 409→Conflict, 401→Auth, other→Api(status) | `apiClient.test.js:140-179` | ✅ PASS |
| AC5: fetch rejection → NetworkError | distinguishable from AC4 errors | `apiClient.test.js:180-183` | ✅ PASS |
| AC6: boot silent refresh before `loading` resolves | no bounce to `/signin` on valid session reload | `AuthContext.test.jsx:168-206` | ✅ PASS |

### F2: Real authentication

| Criterion | Spec outcome | Evidence | Result |
| --- | --- | --- | --- |
| AC1 signUp success | POST /auth/register, tokens+user set, `{success:true}` | `AuthContext.test.jsx:25-47` | ✅ PASS |
| AC2 signUp 409 | `{success:false,message}`, no mutation | `AuthContext.test.jsx:48-62` | ✅ PASS |
| AC3 signUp 400 | message from field errors | `AuthContext.test.jsx:63-79` | ✅ PASS |
| AC4 signIn success | POST /auth/login, tokens+user, `{success:true}` | `AuthContext.test.jsx:80-102` | ✅ PASS |
| AC5 signIn 401 | fixed generic message, no distinguishing logic | `AuthContext.test.jsx:103-117` | ✅ PASS |
| AC6 signOut | best-effort POST /auth/logout, clears tokens+user | `AuthContext.test.jsx:118-167` | ✅ PASS |
| AC7 boot, no refresh token | `loading:false`, `user:null`, no API call | `AuthContext.test.jsx:168-177` | ✅ PASS |
| AC8 no demo credential special-casing | no `DEMO_EMAIL`/`DEMO_PASSWORD` in source | `grep` over `src/context/AuthContext.jsx` — zero hits | ✅ PASS |

### F3: Profile management

| Criterion | Evidence | Result |
| --- | --- | --- |
| AC1 `user` from GET /users/me | `AuthContext.test.jsx:178-191` | ✅ PASS |
| AC2 updateProfile PATCH /users/me | `AuthContext.test.jsx:207-242` | ✅ PASS |
| AC3 local reject on mismatch | `AuthContext.test.jsx:243-259` | ✅ PASS |
| AC4 changePassword PUT + revoke + sign-out | `AuthContext.test.jsx:260-296` | ✅ PASS |

### F4: Teams and players (cascade removal, F4 AC4/AC7)

| Criterion | Evidence | Result |
| --- | --- | --- |
| AC1-3, AC5-6 CRUD → correct endpoints | `src/services/__tests__/teamService.test.js` (path/method assertions throughout) | ✅ PASS |
| AC4 `delete` — no cascade call | `teamService.test.js:93-99` — `expect(cardService.removeByPlayer).not.toHaveBeenCalled()` etc. | ✅ PASS |
| AC7 `deletePlayer` — no cascade call | `teamService.test.js:160-166` | ✅ PASS |

### F5: Trainings and exercises

| Criterion | Evidence | Result |
| --- | --- | --- |
| AC1-6 CRUD/query endpoints | `src/services/__tests__/trainingService.test.js` | ✅ PASS |
| AC7 `delete` — no `ratingService.removeByEvent` call | `trainingService.test.js:103-109` — `not.toHaveBeenCalled()` | ✅ PASS |
| AC8 (amended) exercises round-trip via array in `POST`/`PATCH /trainings` | `spec.md:274-282` amendment matches `src/services/trainingService.js:10-20` comment + implementation | ✅ PASS |

### F6: Games and standings

| Criterion | Evidence | Result |
| --- | --- | --- |
| AC1-5, 7-8 endpoints | `src/services/__tests__/gameService.test.js` | ✅ PASS |
| AC2 `?status=` querystring, not fetch-all-then-filter | `gameService.test.js` (status assertions); killed via Sensor #5 (status-string swap) | ✅ PASS |
| AC6 `delete` — no card/rating cascade | `gameService.test.js:135-141` — `not.toHaveBeenCalled()` | ✅ PASS |
| AC9 (resolved by T17) server-computed table via `getTable`/`GET /standings?teamId=` | `src/services/standingsService.js:38-42`, `src/pages/Games.jsx:69-80`, `standingsService.test.js` asserts `getTable` querystring | ✅ PASS |

### F7: Cards and ratings

| Criterion | Evidence | Result |
| --- | --- | --- |
| AC1-3, 5-7 endpoints | `src/services/__tests__/cardService.test.js`, `ratingService.test.js` | ✅ PASS |
| AC4 `cardService` no longer exports `removeByGame`/`removeByPlayer` | `cardService.test.js:84-87` — `expect(cardService.removeByGame).toBeUndefined()` | ✅ PASS |
| AC6 `value:0` persists, `value:null` clears | `SquadRatingPopup.test.jsx` round-trip assertions; killed via Sensor #3 (forced-null mutation) | ✅ PASS |
| AC8 `ratingService` no longer exports `removeByEvent`/`removeByPlayer` | `ratingService.test.js:132-135` | ✅ PASS |

### F8: Competitions and opponents

| Criterion | Evidence | Result |
| --- | --- | --- |
| AC1-2, AC4 endpoints, 409→Conflict | `competitionService.test.js`/`opponentService.test.js` | ✅ PASS |
| AC3 single PATCH, no cascade loop | `competitionService.test.js:53-59` — `expect(apiFetch).toHaveBeenCalledTimes(1)` | ✅ PASS |

**Status**: ✅ All ACs covered with `file:line` evidence. No spec-precision gaps found — every criterion in spec.md states a precise outcome and the corresponding test targets that exact outcome.

---

## Discrimination Sensor

Sensor depth: **elevated beyond the default lightweight tier** (5 mutations, not the minimum 3) given this feature's explicit risk profile — the fakeApi tautology risk is called out as the highest-priority item to test. All mutations were applied directly to the working tree (no stash needed — no other changes were pending), tests run, then reverted with `git checkout --`; `git status` confirmed a clean tree after every mutation.

| # | File:line | Description | Killed? |
| - | --- | --- | --- |
| 1 | `src/components/GameCardsSection.jsx:36-38` | Deleted `cardService.record(...)` call from the "Add card" click handler (leaving only the refresh) | ✅ Killed — `GameCardsSection.test.jsx` 4/9 tests failed |
| 2 | `src/components/TeamPopup.jsx:23-31` | Deleted `teamService.create(...)` call from the create-team submit branch | ✅ Killed — `Teams.test.jsx` "creating a team via the popup refreshes the team list" failed |
| 3 | `src/components/SquadRatingPopup.jsx:64` | Forced `value: null` on every `ratingService.setRating` call regardless of entered rating | ✅ Killed — `SquadRatingPopup.test.jsx` 5/16 tests failed |
| 4 | `src/lib/apiClient.js:94` | Removed refresh dedup (`refreshInFlight ??=` → `refreshInFlight =`), causing 2 refresh calls under concurrency | ✅ Killed — `apiClient.test.js` dedup test failed (`expected length 1, got 2`) |
| 5 | `src/services/gameService.js:22-26` | Swapped `"scheduled"`/`"played"` status strings between `getScheduled`/`getPlayed` | ✅ Killed — `gameService.test.js` + `Games.test.jsx`/`Home.test.jsx`: 25/144 tests failed |

**Result**: 5/5 killed — **PASS ✅**. No surviving mutants. Mutations 1–3 directly target the Phase 8 tautology risk (deleted production handlers behind round-trip assertions) and all three were caught by the migrated `fakeApi`-based tests, confirming the stateful fake genuinely exercises production code rather than asserting against a static stub.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — services are thin `apiFetch` wrappers, no speculative abstraction |
| Surgical changes | ✅ — diff is scoped to services/auth/lib/tests; no unrelated refactors observed |
| No scope creep | ✅ |
| Matches patterns | ✅ — `*Service` object-literal shape, `*Popup`/`*Card` conventions preserved |
| Spec-anchored outcome check | ✅ — see AC table above |
| Per-layer coverage (service 1:1 AC mapping; component round-trips happy+edge+error) | ✅ |
| Every test maps to a spec AC / edge case / Done-when | ✅ — spot-checked `teamService.test.js`, `apiClient.test.js`, `SquadRatingPopup.test.jsx`; every `it()` title references an AC or documented behavior |
| Documented guidelines followed | ✅ — `CLAUDE.md`'s Data layer/Auth sections, cited and consistent with code |

---

## Edge Cases (from spec.md)

- [x] API unreachable at boot → silent refresh fails as `NetworkError`, treated as signed-out (not hung) — `AuthContext.test.jsx:192-206`
- [x] Two-tab sign-out → next call 401s, same sign-out flow — no dedicated cross-tab test exists, but this is a direct consequence of F1 AC3/AC4's tested behavior (no cross-tab listener required by spec); not separately unit-tested, acceptable given spec explicitly waives the requirement
- [x] ISO date fields parsed to `Date` before reaching components — `src/lib/__tests__/dates.test.js`, `trainingService`/`gameService` hydrate functions, exercised implicitly throughout `Trainings.test.jsx`/`Games.test.jsx`
- [x] Rating `value: 0` never treated as falsy/absent — `SquadRatingPopup.test.jsx`, `ratingService.test.js`; confirmed via Sensor #3

---

## Gate Check

- **Gate command**: `npm test -- --run`, `npm run build`, `npm run lint`
- **Result (backend running)**: 71/71 test files, 1349/1349 tests passed; build succeeded; lint clean (0 errors/warnings)
- **Result (backend + Postgres fully stopped)**: identical — 71/71 files, 1349/1349 tests passed, confirming zero live-network dependency (the exact regression Phase 8 exists to prevent)
- **Test count before feature**: not independently re-derived (pre-feature baseline commit `c5eac99` not re-run — out of scope per validate.md's diff-surface focus); tasks.md's own claim of "1349/1349, run twice" was independently reproduced verbatim
- **Skipped tests**: none — `grep -rn '\.skip\|\.todo' src/ --include='*.test.*'` returns zero matches
- **Failures**: none

---

## Fix Plans

None. No gaps found.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| HTTP- (F1) | Implementing | ✅ Verified |
| AUTH- (F2) | Implementing | ✅ Verified |
| PROF- (F3) | Implementing | ✅ Verified |
| TEAM-, PLAY- (F4) | Implementing | ✅ Verified |
| TRAIN-, EXER- (F5) | Implementing | ✅ Verified |
| GAME-, STAND- (F6) | Implementing | ✅ Verified |
| CARD-, RATE- (F7) | Implementing | ✅ Verified |
| COMP-, OPP- (F8) | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: All ACs across F1-F8 matched their spec-defined outcome with `file:line` evidence; 0 spec-precision gaps.
**Sensor**: 5/5 mutations killed, weighted toward the fakeApi tautology risk per the task's explicit priority.
**Gate**: 71 files / 1349 tests passed, twice (API up and API fully stopped) — identical counts. Build and lint clean.

**What works**:
- The full 8-service + auth rewiring to the real API, with typed error mapping and refresh dedup, is solid and well-tested.
- Cascade-removal ACs (F4/F5/F6/F7) all have explicit "not called" / "undefined export" assertions, not just end-state checks — this closes the exact gap tasks.md flagged as easy to silently regress.
- Phase 8's `fakeApi` remediation genuinely fixed the tautology risk: three independent mutations deleting production side effects behind "round trip" assertions were all caught.
- Both spec deviations (F5 AC8 array round-trip, F6 AC9 server table) are correctly reconciled between spec.md and the shipped code.
- Zero `test.skip`/`.todo` in the tree; zero live-network dependency in the test suite.

**Issues found**: None.

**Next steps**: None required — feature is ready to be marked done.
