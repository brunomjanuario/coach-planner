# 08 — Authentication

Coach Planner talks to a real backend, `coach-planner-api` (a sibling
Kotlin/Spring Boot service), for authentication. There is no plaintext
password storage and no client-side credential checking — every credential
comparison happens server-side.

## Pieces

| File | Role |
| --- | --- |
| [`src/context/AuthContext.jsx`](../src/context/AuthContext.jsx) | Provider + `useAuth` hook; owns the session |
| [`src/lib/apiClient.js`](../src/lib/apiClient.js) | `apiFetch`/`silentRefresh` — bearer auth, refresh-and-retry, typed errors |
| [`src/lib/tokenStore.js`](../src/lib/tokenStore.js) | In-memory access token + `localStorage` refresh token |
| [`src/App.jsx`](../src/App.jsx) | `PrivateRoute` guard |
| [`src/pages/SignIn.jsx`](../src/pages/SignIn.jsx) | Sign-in form |
| [`src/pages/SignUp.jsx`](../src/pages/SignUp.jsx) | Sign-up form |
| [`src/pages/Settings.jsx`](../src/pages/Settings.jsx) | Profile tab: `updateProfile`/`changePassword` |
| [`src/components/Sidebar.jsx`](../src/components/Sidebar.jsx) | Logout action |

## Token storage

- The **access token** lives only in a module-level variable inside
  `tokenStore.js` — never written to `localStorage`, lost on reload.
- The **refresh token** persists in `localStorage` under the key
  `refreshToken`, so a session survives a browser restart.

This bounds how long a token stolen via XSS stays useful to the refresh
token's lifetime rather than the (shorter-lived, more powerful) access
token's.

## `AuthContext`

`AuthProvider` wraps the whole app in `src/main.jsx` and exposes:

| Value | Type | Description |
| --- | --- | --- |
| `user` | `{ id, name, email } \| null` | The signed-in coach, from `GET /users/me`; `null` when signed out. |
| `loading` | `boolean` | `true` until the boot-time silent refresh (below) resolves. |
| `signIn` | `(email, password) => Promise<Result>` | `POST /auth/login`. |
| `signUp` | `(name, email, password) => Promise<Result>` | `POST /auth/register`. |
| `signOut` | `() => Promise<void>` | `POST /auth/logout` (best-effort), then clears local tokens. |
| `updateProfile` | `({ name, email }) => Promise<Result>` | `PATCH /users/me`. |
| `changePassword` | `({ current, next, confirm }) => Promise<Result>` | `PUT /users/me/password`. |

`Result` is `{ success: true }` or `{ success: false, message: string }`.
Every one of these functions is `async` — call sites must `await` them.

Consume it with the hook:

```jsx
import { useAuth } from "../context/useAuth";

const { user, signIn, signOut, signUp, loading } = useAuth();
```

## Boot-time silent refresh

On mount, `AuthProvider`:

1. If no refresh token is in `localStorage`, resolves `loading: false` with
   `user: null` immediately — no API call.
2. Otherwise calls `silentRefresh()` (`POST /auth/refresh`) to obtain a fresh
   access token, then `GET /users/me` to load the profile.
3. If either call fails (expired/revoked refresh token, or the API is
   unreachable), clears the local tokens and resolves signed-out rather than
   hanging on `loading: true` forever.

This is what lets a page reload keep a valid session signed in, while an
expired or absent refresh token correctly bounces to `/signin`.

## Sign-in / sign-up

- **Sign in** (`POST /auth/login`): on `401`, returns the fixed message
  `"Invalid email or password"` — the API guarantees this response is
  identical for a wrong password and an unregistered email, and the
  frontend does not add its own distinguishing logic.
- **Sign up** (`POST /auth/register`): on `409` (email already registered)
  or `400` (invalid email, blank name, short password), returns
  `{ success: false, message }` built from the API's own response — no
  hardcoded frontend copy for these cases.
- Both successes store the returned `accessToken`/`refreshToken` via
  `tokenStore` and set `user` from the response.

There is no `DEMO_EMAIL`/`DEMO_PASSWORD` special-casing anywhere in
`AuthContext` — a demo-looking credential pair behaves exactly like any
other account, because it *is* just another account once registered.

## Editing the profile

`updateProfile({ name, email })` (`PATCH /users/me`) updates `user` from the
response on success, or returns an error message on `400`/`409` without
mutating `user`.

`changePassword({ current, next, confirm })`:

- Rejects locally (no API call) when `next !== confirm`.
- On `400 incorrect-password`, returns `"Current password is incorrect"`.
- On success (`PUT /users/me/password`), the API has already revoked the
  refresh token server-side, so the frontend clears its local tokens and
  `user` too — **the coach is signed out** and must sign in again with the
  new password. This is a deliberate security property (F3 AC4), not a bug:
  it proves the old session is actually dead, not just locally forgotten.

There is no "reset demo data" feature — that only ever existed against the
old localStorage mock's seed data, which no longer exists (see
[10 — Known Issues](10-known-issues.md)).

## Auth failure anywhere in the app

`apiClient.js` calls a single injected callback (`tokenStore`'s
`notifyAuthFailure`) whenever a request's refresh-and-retry is exhausted.
`AuthContext` registers this once on mount to clear tokens and set
`user: null`; `PrivateRoute` (`App.jsx`) already redirects to `/signin`
whenever `user` is `null`. No individual page or popup needs its own
`catch (AuthError)` branch.

## The route guard

```jsx
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;              // avoids a redirect flash on refresh
  return user ? children : <Navigate to="/signin" replace />;
}
```

`replace` is used so the redirect does not add a history entry.

## Ownership and 404s

The API returns `404`, not `403`, when a resource exists but isn't owned by
the caller. The frontend does not special-case this — a 404 on an
owned-resource endpoint renders the same "not found" UI as a genuinely
missing id.

## What's still rough

- `PrivateRoute` renders nothing (not a spinner) during `loading` — a real
  loading indicator would be a natural improvement.
- No cross-tab session sync: if one tab signs out, another tab's *next* API
  call fails with `401` and triggers sign-out then, not immediately.
