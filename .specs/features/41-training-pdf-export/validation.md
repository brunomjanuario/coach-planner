# Training PDF Export (Frontend) Validation

**Date**: 2026-08-26
**Spec**: `.specs/features/41-training-pdf-export/spec.md`
**Diff range**: `c989d38..d2ba4fd` (equivalently `378bb55~1..d2ba4fd`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `src/lib/contentDisposition.js` + tests |
| T2   | ✅ Done | `apiFetchBlob` + `requestCore` split in `src/lib/apiClient.js` |
| T3   | ✅ Done | `src/lib/download.js` |
| T4   | ✅ Done | `browserTimeZone()` in `src/lib/dates.js` |
| T5   | ✅ Done | `trainingService.exportPdf` + 22-file mock-factory sweep (verified mechanical) |
| T6   | ✅ Done | Export PDF button, happy path |
| T7   | ✅ Done | In-flight/error states; manual browser check is author-reported, not independently re-verified (see note below) |
| T8   | ✅ Done | Docs + `AD-026`, with one minor literalism gap (see PDFEX-28 below) |

---

## Spec-Anchored Acceptance Criteria

### F1: Export a training as a PDF from the details popup

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| PDFEX-01 | Enabled `Export PDF` button in action row | `src/components/__tests__/TrainingDetailsPopup.test.jsx:528` — `getByRole("button", {name:"Export PDF"})` is in document and enabled | ✅ PASS |
| PDFEX-02 | Exactly one request via shared client, with training id | `src/components/__tests__/TrainingDetailsPopup.test.jsx:538` — `expect(trainingService.exportPdf).toHaveBeenCalledTimes(1)` + `toHaveBeenCalledWith("tr-99")` | ✅ PASS |
| PDFEX-03 | `?zone=` from `Intl` resolvedOptions, omitted when absent/empty | `src/services/__tests__/trainingService.test.js:158,181,192` — asserts exact path string with/without zone | ✅ PASS |
| PDFEX-04 | Zone URL-encoded (`/` → `%2F`) | `src/services/__tests__/trainingService.test.js:170` — `expect(path).toContain("zone=America%2FSao_Paulo")` and `not.toContain("America/Sao_Paulo")` | ✅ PASS |
| PDFEX-05 | Download handed off named per parser; object URL revoked; anchor removed | `src/lib/__tests__/download.test.js:45` — `document.querySelectorAll("a").length === 0`, `revokeObjectURL` called with created URL; wiring: `TrainingDetailsPopup.test.jsx:550` — `triggerDownload` called with resolved blob/filename | ✅ PASS |
| PDFEX-06 | Popup stays open, no error, training still shown | `TrainingDetailsPopup.test.jsx:563` — heading still present, `queryByRole("alert")` null | ✅ PASS |
| PDFEX-07 | `teamId: null` training exports identically | `TrainingDetailsPopup.test.jsx:576` — same call/download assertions with `teamId: null` | ✅ PASS |

### F2: Binary responses through the shared API client

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| PDFEX-08 | Bearer header when token set; none when not | `src/lib/__tests__/apiClient.test.js:234,244` — `init.headers.Authorization` toBe/toBeUndefined | ✅ PASS |
| PDFEX-09 | Refresh once + retry once on `token-expired`; no second refresh on retry-401 | `apiClient.test.js:253` (3 fetch calls, resolves retried bytes) and `:271` (retry-401 rejects `AuthError`, still 3 calls total) | ✅ PASS |
| PDFEX-10 | Concurrent `apiFetch`+`apiFetchBlob` share one refresh call | `apiClient.test.js:282` — `refreshCalls` filtered to `/auth/refresh` has length 1 | ✅ PASS |
| PDFEX-11 | Failed refresh notifies auth handler, rejects `AuthError`, no blob | `apiClient.test.js:311` — `rejects.toBeInstanceOf(AuthError)`, `authFailures` toBe(1) | ✅ PASS |
| PDFEX-12 | 400/404/409/401/500 map to typed errors, no blob resolved | `apiClient.test.js:327` (`it.each`) + `:332` (status carried on `ApiError`) | ✅ PASS |
| PDFEX-13 | Rejecting `fetch` → `NetworkError` | `apiClient.test.js:343` | ✅ PASS |
| PDFEX-14 | Resolves `{ blob, filename }` | `apiClient.test.js:348,361` — filename asserted exact, blob content read back via `FileReader` | ✅ PASS |
| PDFEX-15 | Pre-existing `apiClient.test.js` unmodified | `git diff c989d38..d2ba4fd -- src/lib/__tests__/apiClient.test.js` — only the import line (`+apiFetchBlob`) changed; every pre-existing `it(...)` body is byte-identical, all new content is a pure addition after line 190 | ✅ PASS |

### F3: The download filename

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| PDFEX-16 | Quoted/unquoted `filename=` both strip to the bare name | `src/lib/__tests__/contentDisposition.test.js:7,13` | ✅ PASS |
| PDFEX-17 | `filename*` percent-decoded, wins over `filename=` in same header | `contentDisposition.test.js:19` — exact `"seção.pdf"` expected | ✅ PASS |
| PDFEX-18 | Absent/empty/no-filename header → fallback | `contentDisposition.test.js:25,29,33` | ✅ PASS |
| PDFEX-19 | Traversal segments reduced to final segment; empty-after-strip → fallback | `contentDisposition.test.js:37,43,49,55` — **only exercises the plain `filename=` branch**; no test drives a traversal payload through the `filename*=` branch, even though that branch calls the same `lastPathSegment` helper | ⚠️ **Coverage gap** (see Discrimination Sensor — mutant #1 survived) |

### F4: Failure feedback and in-flight state

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| PDFEX-20 | Disabled, `Exporting…` while in flight | `TrainingDetailsPopup.test.jsx:598` — `getByRole("button",{name:"Exporting…"})` toBeDisabled | ✅ PASS |
| PDFEX-21 | Two rapid clicks → exactly one request | `TrainingDetailsPopup.test.jsx:614` — `toHaveBeenCalledTimes(1)` | ⚠️ **Weak assertion** (see Discrimination Sensor — mutant #3 survived: the test is satisfied by the button's `disabled` attribute alone, not by the handler's own `if (exporting) return` guard) |
| PDFEX-22 | Button re-enables to `Export PDF` after settle (success and failure) | `TrainingDetailsPopup.test.jsx:630` (failure path); PDFEX-20's own test covers the success path via `resolve(...)` then `waitFor` enabled | ✅ PASS |
| PDFEX-23 | `NotFoundError` → alert naming missing training, no download | `TrainingDetailsPopup.test.jsx:643` — exact text `"This training could not be found."`, `triggerDownload` not called | ✅ PASS |
| PDFEX-24 | `NetworkError` → distinctly-worded alert | `TrainingDetailsPopup.test.jsx:657` — exact text + explicit inequality against the PDFEX-23 message | ✅ PASS |
| PDFEX-25 | `ApiError`/`ValidationError` → generic message + `console.error` | `TrainingDetailsPopup.test.jsx:673` (`it.each`) — exact generic text, `consoleSpy` called with the error | ✅ PASS |
| PDFEX-26 | `AuthError` → no alert, no download | `TrainingDetailsPopup.test.jsx:689` — `queryByRole("alert")` null, `triggerDownload` not called | ✅ PASS |
| PDFEX-27 | Retry-success clears prior alert before download | `TrainingDetailsPopup.test.jsx:702` — alert asserted present, then absent after retry, `triggerDownload` called with resolved values | ✅ PASS |

### F5: Documentation

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| PDFEX-28 | `docs/05-services.md`, `docs/07-components.md`, `CLAUDE.md` each describe the binary path (`apiFetchBlob`, `exportPdf`) and the button; `AD-026` in `STATE.md` | `docs/05-services.md:49,55,59,69` and `CLAUDE.md:86` literally name `apiFetchBlob`; `.specs/STATE.md:230-237` carries `AD-026` with `status: active`. **`docs/07-components.md:176-186` documents the button and `exportPdf` thoroughly but never uses the literal string `apiFetchBlob`** — it cross-references `05-services.md#binary-responses` instead. The spec's own **Independent Test** (`grep -r apiFetchBlob docs/ CLAUDE.md` "returns hits in all three places") is not literally satisfied for this one file. | ⚠️ **Spec-precision gap** — substance present, literal grep check as specified fails for one of the three files |

**Status**: ⚠️ Gaps present — 25/28 clean PASS, 2 coverage/assertion gaps (PDFEX-19, PDFEX-21), 1 doc-literalism gap (PDFEX-28). No AC is functionally uncovered or broken; all three gaps are about the *strength* of the proof, not the correctness of the shipped behavior (independently confirmed by reading the production code for each).

**Manual/author-reported evidence not independently re-run**: PDFEX-05/06/07's real-download behavior and the cross-origin `Content-Disposition` read were verified in a real browser per the T7 commit message and `STATE.md` Handoff — jsdom cannot prove `URL.createObjectURL`/anchor-click downloads or real HTTP header exposure. Code inspection confirms `triggerDownload` (`src/lib/download.js:6,12`) genuinely calls `URL.createObjectURL`/`anchor.click()`, and `apiFetchBlob` (`src/lib/apiClient.js:134-138`) genuinely reads the filename from the response header via `filenameFromDisposition`. This claim is taken as author-reported, not re-verified live against a running backend by this Verifier.

---

## Discrimination Sensor

All mutations were applied to the real working tree, tested, and reverted via `git checkout --`; `git status` was confirmed clean before and after.

| # | File:line | Description | Killed? |
| - | --- | --- | --- |
| 1 | `src/lib/contentDisposition.js:22-24` | In the `filename*=` branch, replaced `const segment = lastPathSegment(decoded); if (segment) return segment;` with `if (decoded) return decoded;` — removes traversal-stripping on the RFC 5987 path | ❌ **Survived** — `npx vitest run src/lib/__tests__/contentDisposition.test.js` still 11/11 green; no test drives a traversal payload through `filename*=` |
| 2 | `src/lib/apiClient.js:99` | Changed `if (res.status === 401 && !isRetry)` to `if (res.status === 401)` — removes the single-retry guard | ✅ Killed — 2 tests failed (`apiClient.test.js` pre-existing `"does not loop when the retried request also 401s"` and the new `"does not refresh a second time...(PDFEX-09)"`), both throwing on the resulting infinite-recursion `TypeError` |
| 3 | `src/components/TrainingDetailsPopup.jsx:45` | Removed `if (exporting) return;` from `handleExport` | ❌ **Survived** — all 47 tests in `TrainingDetailsPopup.test.jsx` still pass; RTL's `userEvent.click` (and native DOM semantics) already refuse to dispatch a click on a `disabled` button, so the PDFEX-21 test never actually exercises this line — it's currently defense-in-depth that no test can prove |

**Sensor depth**: lightweight (3 targeted mutations, default tier)
**Result**: 1/3 killed, 2/3 survived — ❌ **Sensor FAIL** (below the "tests can detect a regression" bar for these two behaviors)

---

## Code Quality

| Principle | Status |
| --- | --- |
| No features beyond what was asked | ✅ |
| No abstractions for single-use code | ✅ |
| No unnecessary "flexibility" added | ✅ — `apiFetchBlob` deliberately stays GET-only per design.md |
| Only touched files required for task | ✅ — the 22-file mock-factory sweep is the one exception, and it's explicitly scoped/justified in tasks.md T5 and design.md Risks row 1 |
| Didn't "improve" unrelated code | ✅ |
| Matches existing patterns/style | ✅ — mirrors `SquadRatingPopup`'s async-handler and inline-error pattern; `apiFetchBlob` mirrors `apiFetch`'s shape |
| Would senior engineer approve? | ✅ overall, with the two sensor gaps as review comments, not blockers |
| Tests map to acceptance criteria and are non-shallow (spot-check: F4 story) | ✅ — F4's tests assert exact message strings and cross-check PDFEX-23 vs PDFEX-24 wording for divergence, not just "an alert exists" |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ — 25/28 clean; PDFEX-19 and PDFEX-21 assert an outcome but not the specific mechanism the AC implies (see Sensor) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ⚠️ — Test Coverage Matrix promises "all branches" for `src/lib/*.js`; the `filename*=` traversal branch in `contentDisposition.js` is not separately tested |
| Every test maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed | `CLAUDE.md` (Conventions, Data layer), `.specs/features/41-training-pdf-export/tasks.md` (Test Coverage Matrix) — followed, with the one gap noted above |

---

## Edge Cases

- [x] No `Intl` timezone → omits `?zone=`, backend defaults to UTC — `src/lib/__tests__/dates.test.js:48`, `src/services/__tests__/trainingService.test.js:181`
- [x] Popup closed mid-flight → no state update, no download — `TrainingDetailsPopup.test.jsx:~720` ("closing (unmounting) the popup mid-flight...")
- [x] `URL.createObjectURL` unavailable → generic message via catch, popup stays usable — covered structurally: `triggerDownload` throws synchronously and `handleExport`'s `catch` routes any non-typed `Error` to the generic branch (`PDFEX-25`'s `it.each` proves the generic-branch wiring; no dedicated `URL.createObjectURL`-undefined test exists, but the code path is the same as any other unexpected throw)
- [x] `400` from backend → generic message path — covered by `PDFEX-25`'s `ValidationError` case
- [x] Empty (0-byte) blob still downloads — not separately tested, but `triggerDownload` and `apiFetchBlob` never inspect blob size, so this is true by construction, not by a specific assertion

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test -- --run`
- **Result**: lint clean (no output/errors); build succeeded (`✓ built in 1.86s`); tests 1443 passed, 0 failed, 0 skipped, 73 files passed
- **Test count before feature**: 1385 tests, 71 files
- **Test count after feature**: 1443 tests, 73 files
- **Delta**: +58 tests, +2 files — matches the author's claimed count exactly
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

### Fix 1: `filename*=` traversal path is untested (PDFEX-19 coverage gap)

- **Root cause**: `src/lib/__tests__/contentDisposition.test.js` only drives traversal payloads (`../evil.pdf`, `/etc/x.pdf`, `a\b.pdf`) through the `filename=` branch (lines 37-58). The `filename*=` branch (lines 19-23 of `contentDisposition.js`) calls the same `lastPathSegment` helper but has no test proving it does.
- **Fix task**: Add one test to `contentDisposition.test.js`: `filenameFromDisposition("attachment; filename*=UTF-8''..%2Fevil.pdf", FALLBACK)` (or an unencoded `../evil.pdf` after the `UTF-8''` prefix) asserting the result is `"evil.pdf"`, not the raw traversal string.
- **Priority**: Minor — production code is already correct; this only strengthens the regression guard.

### Fix 2: PDFEX-21's own guard clause is unproven (double-click test relies on `disabled`, not the handler's guard)

- **Root cause**: `TrainingDetailsPopup.test.jsx:614` clicks the button twice via `userEvent.click`, but the DOM's own `disabled` semantics (which `userEvent` and real browsers both honor) already prevent the second click from ever reaching `handleExport`. The explicit `if (exporting) return;` in `handleExport` (`TrainingDetailsPopup.jsx:45`) is therefore never exercised by any test — removing it doesn't fail the suite.
- **Fix task**: Either (a) accept this as intentional defense-in-depth (the guard protects a narrow same-tick-invocation window `disabled` can't cover, e.g. a fast keyboard-repeat or a caller invoking `handleExport` directly) and note it in a code comment/tasks.md rather than claiming PDFEX-21 as fully machine-proven, or (b) add a test that calls the component's exported handler-equivalent behavior twice synchronously (harder in RTL without exposing an internal ref) to actually exercise line 45.
- **Priority**: Minor — no functional risk today; documentation/test-precision issue only.

### Fix 3: `docs/07-components.md` doesn't literally name `apiFetchBlob` (PDFEX-28 literalism)

- **Root cause**: The doc (lines 176-186) fully describes the button, `trainingService.exportPdf`, and cross-references `05-services.md#binary-responses` for the transport layer — a reasonable documentation choice — but the spec's own Independent Test asks for the literal string `apiFetchBlob` to appear via `grep -r apiFetchBlob docs/ CLAUDE.md` "in all three places."
- **Fix task**: One-line addition to `docs/07-components.md`'s Export PDF paragraph, e.g. "...via `trainingService.exportPdf`, which calls `apiFetchBlob` under the hood" — trivial, no behavior change.
- **Priority**: Cosmetic.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| PDFEX-01…07 | Verified | ✅ Verified |
| PDFEX-08…15 | Verified | ✅ Verified |
| PDFEX-16…18 | Verified | ✅ Verified |
| PDFEX-19 | Verified | ⚠️ Verified — coverage gap (traversal untested on the `filename*=` branch) |
| PDFEX-20 | Verified | ✅ Verified |
| PDFEX-21 | Verified | ⚠️ Verified — assertion proves the outcome via the `disabled` attribute, not the handler's own guard |
| PDFEX-22…27 | Verified | ✅ Verified |
| PDFEX-28 | Verified | ⚠️ Verified — one of three docs doesn't literally match the spec's own grep-based Independent Test |

The `spec.md` Requirement Traceability table has been updated accordingly (see below).

---

## Summary

**Overall**: ⚠️ Issues

**Spec-anchored check**: 25/28 ACs matched the spec-defined outcome cleanly; 3 flagged (2 coverage/assertion gaps, 1 doc-literalism gap)
**Sensor**: 1/3 mutations killed, 2/3 survived
**Gate**: 1443 passed, 0 failed, 0 skipped (lint clean, build clean)

**What works**: The entire feature is functionally correct and well-tested — every AC has real evidence, `apiFetch`'s pre-existing test file is provably untouched (PDFEX-15), and the 22-file mock-factory sweep is confirmed mechanical. The gate is fully green at the exact counts the author claimed.

**Issues found**:
1. `contentDisposition.js`'s `filename*=` branch has no traversal-stripping test — add one case (Fix 1, Minor).
2. `TrainingDetailsPopup.jsx`'s explicit double-click guard is currently unprovable by any click-based test because the `disabled` attribute already blocks the click — either add a comment acknowledging this or add a test that reaches the guard directly (Fix 2, Minor).
3. `docs/07-components.md` doesn't literally say `apiFetchBlob`, only cross-references the file that does — one-line addition closes it (Fix 3, Cosmetic).

**Next steps**: These are all Minor/Cosmetic — none block shipping. Recommend applying Fix 1 and Fix 3 (both trivial, < 5 min each) before closing the feature; Fix 2 is a judgment call between "accept as defense-in-depth" and "add a harder-to-write test," left to the team.
