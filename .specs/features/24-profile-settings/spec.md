# Profile Settings Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** 23-settings-tabs

## Problem Statement

A coach cannot change anything about their own account. `AuthContext` accepts one
hard-coded pair — `user@email.com` / `password` (`AuthContext.jsx:17-26`) — stores
`{ email }` or `{ username, email }` under the `user` key in `localStorage`, and
offers no way to change any of it. `signUp` accepts any email but the password it
is given is discarded (`_password`), so a user who signs up cannot sign back in
with the password they chose. Signing out and signing back in is the only path,
and for a signed-up user that path is broken.

The `23` Profile tab currently displays those details read-only. This feature
makes them editable.

## ⚠️ This is not authentication

The stored credential is plaintext in `localStorage`, readable by any script on
the origin, with no server, no session token and no hashing. This feature makes
the mock **consistent** — the password you set is the password that signs you in
— it does not make it **secure**. Nothing here should be reused when a real
backend arrives; the whole module is replaced at that point. This is recorded as
a decision, not discovered later as a vulnerability.

## Goals

- [x] Name, email and password can be changed from the Profile tab
- [x] The mock actually honours the credentials it stores
- [x] `signUp`'s discarded password stops being discarded

## Out of Scope

| Feature | Reason |
|---|---|
| Real authentication (server, tokens, hashing) | A separate epic. `.specs/README.md` already records it as deliberately unplanned. |
| Password strength rules, breach checks, 2FA | Security theatre on a plaintext mock. |
| Email verification / password reset by email | No mail path, and no server to own the token. |
| Account deletion | Not asked for; sign-out plus reset covers the demo need. |
| Avatar upload | `PlayerCard`/`TeamCard` image handling is already broken in production builds; this feature does not take that on. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Password behaviour | The mock stores a password and `signIn` checks it, so changing it changes what signs you in | User's stated choice, over a cosmetic field | y — user chose it |
| The demo pair | `user@email.com` / `password` still works when no user has been stored | Otherwise a fresh install has no way in, and every existing test and README instruction breaks | n |
| Where credentials live | The existing `user` key in `localStorage`, gaining `name` and `password` | The key already exists and already holds the identity. A second store for one record is worse | n |
| Existing stored users | A stored user with no `password` falls back to the demo password until one is set | An in-flight session must not be locked out by this feature | n |
| Changing the email | Changes what signs you in, immediately, without signing out | The alternative — forcing a re-login — is worse on a mock with no session to protect | n |
| Changing the password | Requires the current password | Cheap, expected, and the only guard available | n |
| Feedback | Each save shows an explicit success or failure message and does not clear the form on failure | Silent saves are indistinguishable from broken ones | n |
| Reset demo data | Does not touch the profile — `store.reset()` only clears its own namespaced collections | Wiping a coach's login when they reset demo fixtures would be surprising | n |
| Name field | Stored as `name`; `signUp`'s existing `username` is migrated to it on read | The two fields mean the same thing and having both is how they drift | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: The mock honours its own credentials ⭐ MVP

**User Story**: As a coach, I want the password I set to be the password that signs me in.

**Why P1**: Without it, changing the password is a lie and `signUp` stays broken.

**Acceptance Criteria**:

1. WHEN a user signs up with a password THEN the system SHALL store it and SHALL accept it on a later sign-in
2. WHEN a stored user exists THEN `signIn` SHALL check the submitted email and password against that user
3. WHEN no user is stored THEN `signIn` SHALL accept the demo pair, as it does today
4. WHEN a stored user has no password recorded THEN `signIn` SHALL accept the demo password for them
5. WHEN sign-in fails THEN the system SHALL return the existing "Invalid email or password" message and SHALL NOT reveal which field was wrong
6. WHEN a user signs out THEN the stored credentials SHALL survive, so they can sign back in

**Independent Test**: Sign up as `coach@club.pt` / `hunter2`, sign out, sign back in with the same pair.

---

### P1: Change name and email ⭐ MVP

**User Story**: As a coach, I want to correct my name and email from Settings.

**Why P1**: Half the requested tab.

**Acceptance Criteria**:

1. WHEN the Profile tab renders THEN it SHALL show editable name and email fields pre-filled with the current values
2. WHEN a changed name is saved THEN the system SHALL persist it and reflect it in the UI without a page reload
3. WHEN a changed email is saved THEN the system SHALL persist it and SHALL accept it on the next sign-in
4. WHEN an email that is not a valid address is submitted THEN the system SHALL reject it with a message and save nothing
5. WHEN an empty name is submitted THEN the system SHALL reject it with a message and save nothing
6. WHEN a save succeeds THEN the system SHALL confirm it

**Independent Test**: Change the email, sign out, sign in with the new address.

---

### P1: Change the password ⭐ MVP

**User Story**: As a coach, I want to change my password from Settings.

**Why P1**: The other half.

**Acceptance Criteria**:

1. WHEN the Profile tab renders THEN it SHALL offer current-password, new-password and confirm-new-password fields
2. WHEN the current password does not match THEN the system SHALL reject the change and SHALL NOT alter the stored password
3. WHEN the new password and its confirmation differ THEN the system SHALL reject the change with a message
4. WHEN the new password is empty THEN the system SHALL reject the change
5. WHEN a password change succeeds THEN the system SHALL confirm it, clear the three fields, and keep the user signed in
6. WHEN a password change succeeds THEN the next sign-in SHALL require the new password and SHALL reject the old one

**Independent Test**: Change the password, sign out, confirm the old one fails and the new one works.

---

## Edge Cases

- WHEN a save fails validation THEN the typed values SHALL remain in the form
- WHEN the profile is edited and demo data is then reset THEN the profile SHALL be unchanged
- WHEN `localStorage` holds a corrupt `user` value THEN the app SHALL treat it as signed out rather than crash on `JSON.parse` — the current code has no `try`/`catch` there
- WHEN an email is saved with surrounding whitespace THEN it SHALL be trimmed before storing and before comparison
- WHEN an email differs only by case at sign-in THEN it SHALL match — email comparison is case-insensitive; the password comparison is not
- WHEN a legacy stored user has `username` but no `name` THEN the Profile tab SHALL show the username as the name
- WHEN storage is unavailable THEN the profile change SHALL surface an error rather than appear to save

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| PROF-01 | P1: Credentials stored and checked by `signIn` | Tasks | Done |
| PROF-02 | P1: `signUp` stores the chosen password | Tasks | Done |
| PROF-03 | P1: `updateProfile` for name and email | Tasks | Done |
| PROF-04 | P1: `changePassword` guarded by the current password | Tasks | Done |
| PROF-05 | P1: Profile tab form, validation and feedback | Tasks | Done |

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped

---

## Success Criteria

- [x] A password set in the app is the password that signs you in
- [x] Signing up and signing back in works end to end
- [x] Resetting demo data never signs a coach out
- [x] The "this is not authentication" limitation is stated in the code and in `docs/`
