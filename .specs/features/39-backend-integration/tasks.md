# Backend Integration — Tasks

Preconditions before T1: `coach-planner-api` running locally
(`docker compose up -d db && ./gradlew bootRun`) so tasks can verify against
the real API, not just mocked `fetch`.

```
Phase 0  Foundation           T1–T5   ← blocks everything
Phase 1  Auth                 T6–T8a  ← blocks every other page
Phase 2  Teams & players      T9
Phase 3  Trainings            T10
Phase 4  Games & standings    T11–T12
Phase 5  Cards & ratings      T13
Phase 6  Reference lists      T14
Phase 7  Cleanup & docs       T15–T16
```

Phases 2–6 are independent of each other once Phase 1 lands and can be
reordered or parallelized across workers.

### T8a — Fix pre-existing tests broken by the async, API-backed AuthContext

**Files**: `src/__tests__/App.test.jsx`, `src/pages/__tests__/Settings.test.jsx`
**Why**: T6/T7 made `AuthContext` async and moved profile/password
validation server-side (per F2/F3's ACs). These two pre-existing suites
still seed a signed-in session via the old mock's `localStorage`
`user`/`session` keys and assert on client-side validation messages that
no longer exist client-side. Confirmed via a full-suite run after merging
T1–T8: 42 tests failing across these 2 files, 0 failures anywhere else.
**Do**: Rewrite the affected tests to mock `apiFetch`/the new
`AuthContext` shape (matching the pattern already used in
`AuthContext.test.jsx` from T6/T7) instead of seeding `localStorage`
directly. Preserve every acceptance criterion the original tests encoded
(shell layout ACs in `App.test.jsx`, profile/password ACs in
`Settings.test.jsx`) — this is a test-harness update, not a coverage cut.
Where a test asserted client-side validation that has legitimately moved
server-side (e.g. "an invalid email is rejected" was a local check, is now
a `400` from the API), update the test to assert the new behavior (mock
the `400` response) rather than deleting the case.
**Test**: the two files themselves, rewritten.
**Gate**: `npm test -- --run` (full suite) — must return to 0 failures.
**Depends on**: T7

---

### T1 — Error types

**Files**: `src/lib/errors.js`
**Do**: Add `ConflictError`, `AuthError`, `ApiError` (with `.status`),
`NetworkError`. Extend `ValidationError` to accept an optional `errors` map
as a second constructor arg, additive.
**Test**: `src/lib/__tests__/errors.test.js` — each class name/instanceof/
message check.
**Gate**: `npm test -- errors`
**Depends on**: —

### T2 — `tokenStore.js`

**Files**: `src/lib/tokenStore.js` (new)
**Do**: `getAccessToken`/`setTokens`/`clearTokens`/`getRefreshToken`,
`setAuthFailureHandler`/`onAuthFailure` invocation point. Access token: a
module-level variable. Refresh token: `localStorage` key `refreshToken`.
**Test**: `src/lib/__tests__/tokenStore.test.js` — set/get/clear round-trip;
localStorage actually written; handler invoked when triggered.
**Gate**: `npm test -- tokenStore`
**Depends on**: —

### T3 — `dates.js`

**Files**: `src/lib/dates.js` (new)
**Do**: `parseApiDate(isoString) -> Date | null`,
`serializeApiDate(date) -> string | null`, both null-safe.
**Test**: round-trip a known ISO string; null passthrough.
**Gate**: `npm test -- dates`
**Depends on**: —

### T4 — env config

**Files**: `.env.example` (new), `.gitignore` (check/extend)
**Do**: `VITE_API_BASE_URL=http://localhost:8080/api/v1` in `.env.example`.
Confirm `.env` is gitignored (add if missing).
**Test**: none (config file) — verify `import.meta.env.VITE_API_BASE_URL`
resolves in a scratch component or via T5's own test.
**Gate**: manual check
**Depends on**: —

### T5 — `apiClient.js`

**Files**: `src/lib/apiClient.js` (new)
**Do**: Implement `apiFetch` per design.md — bearer header, one deduped
refresh-and-retry on `token-expired` 401, typed-error mapping via T1,
`NetworkError` on fetch rejection, `onAuthFailure` call on exhausted
refresh.
**Test**: `src/lib/__tests__/apiClient.test.js` — mock `global.fetch`.
Cover: header attached; expired-token retry succeeds; concurrent 401s
dedupe to one refresh call; refresh failure triggers `onAuthFailure` and
throws; each HTTP status → correct error class; fetch rejection →
`NetworkError`; 204 response → `null` return.
**Gate**: `npm test -- apiClient`
**Depends on**: T1, T2

---

### T6 — `AuthContext` rewrite: sign-in/sign-up/sign-out

**Files**: `src/context/AuthContext.jsx`
**Do**: Replace localStorage mock body with `apiFetch` calls per design.md
(`/auth/register`, `/auth/login`, `/auth/logout`). Remove
`DEMO_EMAIL`/`DEMO_PASSWORD`/`normalizeStoredUser`/`readStoredUser`. Keep
the `{ success, message }` return shape every page already expects.
**Test**: `src/context/__tests__/AuthContext.test.jsx` rewritten to mock
`apiFetch` — sign-up success/409/400, sign-in success/401,
sign-out clears tokens and calls `/auth/logout`.
**Gate**: `npm test -- AuthContext`
**Depends on**: T5

### T7 — `AuthContext`: silent refresh on boot + profile

**Files**: `src/context/AuthContext.jsx`
**Do**: Boot-time silent refresh (F1 AC6, F2 AC7) — if no refresh token,
resolve `loading:false` with no API call; if present, refresh then
`GET /users/me`, on any failure clear tokens and resolve signed-out.
Register `setAuthFailureHandler`. Add `updateProfile`/`changePassword`
against `/users/me` and `/users/me/password`.
**Test**: extend T6's test file — boot with no token (no fetch call), boot
with valid token (user set), boot with invalid/expired refresh (signed
out, no hang), `updateProfile` success/409, `changePassword`
mismatch-rejected-locally, success clears session.
**Gate**: `npm test -- AuthContext`
**Depends on**: T6

### T8 — Wire `AuthContext` into `App.jsx`/pages, verify manually

**Files**: `src/App.jsx` (check `PrivateRoute`, no change expected),
`src/pages/SignIn.jsx`, `src/pages/SignUp.jsx`, `src/pages/Settings.jsx`
(Profile tab) — confirm call sites match T6/T7's function signatures,
adjust callers only if the parameter shape changed
**Do**: `npm run dev` + the sibling API running; register a real account
through the UI, sign out, sign back in, reload mid-session (silent
refresh), edit profile, change password (confirms old session invalidated
per F3 AC4).
**Test**: manual — this is the feature's first real integration point;
capture a screenshot/note of the flow working
**Gate**: manual verification against the running backend
**Depends on**: T7

---

### T9 — `teamService` → API

**Files**: `src/services/teamService.js`, `src/services/__tests__/teamService.test.js`
**Do**: Rewrite per design.md's pattern. Remove `cardService`/
`ratingService` imports and their cascade calls from `delete`/
`deletePlayer` (F4 AC4/AC7).
**Test**: rewrite existing test file to mock `apiFetch`, assert
path/method/body per call, assert no cascade calls made.
**Gate**: `npm test -- teamService`
**Depends on**: T5

### T10 — `trainingService` → API

**Files**: `src/services/trainingService.js`,
`src/services/__tests__/trainingService.test.js`,
delete `src/lib/trainingNumber.js` + its test if no longer imported anywhere
**Do**: Rewrite per design.md. `getAllNumbered` becomes a querystring call,
`number` read from response, no client-side numbering. Date rehydration via
T3. Remove `ratingService.removeByEvent` cascade call from `delete`.
Exercise sub-resource writes hit `/trainings/{id}/exercises[/{id}]`.
**Test**: rewrite existing test file; add a case proving `number` is not
recomputed client-side.
**Gate**: `npm test -- trainingService` and confirm no other file imports
`lib/trainingNumber` before deleting it (`grep -r "trainingNumber" src/`)
**Depends on**: T3, T5

### T11 — `gameService` → API

**Files**: `src/services/gameService.js`,
`src/services/__tests__/gameService.test.js`
**Do**: Rewrite per design.md. `getScheduled`/`getPlayed` become
`?status=` querystring calls, not fetch-all-then-filter. Remove
`cardService.removeByGame`/`ratingService.removeByEvent` cascade calls from
`delete`. Date rehydration for `date` via T3.
**Test**: rewrite existing test file; assert `?status=scheduled`/`?status=played`
querystrings, no cascade calls.
**Gate**: `npm test -- gameService`. Check whether `lib/gameResult.js`'s
`hasResult` is still imported anywhere else (`grep -r "gameResult" src/`)
— delete it in T15 if not.
**Depends on**: T3, T5

### T12 — `standingsService` → API

**Files**: `src/services/standingsService.js`,
`src/services/__tests__/standingsService.test.js`
**Do**: `getAll` (our-team row) → `GET /standings?teamId=`; rival-row
`create`/`update`/`delete` → `/standings/rivals[/{id}]`. Keep the existing
`validate()` client-side won+drawn+lost check as an early reject in
addition to the server's own `400`.
**Test**: rewrite existing test file.
**Gate**: `npm test -- standingsService`
**Depends on**: T5

### T13 — `cardService` + `ratingService` → API

**Files**: `src/services/cardService.js`, `src/services/ratingService.js`,
their `__tests__` files
**Do**: Rewrite per design.md. Delete `removeByGame`/`removeByPlayer` from
`cardService`'s exports and `removeByEvent`/`removeByPlayer` from
`ratingService`'s exports entirely (not just unused — removed from the
object literal). `setRating`'s `null` case: verify against the real running
API first (design.md flags this as unverified) — try `PUT .../{playerId}`
with `{ value: null }`; if the backend rejects it, fall back to
`GET` current rating id → `DELETE /ratings/{id}` and note the deviation in
this task's commit message.
**Test**: rewrite existing test files; assert `value: 0` round-trips as a
real record, `value: null` clears.
**Gate**: `npm test -- cardService ratingService`
**Depends on**: T5

### T14 — `competitionService` + `opponentService` → API

**Files**: `src/services/competitionService.js`,
`src/services/opponentService.js`, their `__tests__` files
**Do**: Rewrite per design.md. Remove client-side `assertNoDuplicate`
(backend owns uniqueness, returns `409` → `ConflictError`) and the
fetch-all-affected-games-then-update-each cascade loop in `update` — a
single `PATCH` call is sufficient (server cascades in one transaction).
Remove the now-unused `gameService` import from both files.
**Test**: rewrite existing test files; assert a rename issues exactly one
`fetch` call, not N.
**Gate**: `npm test -- competitionService opponentService`
**Depends on**: T5

---

### T15 — Delete the mock layer

**Files**: delete `src/services/store.js`, `src/model/mock.js`,
`src/services/__tests__/store.test.js`; delete `src/lib/gameResult.js` and
`src/lib/trainingNumber.js` if T10/T11 confirmed they're unreferenced
**Do**: `grep -rn "services/store\|model/mock" src/` first — fix or flag
any straggling import found (a page that bypassed the service layer would
be a pre-existing bug this task surfaces, not one it should silently paper
over). Delete files once clean.
**Test**: `npm test` (full suite) passes with these files gone;
`npm run build` succeeds (no dangling import breaks the production build).
**Gate**: `npm test && npm run build`
**Depends on**: T9, T10, T11, T12, T13, T14

### T16 — Docs pass

**Files**: `docs/08-authentication.md`, `docs/05-services.md` (or
equivalent current filenames — check `docs/README.md` for the live index),
`CLAUDE.md`'s "Data layer"/"Auth" sections
**Do**: Update to describe the real API integration instead of the mock —
token storage strategy, `apiClient.js`'s existence, that `store.js` no
longer exists. This is a documentation correction, not a new spec.
**Gate**: manual read-through
**Depends on**: T15

---

## Phase 8 — Remediation: downstream test consumers (found post-T16)

**Why this phase exists**: T9–T14 correctly scoped each service's own
`__tests__` file, and T15's gate (`npm test -- --run && npm run build`)
passed — but a full-suite run after merging batch 2 showed **15 additional
test files, 331 tests** now failing. These files call service methods
directly (e.g. `await teamService.getAll()` to seed fixture data) relying on
the old mock's synchronous, test-isolated, in-memory store. Against the real
`apiClient`, those calls now make live unmocked HTTP requests — some
observed hitting the actually-running `coach-planner-api` and getting back
a real `401`. This is a correctness and safety gap (non-deterministic tests,
and tests silently depending on/mutating a real running service) that must
close before the feature's gate is green. Not present in the original
tasks.md because the original task list didn't audit downstream *consumers*
of the services being rewritten — a Tasks-authoring gap, logged here rather
than hidden.

**Fix pattern for every task below**: replace the direct
`await xService.method(...)` fixture-seeding calls with `vi.mock("../../services/xService")`
(the file already imports these services — mock the module, then
`xService.method.mockResolvedValue(...)`/`mockRejectedValue(...)` per test
as needed) so the test controls the data deterministically and makes zero
real network calls. Preserve every existing assertion and AC reference in
each file — this is a test-harness update (how data gets in), not a
coverage cut (what gets asserted). Where a test's existing fixture-seeding
shape doesn't map cleanly to a mocked return value, prefer the smallest
change that keeps the test's original intent legible.

### T17 — Fix `Settings.test.jsx`'s remaining "Reset demo data" tests

**Files**: `src/pages/__tests__/Settings.test.jsx`
**Why separate from the pattern above**: these 10 failures are not a
mocking gap — they test a UI control (Advanced tab → "Reset demo data")
that T15 correctly and deliberately removed (see the comment left in
`Settings.jsx`'s `AdvancedPanel`), since it only ever reset the
now-deleted mock. Delete the tests for the removed control; if `TAB_IDS`/
tab-switching behavior for the Advanced tab is still exercised by other
passing tests in this file, no new test is needed — the Advanced tab
still exists, just renders a placeholder.
**Gate**: `npm test -- --run src/pages/__tests__/Settings.test.jsx`
**Depends on**: T8a, T15

### T18–T26 — Fix component tests (one task per file)

**Files** (one task each, same fix pattern):
T18 `GameCardsSection.test.jsx` · T19 `GameResultPopup.test.jsx` ·
T20 `PlayerCard.test.jsx` · T21 `PlayerRatingHistory.test.jsx` ·
T22 `ReferenceListsPopup.test.jsx` · T23 `SquadRanking.test.jsx` ·
T24 `SquadRatingPopup.test.jsx` · T25 `TeamCard.test.jsx` ·
T26 `TrainingDetailsPopup.test.jsx`, `TrainingSavePopup.test.jsx` (pair —
same component family, small enough to do together)
**Gate per task**: `npm test -- --run <file>`
**Depends on**: T9–T14 (whichever services the file imports)

### T27–T30 — Fix page tests (one task per file)

T27 `Games.test.jsx` · T28 `Home.test.jsx` · T29 `Teams.test.jsx` ·
T30 `Trainings.test.jsx`
**Gate per task**: `npm test -- --run <file>`
**Depends on**: T9–T14

### T31 — Full-suite green + build

**Files**: none (verification-only)
**Do**: `npm test -- --run` must show 0 failed; `npm run build` must
succeed; `npm run lint` must be clean.
**Gate**: all three commands, zero non-zero exits.
**Depends on**: T17–T30

---

## Verifier

After T16, dispatch the standard fresh-eyes Verifier (or run `validate.md`
standalone if not using sub-agents): spec-anchored check against every AC
above, discrimination sensor on the typed-error mapping and the
cascade-removal ACs (F4.4/F4.7, F5 delete, F6.6, F7.4/F7.8) since those are
the easiest to silently regress (an accidentally-kept cascade call would
still "work" — it'd just be redundant with the backend's FK cascade, and no
test currently proves its *absence* unless T9/T10/T11/T13's tests assert
call counts, not just outcomes).
