# App Scroll Shell Validation

**Date**: 2026-08-06
**Spec**: `.specs/features/26-app-scroll-shell/spec.md`
**Diff range**: `edfd832..HEAD` (branch `feature/26-app-scroll-shell`), commits `30a5f43`, `4471a6c`, `8f8d206`
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 | ✅ Done | `src/App.jsx` shell now `h-screen overflow-hidden`, `<main>` added; `src/__tests__/App.test.jsx` new, 8 tests |
| T2 | ✅ Done | `src/components/Sidebar.jsx` root `h-screen` → `h-full flex-shrink-0`; 2 new tests in `Sidebar.test.jsx` |
| T3 | ✅ Done | Audit found no offending page classes (none of the six pages ever declared `h-screen`/`min-h-screen`); regression assertions added to all six page test files instead of code changes |

---

## Spec-Anchored Acceptance Criteria

### P1: The nav stays put (SHELL-01)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| SHELL-01.1 shell carries `h-screen` and `overflow-hidden` | both classes present on same element | `src/__tests__/App.test.jsx:23-30` — `container.querySelector(".h-screen.overflow-hidden")` `toBeInTheDocument()` | ✅ PASS |
| SHELL-01.2 sidebar fills shell (`h-full`, no `h-screen`) | `h-full` present, `h-screen` absent | `src/components/__tests__/Sidebar.test.jsx:54-60` — `root.className` matches `/\bh-full\b/` and not `/\bh-screen\b/` | ✅ PASS |
| SHELL-01.3 `<main>` carries `flex-1 min-w-0 overflow-y-auto` and is the only `overflow-y-auto` element | class match + count === 1 | `src/__tests__/App.test.jsx:32-42` (class match) and `:44-52` (`querySelectorAll(".overflow-y-auto")` length 1, tag `MAIN`) | ✅ PASS |
| SHELL-01.4 sidebar and `<main>` are siblings, sidebar not inside scroll container | `main.contains(sidebarRoot)` false; same `parentElement` | `src/__tests__/App.test.jsx:54-66` | ✅ PASS |

### P2: Every page fits the new shell (SHELL-03)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| SHELL-03.1 no page root declares `h-screen`/`min-h-screen` | absence assertion per page (6 pages) | Home `src/pages/__tests__/Home.test.jsx:779-785`; Teams `Teams.test.jsx:663-669`; Calendar `Calendar.test.jsx:485-491`; Settings `Settings.test.jsx:587-592`; Games `Games.test.jsx:1294-1298` (min-h-screen only — `h-screen` already covered pre-existing at `Games.test.jsx:873-881`, AC GLAY-05.3); Trainings `Trainings.test.jsx:1673-1678` (min-h-screen only — `h-screen` already covered pre-existing at `Trainings.test.jsx:1378-1387`, AC TLAY-01.2/.3) | ✅ PASS (Games/Trainings coverage split across old+new tests, verified both halves present) |
| SHELL-03.2 exactly one scroll container (shell's `<main>`) per page | no page-level `overflow-y-auto` | Home `Home.test.jsx:787-792`; Teams `Teams.test.jsx:671-676`; Calendar `Calendar.test.jsx:493-498`; Settings `Settings.test.jsx:594-598`; Games pre-existing `Games.test.jsx:873-881`; Trainings pre-existing `Trainings.test.jsx:1615-1622` | ✅ PASS |
| SHELL-03.3 league table keeps its own horizontal overflow container | `overflow-x-auto` present on `LeagueTable` | `src/components/__tests__/LeagueTable.test.jsx:115` (pre-existing, unmodified by this feature — correct, since `LeagueTable.jsx` never changed) | ✅ PASS |

### P3: Popups still overlay the whole viewport (SHELL-04)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| SHELL-04.1 shell carries no `transform`/`filter`/`backdrop-`/`perspective`/`contain-`; popup overlay still `fixed inset-0` | negative class assertions on shell + overlay assertion | Shell: `src/__tests__/App.test.jsx:68-79`; overlay: `src/pages/__tests__/Trainings.test.jsx:1687-1699` — `overlay.className` matches `/fixed inset-0/` | ✅ PASS |
| SHELL-04.2 popup caps at `85vh` and scrolls its own body | `max-h-[85vh]` present on dialog | `src/pages/__tests__/Trainings.test.jsx:1698` — `dialog.className` contains `"max-h-[85vh]"` | ✅ PASS |

### Edge Cases

| Case | `file:line` + assertion | Result |
| --- | --- | --- |
| `/signin`, `/signup` render with no shell wrapper | `src/__tests__/App.test.jsx:81-93` | ✅ PASS |
| Unauthenticated visit to a private route redirects, no shell wrapper | `src/__tests__/App.test.jsx:95-100` | ✅ PASS |
| Sidebar doesn't shrink beside a wide main region (`flex-shrink-0`) | `src/components/__tests__/Sidebar.test.jsx:62-67` | ✅ PASS |
| Route changes keep shell mounted, only `<main>`'s children swap | Not directly asserted (no test renders two routes in sequence against the same `App` instance and checks the shell/sidebar DOM node identity is preserved) | ⚠️ GAP — see below |

**Status**: All 4 requirement IDs (SHELL-01 through SHELL-04) have direct test evidence with asserted values matching spec wording exactly (class names, counts, structural containment). One edge case (shell staying mounted across route changes, not remounting the sidebar) has no direct test — flagged below as a spec-precision gap, low severity since the shell's structure change (Sidebar and `<main>`'s `<Routes>` both live under one non-remounting parent `<Routes>` component in `App.jsx`) makes remounting unlikely by construction, but it isn't proven by a test.

---

## Discrimination Sensor

Sensor run in the real tree via targeted edits + revert (`git checkout --` used for App.jsx after a JSX-syntax mutation; Sidebar.jsx mutation was a single-line revert). Tree confirmed clean (`git status --short` showed only the pre-existing, out-of-scope `tasks.md` checkbox diff) before and after.

| # | File:line | Description | Killed? |
| - | --- | --- | --- |
| 1 | `src/App.jsx:29` | Dropped `overflow-hidden` from the shell div (`"flex w-screen h-screen overflow-hidden"` → `"flex w-screen h-screen"`) | ✅ Killed — 2 tests failed in `src/__tests__/App.test.jsx` (SHELL-01.1 and SHELL-04.1 tests, both querying `.h-screen.overflow-hidden`) |
| 2 | `src/components/Sidebar.jsx:24` | Put `h-screen` back on the sidebar instead of `h-full` (`"h-full flex-shrink-0 ..."` → `"h-screen flex-shrink-0 ..."`) | ✅ Killed — 1 test failed in `src/components/__tests__/Sidebar.test.jsx` (AC SHELL-01.2 test) |
| 3 | `src/App.jsx` | Moved the shell `<div>` outside the `/*` route so it wraps all of `<Routes>` (including `/signin`, `/signup`) | ✅ Killed — 3 tests failed in `src/__tests__/App.test.jsx` (both signin/signup no-shell-wrapper tests, plus the unauthenticated-redirect no-shell-wrapper test) |

**Sensor depth**: lightweight (3 targeted mutations, all plausible wrong-implementation shapes)
**Result**: 3/3 killed — no surviving mutants

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — `App.jsx` diff is a structural reshuffle (44 lines changed, net 0 growth in complexity), `Sidebar.jsx` diff is a single class-string change |
| Surgical changes | ✅ — only `App.jsx`, `Sidebar.jsx`, and test files touched; no page `.jsx` files modified since T3's audit found no offenders |
| No scope creep | ✅ — no sidebar redesign, no mobile drawer, no per-page scroll panes reintroduced, matching the spec's Out of Scope table |
| Matches patterns | ✅ — Tailwind utility classes only, no inline `style` introduced |
| Spec-anchored outcome check | ✅ for all 4 requirement IDs; ⚠️ 1 edge case (route-change remount) unasserted |
| Gate commands run at correct granularity | ✅ — T1/T2 used quick gates (`npx vitest run <file>`), T3 used the full gate per tasks.md |

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Lint**: ✅ clean, no errors
- **Build**: ✅ `vite build` succeeded, 5995 modules transformed, no warnings
- **Tests**: ✅ 59 test files, **1147 tests passed**, 0 failed

---

## Gap List (ranked by severity)

1. **Minor** — Edge case "route changes keep the shell mounted, only `<main>`'s children swap" (spec Edge Cases section) has no direct test asserting DOM-node identity/non-remount across a route transition. The structural guarantee holds by construction (single non-remounting `<Routes>` tree in `App.jsx`), and no sensor mutation targeting this behavior survived, but the AC itself is unproven by an explicit assertion. Recommend (not blocking): a test that renders `App`, captures the sidebar DOM node reference, navigates to a second authenticated route, and asserts the same node reference is still in the document.

No other gaps found. All four requirement IDs (SHELL-01–SHELL-04) have precise, spec-matching test evidence; all three discrimination-sensor mutations were killed; the full gate (lint/build/test) is clean.

---

## Verdict

**PASS**
