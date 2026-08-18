# Backend Integration — Design

## Architecture

```
src/lib/apiClient.js        NEW — fetch wrapper: base URL, bearer header,
                             401/token-expired refresh-and-retry-once,
                             RFC 9457 → typed error mapping, NetworkError
src/lib/tokenStore.js       NEW — in-memory access token + localStorage
                             refresh token, no React dependency (importable
                             from apiClient and AuthContext both)
src/lib/errors.js           EXTENDED — add AuthError, ConflictError,
                             ApiError, NetworkError alongside existing
                             NotFoundError/ValidationError
src/lib/dates.js            NEW — parseApiDate(value)/serializeApiDate(date)
                             helpers, used by trainingService/gameService to
                             replace store.js's DATE_FIELDS rehydration

src/services/*.js           REWRITTEN — same exported shape (getAll, create,
                             update, delete, ...), body now calls apiClient
                             instead of getCollection/setCollection
src/context/AuthContext.jsx REWRITTEN — register/login/refresh/logout via
                             apiClient, user from GET /users/me

src/services/store.js       DELETED
src/model/mock.js           DELETED
src/lib/trainingNumber.js   DELETED (server computes `number`)
src/lib/gameResult.js       DELETED if nothing but the old client-side
                             getScheduled/getPlayed filter used it — verify
                             during T-verify before deleting
```

No new dependency is added. `fetch` is native; Vitest + `jsdom` already
support mocking it (`vi.stubGlobal("fetch", ...)` or `msw` if the task
finds the raw-mock approach too repetitive across 8 services — decide at
task time, don't add `msw` to `package.json` unless a task actually needs
it).

## `apiClient.js`

```js
// src/lib/apiClient.js
import { getAccessToken, setTokens, clearTokens, getRefreshToken } from "./tokenStore";
import { NotFoundError, ValidationError, ConflictError, AuthError, ApiError, NetworkError } from "./errors";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";

let refreshInFlight = null; // dedupes concurrent 401s into one refresh call

async function doRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new AuthError("No refresh token");
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) { clearTokens(); throw new AuthError("Refresh failed"); }
  const { accessToken, refreshToken: newRefresh } = await res.json();
  setTokens(accessToken, newRefresh);
  return accessToken;
}

async function toTypedError(res) {
  let body = null;
  try { body = await res.json(); } catch { /* no body */ }
  const message = body?.detail ?? body?.title ?? `Request failed (${res.status})`;
  if (res.status === 404) return new NotFoundError(message);
  if (res.status === 400) return new ValidationError(message, body?.errors);
  if (res.status === 409) return new ConflictError(message);
  if (res.status === 401) return new AuthError(body?.type ?? message);
  return new ApiError(message, res.status);
}

export async function apiFetch(path, { method = "GET", body, isRetry = false } = {}) {
  const accessToken = getAccessToken();
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new NetworkError(`Could not reach the API at ${path}`);
  }

  if (res.status === 401 && !isRetry) {
    const type = await res.clone().json().catch(() => null);
    if (type?.type?.includes("token-expired")) {
      refreshInFlight ??= doRefresh().finally(() => { refreshInFlight = null; });
      await refreshInFlight; // throws AuthError on failure, propagates
      return apiFetch(path, { method, body, isRetry: true });
    }
  }

  if (!res.ok) throw await toTypedError(res);
  if (res.status === 204) return null;
  return res.json();
}
```

Key decisions baked into this shape:

- **One in-flight refresh, not N** — if 6 components fire requests the
  instant an access token expires, they all await the same `refreshInFlight`
  promise rather than triggering 6 refresh calls (which would trip the
  backend's rotation-reuse detection and mass-revoke, per the backend's
  AC "a refresh token that has already been rotated ... revoke every
  refresh token" — a real correctness bug if not deduped).
- **`isRetry` guard** — prevents an infinite loop if the retried request
  also 401s.
- A failed refresh throws `AuthError` all the way up; `AuthContext` is the
  single place that listens for `AuthError` globally (see below) and forces
  sign-out — individual pages do not each need a `catch (AuthError)` branch.

## Global sign-out on auth failure

Rather than every page/popup catching `AuthError` to redirect, `AuthContext`
subscribes once. Simplest mechanism given no state manager exists: `apiClient`
calls an injected callback.

```js
// tokenStore.js
let onAuthFailure = () => {};
export function setAuthFailureHandler(fn) { onAuthFailure = fn; }
```

`apiFetch` calls `onAuthFailure()` whenever it throws `AuthError` after an
exhausted refresh attempt. `AuthContext`'s top-level `useEffect` registers
`setAuthFailureHandler(() => { clearTokens(); setUser(null); })` once on
mount. `PrivateRoute` (`App.jsx`) already redirects to `/signin` whenever
`user` is `null` — no new redirect logic needed there.

## Error types (`src/lib/errors.js` additions)

```js
export class ConflictError extends Error { constructor(m) { super(m); this.name = "ConflictError"; } }
export class AuthError extends Error { constructor(m) { super(m); this.name = "AuthError"; } }
export class ApiError extends Error {
  constructor(m, status) { super(m); this.name = "ApiError"; this.status = status; }
}
export class NetworkError extends Error { constructor(m) { super(m); this.name = "NetworkError"; } }
```

`ValidationError` gains an optional second constructor arg for the
field-keyed `errors` map, additive and backward compatible with existing
`new ValidationError(message)` call sites (there are none left client-side
once F4–F8's client-side pre-validation is removed per spec, except the
standings won+drawn+lost early check the spec explicitly keeps).

## Service rewrite pattern

Every service keeps its exact export shape. Example (`teamService.js`):

```js
import { apiFetch } from "../lib/apiClient";

export const teamService = {
  getAll: () => apiFetch("/teams"),
  getById: (id) => apiFetch(`/teams/${id}`),
  create: (teamData) => apiFetch("/teams", { method: "POST", body: teamData }),
  update: (teamData) => apiFetch(`/teams/${teamData.id}`, { method: "PATCH", body: teamData }),
  delete: (id) => apiFetch(`/teams/${id}`, { method: "DELETE" }),
  addPlayer: (teamId, playerData) =>
    apiFetch(`/teams/${teamId}/players`, { method: "POST", body: playerData }),
  updatePlayer: (playerData) =>
    apiFetch(`/teams/${playerData.teamId}/players/${playerData.id}`, { method: "PATCH", body: playerData }),
  deletePlayer: (playerData) =>
    apiFetch(`/teams/${playerData.teamId}/players/${playerData.id}`, { method: "DELETE" }),
};
```

No more `cardService`/`ratingService` imports, no more manual cascade calls
— deleting those two lines from `delete`/`deletePlayer` is itself an AC
(F4.4/F4.7).

`trainingService.getAllNumbered` and `gameService.getScheduled/getPlayed`
become query-string builders instead of fetch-all-then-filter:

```js
getAllNumbered: (teamId) => apiFetch(teamId != null ? `/trainings?teamId=${teamId}` : "/trainings"),
getScheduled: (teamId) => apiFetch(`/games?status=scheduled${teamId != null ? `&teamId=${teamId}` : ""}`),
```

Date fields are rehydrated at the service boundary, not deeper:

```js
// trainingService.js
import { parseApiDate } from "../lib/dates";
const hydrate = (t) => ({ ...t, day: parseApiDate(t.day) });
getAll: async () => (await apiFetch("/trainings")).map(hydrate),
```

`ratingService.setRating`'s `value: null` case (F7 AC6): the backend's
`PUT /ratings/{eventType}/{eventId}/players/{playerId}` is the natural
single-call mapping. Resolved here rather than left to task time: send
`PUT` with `{ value: null }` in the body — the backend's own AD-106 already
models "null clears" as a first-class semantic (two-nullable-FK rating
model), and `RATE-02`/`RATE-03`'s req IDs both point at this one endpoint,
not a separate delete. If integration testing during T-verify shows the
backend rejects a null `PUT` body instead, fall back to
`GET` the existing rating's id then `DELETE /ratings/{id}` — call this out
explicitly as a task-time verification, not a silent assumption.

## `AuthContext.jsx` rewrite

```js
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthFailureHandler(() => { clearTokens(); setUser(null); });
    (async () => {
      if (!getRefreshToken()) { setLoading(false); return; }
      try {
        await apiClient.silentRefresh(); // wraps doRefresh, no retry semantics needed here
        const me = await apiFetch("/users/me");
        setUser(me);
      } catch {
        clearTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (email, password) => {
    try {
      const { accessToken, refreshToken, user: u } = await apiFetch("/auth/login", {
        method: "POST", body: { email, password },
      });
      setTokens(accessToken, refreshToken);
      setUser(u);
      return { success: true };
    } catch (e) {
      return { success: false, message: e instanceof AuthError ? "Invalid email or password" : e.message };
    }
  };
  // signUp, signOut, updateProfile, changePassword follow the same try/catch → {success,message} shape
}
```

`signUp`'s parameter order changes from `(username, email, password)` to
whatever `SignUp.jsx` already passes — check the call site during
implementation; the spec only constrains the request shape
(`{ name, email, password }` per the backend's `AUTH-01`), not the JS
function's own arg order, which stays whatever the page currently calls.

## Env config

```
# .env.example (new file, committed)
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

`.env` added to `.gitignore` if not already covered by the existing `*.local`
pattern — check `.gitignore` at task time.

## Testing strategy

- `apiClient.test.js` — the highest-value test file. Mock `global.fetch`
  with `vi.fn()`. Cases: bearer header attached; `token-expired` 401 →
  refresh → retry succeeds; concurrent 401s → one refresh call
  (`expect(fetchMock.mock.calls.filter(isRefreshCall)).toHaveLength(1)`);
  refresh failure → `onAuthFailure` invoked; each status code → correct
  error class; `fetch` rejection → `NetworkError`.
- Each service's existing `__tests__/*.test.js` gets rewritten (not
  deleted) to mock `apiFetch` instead of `store.js`'s `getCollection`, and
  assert the right path/method/body per call — these tests currently assert
  localStorage side effects, which no longer exist, so this is a full
  rewrite of the test bodies, same file, same describe structure.
- `AuthContext.test.jsx` — mock `apiFetch`; cover silent-refresh-on-boot
  (success and failure), sign-in/sign-up success and error-message mapping,
  sign-out clearing tokens.
- No integration test against a real running backend is added to the CI
  gate (there is no CI in this repo — `npm run lint`/`npm test` are the
  gates per CLAUDE.md); manual verification against a locally running
  `coach-planner-api` is the acceptance step for Success Criteria, not an
  automated one.

## What could go wrong

| Risk | Mitigation |
| --- | --- |
| CORS: backend only allows `http://localhost:5173` | Document in spec Assumptions; if a task needs a different port, that's a backend change flagged to the user, not silently worked around |
| Refresh-token rotation reuse-detection false-positive from concurrent tabs | Out of scope this round (Edge Cases already accepts eventual cross-tab consistency); single-tab dedup (this design's `refreshInFlight`) is what's actually required by the spec |
| `ratingService.setRating(null)` wire shape unverified against real backend | Called out explicitly above; first task in F7 execution should hit the real running API once to confirm before writing the test suite around an assumption |
| Deleting `store.js` breaks a page that still imports it directly (bypassing the service layer) | `grep -r "services/store"` across `src/` before deleting, add any stray import to the task list |
| Rewriting 8 services + auth is a lot of surface for one PR-sized review | Accepted per the user's own big-bang decision this round; Tasks phase still keeps one atomic commit per service so the diff is reviewable commit-by-commit even though it ships as one feature |
