# Training PDF Export (Frontend) — Specification

**Feature:** `41-training-pdf-export` · **Scope:** Large (transport layer + service + component + docs)
**Created:** 2026-08-25 · **Status:** Implemented — 8/8 tasks done, Verifier pending
**Backend counterpart:** `coach-planner-api` `.specs/features/01-training-pdf-export` (done)

---

## Problem Statement

The backend now exposes `GET /api/v1/trainings/{id}/export.pdf`, which renders one
training as a printable A4 session sheet — header band, one block per exercise, pitch
diagrams drawn to match `DiagramView`. That backend spec explicitly lists *"Frontend
'Export PDF' button — lives in `../coach-planner`, needs its own spec there"* as out of
scope. So today the endpoint exists and nothing in the app can reach it: a coach still
walks onto the pitch with a browser tab.

This feature is the missing half — a button in the training details popup that downloads
that PDF.

One constraint makes this more than "add a button", and it was verified in the source
rather than assumed: **`apiFetch` cannot carry this response.** Every service in the app
goes through `src/lib/apiClient.js`, whose last line is `return res.json()`
(`src/lib/apiClient.js:110`). A PDF body is not JSON. The bearer token, the
refresh-and-retry, and the typed-error mapping all live in that one function, so the
endpoint cannot be consumed without either duplicating that logic in a raw `fetch` or
teaching `apiClient` to return bytes. This spec chooses the latter (see AD-026 in
`design.md`).

## Goals

- [ ] A coach can click one button in the training details popup and get the training's
      PDF as a file download, with the filename the backend chose.
- [ ] The printed header date matches the date the popup shows on screen — not a
      UTC-shifted one.
- [ ] Binary responses reuse the *existing* auth path — same bearer token, same
      single refresh-and-retry, same typed errors — with zero duplicated fetch logic.
- [ ] Every failure the endpoint can produce (401 past retry, 404, 400, 500, offline)
      surfaces as a comprehensible message in the popup, never a silent no-op.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Any change to `coach-planner-api` | The endpoint is done and already exposes `Content-Disposition` through CORS (`SecurityConfig.kt:84`) — verified, not assumed. A genuine backend gap becomes a bug report to that repo, not a change here. |
| An export button anywhere else (`TrainingCard`, `Trainings` page, `Calendar`, dashboard) | The request names the training details popup. `trainingService.exportPdf` makes any other call site a two-line addition later. |
| Batch export (a whole team's programme) | The backend has no batch endpoint; its own spec lists batch as a separate future feature. |
| Exporting games, standings, cards or ratings | No backend endpoint exists for any of them. |
| Rendering/previewing the PDF in-app (embedded viewer, print preview) | A download is what was asked for. An in-app viewer is a different feature with its own layout and library decisions. |
| A coach-configurable export timezone in Settings | User decision this round: the browser's own zone is sent. `pages/Settings.jsx` would need a persisted preference the API does not model. |
| Export progress UI beyond a disabled button (progress bar, percentage) | The response is a single non-streamed body; there is no progress to report. Generation is specified at <2s for a 10-exercise session. |
| Caching or reusing a previously generated PDF | The backend persists nothing (BE AC PDFX-08); a client-side cache would invent a staleness problem the feature does not have. |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here — nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Which timezone to send as `?zone=` | The browser's own IANA zone, from `Intl.DateTimeFormat().resolvedOptions().timeZone` | **User-selected.** The popup already prints `training.day.toLocaleString()` (browser zone). Sending anything else means the sheet and the screen disagree about which day the session is on — a 21:00 São Paulo session is 00:00 UTC *the next day*. | **y** |
| Fallback when `Intl` yields no zone | Omit `?zone=` entirely, letting the backend default to UTC | The backend's documented default. Sending `?zone=undefined` would earn a `400`. | y |
| Delivery mechanism | Fetch the bytes with the bearer token, then hand the browser a `Blob` via a temporary `<a download>` | Forced, not chosen: the endpoint requires an `Authorization` header, so `window.open(url)` / a plain `<a href>` cannot authenticate. There is no cookie session to fall back on (`AD-021`, token in memory). | y |
| Where the binary transport lives | A new `apiFetchBlob` export in `src/lib/apiClient.js`, sharing one request core with `apiFetch` | The alternative — a raw `fetch` inside `trainingService` — would fork the token attachment, the 401 refresh dedupe (`refreshInFlight`) and the RFC 9457 error mapping. See AD-026. | y |
| Filename source | The response's `Content-Disposition`, with a client-side fallback | The backend already derives a meaningful name (`ExportFilename.of`, e.g. `sub-11-session-3-2026-08-25.pdf`) and exposes the header cross-origin. A fallback is still specified because the header is one nginx/CORS misconfiguration away from being unreadable, and a download with no name is worse than a generic one. | y |
| Button label and placement | `Export PDF`, `variant="secondary"`, in the popup's existing `PopupActions` row | Matches the `Rate squad` precedent exactly — same row, same variant, same popup. | y |
| Error presentation | An inline `role="alert"` line inside the popup body | The established pattern in this repo (`SquadRatingPopup.jsx:126`, `TeamPopup`, `GameSavePopup`). No toast system exists to reuse. | y |
| Behaviour on `AuthError` past retry | No inline message; the existing global auth-failure handler redirects to `/signin` | `apiClient` already calls `notifyAuthFailure()`, and `PrivateRoute` acts on it (`CLAUDE.md`, Auth). An inline error would flash and then be unmounted by the redirect. | y |
| Popup stays open after a successful download | Yes | A download is not a mutation; closing the popup would lose the coach's place for no reason, and nothing on screen has changed. | y |

**Open questions:** none — all resolved or logged above.

---

## Implicit-Requirement Dimensions Sweep

Large scope — every dimension resolves to a requirement or an explicit `N/A because…`.

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | `PDFEX-11`…`PDFEX-14` — the `Content-Disposition` filename is *server-controlled input* and is parsed, decoded, path-stripped and fallback-guarded rather than trusted verbatim. `PDFEX-04` — the zone string is URL-encoded. |
| Failure / partial-failure states | `PDFEX-09`, `PDFEX-15`…`PDFEX-18` — every non-2xx maps to a typed error and a specific message; no partial write is possible client-side because the blob is materialised before any anchor is created. |
| Idempotency / retry / duplicate handling | `PDFEX-19` — the button is disabled while a request is in flight, so a double click cannot produce two downloads. `PDFEX-07` — the shared refresh-and-retry fires at most once, reusing `apiClient`'s existing `refreshInFlight` dedupe. |
| Auth boundaries & rate limits | `PDFEX-06`, `PDFEX-07`, `PDFEX-08` — same bearer token, same single retry, same global auth-failure redirect as every other call. **Rate limits: N/A because** the API has no throttling layer (backend spec, PDFX auth row) and this adds no new abuse surface. |
| Concurrency / ordering | `PDFEX-19` covers the only concurrency this feature has (repeat clicks on one button). **Otherwise N/A because** the export is a read-only `GET` that mutates no app state. |
| Data lifecycle / expiry | `PDFEX-05` — the object URL is revoked and the anchor removed immediately after the click, so the blob is not retained for the tab's lifetime. Nothing is persisted client-side. |
| Observability | **N/A because** the app has no telemetry layer at all; failures are `console.error`'d exactly like every other service failure in this repo (`SquadRatingPopup.jsx:69` pattern). No new mechanism is requested. |
| External-dependency failure | `PDFEX-10`, `PDFEX-18` — an unreachable API is a `NetworkError` with its own message, distinct from a server-side failure. |
| State-transition integrity | **N/A because** exporting changes no entity state; the training is unchanged before and after (backend AC PDFX-08). |

---

## User Stories

### F1: Export a training as a PDF from the details popup ⭐ MVP

**User Story**: As a coach, I want an *Export PDF* button on a training's details, so I
can print the session sheet and take it onto the pitch.

**Why F1**: It is the feature. Everything else in this spec exists to make this work
correctly.

**Acceptance Criteria**:

1. `PDFEX-01` — WHEN `TrainingDetailsPopup` renders a training THEN it SHALL show an enabled button labelled `Export PDF` in the popup's action row, alongside the existing Close / Rate squad / Edit buttons.
2. `PDFEX-02` — WHEN the coach clicks `Export PDF` THEN the app SHALL issue exactly one request to `/trainings/{training.id}/export.pdf` through the shared API client.
3. `PDFEX-03` — WHEN that request is issued THEN it SHALL carry `?zone=` set to `Intl.DateTimeFormat().resolvedOptions().timeZone`; and WHEN that value is absent or empty THEN the request SHALL omit the `zone` parameter entirely rather than sending an empty or `undefined` value.
4. `PDFEX-04` — WHEN the zone value is placed in the query string THEN it SHALL be URL-encoded (`America/Sao_Paulo` → `America%2FSao_Paulo`).
5. `PDFEX-05` — WHEN the response bytes arrive THEN the app SHALL hand the browser a file download named per `PDFEX-11`, and SHALL then revoke the created object URL and remove the temporary anchor from the DOM, leaving the document with no leftover `<a>` element.
6. `PDFEX-06` — WHEN the download has been handed off THEN the popup SHALL remain open, showing the same training, with no error displayed.
7. `PDFEX-07` — WHEN the training has `teamId == null` THEN the button SHALL behave identically to the assigned case — the request is issued and the download handed off unchanged (the backend renders an `UNASSIGNED` header and its own filename shape).

**Independent Test**: Open a training's details, click `Export PDF`, and assert the
service was called with the training's id and the browser's zone, that a download was
triggered with the backend's filename, and that the popup is still on screen.

---

### F2: Binary responses through the shared API client ⭐ MVP

**User Story**: As a developer, I want PDF bytes fetched through `apiClient`, so the
token, the refresh-and-retry and the typed errors work exactly as they do for every
JSON call — with no second copy of that logic.

**Why F2**: `apiFetch` ends in `res.json()`. Without this, `trainingService` must
hand-roll a `fetch`, and the next binary endpoint copies it again.

**Acceptance Criteria**:

1. `PDFEX-08` — WHEN `apiFetchBlob(path)` is called while an access token is set THEN the request SHALL carry `Authorization: Bearer <token>`; and WHEN no token is set THEN it SHALL be sent with no `Authorization` header — identical to `apiFetch`'s rule.
2. `PDFEX-09` — WHEN the API answers `401` with a problem `type` containing `token-expired` THEN `apiFetchBlob` SHALL refresh once and retry the request exactly once, resolving with the retried response's bytes; a `401` on the retry SHALL NOT trigger a second refresh.
3. `PDFEX-10` — WHEN a concurrent `apiFetch` and `apiFetchBlob` both hit an expired token THEN they SHALL share one in-flight refresh call (the existing `refreshInFlight` dedupe), not issue two.
4. `PDFEX-11` — WHEN the refresh itself fails with an auth failure THEN `apiFetchBlob` SHALL notify the global auth-failure handler and reject with `AuthError`, returning no bytes.
5. `PDFEX-12` — WHEN the API answers a non-2xx status with an RFC 9457 `problem+json` body THEN `apiFetchBlob` SHALL reject with the same typed error `apiFetch` produces for that status (`400`→`ValidationError`, `404`→`NotFoundError`, `409`→`ConflictError`, `401`→`AuthError`, anything else→`ApiError` carrying the status), and SHALL NOT resolve with a blob.
6. `PDFEX-13` — WHEN `fetch` itself rejects (offline, DNS, CORS block) THEN `apiFetchBlob` SHALL reject with `NetworkError`.
7. `PDFEX-14` — WHEN the request succeeds THEN `apiFetchBlob` SHALL resolve with an object exposing both the response `Blob` and the derived filename, so no caller re-reads response headers itself.
8. `PDFEX-15` — WHEN `apiFetch` is called for any existing JSON endpoint THEN its observable behaviour SHALL be unchanged by this refactor: the full pre-existing `apiClient` test file SHALL pass untouched, with no test weakened, skipped or deleted.

**Independent Test**: Drive `apiFetchBlob` against a stubbed `fetch` for each status
(200, 401-expired→200, 401-expired→401, 404, 400, 500, network reject) and assert the
resolved blob or the thrown typed error — with the existing `apiClient.test.js` still
green, unmodified.

---

### F3: The download filename ⭐ MVP

**User Story**: As a coach, I want the downloaded file named after the session, so a
folder of exports is readable without opening each one.

**Why F3**: The backend already computes `sub-11-session-3-2026-08-25.pdf`. Dropping
that on the floor and saving `download.pdf` wastes work already done, and the header is
server-supplied input that must be parsed rather than trusted.

**Acceptance Criteria**:

1. `PDFEX-16` — WHEN the response carries `Content-Disposition: attachment; filename="sub-11-session-3-2026-08-25.pdf"` THEN the download's filename SHALL be `sub-11-session-3-2026-08-25.pdf`, with the surrounding quotes stripped.
2. `PDFEX-17` — WHEN the header carries an RFC 5987 `filename*=UTF-8''…` parameter THEN its percent-decoded value SHALL be used, and SHALL take precedence over a plain `filename=` in the same header.
3. `PDFEX-18` — WHEN the header is absent, empty, or carries no usable filename parameter THEN the caller-supplied fallback SHALL be used, and that fallback SHALL be a non-empty name ending in `.pdf`.
4. `PDFEX-19` — WHEN the parsed filename contains a path separator or a traversal segment (`../evil.pdf`, `/etc/x.pdf`, `a\b.pdf`) THEN only its final path segment SHALL be used; and WHEN stripping leaves nothing usable THEN the fallback SHALL be used instead.

**Independent Test**: Unit-drive the parser over each header form above — quoted,
unquoted, `filename*`, both present, absent, empty, traversal — asserting the exact
resulting string per case.

---

### F4: Failure feedback and in-flight state ⭐ MVP

**User Story**: As a coach, I want to see what happened when an export fails, so a
click that produces no file isn't a mystery.

**Why F4**: A `GET` that can 404, 400, 500 or fail offline, wired to a button with no
feedback, is indistinguishable from a broken button.

**Acceptance Criteria**:

1. `PDFEX-20` — WHEN an export request is in flight THEN the `Export PDF` button SHALL be disabled and SHALL show a distinct in-progress label (`Exporting…`).
2. `PDFEX-21` — WHEN the coach clicks the button twice in rapid succession THEN exactly one request SHALL be issued.
3. `PDFEX-22` — WHEN the request settles, successfully or not THEN the button SHALL return to its enabled `Export PDF` state.
4. `PDFEX-23` — WHEN the export fails with `NotFoundError` THEN the popup SHALL display an inline `role="alert"` message stating the training could not be found, and SHALL NOT trigger any download.
5. `PDFEX-24` — WHEN the export fails with `NetworkError` THEN the inline message SHALL say the server could not be reached — wording distinct from `PDFEX-23`'s.
6. `PDFEX-25` — WHEN the export fails with any other error (`ApiError`, `ValidationError`, an unexpected throw) THEN the popup SHALL display a generic inline failure message and SHALL log the underlying error to the console, matching the repo's existing `console.error` + `setError` pattern.
7. `PDFEX-26` — WHEN the export fails with `AuthError` THEN the popup SHALL NOT display an inline message — the global auth-failure handler already redirects to `/signin` — and SHALL NOT trigger a download.
8. `PDFEX-27` — WHEN a failed export is retried and succeeds THEN the previously shown error message SHALL be cleared before the download is handed off.

**Independent Test**: Render the popup with a service stub rejecting with each error
type in turn, assert the exact message (or its absence for `AuthError`), then make the
stub resolve and assert the message clears and the download fires.

---

### F5: Documentation ✳️ P2

**User Story**: As the next developer, I want `apiFetchBlob` and the export button
documented where the other services and components are, so the binary path is
discoverable instead of being found by grep.

**Acceptance Criteria**:

1. `PDFEX-28` — WHEN the feature is complete THEN `docs/05-services.md`, `docs/07-components.md` and `CLAUDE.md`'s Data-layer section SHALL each describe the binary path (`apiFetchBlob`, `trainingService.exportPdf`) and the export button, and `.specs/STATE.md` SHALL carry the new `AD-026` decision entry.

**Independent Test**: `grep -r apiFetchBlob docs/ CLAUDE.md` returns hits in all three
places, and `AD-026` exists in `.specs/STATE.md` with `status: active`.

---

## Edge Cases

- WHEN the browser exposes no `Intl` timezone THEN the request SHALL omit `?zone=` and accept the backend's UTC default rather than failing (`PDFEX-03`).
- WHEN the coach closes the popup while an export is in flight THEN the in-flight response SHALL be discarded without throwing — no state update on an unmounted component, no download fired after unmount.
- WHEN `URL.createObjectURL` is unavailable in the running environment THEN the download helper SHALL throw a plain error that the popup's catch turns into the generic message (`PDFEX-25`) — it SHALL NOT crash the popup.
- WHEN the backend rejects the zone with `400` (`ValidationError`) THEN the generic message path (`PDFEX-25`) applies; this is not expected to occur, since the value comes from `Intl`'s own IANA database.
- WHEN the returned blob is empty (0 bytes) THEN the download SHALL still be handed off — the app does not second-guess a `200` from the backend, whose own AC `PDFX-06` guarantees a complete document or an error status.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PDFEX-01…07 | F1: Export button | T6 | Verified |
| PDFEX-08…15 | F2: Binary transport | T2 | Verified |
| PDFEX-16…19 | F3: Filename | T1 | Verified |
| PDFEX-20…27 | F4: Failure feedback | T7 | Verified |
| PDFEX-28 | F5: Documentation | T8 | Verified |

**Coverage:** 28 total, 28 mapped to tasks (see `tasks.md`), 0 unmapped

---

## Success Criteria

- [ ] A coach opens a training, clicks one button, and a correctly-named PDF lands in their downloads — verified in a real browser against a running backend, not only in jsdom.
- [ ] `src/lib/apiClient.js` contains exactly one place where the token is attached, one place where the refresh-and-retry happens, and one place where statuses become typed errors — after the change as before it.
- [ ] The pre-existing `src/lib/__tests__/apiClient.test.js` passes unmodified.
- [ ] Every failure mode produces a distinguishable message; no click ever silently does nothing.
- [ ] Full gate green: `npm run lint && npm run build && npm test` — with a test count above the 1385 baseline and no test removed.
