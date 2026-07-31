# Test Harness Validation

**Date**: 2026-07-31
**Spec**: `.specs/features/00-test-harness/spec.md`
**Diff range**: `0a851a5..HEAD` (feature/00/test-harness), commits `1db25c0..6e400ee`
**Verifier**: independent sub-agent (author ≠ verifier), fresh clean `npm install` in an isolated worktree

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1: Install test dependencies | ✅ Done | `vitest@3.2.7`, `jsdom@27.0.1`, `@testing-library/react@16.3.2`, `@testing-library/jest-dom@7.0.0`, `@testing-library/user-event@14.6.1` present in `package-lock.json` at exactly the claimed pinned versions. Clean `npm install` (`rm -rf node_modules && npm install`) completed with 0 peer-dep errors, `npm run build` succeeds. |
| T2: Configure Vitest in vite.config.js | ✅ Done | `vite.config.js:7-12` — `environment: "jsdom"`, `globals: true`, `setupFiles: ["./src/test/setup.js"]`, `passWithNoTests: true`. Single `defineConfig` call retained. |
| T3: Create test setup file | ✅ Done | `src/test/setup.js:1-8` imports `@testing-library/jest-dom/vitest`, registers `afterEach` with `cleanup()` and `localStorage.clear()`. See Discrimination Sensor — mutant removing both calls survived; RTL's own automatic afterEach cleanup already provides the DOM-isolation outcome independent of this code. |
| T4: Add test npm scripts | ✅ Done | `package.json:11-13` — `test`→`vitest run`, `test:watch`→`vitest`, `test:ui`→`vitest --ui`. Independently reproduced: empty suite exits 0 with "No test files found" (verified live); a failing assertion exits 1 (verified live via mutation). |
| T5: Sidebar component test | ✅ Done | `src/components/__tests__/Sidebar.test.jsx` — 3 tests, all pass in isolation (`npx vitest run src/components/__tests__/Sidebar.test.jsx`). |
| T6: Clear lint errors for green baseline | ✅ Done | `npm run lint` → 0 errors/warnings. `npm run build` → clean, no missing-file warning. `index.html`'s dead `/src/styles.css` link removed (`index.html:4` diff). `Calendar.jsx:82` `monthName` removed. `AuthContext.jsx:28` param renamed `_password`. `useAuth` moved to `src/context/useAuth.js`, `AuthContext` object moved to `src/context/AuthContextInstance.js`; all 4 import sites (`App.jsx:12`, `Sidebar.jsx:11`, `SignIn.jsx:3`, `SignUp.jsx:3`) updated and verified working via the Sidebar test + a fresh build. |

**All 6 tasks' "Done when" criteria hold against actual repo state**, independently re-derived (not from the implementer's checked boxes).

---

## SPEC_DEVIATION Verification

| # | Claim | Verified? | Evidence |
|---|---|---|---|
| 1 | `vitest@3.2.7`/`jsdom@27.0.1` pinned below latest (4.x/30.x) for tooling compatibility | ✅ Confirmed | `package-lock.json` shows exactly these versions installed; clean install + `npm test`/`npm run build` both succeed on Node v23.11.0. |
| 2 | `test.passWithNoTests: true` needed because Vitest's default exits 1 on empty suite, forbidden by AC TEST-01.3 | ✅ Confirmed, with a caveat surfaced by probing | Removing the test file → `npm test` exits 0 ("No test files found"). **Probed further**: renaming the existing test file to `Sidebar.tests.jsx` (typo, doesn't match the `*.test.{js,jsx}` glob) also silently exits 0 — this is the exact edge the flag creates: an accidentally-excluded test file is indistinguishable from "no tests exist yet." This is inherent to the AC as spec'd, not an implementation defect, but it is a real blind spot worth naming (see Gaps). |
| 3 | `argsIgnorePattern: '^_'` + a `**/*.test.{js,jsx}` globals block needed in `eslint.config.js` | ✅ Confirmed | `eslint.config.js:26-29` has `argsIgnorePattern: '^_'` (separate from `varsIgnorePattern`, which indeed only covers declarations per ESLint's own option semantics); `eslint.config.js:36-41` adds the test-file globals block. `npm run lint` is clean with the Sidebar test file present. |
| 4 | `AuthContextInstance.js` (not `authContext.js`) needed because of a case-insensitive collision with `AuthContext.jsx` | ✅ Confirmed | Verified the working filesystem (macOS APFS) is case-insensitive (`touch CaseTestFile.txt` resolved via `casetestfile.txt`). Vite/Rollup's default resolve-extension order tries `.js` before `.jsx`, so `authContext.js` would indeed shadow `AuthContext.jsx` for a bare `./context/AuthContext` import on this filesystem — the claimed failure mode is real and specific to this environment, not hypothetical. |

---

## Spec-Anchored Acceptance Criteria

### P1: Runnable test suite (TEST-01, TEST-02)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| WHEN `npm test` is run THEN execute Vitest over all `*.test.{js,jsx}` files and report pass/fail summary | Vitest CLI run, pass/fail summary printed | `package.json:11` `"test": "vitest run"` — reproduced live: `Test Files 1 passed (1)`, `Tests 3 passed (3)` | ✅ PASS |
| WHEN a test asserts something false THEN exit non-zero | Non-zero exit code | Reproduced live via mutation (Sidebar `/teams`→`/team`): `npx vitest run src/components/__tests__/Sidebar.test.jsx` → exit code 1, 1 failed/2 passed. No committed regression test asserts this meta-behavior (T4's scratch test was deleted per its own "Done when"). | ✅ PASS (verified by Verifier's own run; no persisted automated test for this meta-behavior — noted, not a gap given it's a scratch-only AC by design) |
| WHEN no test files match THEN exit zero with "no tests found" message | Exit 0, "no tests found"-style message | `vite.config.js:11` `passWithNoTests: true`. Reproduced live: moved `Sidebar.test.jsx` out → `No test files found, exiting with code 0` | ✅ PASS — see Gap G1 for the glob-typo blind spot this creates |

### P1: Component rendering (TEST-03, TEST-04)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| WHEN a test renders with RTL `render()` THEN expose result through RTL queries | `render()` + `screen.getByRole`/etc. resolve | `src/components/__tests__/Sidebar.test.jsx:8-9` `render(<MemoryRouter>...)`; `:30` `screen.getByRole("link", { name })` | ✅ PASS |
| WHEN a test uses a jest-dom matcher (`toBeInTheDocument()`) THEN it resolves without additional per-file setup | Matcher works globally, no per-file import | `src/test/setup.js:1` `import "@testing-library/jest-dom/vitest"` (registered via `vite.config.js:10` `setupFiles`); `Sidebar.test.jsx:39,44` uses `toBeInTheDocument()`/`toHaveAttribute()` with zero per-file jest-dom import | ✅ PASS |
| WHEN one test renders and a later test renders another THEN no DOM state leaks between them | `document.body` empty at the start of the later test | `Sidebar.test.jsx:35` `expect(document.body).toBeEmptyDOMElement()` (start of 2nd test) | ✅ PASS as an outcome — but see Discrimination Sensor: the mechanism claimed to provide this (`setup.js`'s explicit `cleanup()`) is not what's actually providing it; RTL's own automatic `afterEach` cleanup does. The AC holds; the test does not discriminate the intended mechanism. Flagged as a spec-precision/coverage-strength gap (G2), not an AC failure. |

### P2: Green baseline (TEST-05)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| WHEN `npm run lint` is run THEN report zero errors | Exit 0, 0 errors | Reproduced live: `npm run lint` → exit 0, no output (0 errors, 0 warnings) | ✅ PASS |
| WHEN `npm run build` is run THEN complete without warnings about missing files | Exit 0, no missing-file warning | Reproduced live: `npm run build` → clean output, `✓ built in 1.5xs`, no warnings. `index.html:4`'s dead stylesheet link removed. | ✅ PASS |
| WHEN the full gate is run THEN exit zero | `npm run lint && npm run build && npm test` exits 0 | Reproduced live end-to-end after a clean `npm install`, three separate times (baseline + after each mutation revert) — always exit 0 | ✅ PASS |

**Status**: ✅ All 8 ACs covered with direct evidence; 0 uncovered. 1 outcome-level PASS carries a noted coverage-strength caveat (G2), not a failure.

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `src/test/setup.js:5-8` | Emptied the `afterEach` body, removing both `cleanup()` and `localStorage.clear()` | ❌ **Survived** — all 3 Sidebar tests still pass. Root cause isolated: `@testing-library/react`'s own default export auto-registers an `afterEach(cleanup)` hook whenever it detects global `afterEach` (which `vite.config.js`'s `test.globals: true` provides), independent of `setup.js`. Verified with a throwaway scratch test file (no import of `cleanup` at all) that DOM state still didn't leak. The `localStorage.clear()` half is separately unproven: the only test that touches `localStorage` (test 3) cleans up after itself via the app's own `signOut()` call, so no test in the suite would fail if `localStorage.clear()` were simply absent. |
| 2 | `src/components/Sidebar.jsx:11` (the `/teams` `<Link>`) | Changed `to="/teams"` → `to="/team"` | ✅ **Killed** — `renders all six navigation links with correct hrefs` fails with a clear diff (`Expected "/teams"`, `Received "/team"`); other 2 tests unaffected. |
| 3 | `vite.config.js:11` | Flipped `passWithNoTests: true` → `false` | ❌ **Survived (as expected/inert)** — with the real Sidebar test file present, this flag is never exercised (there are always test files to run), so flipping it changes nothing in the committed suite's outcome. This is not a weak-test finding — it confirms there is no *automated regression test* covering AC TEST-01.3 in the repo itself; the AC is proven only by the Verifier's manual reproduction (also true of the implementer's own scratch-test verification in T4, which was deleted before commit per its own Done-when criteria). |

All mutations reverted; working tree confirmed clean (`git status` / `git diff --stat`) before and after each.

**Sensor depth**: lightweight (3 targeted mutations, proportional to a config/harness-only feature)
**Result**: 1/3 killed outright; 2/3 "survived" for explainable, non-equivalent reasons — one is a genuine coverage-strength gap (G2/mutation 1), the other is an inherent property of an AC that has no persisted automated test by design (mutation 3, not a defect in this feature but worth naming as future guidance).

---

## Edge Cases (spec.md)

- [ ] **`.png` asset import resolves to a stub path**: NOT tested. No test in scope imports a component that references a `.png` (`Sidebar.jsx` doesn't; `PlayerCard.jsx`/`TeamCard.jsx` do but have no tests). Plausible-by-construction only (Vite's default asset handling), not empirically proven.
- [ ] **`localStorage` isolated per test file**: Partially tested. `setup.js`'s `afterEach` clears `localStorage`, and test 3 exercises reading/writing it — but no test proves isolation *across test files* (only one test file exists in the repo), and as the sensor found, no test would fail today if the explicit `localStorage.clear()` call were removed. Plausible-by-construction, not empirically proven for the isolation claim specifically.
- [ ] **`useNavigate` outside a router throws a clear router error, not a null dereference**: NOT tested. `Sidebar.test.jsx` always wraps the component in `MemoryRouter`; no test renders `Sidebar` (or any `useNavigate` consumer) unwrapped to confirm the error message shape. Plausible-by-construction only (this is React Router's own documented behavior), not empirically proven in this repo's suite.

None of the three edge cases has a dedicated, empirically-verified test. Given this feature's explicitly minimal scope (T5 "proves the harness on one component only," per spec's Out-of-Scope section), this is a reasonable minimal-viable outcome, not a spec violation — but it should not be read as "tested," and is recorded as guidance (see Gaps/Lessons).

---

## Code Quality

| Principle | Status |
| --- | --- |
| No features beyond what was asked | ✅ |
| No abstractions for single-use code | ✅ |
| No unnecessary "flexibility" added | ✅ |
| Only touched files required for task | ✅ — every changed file (`package.json`, `package-lock.json`, `vite.config.js`, `src/test/setup.js`, `src/components/__tests__/Sidebar.test.jsx`, `eslint.config.js`, `index.html`, `src/context/AuthContext.jsx`, `src/context/AuthContextInstance.js`, `src/context/useAuth.js`, `src/components/Sidebar.jsx`, `src/pages/Calendar.jsx`, `src/pages/SignIn.jsx`, `src/pages/SignUp.jsx`, `src/App.jsx`) traces directly to a task in `tasks.md` |
| Didn't "improve" unrelated code | ✅ — diffs are surgical (e.g. `Calendar.jsx` diff removes exactly the one dead `monthName` line, nothing else) |
| Matches existing patterns/style | ✅ — co-located `__tests__/` matches the stated convention; context split follows existing file-per-concern layout |
| Would a senior engineer approve? | ✅ |
| Tests map to acceptance criteria and are non-shallow | ✅ — spot-checked: all 3 Sidebar tests assert real DOM/state outcomes (hrefs, DOM emptiness, `localStorage` value), not spy-call presence |
| Spec-anchored outcome check | ✅ — see table above; asserted values (`/teams`, `null`, `toBeEmptyDOMElement`) match spec-defined outcomes exactly |
| Per-layer Coverage Expectation met | ✅ for the one layer in scope (component); T1-T4 correctly `Tests: none` per the matrix (build config layer) |
| Every test maps to a spec AC / Done-when criterion | ✅ — all 3 Sidebar tests map 1:1 to T5's Done-when bullets |
| Documented project guidelines followed | `CLAUDE.md`, `docs/02-getting-started.md` — neither documents testing standards (confirmed by re-reading both); strong defaults applied per tasks.md's own matrix header |

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test` (from a clean `rm -rf node_modules && npm install`)
- **Result**: lint 0 errors/warnings; build succeeds, no missing-file warnings; test 1 file / 3 tests, all passed, 0 failed, 0 skipped
- **Test count before feature**: 0 (confirmed via `git ls-tree -r 0a851a5` — no `*.test.*` files existed)
- **Test count after feature**: 3 (1 file)
- **Delta**: +3 new tests
- **Skipped tests**: none
- **Failures**: none

---

## Gaps (advisory, not blocking — feature is PASS)

**G1 — `passWithNoTests: true` cannot distinguish "no tests exist yet" from "the test glob silently stopped matching."** Reproduced: renaming `Sidebar.test.jsx` → `Sidebar.tests.jsx` (a plausible typo) still exits 0 with "No test files found." This is inherent to satisfying AC TEST-01.3 as literally spec'd, not a defect introduced by the implementer — flagging as guidance for future features that add test files, so a CI step (if one is ever added) also asserts a minimum test-file count.

**G2 — The DOM-isolation outcome (AC TEST-04, 3rd criterion) is provided by `@testing-library/react`'s own automatic cleanup, not by the explicit `cleanup()`/`localStorage.clear()` calls in `src/test/setup.js`.** Mutation 1 proved the explicit calls are currently unfalsifiable by the repo's own test suite. The code is harmless (redundant-but-correct) and matches common RTL setup boilerplate, but T3's "Done when" bullet ("`afterEach` calls RTL `cleanup()`") is met literally while not actually being what makes the isolation AC pass today. `localStorage.clear()` specifically is even less proven — no test in the suite would fail if it were removed, since the only `localStorage`-touching test cleans up via the app's own `signOut()` logic, not via the harness.

Neither gap fails an AC as spec'd (both outcomes hold), and both are proportionate for a config-only harness feature — recording as lessons for future feature verifiers rather than fix tasks.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| TEST-01 | Implementing | ✅ Verified |
| TEST-02 | Implementing | ✅ Verified |
| TEST-03 | Implementing | ✅ Verified |
| TEST-04 | Implementing | ✅ Verified (outcome holds; coverage-strength note recorded as G2/lesson) |
| TEST-05 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 8/8 ACs matched spec-defined outcome (all with direct `file:line` evidence or live reproduction); 0 spec-precision gaps (all ACs had precise, checkable outcomes)
**Sensor**: 1/3 mutations killed outright; 2/3 "survived" for explainable reasons (1 genuine coverage-strength gap [G2], 1 inherent property of an AC with no persisted automated test [mutation 3])
**Gate**: 3/3 gate commands passed (lint, build, test), 0 failed, 0 skipped; test count 0→3

**What works**: Vitest+RTL+jsdom harness runs cleanly from a fresh install; Sidebar test proves render/query/matcher/isolation/user-event all function; lint and build are genuinely clean (0 errors/warnings); all 4 SPEC_DEVIATIONs independently verified as true and necessary on this environment.

**Issues found**: G1 (passWithNoTests glob-typo blind spot) and G2 (setup.js cleanup calls currently unfalsifiable/redundant given RTL's built-in auto-cleanup) — both advisory, recorded as lessons, not fix tasks.

**Next steps**: None required to mark this feature done. Future features adding test files should be aware of G1/G2 (see `.specs/LESSONS.md` after this report's lessons are recorded).
