# Test Harness Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/00-test-harness/spec.md`
**Design**: not required — no architectural decisions
**Status**: ✅ Verified — PASS (see `validation.md`)
**Batches**: 6 tasks → 1 batch, execute inline (no sub-agents)

> **Bootstrapping note:** this feature builds the gate that every other feature
> uses. T1–T4 therefore have `Tests: none` and gate on `npm run build` — there is
> no runner yet to test them with. T5 is the task that proves the harness works,
> and it is the first task in this repository with a real test. Do not "fix" the
> earlier tasks by inventing tests for config files.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `CLAUDE.md`, `docs/02-getting-started.md` — neither documents testing standards, and no test runner exists. Strong defaults applied; stack fixed by AD-001.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Pure logic (`src/lib/*.js`) | unit | All branches; 1:1 to spec ACs; every listed edge case | `src/lib/__tests__/*.test.js` | `npm test` |
| Services (`src/services/*.js`) | unit | All branches; 1:1 to spec ACs; every listed edge case | `src/services/__tests__/*.test.js` | `npm test` |
| Components (`src/components/*.jsx`) | component | Render + every AC-defined interaction; empty and error states | `src/components/__tests__/*.test.jsx` | `npm test` |
| Pages (`src/pages/*.jsx`) | integration | Happy path + every listed edge case + error path | `src/pages/__tests__/*.test.jsx` | `npm test` |
| Context (`src/context/*.jsx`) | unit | All branches | `src/context/__tests__/*.test.jsx` | `npm test` |
| Build config, CSS, assets | none | — (build gate only) | — | build gate only |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After tasks with unit/component tests only | `npx vitest run <path/to/file.test.jsx>` |
| Full | After tasks touching pages or multiple layers | `npm test` |
| Build | After phase completion or config-only tasks | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Harness setup

```
T1 → T2 → T3 → T4
```

### Phase 2: Proof and green baseline

```
T5 → T6
```

---

## Task Breakdown

### T1: Install test dependencies ✅ Complete

**What**: Add Vitest, RTL, jest-dom, user-event and jsdom as devDependencies.
**Where**: `package.json`
**Depends on**: None
**Reuses**: Existing `devDependencies` block
**Requirement**: TEST-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom` present in `devDependencies`
- [x] `npm install` completes with no peer-dependency errors against React 19
- [x] `package-lock.json` updated and committed
- [x] `npm run build` still succeeds

**Tests**: none (matrix: build config → none)
**Gate**: build

**Commit**: `chore(test): add vitest and testing-library dependencies` — [1db25c0]

> **SPEC_DEVIATION**: `vitest@4.1.10` (latest at plan time) crashes npm 10.9.2's
> arborist (`Cannot read properties of null (reading 'edgesOut')`) via its
> optional peer chain to `@vitest/browser` → `webdriverio` → `@vitest/ui`.
> Installed `vitest@3.2.7` instead — stable, no version was pinned by AD-001,
> installs cleanly. Also pinned `jsdom@27.0.1` over the latest 30.x, whose
> engines range excludes this machine's Node v23.11.0. Confirmed with the user.
>
> `npm audit` reports 7 pre-existing high-severity findings (a `brace-expansion`
> DoS via eslint's dependency tree, and a `react-router` CSRF-bypass advisory via
> `react-router-dom`) — both predate this task and are out of scope. Flagged as a
> separate follow-up task per user confirmation.

---

### T2: Configure Vitest in the Vite config ✅ Complete

**What**: Add a `test` block to the existing `defineConfig` — jsdom environment, globals on, setup file, and a CSS-off setting.
**Where**: `vite.config.js` (modify)
**Depends on**: T1
**Reuses**: The existing `defineConfig` with `react()` and `tailwindcss()` plugins — do not create a second config file
**Requirement**: TEST-01, TEST-03

**Tools**: MCP: `context7` (confirm the Vitest 3 config shape against current docs) · Skill: NONE

**Done when**:
- [x] `test.environment` is `"jsdom"`
- [x] `test.globals` is `true` so `describe`/`it`/`expect` need no import
- [x] `test.setupFiles` points at `src/test/setup.js`
- [x] Config still exports a single `defineConfig` call; `npm run build` unaffected

**Tests**: none (matrix: build config → none)
**Gate**: build

**Commit**: `chore(test): configure vitest with jsdom environment` — [4b766ce]

> Context7 MCP was not available in this session; confirmed the Vitest 3
> `test.environment`/`globals`/`setupFiles` config shape via web search against
> vitest.dev docs instead (Knowledge Verification Chain step 4).
>
> `test.passWithNoTests: true` was added here too, during T4 (see T4's note) —
> it belongs to this same config block.

---

### T3: Create the test setup file ✅ Complete

**What**: A setup module that registers jest-dom matchers and clears the DOM and `localStorage` between tests.
**Where**: `src/test/setup.js` (new)
**Depends on**: T2
**Reuses**: nothing
**Requirement**: TEST-03, TEST-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Imports `@testing-library/jest-dom/vitest`
- [x] `afterEach` calls RTL `cleanup()`
- [x] `afterEach` calls `localStorage.clear()` — required by `01-persistence-layer`, which would otherwise leak state across test files
- [x] File is referenced by `vite.config.js` from T2

**Tests**: none (matrix: build config → none) — its correctness is proven by T5
**Gate**: build

**Commit**: `chore(test): add vitest setup with jest-dom and cleanup` — [4e56df3]

---

### T4: Add test npm scripts ✅ Complete

**What**: Add `test`, `test:watch` and `test:ui` scripts.
**Where**: `package.json` (modify)
**Depends on**: T3
**Reuses**: Existing `scripts` block
**Requirement**: TEST-01, TEST-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `npm test` maps to `vitest run` (single-shot, CI-safe — **not** watch mode)
- [x] `npm run test:watch` maps to `vitest`
- [x] `npm test` on the current tree exits **zero** with "no test files found" (AC TEST-01.3)
- [x] A deliberately failing scratch test makes `npm test` exit non-zero; scratch test deleted before commit

**Tests**: none (matrix: build config → none)
**Gate**: build

**Commit**: `chore(test): add test scripts` — [bd28a43]

> **SPEC_DEVIATION**: Vitest's default behavior exits **1** when no test files
> are found — the opposite of what AC TEST-01.3 requires. Added
> `test.passWithNoTests: true` to `vite.config.js` (T2's file, not this task's
> listed scope) since the AC is otherwise unreachable. Verified: empty suite
> now exits 0; a deliberately failing scratch test still exits 1 (proving the
> flag doesn't mask real failures); scratch test deleted before commit.
>
> `test:ui` requires `@vitest/ui`, not installed (not part of T1's dependency
> list). Running it prints vitest's own install prompt — expected, not a defect.

---

### T5: Prove the harness with a Sidebar component test ✅ Complete

**What**: The first real test — render `Sidebar` and assert its navigation.
**Where**: `src/components/__tests__/Sidebar.test.jsx` (new)
**Depends on**: T4
**Reuses**: `src/components/Sidebar.jsx`, `src/context/AuthContext.jsx`
**Requirement**: TEST-03, TEST-04

**Tools**: MCP: `context7` (RTL query APIs) · Skill: NONE

**Done when**:
- [x] Renders `Sidebar` wrapped in `MemoryRouter` and `AuthProvider`
- [x] Asserts all six nav links resolve to the correct `href` (`/`, `/teams`, `/trainings`, `/games`, `/calendar`, `/settings`)
- [x] Asserts clicking logout calls `signOut` and clears the `user` key from `localStorage`
- [x] Two tests in the file do not leak DOM state into each other (AC TEST-04.3) — assert an empty container at the start of the second
- [x] Establishes the co-location pattern (`__tests__/` beside source) every later feature follows
- [x] Gate passes: `npx vitest run src/components/__tests__/Sidebar.test.jsx`
- [x] Test count: 3 tests pass

**Tests**: component
**Gate**: quick

**Commit**: `test(sidebar): add first component test proving the harness` — [f715d10]

> Context7 was unavailable this session; RTL query API usage (`getByRole`,
> `toHaveAttribute`, `toBeEmptyDOMElement`) followed established, stable RTL/
> jest-dom conventions rather than a fresh doc lookup. Test Adequacy Review
> passed inline (see conversation) — all 3 tests map to a spec AC or Done-when
> criterion, none are shallow, all assert real state rather than spy calls.

---

### T6: Clear the lint errors for a green baseline ✅ Complete

**What**: Fix the three ESLint findings so the full gate passes.
**Where**: `src/context/AuthContext.jsx`, `src/pages/Calendar.jsx`, `index.html`
**Depends on**: T5
**Reuses**: nothing
**Requirement**: TEST-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `AuthContext.jsx:29` — the unused `password` parameter in `signUp` is resolved. **Keep the parameter** (the signature is the seam a real backend will use); silence it via the config's existing `varsIgnorePattern` by renaming to `_password`
- [x] `AuthContext.jsx:52` — the `react-refresh/only-export-components` warning is resolved by moving `useAuth` into `src/context/useAuth.js`, updating all 4 import sites (App.jsx, Sidebar.jsx, SignIn.jsx, SignUp.jsx)
- [x] `Calendar.jsx:82` — the unused `monthName` variable is deleted (`displayMonth` is the one actually rendered)
- [x] `index.html` — the dead `<link href="/src/styles.css">` is removed, silencing the build-time warning (AC TEST-05.2)
- [x] `npm run lint` reports **0 errors, 0 warnings**
- [x] `npm run build` emits no "doesn't exist at build time" warning
- [x] T5's test still passes after the `useAuth` move
- [x] Full gate passes: `npm run lint && npm run build && npm test`
- [x] Test count: 3 tests pass (no change from T5)

**Tests**: component (T5's tests must survive the `useAuth` refactor)
**Gate**: build

**Commit**: `fix(lint): clear all lint errors and dead stylesheet link` — [a381aad]

> **SPEC_DEVIATION** (two, both necessary — full detail in the commit message):
>
> 1. `varsIgnorePattern` (the plan's stated mechanism) only covers variable
>    declarations, not function parameters — verified against ESLint docs.
>    Added `argsIgnorePattern: '^_'` to `eslint.config.js`'s `no-unused-vars`
>    options (not in this task's listed files) to actually silence `_password`.
> 2. Splitting `useAuth` out fully required also splitting the raw `AuthContext`
>    object into its own file (`react-refresh/only-export-components` fires on
>    *any* non-component export sharing a file with a component). The first
>    name I gave that file, `authContext.js`, collided case-insensitively with
>    `AuthContext.jsx` on this filesystem — Vite/Rollup resolved
>    `./context/AuthContext` to the wrong file (tries `.js` before `.jsx`),
>    silently breaking the `AuthProvider` import in `main.jsx`. Caught by the
>    build gate; renamed to `AuthContextInstance.js`.
> 3. Also had to add a `**/*.test.{js,jsx}` globals block to `eslint.config.js`
>    (reusing the already-installed `globals.vitest` preset) — T5's test file
>    was tripping `no-undef` on `test`/`expect`, undetected until this task's
>    lint gate actually ran against it.
>
> Manually verified end-to-end in the browser (sign in → sidebar → logout) on
> top of the automated gate, given the amount of import-path restructuring.

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ──→ T2 ──→ T3 ──→ T4
Phase 2:  T5 ──→ T6
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Install dependencies | 1 file (package.json) | ✅ Granular |
| T2: Configure Vitest | 1 file | ✅ Granular |
| T3: Setup file | 1 file | ✅ Granular |
| T4: npm scripts | 1 file | ✅ Granular |
| T5: Sidebar test | 1 test file | ✅ Granular |
| T6: Lint fixes | 3 files, one cohesive goal (green baseline) | ⚠️ OK — cohesive; splitting would leave the gate red mid-phase |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 (phase boundary) | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Build config | none | none | ✅ OK |
| T2 | Build config | none | none | ✅ OK |
| T3 | Build config | none | none | ✅ OK |
| T4 | Build config | none | none | ✅ OK |
| T5 | Component test | component | component | ✅ OK |
| T6 | Context (`AuthContext`) | unit | component | ✅ OK — T5's suite covers the `useAuth` move end-to-end; a separate context unit test would duplicate it |
