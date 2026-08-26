# 05 — Services

The service layer is the boundary between the UI and the data. Eight modules
exist, each exporting a single object of `async` methods that call through
[`src/lib/apiClient.js`](../src/lib/apiClient.js) to the real
`coach-planner-api` backend — there is no in-memory mock store any more
(`src/services/store.js` and `src/model/seed.js` were deleted once every
service was rewired; see git history if you need the old mock for
reference).

```js
import { teamService } from "../services/teamService";
```

Every method preserves the name and shape it had against the old mock, so
pages/components call them exactly as before — the only behavior change
callers may need to handle is that failures now throw the typed errors
described below instead of a bare `TypeError`, and unauthenticated/expired
sessions surface as `AuthError` (handled globally by `AuthContext`, see
[08 — Authentication](08-authentication.md)).

## The shared pattern

```js
import { apiFetch } from "../lib/apiClient";

export const teamService = {
  getAll: () => apiFetch("/teams"),
  create: (teamData) => apiFetch("/teams", { method: "POST", body: teamData }),
  // ...
};
```

`apiFetch`:

- Attaches `Authorization: Bearer <accessToken>` from `tokenStore`.
- Transparently refreshes an expired access token once and retries the
  original request.
- Maps RFC 9457 `problem+json` error responses to typed errors —
  `NotFoundError` (404), `ValidationError` (400, with an optional
  field-keyed `errors` map), `ConflictError` (409), `AuthError` (401),
  `ApiError` (any other status) — and `NetworkError` when `fetch` itself
  rejects (offline, DNS failure, CORS block).
- Returns `null` for a `204 No Content` response.

## Binary responses

`apiFetch` ends in `res.json()`, so it can't carry a non-JSON body. For that,
`apiClient.js` also exports `apiFetchBlob(path, { fallbackFilename })`,
sharing the same request core as `apiFetch` — the same token attachment,
the same single-flight 401 refresh-and-retry, the same RFC 9457 error
mapping — but reading the response as a `Blob` instead of JSON:

```js
import { apiFetchBlob } from "../lib/apiClient";

export const trainingService = {
  exportPdf: (id, { zone = browserTimeZone() } = {}) =>
    apiFetchBlob(`/trainings/${id}/export.pdf${zone ? `?zone=${encodeURIComponent(zone)}` : ""}`, {
      fallbackFilename: `training-${id}.pdf`,
    }),
};
```

It resolves `{ blob, filename }` — `filename` is parsed from the response's
`Content-Disposition` header (`src/lib/contentDisposition.js`), falling
back to the caller-supplied default when the header is missing or
unparseable. No service calls `fetch` directly (see `AD-026` in
`.specs/STATE.md`); a binary endpoint always goes through `apiFetchBlob`.

`trainingService.exportPdf(id, { zone })` is the one consumer today —
`TrainingDetailsPopup`'s Export PDF button calls it, then hands the result
to `src/lib/download.js`'s `triggerDownload(blob, filename)` to save it.
`zone` defaults to the browser's own IANA zone
(`src/lib/dates.js`'s `browserTimeZone()`) so the PDF's header date matches
what the popup already shows via `day.toLocaleString()`; it's omitted
entirely when the zone can't be determined, rather than sent as the string
`"undefined"`.

## The eight services

| Service | Backend resource | Notes |
| --- | --- | --- |
| `teamService` | `/teams`, `/teams/{id}/players` | `getById` now **throws** `NotFoundError` for an unknown id (the old mock returned `null`). |
| `trainingService` | `/trainings`, `/trainings/{id}/exercises`, `/trainings/{id}/export.pdf` | `number` comes straight from the API — no client-side numbering. `day` is rehydrated to a `Date` via `lib/dates.js`. `exportPdf` is the one method that returns a binary blob instead of JSON — see [Binary responses](#binary-responses) above. |
| `gameService` | `/games`, `/games/{id}/result` | `getScheduled`/`getPlayed` are `?status=` querystring calls, not fetch-all-then-filter. `date` is rehydrated to a `Date`. |
| `standingsService` | `/standings/rivals` | Rival rows only — the "our team" row is still computed client-side in `pages/Games.jsx` from `gameService.getAll(teamId)` via `lib/standings.js`. Client-side won+drawn+lost validation is kept as an early, cheap reject in addition to the server's own `400`. |
| `cardService` | `/cards` | `removeByGame`/`removeByPlayer` no longer exist — the backend cascades a deleted game/player's cards via FK actions. |
| `ratingService` | `/ratings` | `removeByEvent`/`removeByPlayer` no longer exist, same reasoning. `setRating({..., value: null})` clears a rating in one `PUT` call (verified against the live API: returns `204`, no separate delete needed). |
| `competitionService` | `/competitions` | No client-side duplicate-name check — the backend owns case-insensitive uniqueness and returns `409`. A rename cascades to affected games server-side in one transaction; the frontend issues a single `PATCH`, not a fetch-all-then-update-each loop. |
| `opponentService` | `/opponents` | Same shape as `competitionService`. |

## Dates

`training.day` and `game.date` arrive as ISO strings and are parsed to
`Date` instances at the service boundary (`getAll`/`getById`/`create`/
`update` all hydrate before returning), matching what the old mock's
`DATE_FIELDS` rehydration used to do — pages that call `.getMonth()` /
`.toLocaleDateString()` on these fields need no changes.

## Removed cascade helpers

`teamService.delete`/`deletePlayer`, `trainingService.delete` and
`gameService.delete` used to call `cardService`/`ratingService`'s
`removeBy*` helpers explicitly. That's gone: the backend performs these
cascades itself via FK actions in one transaction, so no service imports
another service's cascade helper any more.

## Who calls what

Unchanged from before this migration — see
[06 — Routing & Pages](06-routing-and-pages.md) and
[07 — Components](07-components.md) for the current caller list. Mutations
are still invoked from **components** (popups/cards), not pages; a
component calls the service, then fires `onClose()` so the parent re-fetches
and re-renders with fresh data (services still don't mutate anything in
React state directly).

## Error handling

Call sites vary: some `pages/*.jsx` wrap loads in `try/catch` and
`console.error`; mutation call sites in popups/cards mostly don't, so an
unhandled rejection there still surfaces as an unhandled promise rejection
in the console. Catching `NetworkError` specifically (to show an "offline"
message) is the main gap worth filling next.
