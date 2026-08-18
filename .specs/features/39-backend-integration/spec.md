# Backend Integration — Backend MVP Specification

**Scope:** Complex (new domain, cross-repo contract, auth/token lifecycle)
**Created:** 2026-08-18
**Status:** Specified — awaiting design

## Problem Statement

Coach Planner runs entirely against `src/services/store.js`, a localStorage
mock: plaintext-password auth (`context/AuthContext.jsx`), an in-memory-per-tab
data layer capped by AD-002's ~5MB ceiling, single-device only, no backup. The
sibling `coach-planner-api` repo is now feature-complete — a Kotlin/Spring
Boot API over PostgreSQL with real JWT auth and per-user data ownership,
purpose-built to replace this store (see its `.specs/features/00-backend-mvp/`).
This feature rewires the frontend's 8 services and `AuthContext` to call that
API instead, and removes the mock entirely.

This is a same-shape swap by design: the API's wire format (camelCase JSON,
`Training.number` computed server-side, `Game` scores explicitly null) was
built to match what these services already return, specifically so this
feature needs no new frontend capability — only a new transport.

## Goals

- [ ] Every one of the 8 service modules (`teamService`, `trainingService`,
      `gameService`, `standingsService`, `cardService`, `ratingService`,
      `competitionService`, `opponentService`) calls the API instead of
      localStorage, preserving its existing exported method signatures so no
      page needs to change its calling code beyond error handling
- [ ] `AuthContext` performs real `register`/`login`/`logout`/`refresh`
      against the API, replacing the plaintext localStorage mock
- [ ] An expired access token is transparently refreshed once and the
      original request retried; a failed refresh signs the user out and
      redirects to `/signin`
- [ ] Every API error (RFC 9457 `problem+json`) is mapped to the frontend's
      existing `NotFoundError`/`ValidationError` types (or a new
      `AuthError`/`ConflictError` where no existing type fits), so `catch`
      blocks in pages/popups keep working unchanged where the type already
      matches
- [ ] `src/services/store.js`, `src/model/mock.js`/seed data, and the
      plaintext-credential branches of `AuthContext.jsx` are deleted — no
      dual-mode, no fallback
- [ ] The app is usable end-to-end against a running local API: register →
      sign in → create a team/player → create a training/game → record a
      result → see it survive a hard reload

## Out of Scope

| Feature | Reason |
| --- | --- |
| Any change to the backend | `coach-planner-api` is feature-complete and out of this repo. If a genuine gap is found, it's a bug report to that repo, not a workaround here. |
| Deploying either app | Local `docker compose up -d db` + `./gradlew bootRun` + `npm run dev` is the target environment for this round. |
| Offline/demo mode | User decision this round: delete the mock rather than keep it behind a flag (see Decisions). |
| Real-time updates | Unchanged from the backend spec — the frontend re-reads after every mutation; no WebSocket/SSE. |
| `localStorage` data migration | The backend spec already scoped this out; no existing production data exists. |
| UI redesign of loading/error states beyond what's needed to surface network failures | This is a transport swap, not a UX pass. |

---

## Decisions (locked this round)

1. **Token storage**: the access token lives only in memory (a module-level
   variable in the new `src/lib/apiClient.js`, lost on reload); the refresh
   token persists in `localStorage`. On app boot, if a refresh token exists,
   the client calls `POST /auth/refresh` once to obtain a fresh access token
   before rendering past the loading state. This bounds XSS exposure to the
   refresh token's window rather than the access token's, while still
   surviving a browser restart.
2. **Cutover shape**: big-bang. Auth and all 8 services move to the API in
   this one feature; the mock is deleted in the same feature, not kept as a
   fallback. There is no intermediate state where some pages hit the API and
   others hit localStorage.
3. **Mock removal**: `store.js`, `model/mock.js` (seed arrays), and
   `AuthContext`'s plaintext/demo-credential logic are deleted outright.
   `docs/08-authentication.md` and any other docs describing the mock get a
   pass to reflect the new reality (doc update, not a new spec).

## Assumptions & Open Questions

- **API base URL**: `import.meta.env.VITE_API_BASE_URL`, defaulting to
  `http://localhost:8080/api/v1` in dev (`.env.example` ships the default;
  `.env` stays gitignored, matching the backend's own convention). Vite's
  built-in `import.meta.env` is used rather than a new config layer.
- **CORS**: the backend's `SecurityConfig.kt` hardcodes
  `allowedOrigins = ["http://localhost:5173"]` — the frontend's dev server
  must keep running on port 5173 (Vite's default, unchanged) or CORS breaks.
  Flagged, not fixed here — changing it is a backend change, out of scope.
- **`Date` re-hydration**: the API returns ISO instant strings
  (`training.day`, `game.date`); the frontend's own `docs/05-services.md`
  already flags this rehydration step as unresolved. This feature resolves
  it: services parse date fields to `Date` on read, matching what
  `store.js`'s `DATE_FIELDS` used to do, so pages that call `.getMonth()` /
  `.toLocaleDateString()` etc. on these fields keep working unchanged.
- **Cascade helpers removed**: `cardService.removeByGame`/`removeByPlayer`
  and `ratingService.removeByEvent`/`removeByPlayer` are deleted from the
  frontend's public API (not just left unused) — the backend now performs
  these as FK cascade actions server-side (AD-106/AD-107 in the backend's own
  decision log). Any caller that still imports them is a bug this feature
  must find and fix (`teamService.delete`/`deletePlayer`,
  `gameService.delete`, `trainingService.delete` currently call them
  explicitly and must stop).
- **Ownership 404 semantics**: the backend returns `404`, not `403`, when a
  resource exists but isn't owned by the caller (P4's AC). The frontend must
  not special-case this — a 404 from an owned-resource endpoint is
  indistinguishable from "doesn't exist" and both should render the same
  "not found" UI.

### Implicit-requirement dimensions sweep (Complex ⇒ full sweep)

| Dimension | Applies? | Handling |
| --- | --- | --- |
| Persistence/state | Yes | Refresh token in `localStorage`; access token in memory only (Decision 1) |
| External calls | Yes | Every service now does `fetch` against `coach-planner-api`; network failure is a new error class (`NetworkError`) pages must handle |
| Auth | Yes | Real JWT bearer auth replaces the mock; token refresh-and-retry is a new cross-cutting concern (`apiClient.js`) |
| Payments | No | — |
| Concurrency | Partial | No optimistic locking on the frontend; last-write-wins, matching current mock behaviour and the backend's own scope (no ETags specified) |
| State transitions | Yes | Sign-in/sign-out/token-expiry are state transitions already handled by `AuthContext`; refresh failure must transition to signed-out, not hang |

---

## User Stories

### F1: A shared HTTP client with auth and error translation ⭐ blocks everything

**User Story**: As a developer wiring 8 services to a real API, I want one
client that attaches the bearer token, retries once on a 401 via refresh, and
translates RFC 9457 errors into the app's existing error types, so that no
individual service reimplements this.

**Why blocking**: every other story calls through this client.

**Acceptance Criteria**:

1. WHEN any authenticated request is made THEN the client SHALL attach
   `Authorization: Bearer <accessToken>` from its in-memory token
2. WHEN a request returns `401` with problem type `token-expired` AND a
   refresh token is present THEN the client SHALL call `/auth/refresh` once,
   store the new access token in memory and the new refresh token in
   `localStorage`, and retry the original request exactly once
3. WHEN the refresh call itself fails (expired/revoked/reused refresh token)
   THEN the client SHALL clear both tokens, and the app SHALL treat this as a
   sign-out (redirect to `/signin`) rather than surfacing a raw network error
4. WHEN a response body matches the RFC 9457 shape THEN the client SHALL
   throw `NotFoundError` for `404`, `ValidationError` for `400` (attaching the
   field-keyed `errors` member), `ConflictError` for `409`, `AuthError` for
   `401` (after the refresh-and-retry in AC2/AC3 has already been attempted),
   and a generic `ApiError` for any other status
5. WHEN `fetch` itself rejects (offline, DNS failure, CORS block) THEN the
   client SHALL throw `NetworkError`, distinguishable from every error in AC4
6. WHEN the app boots AND a refresh token exists in `localStorage` THEN
   `AuthContext` SHALL call `/auth/refresh` before resolving its `loading`
   state, so a page reload does not bounce a valid session to `/signin`

**Independent Test**: Mock `fetch`. Assert bearer header attached; assert a
`token-expired` 401 triggers exactly one refresh + one retry; assert a second
401 after refresh does not loop; assert each problem type maps to the right
error class.

---

### F2: Real authentication ⭐ MVP

**User Story**: As a coach, I want to register and log in against the real
API, so my account and data follow me across devices and browsers.

**Acceptance Criteria**:

1. WHEN `signUp(name, email, password)` is called THEN `AuthContext` SHALL
   `POST /auth/register`, store the returned tokens per Decision 1, set
   `user` from the response, and return `{ success: true }`
2. WHEN registration fails with `409 email-already-registered` THEN `signUp`
   SHALL return `{ success: false, message }` without altering `user` or
   any stored token, using the API's message rather than a hardcoded string
3. WHEN registration fails with `400` (invalid email/blank name/short
   password) THEN `signUp` SHALL return `{ success: false, message }`
   built from the response's field-keyed `errors`
4. WHEN `signIn(email, password)` is called THEN `AuthContext` SHALL
   `POST /auth/login`, store tokens, set `user`, and return
   `{ success: true }`
5. WHEN login fails with `401` THEN `signIn` SHALL return
   `{ success: false, message: "Invalid email or password" }` — the API's
   AC already guarantees this response is indistinguishable between wrong
   password and unregistered email, so the frontend SHALL NOT add its own
   distinguishing logic
6. WHEN `signOut()` is called THEN `AuthContext` SHALL `POST /auth/logout`
   (best-effort — a network failure here still clears local state), then
   clear the in-memory access token and the `localStorage` refresh token,
   and set `user` to `null`
7. WHEN the app boots with no refresh token present THEN `loading` SHALL
   resolve to `false` with `user: null` — no API call is made
8. WHEN the demo credentials `user@email.com` / `password` are submitted
   THEN they SHALL behave exactly like any other account — no
   `DEMO_EMAIL`/`DEMO_PASSWORD` special-casing remains in `AuthContext`

**Independent Test**: Register → reload the page → still signed in (via
silent refresh). Sign out → reload → redirected to `/signin`.

---

### F3: Profile management ⭐ MVP

**User Story**: As a coach, I want Settings → Profile to read/write my real
account, so the screen that already exists keeps working.

**Acceptance Criteria**:

1. WHEN `user` is set after sign-in THEN it SHALL come from
   `GET /users/me` (id, name, email, creation timestamp) rather than the
   locally-echoed register/login response, so a profile edited in another
   tab is picked up on next load
2. WHEN `updateProfile({ name, email })` is called THEN `AuthContext` SHALL
   `PATCH /users/me` and update `user` from the response on success, or
   return `{ success: false, message }` on `400`/`409` without mutating
   `user`
3. WHEN `changePassword({ current, next, confirm })` is called AND
   `next !== confirm` THEN the frontend SHALL reject locally (matching
   current behaviour) without calling the API
4. WHEN `changePassword` is called with matching `next`/`confirm` THEN
   `AuthContext` SHALL `PUT /users/me/password`; on `400 incorrect-password`
   it SHALL return `{ success: false, message: "Current password is
   incorrect" }`; on success it SHALL clear the local refresh token (the API
   has already revoked it server-side) and require the user to sign in again

**Independent Test**: Change password → old session's next API call gets a
`401` → app redirects to `/signin` (per F1 AC3) → sign in with new password
succeeds.

---

### F4: Teams and players ⭐ MVP

**User Story**: As a developer, I want `teamService` to hit `/teams` and
`/teams/{id}/players`, preserving its existing method names, so `Teams.jsx`
and its popups need no changes beyond error handling.

**Acceptance Criteria**:

1. `getAll()` → `GET /teams`; `getById(id)` → `GET /teams/{id}`
2. `create(teamData)` → `POST /teams`
3. `update(teamData)` → `PATCH /teams/{id}`
4. `delete(id)` → `DELETE /teams/{id}` — the frontend SHALL NOT call
   `cardService.removeByPlayer`/`ratingService.removeByPlayer` afterward;
   the backend cascades players → cards/ratings via FK actions
5. `addPlayer(teamId, playerData)` → `POST /teams/{teamId}/players`
6. `updatePlayer(playerData)` → `PATCH /teams/{teamId}/players/{id}`
7. `deletePlayer(playerData)` → `DELETE /teams/{teamId}/players/{id}` — no
   frontend-side cascade call, same reasoning as AC4

**Independent Test**: Create team → add player → delete team → `GET
/cards?playerId=` for that player returns empty (proves the backend cascade
fired, not a frontend one).

---

### F5: Trainings and exercises ⭐ MVP

**User Story**: As a developer, I want `trainingService` to hit
`/trainings`, with `number` coming from the server instead of
`lib/trainingNumber.js`, so `Trainings.jsx` keeps working.

**Acceptance Criteria**:

1. `getAll()` → `GET /trainings`
2. `getAllNumbered(teamId)` → `GET /trainings?teamId=` when `teamId` is
   given, else `GET /trainings` — `number` SHALL be read directly from the
   response, not recomputed client-side; `src/lib/trainingNumber.js` and its
   client-side numbering logic are deleted as dead code
3. `getUnassigned()` → `GET /trainings?assigned=false`
4. `getById(id)` → `GET /trainings/{id}`
5. `create(trainingData)` → `POST /trainings`
6. `update(trainingData)` → `PATCH /trainings/{id}`
7. `delete(id)` → `DELETE /trainings/{id}` — no frontend-side
   `ratingService.removeByEvent` call; backend cascades
8. **Amended (T18, accepted deviation)**: exercise writes (add/edit/delete
   an exercise within a training popup) SHALL round-trip the training's
   whole `exercises[]` array through `POST`/`PATCH /trainings[/{id}]`,
   rather than granular `POST`/`PATCH`/`DELETE
   /trainings/{id}/exercises[/{exerciseId}]` sub-resource calls as
   originally specified. Reasoning: `PATCH /trainings/{id}` already
   replaces the whole array in one call, so the round-trip the shipped
   implementation uses is behaviorally identical to granular calls — same
   persisted result, same user-visible behavior — with no duplicated logic
   between two write paths. Going granular would mean rewriting the
   exercise popup's editing model for no observable gain, so the deviation
   is accepted rather than reworked.

**Independent Test**: Create training with 2 exercises → reload → both
exercises present with `diagram` intact → delete training → `GET /ratings`
for that event returns empty.

---

### F6: Games and standings ⭐ MVP

**User Story**: As a developer, I want `gameService` and `standingsService`
to hit `/games` and `/standings`, with the league table computed server-side,
so `Games.jsx` and its result popups keep working.

**Acceptance Criteria**:

1. `getAll(teamId)` → `GET /games` or `GET /games?teamId=`
2. `getScheduled(teamId)` / `getPlayed(teamId)` → `GET
   /games?status=scheduled` / `GET /games?status=played` (optionally
   `&teamId=`) — the frontend SHALL NOT refetch-all-then-filter client-side
   with `hasResult()`; `src/lib/gameResult.js`'s `hasResult` becomes unused
   and is deleted if nothing else calls it
3. `getUnassigned()` → `GET /games?assigned=false`
4. `create(gameData)` → `POST /games`
5. `update(gameData)` → `PATCH /games/{id}`
6. `delete(id)` → `DELETE /games/{id}` — no frontend-side
   `cardService.removeByGame`/`ratingService.removeByEvent` calls
7. `recordResult(id, { us, them })` → `PUT /games/{id}/result`
8. `clearResult(id)` → `DELETE /games/{id}/result`
9. **Resolved by T17**: the full league table (our row + rivals,
   server-computed points/goal difference, pre-sorted) SHALL come from
   `GET /standings?teamId=` instead of being derived/sorted client-side.
   Shipped as `standingsService.getTable(teamId)` — a new method, not an
   overload of `getAll()` — because `getAll()` already had an established
   meaning (rival rows only, `GET /standings/rivals`) that the rival-row
   manager UI still depends on; introducing `getTable` avoided overloading
   one method with two return shapes. `standingsService`'s rival-row CRUD
   (`create`/`update`/`delete`) maps to `/standings/rivals[/{id}]`
   unchanged in shape, and client-side validation of
   won+drawn+lost-sums-to-played SHALL be kept as an early, cheap reject
   before the request in addition to the server's own `400` — both must
   agree on the same rule

**Independent Test**: Record a result → `GET /standings?teamId=` reflects
updated points/goal difference without a page reload of unrelated data.

---

### F7: Cards and ratings ⭐ MVP

**User Story**: As a developer, I want `cardService`/`ratingService` to hit
`/cards`/`/ratings`, so the card/rating popups keep working and dead cascade
methods are removed.

**Acceptance Criteria**:

1. `getAll()`/`getByGame(gameId)`/`getByPlayer(playerId)` on cards → `GET
   /cards`, `GET /cards?gameId=`, `GET /cards?playerId=`
2. `record({ playerId, gameId, type })` → `POST /cards`; a `400` (invalid
   type, or player not on the game's team) maps to `ValidationError` per F1
3. `remove(id)` → `DELETE /cards/{id}`
4. `cardService.removeByGame`/`removeByPlayer` are deleted from the module's
   exports (Assumptions section) — any remaining caller is a bug to fix in
   this feature, not a follow-up
5. `getAll()`/`getByEvent(eventType, eventId)`/`getByPlayer(playerId,
   eventType)` on ratings → `GET /ratings`, `GET
   /ratings?eventType=&eventId=`, `GET /ratings?playerId=[&eventType=]`
6. `setRating({ playerId, eventType, eventId, value })` → `PUT
   /ratings/{eventType}/{eventId}/players/{playerId}` with `{ value }` as
   the body; `value: null` SHALL still delete the rating (the frontend keeps
   this branch, translating to `DELETE /ratings/{id}` after first resolving
   the id via a `GET`, OR the frontend accepts a `null` PUT if the backend
   supports it — resolve exact mechanics in Design, this AC only locks the
   observable behaviour: null clears, 0 is a real rating)
7. `remove(id)` → `DELETE /ratings/{id}`
8. `ratingService.removeByEvent`/`removeByPlayer` are deleted from the
   module's exports, same reasoning as AC4

**Independent Test**: Set rating value `0` for a player → `GET
/ratings?playerId=` returns a record with `value: 0`, not absent. Set
`value: null` → same query returns no record for that player/event.

---

### F8: Competitions and opponents ⭐ MVP

**User Story**: As a developer, I want `competitionService`/`opponentService`
to hit `/competitions`/`/opponents`, with rename cascades happening
server-side in one transaction instead of the frontend's own
fetch-all-affected-games-then-update-each loop.

**Acceptance Criteria**:

1. `getAll()` → `GET /competitions` / `GET /opponents`
2. `create(name)` → `POST /competitions` / `POST /opponents`; a duplicate
   name maps `409` → `ConflictError`, replacing the frontend's own
   client-side `assertNoDuplicate` check (the backend now owns
   case-insensitive uniqueness)
3. `update({ id, name })` → `PATCH /competitions/{id}` / `PATCH
   /opponents/{id}` — the frontend SHALL NOT re-implement the
   fetch-games-and-update-each cascade in `gameService`; the single PATCH
   call is sufficient because the backend cascades to affected games in one
   transaction
4. `delete(id)` → `DELETE /competitions/{id}` / `DELETE /opponents/{id}`

**Independent Test**: Rename a competition referenced by 2 games → both
games' `competition` field reflects the new name after a single `PATCH`
call, with no additional `gameService.update` calls made by the frontend
(verifiable by asserting `fetch` call count).

---

## Edge Cases

- WHEN the API is unreachable (dev server not running) at app boot THEN the
  silent-refresh call in F1 AC6 SHALL fail as a `NetworkError`, and
  `AuthContext` SHALL treat this the same as "no valid session" (resolve to
  signed-out) rather than hanging on `loading: true` forever
- WHEN two tabs are open and one signs out THEN the other tab's next API
  call SHALL fail with `401`, triggering the same sign-out flow (no
  cross-tab `storage` event listener is required this round — eventual
  consistency on next action is acceptable)
- WHEN a training/game `day`/`date` field arrives from the API as an ISO
  string THEN it SHALL be parsed to a `Date` before reaching any page
  component, matching the mock's prior `DATE_FIELDS` behaviour, so
  `Calendar.jsx`'s date arithmetic does not regress
- WHEN a rating's `value` is legitimately `0` THEN no part of the client
  (request or response handling) SHALL treat it as falsy/absent (the
  null-vs-zero trap the mock already guards against, per F7 AC6)

## Requirement Traceability

| Req ID prefix | Story |
| --- | --- |
| HTTP- | F1 |
| AUTH- | F2 |
| PROF- | F3 |
| TEAM-, PLAY- | F4 |
| TRAIN-, EXER- | F5 |
| GAME-, STAND- | F6 |
| CARD-, RATE- | F7 |
| COMP-, OPP- | F8 |

## Success Criteria

- Every page (`Home`, `Teams`, `Trainings`, `Games`, `Calendar`, `Settings`)
  renders real data from a locally running `coach-planner-api` with no
  console errors
- `src/services/store.js`, `src/model/mock.js`, `src/lib/trainingNumber.js`
  (if fully superseded), and the mock branches of `AuthContext.jsx` no
  longer exist in the tree
- No service module imports another service's `removeBy*` cascade helper
- A hard reload while signed in does not sign the user out (silent refresh
  works); a hard reload with an expired/absent refresh token does
