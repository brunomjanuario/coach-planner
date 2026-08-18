# Backend Integration — Tasks

Preconditions before T1: `coach-planner-api` running locally
(`docker compose up -d db && ./gradlew bootRun`) so tasks can verify against
the real API, not just mocked `fetch`.

```
Phase 0   Foundation            T1–T5    ← blocks everything          ✅ done
Phase 1   Auth                  T6–T8a   ← blocks every other page    ✅ done
Phase 2   Teams & players       T9                                    ✅ done
Phase 3   Trainings             T10                                   ✅ done
Phase 4   Games & standings     T11–T12                               ✅ done
Phase 5   Cards & ratings       T13                                   ✅ done
Phase 6   Reference lists       T14                                   ✅ done
Phase 7   Cleanup & docs        T15–T16                               ✅ done
Phase 8a  Reconcile spec/code   T17–T18  ← source changes first        ✅ done
Phase 8b  Test harness          T19      ← blocks all of 8c            ✅ done
Phase 8c  Migrate consumers     T20–T26                                ✅ done
Phase 8d  Close out             T27                                    ✅ done
```

Phases 2–6 are independent of each other once Phase 1 lands and can be
reordered or parallelized across workers. Phase 8's tasks are **not**
independent: 8a changes source that 8c's tests assert against, and every
8c task builds on 8b's shared fake — run them in order.

**Status**: All tasks (T1–T27) are committed and merged to `main` (through
`09f82c2`). T27's full-suite check was run twice — once normally, once with
`coach-planner-api` and its database fully stopped — both 71/71 files,
1349/1349 tests passing, proving no test depends on a live backend. One
manual fix landed on top of the T23–T26 batch: `TrainingSavePopup.test.jsx`
had a `test.skip` (a localStorage-quota scenario made unreachable by the API
cutover) that violated the execution contract's "never skip a test" rule;
it was rewritten to inject the equivalent failure via
`fakeApi.forceFailure` on the real `PATCH /trainings/{id}` call rather than
left skipped. Next: the feature has never been validated — dispatch the
Verifier (see below) before considering this feature done. Phase 8 was
added after a full-suite run exposed 331 failing tests in 15 downstream
files; its first version prescribed the wrong fix and was revised — see the
revision note in Phase 8 before executing anything
there.

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

## Phase 8 — Remediation (found post-T16, plan revised after a first failed attempt)

**Why this phase exists**: T9–T14 each correctly scoped their own service +
`__tests__` file, and T15's gate passed — but a full-suite run after merging
batch 2 showed **15 further test files, 331 tests** failing. Those files call
service methods directly to seed fixtures (`await teamService.getAll()`),
which the old mock served from a synchronous, test-isolated in-memory store.
Against the real `apiClient` those are live HTTP calls — several were
observed hitting the actually-running `coach-planner-api` and getting real
`401`s. Non-deterministic tests that silently depend on (and can mutate) a
real service. A Tasks-authoring gap: the original list never audited
downstream *consumers* of the services being rewritten.

### Revision note — the first remediation plan was wrong, and why

The first version of this phase told workers to `vi.mock` each service and
stub methods with `mockResolvedValue`. **That fix is incorrect** and must not
be used. These are round-trip tests. For example
`GameCardsSection.test.jsx`:

```js
await user.click(screen.getByRole("button", { name: `Add yellow card to ${label(player)}` }));
await waitFor(async () => {
  const cards = await cardService.getByGame(game.id);   // reads back
  expect(cards).toHaveLength(1);
});
expect(cards[0]).toMatchObject({ playerId: player.id, gameId: game.id, type: "yellow" });
```

With `cardService.getByGame` stubbed to a fixed value, that assertion passes
**even if the component's click handler is deleted** — it asserts the stub,
not the behavior. Applying that pattern across 15 files would convert ~331
meaningful assertions into tautologies and report green. That is the
"would still pass under a plausible wrong implementation" failure the
execution contract forbids, and a discrimination sensor would surface every
one of them as a surviving mutant. A red suite is more honest.

### The correct seam: one shared stateful fake at `apiFetch`

All 8 services import exactly one function — `apiFetch` from
`src/lib/apiClient.js`. Mocking *there* rather than at the service boundary:

- **preserves round trips** — a stateful fake keeps writes readable, so the
  assertions above still discriminate a broken handler
- **keeps the real service code in the test path** — URL building, query
  strings, `Date` rehydration and typed-error mapping are all new code from
  this feature with no component-level coverage otherwise
- **is written once, not 15 times** — the per-file hand-rolled fakes the old
  plan implied would have diverged immediately
- **matches the pattern already in the repo** — `AuthContext.test.jsx` and
  the T8a rewrite of `Settings.test.jsx` already do
  `vi.mock("../../lib/apiClient")`

Salvage from the two terminated workers is kept as patches in the session
scratchpad (`salvage-A-settings-test.patch`, `salvage-B-squadratingpopup.patch`)
— A's Settings work already uses this seam and is directly reusable; B's
SquadRatingPopup fake is at the service seam and should be re-pointed at
`fakeApi` for uniformity, but its fixture data is reusable.

---

### Phase 8a — Reconcile spec vs. code (source changes first)

Two ACs disagree with what shipped. Both were flagged by the batch-2 worker
rather than hidden; both are resolved here by explicit decision, so the spec
stops lying either way. Source changes land before the test migration so
each test file is rewritten once, against final behavior.

#### T17 — Use the server-computed standings table (F6 AC9)

**Decision**: follow the spec. The backend exposes
`GET /api/v1/standings?teamId=` returning a fully computed, sorted
`List<StandingsRowDto>` (verified in `StandingsController.kt:30`), and the
frontend ignores it — `Games.jsx` fetches rival rows, computes "our row" via
`lib/standings.js`'s `computeOurRow`, and sorts client-side. That duplicates
the points / goal-difference / sort rule in two languages, where it can
drift from the backend's own tested implementation. It is also the exact
situation T10 already resolved the other way for `Training.number` (deleted
`lib/trainingNumber.js`, took the server's value) — the inconsistency is the
strongest argument for fixing it here.

**Files**: `src/services/standingsService.js`, `src/pages/Games.jsx`,
delete `src/lib/standings.js` + `src/lib/__tests__/standings.test.js`
**Do**: Add `standingsService.getTable(teamId)` → `GET /standings?teamId=`.
Rewire `Games.jsx` to render that response directly through `LeagueTable`
instead of `computeOurRow`/`toStandingsRow`/`sortStandings`. Keep
`getAll`/`create`/`update`/`delete` on `/standings/rivals` unchanged — the
rival-row *manager UI* still needs raw rows; only the *table* comes from the
server now. Note the endpoint requires `teamId` (returns `400
missing-parameter` without it) — `Games.jsx` must not call it with no team
selected.
**Test**: `standingsService.test.js` gains a case asserting `getTable`
issues `GET /standings?teamId=<id>` and returns rows unmodified (no
client-side re-sort). `Games.test.jsx`'s table assertions move to T24's
migration — do not rewrite that file here beyond keeping it compiling.
**Gate**: `npm test -- --run standingsService` + `npm run build`
**Depends on**: T12

#### T18 — Amend the spec for the accepted exercise deviation (F5 AC8) + record decisions

**Decision**: accept the deviation. `PATCH /trainings/{id}` replaces the
`exercises[]` array wholesale, so the round-trip the implementation uses is
behaviorally identical to granular sub-resource calls; there is no
duplicated logic and no user-visible difference. Going granular means
rewriting the exercise popup's editing model for no gain.

**Files**: `.specs/features/39-backend-integration/spec.md`,
`.specs/STATE.md`, `.specs/README.md`
**Do**:
1. Amend **F5 AC8** to state that exercise writes round-trip the whole
   `exercises[]` array through `POST`/`PATCH /trainings`, with the reasoning
   above recorded inline — do not silently delete the AC.
2. Mark **F6 AC9** as resolved-by-T17 (server table adopted).
3. Record this feature's locked decisions in `.specs/STATE.md`'s
   **Decisions** section, continuing the existing numbering from AD-018 —
   these were agreed at planning time but never written down: access token
   in memory + refresh token in `localStorage`; big-bang cutover of auth +
   all 8 services; mock store deleted outright with no fallback; standings
   table server-computed (T17); exercise writes array-round-tripped (this
   task). **Section-scoped write** — replace only within `## Decisions`,
   never overwrite the file (the Handoff section below it must survive).
4. Add feature `39-backend-integration` to `.specs/README.md`'s roadmap,
   matching how rounds one–four are presented.
**Gate**: manual read-through; `git diff` shows the Handoff section of
`STATE.md` untouched
**Depends on**: T17

---

### Phase 8b — Test harness foundation

#### T19 — Build the shared fake API

**Files**: `src/test/fakeApi.js` (new), `src/test/__tests__/fakeApi.test.js` (new)
**Do**: A stateful in-memory fake that stands in for `apiFetch(path, {method, body})`.
It routes on method + path and keeps collections in a plain object, so a
`POST /cards` is readable by a later `GET /cards?gameId=`.

Requirements:
- `createFakeApi(seed?)` returns `{ apiFetch, state, reset() }`; tests do
  `vi.mock("../../lib/apiClient", ...)` wiring `apiFetch` to the fake.
- Routes needed by the 14 consumer files: `/teams`(+`/players`),
  `/trainings`, `/games`(+`/result`), `/cards`, `/ratings`,
  `/standings`(+`/rivals`), `/competitions`, `/opponents`. Support the query
  params the services actually send (`?teamId=`, `?status=`, `?assigned=false`,
  `?gameId=`, `?playerId=`, `?eventType=&eventId=`).
- Returns **API-shaped** payloads, not frontend-shaped: ISO instant strings
  for `day`/`date` (so the services' own `parseApiDate` runs), `number` as a
  server-supplied field on trainings, `usScore`/`themScore` explicitly
  `null` when unplayed. Cross-check `design.md`'s "Wire format" section.
- Server-side cascades modeled: deleting a team removes its players' cards
  and ratings; deleting a game removes its cards and ratings; deleting a
  training removes its ratings. Several existing tests assert exactly this,
  and the backend now does it via FK actions.
- Able to force failures — a way to make a given route reject with a typed
  error, since some tests assert error handling (e.g. "logs an error and
  still renders when `teamService.getAll` rejects").
- A default seed roughly equivalent to the deleted `src/model/seed.js`
  (teams with players, some trainings/games), since most consumer tests
  previously relied on seeded data existing. Recover the shape from git
  history: `git show 32050f9^:src/model/seed.js`.
**Test**: `fakeApi.test.js` — the fake itself needs coverage, or every file
built on it inherits its bugs silently. Assert: a POST is readable by a
subsequent GET; query filtering works per route; date fields come back as
ISO strings; each cascade removes exactly the dependent records and nothing
else; forced failures reject with the right error type.
**Gate**: `npm test -- --run fakeApi`
**Depends on**: T17 (so `/standings` routing matches final behavior)

---

### Phase 8c — Migrate the 15 consumer files onto `fakeApi`

Same recipe for each task: replace direct-service fixture seeding with the
shared fake, keep **every existing assertion and AC comment**. This is a
harness change (how data gets in), never a coverage cut. If a test cannot
pass because the behavior it covers no longer exists, STOP and flag it —
do not delete it. The one known exception is T20's deliberate removal,
described there.

Each task's gate is `npm test -- --run <its files>`, and each must make
**zero real network calls** — verify by confirming the file passes with the
local API stopped, or that `fetch` is never reached.

| Task | Files |
| --- | --- |
| **T20** | `src/pages/__tests__/Settings.test.jsx` — start from `salvage-A-settings-test.patch`, which already deletes the dead "Reset demo data" tests. That control was deliberately removed in T15 (it only ever reset the deleted localStorage mock; see the comment in `Settings.jsx`'s `AdvancedPanel`), so deleting its tests is correct here — the one sanctioned deletion in this phase. |
| **T21** | `GameCardsSection.test.jsx`, `GameResultPopup.test.jsx` |
| **T22** | `PlayerCard.test.jsx`, `PlayerRatingHistory.test.jsx` |
| **T23** | `SquadRanking.test.jsx`, `SquadRatingPopup.test.jsx` — reuse fixture data from `salvage-B-squadratingpopup.patch`, but point it at `fakeApi` rather than its own service-seam fake |
| **T24** | `src/pages/__tests__/Games.test.jsx`, `src/pages/__tests__/Home.test.jsx` — Games' league-table assertions must move to the server-computed shape from T17 |
| **T25** | `src/pages/__tests__/Teams.test.jsx`, `src/pages/__tests__/Trainings.test.jsx` |
| **T26** | `TeamCard.test.jsx`, `ReferenceListsPopup.test.jsx`, `TrainingDetailsPopup.test.jsx`, `TrainingSavePopup.test.jsx` |

**Depends on**: T19 (all of them)

---

### Phase 8d — Close out

#### T27 — Full-suite green

**Files**: none (verification only)
**Do**: `npm test -- --run` → 0 failed. `npm run build` → succeeds.
`npm run lint` → clean. Additionally confirm the suite passes with the local
`coach-planner-api` **stopped** — that is the real proof no test depends on
a live backend, and it is the regression this whole phase exists to fix.
**Gate**: all three commands zero-exit, twice (API up, API down)
**Depends on**: T20–T26

---
## Verifier

After **T27** (not T16 — Phase 8 moved the finish line), dispatch the
standard fresh-eyes Verifier, or run `validate.md` standalone if not using
sub-agents. Spec-anchored check against every AC, plus a discrimination
sensor weighted toward the four things this feature can most easily get
wrong while still looking green:

1. **The `fakeApi` tautology risk (highest priority).** Phase 8's whole
   premise is that a badly-mocked test passes under a broken
   implementation. Mutate component handlers — delete the `cardService.record`
   call behind "add yellow card", drop the `setRating` call behind a rating
   click — and confirm the migrated tests in T20–T26 actually go red. Any
   surviving mutant means the migration recreated the exact defect the
   first plan would have introduced wholesale.
2. **Cascade-removal ACs** (F4.4/F4.7, F5 delete, F6.6, F7.4/F7.8). An
   accidentally-retained frontend cascade still "works" — it is merely
   redundant with the backend's FK action — so nothing fails unless a test
   proves its *absence*. Check these assert call counts/absence, not just
   end state.
3. **Typed-error mapping** (F1 AC4/AC5) and the one-in-flight-refresh
   dedupe (F1 AC2) — concurrent-401 handling is easy to regress into N
   refresh calls, which would trip the backend's rotation-reuse detection.
4. **The two reconciled deviations** — confirm F5 AC8 now matches the
   array-round-trip implementation and F6 AC9 matches T17's server-computed
   table, so the spec no longer disagrees with the code in either place.

Note for the Verifier: `.specs/features/39-backend-integration/validation.md`
does not exist yet — this feature has never been validated. Write it.
