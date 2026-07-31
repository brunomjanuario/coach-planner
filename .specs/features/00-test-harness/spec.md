# Test Harness Specification

**Scope:** Medium · **Design:** skipped (no architectural decisions) · **Blocks:** every other feature

## Problem Statement

The repository has no test runner. `npm test` does not exist, there are no test
files, and the stale root `README.md` claims Jest is available when it is not.
Every feature in this roadmap defines its "done" condition as a passing gate —
without a harness, none of them can be verified, and the skill's discrimination
sensor has nothing to run against. On top of that, `npm run lint` currently
fails with 2 errors, so there is no green baseline to build on.

## Goals

- [ ] `npm test` runs a real suite and exits non-zero on failure
- [ ] A component test can render a React component and assert on the DOM
- [ ] `npm run lint && npm run build && npm test` passes cleanly on `main`

## Out of Scope

| Feature | Reason |
|---------|--------|
| E2E / browser tests (Playwright, Cypress) | No routing-heavy flows worth the setup cost yet; component + integration tests via jsdom cover every AC in this roadmap. |
| Coverage thresholds in CI | There is no CI. Adding a threshold before any tests exist would gate on a number nobody chose. |
| Backfilling tests for existing untested code | Unbounded. Existing code gets tests when a feature touches it. T5 proves the harness on one component only. |
| Fixing the missing `key` props | Belongs to `02-select-team-color`, which rewrites those exact list items. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Test stack | Vitest + React Testing Library | User selection; reuses the Vite config and plugin chain (AD-001) | y |
| Test file location | Co-located `__tests__/` next to source | No existing convention to follow; keeps a test adjacent to what it tests | n |
| DOM environment | `jsdom` | Standard for RTL; `happy-dom` is faster but has thinner API coverage | n |
| Where the `AuthContext` fast-refresh lint warning is fixed | Here, in T6 | It is one of the two blockers to a green baseline, and the baseline is this feature's third goal | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Runnable test suite ⭐ MVP

**User Story**: As a developer, I want `npm test` to run a real suite so that every
subsequent task has a gate that can actually pass or fail.

**Why P1**: Every other feature's task definition references a gate command. Without
this, all 72 remaining tasks are unverifiable.

**Acceptance Criteria**:

1. WHEN `npm test` is run THEN the system SHALL execute Vitest over all `*.test.{js,jsx}` files and report a pass/fail summary
2. WHEN a test asserts something false THEN the system SHALL exit with a non-zero status code
3. WHEN no test files match THEN the system SHALL exit zero with a "no tests found" message rather than erroring

**Independent Test**: Add a trivially passing test and a trivially failing one; confirm the exit codes differ.

---

### P1: Component rendering ⭐ MVP

**User Story**: As a developer, I want to render a React component in a test and assert
on the resulting DOM so that UI acceptance criteria are testable.

**Why P1**: 9 of the 12 features assert on rendered UI behaviour.

**Acceptance Criteria**:

1. WHEN a test renders a component with RTL `render()` THEN the system SHALL expose the result through RTL queries
2. WHEN a test uses a `jest-dom` matcher such as `toBeInTheDocument()` THEN the system SHALL resolve it without additional per-file setup
3. WHEN one test renders a component and a later test renders another THEN the system SHALL NOT leak DOM state between them

**Independent Test**: Render `Sidebar` inside a `MemoryRouter` + `AuthProvider` and assert the six nav links are present.

---

### P2: Green baseline

**User Story**: As a developer, I want lint, build and test all passing on `main` so that
a future failure is unambiguously caused by my change.

**Why P2**: Not required to write tests, but required for any gate to mean anything.

**Acceptance Criteria**:

1. WHEN `npm run lint` is run THEN the system SHALL report zero errors
2. WHEN `npm run build` is run THEN the system SHALL complete without warnings about missing files
3. WHEN the full gate `npm run lint && npm run build && npm test` is run THEN the system SHALL exit zero

**Independent Test**: Run the full gate command on a clean checkout.

---

## Edge Cases

- WHEN a test imports a `.png` asset THEN the system SHALL resolve it to a stub path rather than failing to parse
- WHEN a component under test calls `localStorage` THEN the system SHALL provide the jsdom implementation, isolated per test file
- WHEN a test renders a component using `useNavigate` outside a router THEN the failure SHALL be a clear router error, not a null dereference

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| TEST-01 | P1: Runnable test suite | Tasks | Pending |
| TEST-02 | P1: Runnable test suite (exit codes) | Tasks | Pending |
| TEST-03 | P1: Component rendering | Tasks | Pending |
| TEST-04 | P1: Component rendering (isolation) | Tasks | Pending |
| TEST-05 | P2: Green baseline | Tasks | Pending |

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped

**Validation**: `.specs/features/00-test-harness/validation.md` (2026-07-31) — PASS. 8/8 spec-anchored ACs matched; gate 3/3 passed (0→3 tests); discrimination sensor 1/3 mutations killed outright, 2/3 survived for explainable, advisory-only reasons (see report).

---

## Success Criteria

- [ ] `npm test` runs and reports results in under 10 seconds on this codebase
- [ ] A component test renders `Sidebar` and asserts on its links
- [ ] `npm run lint && npm run build && npm test` exits zero
