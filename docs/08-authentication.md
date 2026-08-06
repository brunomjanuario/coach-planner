# 08 — Authentication

> **This is a mock.** There is no server, no token, no password hashing and no
> real access control. It exists to shape the UI, not to secure anything. Do not
> ship it as-is.

## Pieces

| File | Role |
| --- | --- |
| [`src/context/AuthContext.jsx`](../src/context/AuthContext.jsx) | Provider + `useAuth` hook; owns the session |
| [`src/App.jsx`](../src/App.jsx) | `PrivateRoute` guard |
| [`src/pages/SignIn.jsx`](../src/pages/SignIn.jsx) | Sign-in form |
| [`src/pages/SignUp.jsx`](../src/pages/SignUp.jsx) | Sign-up form |
| [`src/components/Sidebar.jsx`](../src/components/Sidebar.jsx) | Logout action |

## `AuthContext`

`AuthProvider` wraps the whole app in `src/main.jsx` and exposes:

| Value | Type | Description |
| --- | --- | --- |
| `user` | `{ email, name?, username?, password? } \| null` | Current session, `null` when signed out. |
| `loading` | `boolean` | `true` until the `localStorage` read completes on mount. |
| `signIn` | `(email, password) => Result` | Checks the stored user, falling back to the demo pair. |
| `signUp` | `(username, email, password) => Result` | Accepts any email except the demo one; now stores the password. |
| `signOut` | `() => void` | Clears the session but leaves stored credentials in `localStorage`. |
| `updateProfile` | `({ name, email }) => Result` | Validates and persists a new name/email. |
| `changePassword` | `({ current, next, confirm }) => Result` | Validates and persists a new password. |

`Result` is `{ success: true }` or `{ success: false, message: string }`. Both
functions are **synchronous** despite representing network operations — call
sites read `result.success` directly without `await`.

Consume it with the hook:

```jsx
import { useAuth } from "../context/AuthContext";

const { user, signIn, signOut, signUp, loading } = useAuth();
```

## ⚠️ This is not authentication

Credentials — including the password — are stored as **plaintext** in
`localStorage`, readable by any script on the origin. There is no server, no
session token and no hashing. Feature `24-profile-settings` made the mock
**consistent** (the password you set is the password that signs you in); it did
not make it **secure**. Nothing here should be reused when a real backend
arrives — the whole module gets replaced at that point.

## Credentials

**Sign in** checks the submitted email/password against the stored `user`
record in `localStorage`:

- Email comparison is case-insensitive and trimmed; password comparison is
  neither.
- If the stored record has no `password` field (a pre-`24` account, or one
  created before ever changing it), the demo password (`password`) is accepted
  for it.
- If nothing is stored yet, the hard-coded demo pair still works:

  ```
  email:    user@email.com
  password: password
  ```

Any other combination returns `{ success: false, message: "Invalid email or
password" }` — sign-in never reveals which field was wrong.

**Sign up** rejects `user@email.com` with "Email already taken" and otherwise
stores `{ username, email, password }`, immediately creating a session. Unlike
before `24`, the password is **not** discarded, so an account created via
sign-up can be signed back in to after logout with the same credentials.

**Sign out** clears the in-memory `user` session but deliberately does **not**
remove the `localStorage` record, so `signIn` can still check a later attempt
against it. One consequence of the single-key design: refreshing the page
immediately after signing out re-hydrates the same stored record on mount,
signing the coach back in. This is a known trade-off of reusing one
`localStorage` key for both "the account that exists" and "the session that's
active" — not something `24` set out to fix.

**Editing the profile** (`updateProfile`, `changePassword`, both surfaced on
the Settings → Profile tab) validates and persists changes to the same stored
record: `updateProfile` rejects an invalid email or an empty name and writes
nothing on failure; `changePassword` requires the current password and a
matching confirmation, and a successful change keeps the coach signed in while
requiring the new password on the next `signIn`. Resetting demo data
(`services/store.js`'s `reset()`) only clears its own namespaced collections —
it never touches the `user` key, so a coach's profile survives a reset.

## Session persistence

The user object is serialized to `localStorage` under the key `user`:

```js
localStorage.setItem("user", JSON.stringify(userObj));
```

On mount, `AuthProvider` reads it back — migrating a legacy `username` field to
`name` if present — and rehydrates `user`, then sets `loading` to `false`.
That is why a refresh keeps you signed in even though the app data itself
resets. A corrupt (non-JSON) value in the key is treated as signed out rather
than thrown from `JSON.parse`.

Because the guard trusts whatever is in `localStorage`, writing a value there by
hand grants access to every private route. That is expected for a mock and
unacceptable for a real deployment.

Clear the credentials entirely (not just the session) with:

```js
localStorage.removeItem("user")
```

## The route guard

```jsx
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;              // avoids a redirect flash on refresh
  return user ? children : <Navigate to="/signin" replace />;
}
```

The `loading` check matters: without it, the first render (before
`localStorage` is read) would see `user === null` and bounce a signed-in user to
`/signin`. Returning `null` renders nothing for that one frame — a spinner would
be a natural improvement, and the source carries a `// or a loading spinner`
note to that effect.

`replace` is used so the redirect does not add a history entry.

## Flows

**Sign in**

```
/signin → submit → signIn(email, password)
  success (stored user exists)  → setUser → navigate("/")
  success (no user stored yet)  → setUser + localStorage.setItem → navigate("/")
  failure → render result.message in red under the form
```

`SignIn` also runs a `useEffect` that redirects to `/` whenever `user` becomes
truthy, so an already-signed-in visitor never sees the form.

**Sign up**

```
/signup → submit → signUp(username, email, password)
  success → setUser + localStorage.setItem → setSuccess(true) → navigate("/")
  failure → render "Email already taken"
```

The success banner is rendered in the JSX but never visible in practice, because
`navigate("/")` fires in the same handler.

**Sign out**

```
sidebar logout icon → preventDefault → signOut() → navigate("/signin")
```

## Making it real

The seams are already in the right places — `AuthContext` is the only module
that knows how a session is established.

1. Make `signIn` / `signUp` `async` and have them `POST` to a real endpoint.
   Update `SignIn.jsx` and `SignUp.jsx` to `await` the result.
2. Store a short-lived token rather than the raw user object; keep the refresh
   token out of `localStorage` (prefer an httpOnly cookie).
3. Verify the session server-side on load instead of trusting `localStorage`.
4. Add a loading indicator in `PrivateRoute` and pending states on the forms.
5. Attach the token to service requests once `src/services/*` talk to an API.
6. Scope the data: today every session sees the same global `teams` and
   `trainings` arrays.
