# Auth Mock Hardening Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/36-auth-mock-hardening/spec.md`
**Design**: not required
**Status**: Not started
**Batches**: 4 tasks → 1 batch, execute inline

---

## Test Coverage Matrix

> No dedicated testing-standards doc beyond `CLAUDE.md`'s command list. Guidelines found: none — strong defaults applied, floored against `AuthContext.test.jsx`'s existing depth (29 tests today, hook-level via `renderHook`/a test harness component, not through `SignUp.jsx`'s DOM).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Context (`AuthContext.jsx`) | unit (hook-level, matching existing file's convention) | 1:1 to spec ACs; every listed edge case | `src/context/__tests__/AuthContext.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After a single-file task | `npx vitest run src/context/__tests__/AuthContext.test.jsx` |
| Build | After the final task | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Both fixes

```
T1 → T2
```

### Phase 2: Docs

```
T3 → T4
```

---

## Task Breakdown

### T1: signUp validates username, email and password

**What**: Add three checks (username non-empty after trim, email matches `EMAIL_PATTERN`, password non-empty) ahead of the account write, preserving the existing duplicate-email check's position and message.
**Where**: `src/context/AuthContext.jsx` (modify), `src/context/__tests__/AuthContext.test.jsx` (modify)
**Depends on**: None
**Reuses**: `EMAIL_PATTERN` (already defined, already used by `updateProfile`); the `"cannot be empty"` message phrasing `updateProfile`/`changePassword` already establish
**Requirement**: AUTH-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `signUp` checks, in order: duplicate email (existing, unchanged) → username non-empty (trimmed) → email format → password non-empty
- [ ] An invalid email returns `{ success: false, message: "Enter a valid email address" }` and writes nothing to `localStorage` (AC AUTH-01.1)
- [ ] An empty/whitespace-only username returns `{ success: false, message: "Username cannot be empty" }` and writes nothing (AC AUTH-01.2)
- [ ] An empty password returns `{ success: false, message: "Password cannot be empty" }` and writes nothing (AC AUTH-01.3)
- [ ] The existing "Email already taken" check still fires first and is unaffected (AC AUTH-01.4, regression guard)
- [ ] Valid input still succeeds exactly as before (AC AUTH-01.5)
- [ ] The whitespace-only-username edge case is covered
- [ ] Gate passes: `npx vitest run src/context/__tests__/AuthContext.test.jsx`
- [ ] Test count: existing count (29) + 6

**Tests**: unit
**Gate**: quick

**Commit**: `fix(auth): validate signUp's username, email and password`

---

### T2: Sign-out survives a refresh (AD-018)

**What**: Introduce a second `localStorage` key (`"session"`, value `"active"`) tracking whether anyone is currently signed in, separate from the `"user"` key that stores the account. `signIn`/`signUp` set it on success; `signOut` removes it; the mount effect only restores `user` when both the account record and the session flag are present.
**Where**: `src/context/AuthContext.jsx` (modify), `src/context/__tests__/AuthContext.test.jsx` (modify)
**Depends on**: T1 (same file — sequenced to avoid two tasks racing edits, not a functional dependency)
**Reuses**: nothing new — one more `localStorage.setItem`/`removeItem`/`getItem` call, same primitive already used for the `"user"` key
**Requirement**: AUTH-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A `SESSION_KEY = "session"` constant; `signIn` and `signUp` call `localStorage.setItem(SESSION_KEY, "active")` on every success path (including the hard-coded demo-pair path)
- [ ] `signOut` calls `localStorage.removeItem(SESSION_KEY)` in addition to `setUser(null)` — the `"user"` key is untouched (regression guard on the existing "credentials survive sign-out" behavior)
- [ ] The mount effect only calls `setUser(readStoredUser())` when `localStorage.getItem(SESSION_KEY) === "active"` AND a valid stored user exists; otherwise `user` stays `null`
- [ ] Signing out then remounting the provider (simulating a refresh) leaves `user` as `null` (AC AUTH-02.2) — tested by unmounting/remounting a test harness component, not just asserting state after a synchronous call
- [ ] The same account's correct credentials still sign in successfully after a sign-out (AC AUTH-02.3) — the account record must survive, only the session is cleared
- [ ] A browser that has never signed in (no session key, no user key) behaves exactly as before: signed out, demo credentials work (AC AUTH-02.4)
- [ ] Edge case: a session flag present with no/corrupt account record is treated as signed out, not a fabricated user
- [ ] Gate passes: `npm test`
- [ ] Test count: existing count (35, after T1) + 5

**Tests**: unit
**Gate**: build

**Commit**: `fix(auth): separate the active session from the stored account (AD-018)`

---

### T3: Update docs/08-authentication.md

**What**: Remove the "known trade-off"/quirk framing now that it's fixed; document the two-key session/account model.
**Where**: `docs/08-authentication.md` (modify)
**Depends on**: T1, T2
**Reuses**: n/a
**Requirement**: n/a (documentation)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The "Sign out" paragraph no longer describes refreshing-after-signout as re-authenticating
- [ ] The `## Session persistence` section documents both `localStorage` keys (`user`, `session`) and what each is responsible for
- [ ] `signUp`'s paragraph documents the new validation
- [ ] Gate passes: `npm run lint && npm run build && npm test`

**Tests**: none (documentation)
**Gate**: build

**Commit**: `docs(auth): document signUp validation and the session/account split`

---

### T4: Record AD-018

**What**: Append the decision to `.specs/STATE.md`.
**Where**: `.specs/STATE.md` (modify)
**Depends on**: T3
**Reuses**: existing `AD-NNN` entry format
**Requirement**: n/a (documentation)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `AD-018` entry added, dated today, `status: active`, matching the wording already promised in `.specs/README.md`'s round-four section (which references AD-018 as "proposed" — this task makes it real)
- [ ] Gate passes: `npm run lint && npm run build && npm test`

**Tests**: none (documentation)
**Gate**: build

**Commit**: `docs(auth): record AD-018 in STATE.md`

---

## Phase Execution Map

```
Phase 1:  T1 ──→ T2
                  │
Phase 2:          └──→ T3 ──→ T4
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: signUp validation | 1 file | ✅ Granular |
| T2: Session/account split | 1 file | ✅ Granular |
| T3: Docs | 1 file | ✅ Granular |
| T4: STATE.md | 1 file | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T1, T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Context | unit | unit | ✅ OK |
| T2 | Context | unit | unit | ✅ OK |
| T3 | Documentation | none | none | ✅ OK |
| T4 | Documentation | none | none | ✅ OK |
