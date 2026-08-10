# Auth Mock Hardening Specification

**Scope:** Medium · **Design:** skipped — one small, well-bounded data-shape decision (AD-018), no new component or pattern
**Depends on:** none (independent of 33-37; only touches `AuthContext.jsx`/`SignUp.jsx` and their tests)

## Problem Statement

Two related gaps in the mock auth module (`src/context/AuthContext.jsx`,
documented as intentionally-a-mock, not real authentication, in
`docs/08-authentication.md`):

1. **`signUp` skips validation `updateProfile` already enforces.**
   `updateProfile` checks the email against `EMAIL_PATTERN` and rejects an
   empty name; `signUp` checks neither its email nor its username nor its
   password — only a duplicate-email check exists. You can register with
   `email: "x"` and an empty password (the HTML `required` attribute on
   `SignUp.jsx`'s inputs protects that one page's own form, but `signUp` is
   exported from the context and callable with anything).
2. **`signOut` doesn't survive a refresh.** `signOut` only calls
   `setUser(null)` — it never touches `localStorage`. The mount effect
   (`useEffect(() => setUser(readStoredUser()), [])`) re-reads
   `localStorage` on every mount, so a refresh immediately after signing out
   silently re-authenticates the user, because the one stored record doubles
   as both "the account that exists" and "whether anyone is currently signed
   in." `docs/08-authentication.md` already documents this as an accepted
   quirk — this feature is what makes it no longer necessary to accept.

## Goals

- [ ] `signUp` rejects the same malformed input `updateProfile` already
      rejects, with the same messages where the check is the same kind
- [ ] Signing out and refreshing the page does NOT silently re-authenticate
- [ ] A stored account survives sign-out exactly as it does today — a later
      `signIn` with the correct credentials still works

## Out of Scope

| Feature | Reason |
|---|---|
| Real authentication (tokens, hashing, server) | `AD-011` already scopes this module as consistent-not-secure; replaced wholesale when a real backend arrives. |
| Multi-tab session sync | No such mechanism exists anywhere in this app today; adding one is a separate feature, not a bug fix. |
| Session expiry / timeout | Not a reported defect. The bug is "sign-out doesn't stick," not "sessions never end." |
| Validating `signIn`'s inputs beyond what it already does | `signIn` already correctly rejects a wrong password/email pair; this feature is scoped to `signUp`'s missing checks specifically. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| `signUp` validation rules | Reuse `EMAIL_PATTERN` for email (message: `"Enter a valid email address"`, matching `updateProfile` exactly); reject an empty/whitespace-only username (message: `"Username cannot be empty"`); reject an empty password (message: `"Password cannot be empty"`) | Email message matches `updateProfile`'s existing wording exactly since it's the same check. Username/password get their own messages since `updateProfile`/`changePassword` don't have a direct analogue for "username" (that field doesn't exist elsewhere) — `"cannot be empty"` matches the established phrasing family (`"Name cannot be empty"`, `"New password cannot be empty"`). | n |
| Validation order | Duplicate-email check first (existing), then username, then email format, then password | Preserves the one existing check's behavior/position exactly (no regression on the "Email already taken" path); new checks ordered to match the form's own field order top-to-bottom, matching how `updateProfile` checks name-then-email. | n |
| Session-vs-account separation mechanism (closes `docs/08-authentication.md`'s documented quirk) | A second `localStorage` key (`"session"`, storing the literal string `"active"`) tracks whether anyone is currently signed in, separate from the `"user"` key that stores the account. `signIn`/`signUp` set it on success; `signOut` removes it; the mount effect only restores `user` state when both the account record AND the session flag are present. | Matches this codebase's existing pattern of one `localStorage` key per concern (`coachplanner:v1:*` collections are already one-key-per-collection via `src/lib/storage.js`, though auth intentionally uses its own unprefixed `"user"` key per `AD-011`'s existing scope). Two keys is the minimal change that separates "account exists" from "is signed in" without touching the account record's shape. Recorded as **AD-018**. | y |
| Does deleting the session flag on sign-out also require clearing the account (`"user"`) key? | No — the account key is untouched, exactly as today | `docs/08-authentication.md` explicitly documents this as deliberate: sign-out "leaves the stored credentials in localStorage so a later `signIn` still works." This feature must not regress that; only the *session* is cleared. | y |

**Open questions:** none.

---

## User Stories

### P1: signUp rejects the input updateProfile already rejects ⭐ MVP

**User Story**: As someone registering, I want the same basic validation the
profile-edit form already has, so I can't create an account with garbage
data.

**Why P1**: The gap is directly exploitable through the app's own sign-up
form today (a coach fat-fingering a password field and tabbing past it
succeeds).

**Acceptance Criteria**:

1. WHEN `signUp` is called with an email that fails `EMAIL_PATTERN` THEN it
   SHALL return `{ success: false, message: "Enter a valid email address" }`
   and SHALL NOT create an account
2. WHEN `signUp` is called with an empty or whitespace-only username THEN it
   SHALL return `{ success: false, message: "Username cannot be empty" }`
   and SHALL NOT create an account
3. WHEN `signUp` is called with an empty password THEN it SHALL return
   `{ success: false, message: "Password cannot be empty" }` and SHALL NOT
   create an account
4. WHEN `signUp` is called with the already-taken demo email THEN it SHALL
   still return `{ success: false, message: "Email already taken" }`
   unchanged (regression guard on the one existing check)
5. WHEN `signUp` is called with valid username, email and password THEN it
   SHALL succeed exactly as it does today

**Independent Test**: Call `signUp("", "not-an-email", "")` via the
`useAuth()` hook in a test harness; assert the *first* violated rule's
message per the validation order, and that no account was written to
`localStorage`.

---

### P2: Signing out and refreshing does not silently re-authenticate

**User Story**: As a coach sharing a device, I want sign-out to actually
sign me out — even after a refresh — so the next person doesn't land in my
account.

**Why P2**: A security-shaped surprise, already flagged in
`docs/08-authentication.md` as an accepted-but-undesirable quirk.

**Acceptance Criteria**:

1. WHEN a signed-in user calls `signOut` THEN the app SHALL immediately show
   as signed out (unchanged existing behavior)
2. WHEN `signOut` has been called and the app remounts (simulating a
   refresh) THEN the mount effect SHALL NOT restore a signed-in user
3. WHEN `signOut` has been called and the same account's correct
   email/password is submitted to `signIn` afterward THEN it SHALL succeed
   (the account record itself must survive — this is the existing,
   deliberately-kept behavior)
4. WHEN a user has never signed in on a given browser (no session flag, no
   stored account) THEN the mount effect SHALL behave exactly as it does
   today (signed out, demo credentials work)

**Independent Test**: Sign in, sign out, unmount and remount the provider
(simulating a refresh), assert `user` is `null`; then call `signIn` with the
same credentials and assert it succeeds.

---

## Edge Cases

- WHEN `signUp`'s username is only whitespace (e.g. `"   "`) THEN it SHALL
  be treated as empty (trimmed before the empty check, matching
  `updateProfile`'s `name.trim()` pattern)
- WHEN a session flag exists in `localStorage` but the account record
  (`"user"` key) does not (a corrupted/manually-edited storage state) THEN
  the mount effect SHALL treat this as signed-out (`readStoredUser()`
  already returns `null` for a missing/corrupt record; the session flag
  alone must never fabricate a user)
- WHEN `signIn` succeeds against the **hard-coded demo pair** (no user ever
  stored) THEN the session flag SHALL still be set, so a subsequent refresh
  keeps the demo session alive exactly as a real account's would

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| AUTH-01 | P1: signUp validation | Implementing | Verified |
| AUTH-02 | P2: Sign-out survives a refresh | Implementing | Verified |

**Coverage:** 2 total, 2 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] `signUp` has the same validation depth as `updateProfile`
- [ ] `docs/08-authentication.md`'s "known quirk" section is removed, not
      just caveated further
- [ ] `.specs/STATE.md` records AD-018
