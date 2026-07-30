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
| `user` | `{ email, username? } \| null` | Current session, `null` when signed out. |
| `loading` | `boolean` | `true` until the `localStorage` read completes on mount. |
| `signIn` | `(email, password) => Result` | Validates against the demo credentials. |
| `signUp` | `(username, email, password) => Result` | Accepts any email except the demo one. |
| `signOut` | `() => void` | Clears state and `localStorage`. |

`Result` is `{ success: true }` or `{ success: false, message: string }`. Both
functions are **synchronous** despite representing network operations — call
sites read `result.success` directly without `await`.

Consume it with the hook:

```jsx
import { useAuth } from "../context/AuthContext";

const { user, signIn, signOut, signUp, loading } = useAuth();
```

## Credentials

**Sign in** succeeds only for the hard-coded pair:

```
email:    user@email.com
password: password
```

Anything else returns `{ success: false, message: "Invalid email or password" }`.

**Sign up** is the inverse — it rejects `user@email.com` with "Email already
taken" and accepts every other email/username/password combination, immediately
creating a session. Passwords are never stored, so an account created via sign-up
**cannot be signed in to again** after logout: `signIn` still only knows the one
hard-coded pair.

## Session persistence

The user object is serialized to `localStorage` under the key `user`:

```js
localStorage.setItem("user", JSON.stringify(userObj));
```

On mount, `AuthProvider` reads it back and rehydrates `user`, then sets
`loading` to `false`. That is why a refresh keeps you signed in even though the
app data itself resets.

Because the guard trusts whatever is in `localStorage`, writing a value there by
hand grants access to every private route. That is expected for a mock and
unacceptable for a real deployment.

Clear the session manually with:

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
  success → setUser + localStorage.setItem → navigate("/")
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
