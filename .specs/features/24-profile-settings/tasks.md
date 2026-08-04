# Profile Settings Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/24-profile-settings/spec.md`
**Design**: not required
**Status**: Draft
**Batches**: 5 tasks → 1 batch, execute inline (no sub-agents)

**Note for the executor**: read the spec's "⚠️ This is not authentication"
section before writing a line. The goal is a **consistent mock**, not a secure
one. Do not add hashing, tokens or session expiry — they would imply a security
property this design does not have.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. `src/context/AuthContext.jsx` has no test file today; T1 creates one.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Context (`src/context/*.jsx`) | unit | Every branch of signIn/signUp/update/changePassword; every listed edge case | `src/context/__tests__/*.test.jsx` | `npm test` |
| Pages (`src/pages/*.jsx`) | integration | Form validation, feedback, and the sign-out/sign-in round trip | `src/pages/__tests__/*.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After context-only tasks | `npx vitest run <path/to/file>` |
| Full | After tasks touching pages | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Make the mock consistent

```
T1 → T2
```

### Phase 2: The profile form

```
T3 → T4 → T5
```

---

## Task Breakdown

### T1: Store and check credentials

**What**: `signIn` checks the stored user; `signUp` stops discarding the password.
**Where**: `src/context/AuthContext.jsx` (modify), `src/context/__tests__/AuthContext.test.jsx` (new)
**Depends on**: None
**Reuses**: The existing `user` localStorage key and its read on mount
**Requirement**: PROF-01, PROF-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `signUp` stores the chosen password and a later `signIn` with that pair succeeds (AC PROF-01.1, PROF-02) — the `_password` parameter stops being discarded
- [ ] With a stored user, `signIn` checks the submitted pair against it (AC PROF-01.2)
- [ ] With no stored user, the demo pair still works (AC PROF-01.3) — assert it, since every existing test and the README depend on it
- [ ] A stored user with no `password` field accepts the demo password (AC PROF-01.4) — the in-flight-session case
- [ ] A failed sign-in returns the existing message and does not distinguish a wrong email from a wrong password (AC PROF-01.5)
- [ ] Sign-out leaves the stored credentials intact and a later sign-in succeeds (AC PROF-01.6) — note this changes what `signOut` removes; assert both that the session is cleared and the credentials survive
- [ ] Email comparison is case-insensitive and whitespace-trimmed; password comparison is neither (edge case) — assert all four combinations
- [ ] A corrupt `user` value in `localStorage` is treated as signed out instead of throwing from `JSON.parse` (edge case)
- [ ] A legacy stored user with `username` and no `name` is read as having that name (edge case)
- [ ] Gate passes: `npm test`
- [ ] Test count: 18+ tests pass

**Tests**: unit
**Gate**: full

**Commit**: `feat(auth): make the mock honour the credentials it stores`

---

### T2: Add `updateProfile` and `changePassword`

**What**: Two context methods with their validation.
**Where**: `src/context/AuthContext.jsx` (modify)
**Depends on**: T1
**Reuses**: The `{ success, message }` result shape `signIn`/`signUp` already return — do not invent a second convention
**Requirement**: PROF-03, PROF-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `updateProfile({ name, email })` persists both and updates the context user (AC PROF-03.2, PROF-03.3)
- [ ] An invalid email is rejected and nothing is written (AC PROF-03.4) — assert the stored value is unchanged, not just that a message came back
- [ ] An empty or whitespace-only name is rejected and nothing is written (AC PROF-03.5)
- [ ] The email is trimmed before storing (edge case)
- [ ] `changePassword({ current, next, confirm })` rejects a wrong current password without altering the stored one (AC PROF-04.2)
- [ ] It rejects a mismatched confirmation (AC PROF-04.3) and an empty new password (AC PROF-04.4)
- [ ] A successful change keeps the user signed in and makes the next sign-in require the new password while rejecting the old one (AC PROF-04.6) — assert both directions
- [ ] A storage failure returns a failure result rather than reporting success (edge case)
- [ ] Both methods return the same `{ success, message }` shape as the existing ones
- [ ] Gate passes: `npm test`
- [ ] Test count: 20+ tests pass

**Tests**: unit
**Gate**: full

**Commit**: `feat(auth): add profile and password updates`

---

### T3: Build the profile form

**What**: The editable name/email form in the `23` Profile tab.
**Where**: `src/pages/Settings.jsx` (modify), `src/pages/__tests__/Settings.test.jsx` (modify)
**Depends on**: T2
**Reuses**: The `23` Profile panel; the inline-error pattern used across the popups
**Requirement**: PROF-05, PROF-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Name and email fields render pre-filled from the current user (AC PROF-03.1)
- [ ] Saving a changed name updates the displayed value with no page reload (AC PROF-03.2)
- [ ] An invalid email and an empty name each render their message and save nothing (AC PROF-03.4, PROF-03.5)
- [ ] A failed save keeps the typed values in the form (edge case)
- [ ] A successful save renders an explicit confirmation (AC PROF-03.6)
- [ ] The read-only display added by `23` T2 is replaced, not duplicated
- [ ] Gate passes: `npm test`
- [ ] Test count: 12+ tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(settings): edit name and email from the profile tab`

---

### T4: Build the password form

**What**: The three-field change-password form.
**Where**: `src/pages/Settings.jsx` (modify)
**Depends on**: T3
**Reuses**: `changePassword` from T2
**Requirement**: PROF-05, PROF-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Current, new and confirm fields render as password inputs (AC PROF-04.1)
- [ ] A wrong current password, a mismatched confirmation and an empty new password each render their own distinct message (AC PROF-04.2–PROF-04.4) — assert three different messages, so one catch-all cannot pass
- [ ] A successful change clears all three fields, confirms, and leaves the user signed in (AC PROF-04.5)
- [ ] A failed change leaves the fields as typed (edge case)
- [ ] The form is a separate `<form>` from the name/email form, so submitting one does not submit the other
- [ ] Gate passes: `npm test`
- [ ] Test count: 12+ tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(settings): change the password from the profile tab`

---

### T5: Prove the round trip and document the limitation

**What**: The end-to-end guarantee, plus an honest note in the code and the docs.
**Where**: `src/pages/__tests__/Settings.test.jsx` (modify), `src/context/AuthContext.jsx` (comment), `docs/` (modify), `CLAUDE.md` (modify)
**Depends on**: T4
**Reuses**: nothing
**Requirement**: PROF-01, PROF-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] An integration test covers: change the email and password → sign out → the old pair is rejected → the new pair signs in (AC PROF-04.6)
- [ ] A test covers: edit the profile → reset demo data → the profile is unchanged and the user is still signed in (edge case)
- [ ] `AuthContext.jsx` carries a comment stating plainly that credentials are plaintext in `localStorage` and that this is a mock, not authentication
- [ ] `CLAUDE.md`'s Auth section is updated — it currently documents the old hard-coded-pair-only behaviour, which this feature changes
- [ ] The `docs/` page covering auth records the same limitation
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 6+ tests pass

**Tests**: integration
**Gate**: build

**Commit**: `test(auth): cover the credential round trip and document the mock`

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ──→ T2
Phase 2:  T3 ──→ T4 ──→ T5
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Credential storage | 1 module, 2 methods | ✅ Granular |
| T2: Update methods | 1 module, 2 methods | ✅ Granular |
| T3: Name/email form | 1 page, 1 form | ✅ Granular |
| T4: Password form | 1 page, 1 form | ✅ Granular |
| T5: Round trip + docs | tests + docs | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | Phase 1 → Phase 2 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Context | unit | unit | ✅ OK |
| T2 | Context | unit | unit | ✅ OK |
| T3 | Page | integration | integration | ✅ OK |
| T4 | Page | integration | integration | ✅ OK |
| T5 | Page + docs | integration | integration | ✅ OK |
