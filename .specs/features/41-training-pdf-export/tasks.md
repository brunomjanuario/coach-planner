# Training PDF Export (Frontend) — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow
its Execute flow and Critical Rules.** Do not search for skill files by filesystem path.
The skill is the source of truth for the full flow (per-task cycle, adequacy review,
Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/41-training-pdf-export/spec.md`
**Design**: `.specs/features/41-training-pdf-export/design.md`
**Status**: Done — all 8 tasks implemented and committed; Verifier pending

**Baseline before any work**: `71` test files, `1385` tests, all green (measured
2026-08-25). Every task's test count is stated against this.

---

## Test Coverage Matrix

> Generated from codebase sampling, project guidelines, and spec — confirm before Execute.
> Guidelines found: `CLAUDE.md` (Commands + Conventions sections), `vite.config.js`
> (`test:` block — jsdom, globals, `src/test/setup.js`), `package.json` scripts.
> No coverage thresholds are configured anywhere in the repo, so the **strong default**
> applies to depth: every spec AC and every listed edge case gets a test.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Pure lib utility (`src/lib/*.js`, no DOM) | unit | All branches; 1:1 to spec ACs; every listed edge case | `src/lib/__tests__/*.test.js` | `npm test -- --run` |
| Transport (`src/lib/apiClient.js`) | unit | All branches; 1:1 to ACs; **plus** the pre-existing `apiClient.test.js` passing untouched as a regression harness | `src/lib/__tests__/apiClient.test.js` | `npm test -- --run` |
| DOM side-effect lib (`src/lib/download.js`) | unit | All branches, with `URL.createObjectURL`/`revokeObjectURL` stubbed (jsdom implements neither) + one manual real-browser check recorded in T7 | `src/lib/__tests__/*.test.js` | `npm test -- --run` |
| Service (`src/services/*.js`) | unit | Every method: request shape (path + query) and returned shape; error propagation | `src/services/__tests__/*.test.js` | `npm test -- --run` |
| Component (`src/components/*.jsx`) | unit (React Testing Library) | Every AC: rendered output, user interaction via `userEvent`, in-flight state, each distinct error branch | `src/components/__tests__/*.test.jsx` | `npm test -- --run` |
| Docs / `.specs` markdown | none | — (no gate beyond the full build) | — | — |

## Gate Check Commands

> Generated from `package.json` and `CLAUDE.md` — confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After any task with unit tests (all of T1–T7) | `npm test -- --run` |
| Full | Same as Quick in this repo — there is no separate e2e/integration runner | `npm test -- --run` |
| Build | After the final task and after any docs-only task | `npm run lint && npm run build && npm test -- --run` |

---

## Execution Plan

Phases run sequentially; tasks within a phase run in order.

### Phase 1: Transport primitives
```
T1 → T2 → T3
```
### Phase 2: Service layer
```
T4 → T5
```
### Phase 3: User interface
```
T6 → T7
```
### Phase 4: Documentation & memory
```
T8
```

**Total: 8 tasks — one batch.** Under the ~8-task sub-agent threshold, so this executes
**inline**, no batch workers. The Verifier still runs automatically after T8.

---

## Task Breakdown

### T1: Content-Disposition filename parser

**What**: A pure `filenameFromDisposition(header, fallback)` that turns a server-supplied
`Content-Disposition` into a safe download filename.
**Where**: `src/lib/contentDisposition.js` (new), `src/lib/__tests__/contentDisposition.test.js` (new)
**Depends on**: None
**Reuses**: Nothing — pure string handling. Matches `src/lib/dates.js`'s doc-comment style.
**Requirement**: PDFEX-16, PDFEX-17, PDFEX-18, PDFEX-19

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `filename="x.pdf"` (quoted) and `filename=x.pdf` (unquoted) both yield `x.pdf` — PDFEX-16
- [ ] `filename*=UTF-8''se%C3%A7%C3%A3o.pdf` yields the percent-decoded name, and wins over a `filename=` in the same header — PDFEX-17
- [ ] `null`, `""`, and a header with no filename parameter all return the fallback — PDFEX-18
- [ ] `../evil.pdf`, `/etc/x.pdf`, `a\b.pdf` each reduce to their final segment; a name that reduces to empty returns the fallback — PDFEX-19
- [ ] A malformed `filename*` whose percent-decoding throws returns the fallback rather than propagating
- [ ] Gate passes: `npm test -- --run` — expected ~1395 tests (+10)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(lib): parse Content-Disposition into a safe download filename`

---

### T2: `apiFetchBlob` on the shared request core

**What**: Split `apiFetch`'s body into a `Response`-returning request core (token attach,
network-error wrap, 401-expired refresh-and-retry, non-2xx → typed error), then add
`apiFetchBlob(path, { fallbackFilename })` on top of it returning `{ blob, filename }`.
**Where**: `src/lib/apiClient.js` (modify), `src/lib/__tests__/apiClient.test.js` (append only)
**Depends on**: T1
**Reuses**: `doRefresh` / `refreshInFlight` / `toTypedError` verbatim; `filenameFromDisposition` from T1
**Requirement**: PDFEX-08 … PDFEX-15

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Sends `Authorization: Bearer <token>` when a token is set, and no such header when none is — PDFEX-08
- [ ] A `401` whose problem `type` contains `token-expired` refreshes once and retries once; a `401` on the retry does **not** refresh again — PDFEX-09
- [ ] A concurrent `apiFetch` + `apiFetchBlob` on an expired token produce exactly **one** `/auth/refresh` call — PDFEX-10
- [ ] A failed refresh calls the auth-failure handler and rejects with `AuthError`, resolving no blob — PDFEX-11
- [ ] `400`/`404`/`409`/`401`/`500` reject with `ValidationError`/`NotFoundError`/`ConflictError`/`AuthError`/`ApiError(status)` respectively, and resolve no blob — PDFEX-12
- [ ] A rejecting `fetch` rejects with `NetworkError` — PDFEX-13
- [ ] A success resolves `{ blob, filename }`, filename derived via T1 with the caller's fallback — PDFEX-14
- [ ] **The pre-existing tests in `apiClient.test.js` are unmodified** — new cases are appended only; `git diff` on that file shows additions and no deletions or edits to existing cases — PDFEX-15
- [ ] Gate passes: `npm test -- --run` — expected ~1405 tests (+10)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(api): add apiFetchBlob sharing apiFetch's auth and error core`

---

### T3: Blob download helper

**What**: `triggerDownload(blob, filename)` — object URL → temporary `<a download>` →
click → detach → revoke (in a `finally`).
**Where**: `src/lib/download.js` (new), `src/lib/__tests__/download.test.js` (new)
**Depends on**: None (ordered after T2 for a clean commit sequence, not by dependency)
**Reuses**: Nothing — new DOM boundary, deliberately the only DOM-touching lib in the feature
**Requirement**: PDFEX-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Creates an object URL from the blob and sets it as the anchor's `href`
- [ ] Sets the anchor's `download` attribute to the exact filename passed in
- [ ] Clicks the anchor once
- [ ] After the call, `document.body` contains no leftover `<a>` and `URL.revokeObjectURL` was called with the created URL — PDFEX-05
- [ ] When `.click()` throws, the URL is still revoked and the anchor still removed (`finally` path proven by a test, not by reading the code)
- [ ] Tests stub `URL.createObjectURL`/`revokeObjectURL` (jsdom implements neither) and the stubs are torn down in `afterEach`
- [ ] Gate passes: `npm test -- --run` — expected ~1411 tests (+6)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(lib): add triggerDownload for in-memory blobs`

---

### T4: Browser timezone helper

**What**: `browserTimeZone(): string | null` — the browser's IANA zone, or `null` when
unavailable.
**Where**: `src/lib/dates.js` (modify), `src/lib/__tests__/dates.test.js` (append)
**Depends on**: None
**Reuses**: `src/lib/dates.js`'s existing null-safe helper style
**Requirement**: PDFEX-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Returns `Intl.DateTimeFormat().resolvedOptions().timeZone` when available
- [ ] Returns `null` when `Intl` is absent, when `resolvedOptions()` throws, or when the zone is `""`/`undefined` — each branch driven by a stub, each asserted separately — PDFEX-03
- [ ] Existing `dates.test.js` cases untouched
- [ ] Gate passes: `npm test -- --run` — expected ~1415 tests (+4)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(lib): expose the browser's IANA time zone`

---

### T5: `trainingService.exportPdf`

**What**: The service wrapper: build `/trainings/{id}/export.pdf` with an optional
encoded `?zone=`, call `apiFetchBlob`, return `{ blob, filename }`.
**Where**: `src/services/trainingService.js` (modify), `src/services/__tests__/trainingService.test.js` (append), **plus** every test file whose `vi.mock` factory for `../../lib/apiClient` must now also expose `apiFetchBlob`
**Depends on**: T2, T4
**Reuses**: the module's existing one-line-wrapper style; `apiFetchBlob` (T2); `browserTimeZone` (T4)
**Requirement**: PDFEX-02, PDFEX-03, PDFEX-04, PDFEX-14

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] **First step**: `grep -rln 'vi.mock(".*lib/apiClient"' src` (26 files today) and add `apiFetchBlob: vi.fn()` to every factory that needs it — a factory missing the export makes Vitest throw *"No 'apiFetchBlob' export is defined on the mock"*, a hard failure in files unrelated to this feature (design.md, Risks row 1)
- [ ] `exportPdf("tr1")` calls `apiFetchBlob` with `/trainings/tr1/export.pdf?zone=<browser zone>` — PDFEX-02
- [ ] With a zone of `America/Sao_Paulo`, the path contains `zone=America%2FSao_Paulo` — PDFEX-04
- [ ] When `browserTimeZone()` returns `null`/`""`, the path has **no** `?zone=` at all (asserted on the exact string, not with `not.toContain("undefined")`) — PDFEX-03
- [ ] An explicit `{ zone }` argument overrides the browser zone
- [ ] The `{ blob, filename }` from `apiFetchBlob` is returned unchanged, and a fallback filename ending in `.pdf` is passed down — PDFEX-14
- [ ] A rejection from `apiFetchBlob` propagates untouched (no swallowing, no rewrapping)
- [ ] Gate passes: `npm test -- --run` — expected ~1423 tests (+8), **no pre-existing test failing** from the mock-factory change
- [ ] `npm run lint` clean

**Tests**: unit · **Gate**: quick (plus `npm run lint`, because this task edits ~26 files)
**Commit**: `feat(trainings): add exportPdf to trainingService`

---

### T6: Export PDF button — happy path

**What**: Add the `Export PDF` button to `TrainingDetailsPopup`'s action row and wire it
to `exportPdf` → `triggerDownload`.
**Where**: `src/components/TrainingDetailsPopup.jsx` (modify), `src/components/__tests__/TrainingDetailsPopup.test.jsx` (append)
**Depends on**: T3, T5
**Reuses**: `Button` (`variant="secondary"`), `PopupActions`, the `SquadRatingPopup` async-handler pattern
**Requirement**: PDFEX-01, PDFEX-02, PDFEX-05, PDFEX-06, PDFEX-07

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] An enabled button named `Export PDF` renders in the action row, outside the shell's scroll region — asserted the same way the existing `PopupActions` test does — PDFEX-01
- [ ] Clicking it calls `trainingService.exportPdf` exactly once with the training's id — PDFEX-02
- [ ] On resolve, `triggerDownload` is called with the returned blob and the returned filename — PDFEX-05
- [ ] After a successful export the popup is still rendered, the training's fields are still shown, and no alert is present — PDFEX-06
- [ ] A training with `teamId: null` exports identically (same call, same download) — PDFEX-07
- [ ] Gate passes: `npm test -- --run` — expected ~1429 tests (+6)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(trainings): add an Export PDF button to the training details popup`

---

### T7: In-flight state, error branches, and real-browser verification

**What**: Disabled/`Exporting…` state, the double-click guard, the mounted-ref guard, and
one inline `role="alert"` message per error branch.
**Where**: `src/components/TrainingDetailsPopup.jsx` (modify), `src/components/__tests__/TrainingDetailsPopup.test.jsx` (append)
**Depends on**: T6
**Reuses**: `Button`'s existing `disabled:` classes; `SquadRatingPopup.jsx:126`'s inline-error markup, upgraded with `role="alert"`
**Requirement**: PDFEX-20 … PDFEX-27, plus the Edge Cases

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] While the promise is pending the button is `disabled` and reads `Exporting…` — PDFEX-20
- [ ] Two rapid clicks produce exactly one `exportPdf` call — PDFEX-21
- [ ] After settle (both resolve and reject) the button is enabled and reads `Export PDF` again — PDFEX-22
- [ ] `NotFoundError` → a `role="alert"` naming the missing training; `triggerDownload` not called — PDFEX-23
- [ ] `NetworkError` → a `role="alert"` with **different** wording, asserted against the `NotFoundError` message so the two cannot silently converge — PDFEX-24
- [ ] `ApiError(500)` and `ValidationError` → the generic message, and `console.error` called with the underlying error — PDFEX-25
- [ ] `AuthError` → **no** alert rendered and no download — PDFEX-26
- [ ] A retry after a failure clears the previous alert before the download fires — PDFEX-27
- [ ] Closing the popup mid-flight fires no download and logs no unmounted-`setState` warning (Edge Cases)
- [ ] **Manual real-browser check, recorded in the commit message**: with `coach-planner-api` running and `npm run dev`, export a real training — the file downloads, the filename is the backend's (`…-session-N-YYYY-MM-DD.pdf`, *not* the fallback, which proves the CORS-exposed `Content-Disposition` is actually readable), and the header date matches the date the popup shows on screen. jsdom cannot prove any of this (design.md, Risks row 3)
- [ ] Gate passes: `npm run lint && npm run build && npm test -- --run` — expected ~1441 tests (+12)

**Tests**: unit · **Gate**: build
**Commit**: `feat(trainings): surface export progress and failures in the details popup`

---

### T8: Documentation and decision record

**What**: Document the binary path and the button where the rest of the app is
documented, and record `AD-026`.
**Where**: `docs/05-services.md`, `docs/07-components.md`, `CLAUDE.md`, `.specs/STATE.md`, `.specs/features/41-training-pdf-export/{spec,tasks}.md`
**Depends on**: T7
**Reuses**: The existing structure of each doc — additive edits only
**Requirement**: PDFEX-28

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `docs/05-services.md` documents `apiFetchBlob` and `trainingService.exportPdf` alongside the other service methods
- [ ] `docs/07-components.md` documents the export button on `TrainingDetailsPopup`
- [ ] `CLAUDE.md`'s Data-layer section states that binary responses go through `apiFetchBlob` and that no service calls `fetch` directly
- [ ] `.specs/STATE.md` gains `AD-026` (text drafted in `design.md`) with `status: active`, and its Handoff section is updated for this feature
- [ ] `spec.md` traceability table statuses move to `Verified`; this file's Status becomes `Done`
- [ ] Gate passes: `npm run lint && npm run build && npm test -- --run` — test count unchanged from T7
- [ ] `grep -r apiFetchBlob docs/ CLAUDE.md` returns hits in all three files — PDFEX-28

**Tests**: none (docs layer — matrix says none) · **Gate**: build
**Commit**: `docs(export): document the PDF export path and record AD-026`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 ──→ T2 ──→ T3
Phase 2:  T4 ──→ T5
Phase 3:  T6 ──→ T7
Phase 4:  T8
```

Execution is strictly sequential — one task at a time, in order. 8 tasks pack into a
single ~7-task batch, so this runs **inline in the main window with no sub-agents**. The
Verifier runs automatically after T8 regardless.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: filename parser | 1 function, 1 new file | ✅ Granular |
| T2: `apiFetchBlob` + core split | 1 file, 1 cohesive refactor + 1 new export | ✅ Granular (2 related changes, same file, inseparable) |
| T3: `triggerDownload` | 1 function, 1 new file | ✅ Granular |
| T4: `browserTimeZone` | 1 function | ✅ Granular |
| T5: `exportPdf` + mock-factory sweep | 1 method + a mechanical test-harness fix its own import forces | ✅ Granular (the sweep is not separable — the suite is red until both land) |
| T6: button + happy path | 1 component, 1 handler | ✅ Granular |
| T7: states + error branches | 1 component, same handler | ✅ Granular (split from T6 deliberately: happy path and failure surface are independently demoable) |
| T8: docs + AD-026 | docs only | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | (phase head) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | None (sequenced after T2) | T2 → T3 (ordering only, noted in the body) | ✅ Match — ordering arrow, not a dependency |
| T4 | None | (phase head) | ✅ Match |
| T5 | T2, T4 | T4 → T5 within Phase 2; T2 via the Phase 1 → Phase 2 boundary | ✅ Match |
| T6 | T3, T5 | Phase 2 → Phase 3 boundary carries T5; T3 via Phase 1 → Phase 3 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | Phase 3 → Phase 4 boundary | ✅ Match |

No task depends on a later-phase task.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Pure lib utility | unit | unit | ✅ OK |
| T2 | Transport (`apiClient`) | unit | unit | ✅ OK |
| T3 | DOM side-effect lib | unit | unit | ✅ OK |
| T4 | Pure lib utility | unit | unit | ✅ OK |
| T5 | Service | unit | unit | ✅ OK |
| T6 | Component | unit (RTL) | unit | ✅ OK |
| T7 | Component | unit (RTL) | unit | ✅ OK |
| T8 | Docs / markdown | none | none | ✅ OK |

No task defers its tests to a later task. Every AC in `spec.md` is claimed by exactly one
task's `Done when` list.

---

## Requirement → Task Coverage

| Requirement | Task |
| --- | --- |
| PDFEX-01, 06, 07 | T6 |
| PDFEX-02 | T5, T6 |
| PDFEX-03 | T4, T5 |
| PDFEX-04 | T5 |
| PDFEX-05 | T3, T6 |
| PDFEX-08 … 15 | T2 |
| PDFEX-16 … 19 | T1 |
| PDFEX-20 … 27 | T7 |
| PDFEX-28 | T8 |

**Coverage: 28 of 28 requirements mapped. 0 unmapped.**

---

## Open Question for Execute

**MCPs and Skills per task**: every task above says `MCP: NONE · Skill: NONE` — this is a
plain React/Vitest codebase with no external integration in scope. Confirm, or name tools
you want used, before Execute starts.
