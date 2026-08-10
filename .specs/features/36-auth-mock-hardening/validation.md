# Auth Mock Hardening Validation

**Date**: 2026-08-10
**Spec**: `.specs/features/36-auth-mock-hardening/spec.md`
**Diff range**: `aba2ea6..97433b0` (merge-base `main`..`HEAD` on `feat/auth-mock-hardening`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `signUp` validation added, `src/context/AuthContext.jsx:67-85` |
| T2   | ✅ Done | Session/account split added, same file |
| T3   | ✅ Done | `docs/08-authentication.md` rewritten — quirk framing removed, two-key model documented |
| T4   | ✅ Done | `AD-018` recorded in `.specs/STATE.md:158-165`, dated 2026-08-10, status active |

---

## Spec-Anchored Acceptance Criteria

### P1: signUp rejects the input updateProfile already rejects (AUTH-01)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| WHEN email fails `EMAIL_PATTERN` THEN reject | `{ success: false, message: "Enter a valid email address" }`, no account written | `src/context/__tests__/AuthContext.test.jsx:18-22` — `expect(signUpResult).toEqual({success:false,message:"Enter a valid email address"})`; `expect(localStorage.getItem("user")).toBeNull()` | ✅ PASS |
| WHEN username empty/whitespace-only THEN reject | `{ success: false, message: "Username cannot be empty" }`, no account written | `AuthContext.test.jsx:33-37` (empty) and `:48-51` (whitespace-only, edge case) | ✅ PASS |
| WHEN password empty THEN reject | `{ success: false, message: "Password cannot be empty" }`, no account written | `AuthContext.test.jsx:62-66` | ✅ PASS |
| WHEN duplicate demo email THEN reject unchanged | `{ success: false, message: "Email already taken" }` | `AuthContext.test.jsx:77-80` | ✅ PASS |
| WHEN valid input THEN succeed as before | `{ success: true }`, user set with `username`/`email` | `AuthContext.test.jsx:91-95` | ✅ PASS |

### P2: Signing out and refreshing does not silently re-authenticate (AUTH-02)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| WHEN signed-in user calls `signOut` THEN app shows signed out immediately | `user` is `null` right after the call | `AuthContext.test.jsx:253` — `expect(result.current.user).toBeNull()` (synchronous, no remount) | ✅ PASS |
| WHEN `signOut` called and app remounts THEN mount effect does NOT restore user | `user` is `null` after unmount/remount | `AuthContext.test.jsx:100-114`, assertion at `:113` — `expect(remounted.result.current.user).toBeNull()` | ✅ PASS |
| WHEN `signOut` called and correct email/password submitted to `signIn` afterward THEN succeeds | `{ success: true }`, account survives | `AuthContext.test.jsx:258-275`, assertion `:274`; also `:161-175` | ✅ PASS |
| WHEN never signed in on a browser THEN behaves exactly as before | signed out, demo credentials work | `AuthContext.test.jsx:149-158`, assertion `:157` — `expect(signInResult).toEqual({success:true})` | ✅ PASS |

**Status**: ✅ All ACs covered — every asserted value matches the spec-defined exact outcome (message strings, `success` booleans, `null`/non-`null` user state). No spec-precision gaps.

---

## Edge Cases

- [x] Whitespace-only username treated as empty — `AuthContext.test.jsx:40-52`
- [x] Session flag present, no/corrupt account record → treated as signed out — `AuthContext.test.jsx:131-136`
- [x] `signIn` against the hard-coded demo pair also sets the session flag, surviving a remount — `AuthContext.test.jsx:138-147`

---

## Discrimination Sensor

Scratch state only: mutations applied directly to the working tree, `git checkout -- src/context/AuthContext.jsx` used to discard after each, tree confirmed clean (`git status --short`) before moving to the next.

| # | File:line | Description | Killed? |
| - | --- | --- | --- |
| 1 | `src/context/AuthContext.jsx:83` | Removed `localStorage.setItem(SESSION_KEY, "active")` from `signUp`'s success path | ❌ **Survived** — full `AuthContext.test.jsx` suite (40 tests) still passed |
| 2 | `src/context/AuthContext.jsx:87-90` | Reverted `signOut` to not clear `SESSION_KEY` | ✅ Killed — `AuthContext.test.jsx:113` failed (`expected {...} to be null`) |
| 3 | `src/context/AuthContext.jsx:77-79` | Removed `signUp`'s empty-password check | ✅ Killed — `AuthContext.test.jsx:62` failed (`expected {success:false,...} received {success:true}`) |

**Sensor depth**: lightweight (3 mutations)
**Result**: 2/3 killed — ❌ one mutant survived

### Surviving mutant — root cause

No test in the suite exercises `signUp`'s success path with a **remount and no intervening `signOut`/`signIn`**. Every existing test that remounts either:
- calls `signOut` first (so the session key removal masks whether `signUp` ever set it — `AuthContext.test.jsx:100-114`), or
- calls `signIn` after sign-out (`:116-129`, `:138-147`), which independently sets the session flag and would pass even if `signUp` never did.

So a `signUp` that forgets to set the session flag is currently undetectable by the suite — a coach who signs up and refreshes without ever signing out or in again would be silently kicked to `/signin`, which is exactly the class of bug this feature exists to fix, just on `signUp`'s path instead of `signOut`'s. This is a real coverage gap in T2's "Done when" list (which does state "`signIn` **and** `signUp** call `localStorage.setItem(SESSION_KEY, "active")` on every success path" as a requirement, but the tests only assert this indirectly for `signIn`).

**Fix task** (see below) recommended before closing the feature.

---

## Grep Sweep — Missed "signed in via direct localStorage write" Test Pattern

Command run: `grep -rn 'localStorage.setItem("user"' src --include="*.test.jsx"`

| File:line | Simulates signed-in without `signIn`/`signUp`? | Session key added? | Needs it? |
| --- | --- | --- | --- |
| `src/context/__tests__/AuthContext.test.jsx:212` | Yes (`signIn`'s own "no password field" test) — but this test calls `signIn` itself afterward, not asserting pre-signIn signed-in state | n/a | No — test doesn't assert a signed-in render before calling `signIn` |
| `src/context/__tests__/AuthContext.test.jsx:384` | Yes (corrupt JSON test) — asserts `user` is `null`, i.e. signed-out, by design | n/a | No — the test's whole point is that this state is *not* signed in |
| `src/context/__tests__/AuthContext.test.jsx:408` (in the "legacy `username`→`name`" test, `:403-412`) | Yes | ✅ `session` set at `:408` | Confirmed fixed |
| `src/components/__tests__/Sidebar.test.jsx:43` | Writes `"user"` directly, then renders `<Sidebar>` and clicks Logout, asserting the account record survives in `localStorage` | Not added | **No** — `Sidebar.jsx` never reads `user` from `useAuth()` (only destructures `signOut`); the test doesn't assert any signed-in-dependent render or state, only that `signOut` leaves the account key untouched, which is true regardless of session state. Confirmed a false-positive match, not a missed regression. |
| `src/__tests__/App.test.jsx:7-11` (`signIn()` helper) | Yes | ✅ `session` set at `:11` | Confirmed fixed |
| `src/pages/__tests__/Settings.test.jsx:27-28` (`beforeEach`) | Yes | ✅ `session` set at `:28` | Confirmed fixed |

**Sweep result**: the three claimed fixes (`AuthContext.test.jsx`, `App.test.jsx`, `Settings.test.jsx`) are complete and correct. One additional match (`Sidebar.test.jsx:43`) was found and manually verified to be a false positive — `Sidebar` doesn't consume `user` state, so the test's assertions are unaffected by the session model change. **No missed regression.**

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — 3 `if` checks + 1 constant + 3 `localStorage` calls, nothing more |
| Surgical changes | ✅ — only `AuthContext.jsx`, its test file, `docs/08-authentication.md`, `.specs/STATE.md` touched |
| No scope creep | ✅ — `signIn` input validation explicitly out of scope per spec, untouched |
| Matches patterns | ✅ — reuses `EMAIL_PATTERN`, mirrors `updateProfile`'s `"cannot be empty"` message family, one `localStorage` key per concern (matches `src/lib/storage.js`'s stated pattern) |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ — context-only feature, all 5+4 ACs and 3 edge cases have 1:1 tests |
| Every test maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed | none — strong defaults applied, per `tasks.md`'s own Test Coverage Matrix note |

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: lint clean (0 errors); build succeeded (`dist/` produced, 1.80s); **1441 passed, 0 failed, 0 skipped** (68 test files)
- **Test count before feature** (true pre-feature baseline, merge-base `aba2ea6`, via `git worktree add`): **1430** (68 files)
- **Test count after feature**: **1441** (68 files)
- **Delta**: **+11** — matches tasks.md's stated expectation exactly (T1: +6, T2: +5)
- **Skipped tests**: none
- **Failures**: none
- Baseline worktree at `/tmp/scratch-baseline` removed after comparison (`git worktree remove --force`); confirmed via `git worktree list` that only the main working tree remains.

Note: `main`'s current tip (`c5eac99`, feature #38) is ahead of this branch's fork point and was not used for the baseline — using it directly would have shown a false file-count delta (`TeamCard.test.jsx` exists on `main` but not on this branch, unrelated to feature 36). The merge-base (`aba2ea6`) was used instead for an apples-to-apples comparison.

---

## Fix Plans

### Fix 1: `signUp` forgetting to set the session flag is not caught by any test

- **Root cause**: All tests that remount after `signUp` also call `signOut` or `signIn` in between, which independently exercise the session-flag write/removal. No test isolates "sign up, then remount with no other auth call."
- **Fix task**: Add a test to `src/context/__tests__/AuthContext.test.jsx` (near the existing session-persistence `describe` block, `:99-159`): call `signUp(...)`, `unmount()`, `renderAuth()` again, and assert the remounted `user` matches the signed-up account (mirroring the existing demo-pair remount test at `:138-147` but starting from `signUp` instead of `signIn`).
- **Priority**: Minor — the underlying implementation is correct (`AuthContext.jsx:83` does set the session flag); this is a test-coverage gap, not a shipped defect. Does not block the P1/P2 acceptance criteria, all of which are independently covered.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| AUTH-01 | Implementing | ✅ Verified |
| AUTH-02 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ⚠️ Issues (one Minor, non-blocking coverage gap; recommend closing before calling the feature fully done, but does not represent a shipped defect)

**Spec-anchored check**: 9/9 ACs matched spec outcome, 0 spec-precision gaps
**Sensor**: 2/3 mutations killed (1 survived — see Fix 1)
**Gate**: 1441 passed, 0 failed, 0 skipped; lint clean; build clean

**What works**: Both `signUp` validation (AUTH-01) and the session/account split (AUTH-02) behave exactly per spec, evidenced by exact-value assertions (not just "an assertion exists"). Docs (`08-authentication.md`) and `STATE.md` (AD-018) are both updated accurately and consistently with the code. The independent grep sweep for the flagged "direct localStorage write" test-regression pattern found the three claimed fixes correct and complete, plus one additional match that was verified to be a false positive (unaffected by the change).

**Issues found**: Fix 1 above — `signUp`'s session-flag write has no isolated test; a regression there would currently go undetected.

**Next steps**: Add the one recommended test (Fix 1). Not a blocker for merge given the implementation itself is correct and every spec AC is otherwise fully covered, but should be added before this feature is considered to have airtight regression protection.

---

## Follow-up (implementer, not the Verifier — added after the pass above)

Fix 1 was closed in commit `8002e12`, not deferred: added a test in `AuthContext.test.jsx`'s session-persistence block that signs up, remounts with no `signOut`/`signIn` in between, and asserts the account is restored — isolating `signUp`'s own session-flag write from every other path that also happens to set it. Verified by removing `localStorage.setItem(SESSION_KEY, "active")` from `signUp`'s success path locally, confirming exactly this one new test fails (naming the right symptom: `user` comes back `null` instead of the signed-up account), then reverting.

Full suite re-run after the fix: 1442 passed, 0 failed (+1 vs. this validation's own 1441 baseline). Lint and build clean.

This section is written by the implementer for transparency, not a second independent verification pass — the sensor result and verdict above remain the Verifier's own, unedited.
