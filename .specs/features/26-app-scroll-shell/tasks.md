# App Scroll Shell Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/26-app-scroll-shell/spec.md`
**Design**: not required
**Status**: Not started
**Batches**: 3 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> jsdom performs no layout, so every AC here is asserted as **class presence and
> DOM structure**, never as a measured height or scroll offset. Tests are named
> for what they assert.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| App shell (`src/App.jsx`) | integration | Shell/sidebar/main classes, single scroll container, route swap | `src/__tests__/App.test.jsx` (new) | `npm test` |
| Components (`src/components/Sidebar.jsx`) | component | Height class, no self-declared `h-screen` | `src/components/__tests__/Sidebar.test.jsx` | `npm test` |
| Pages (`src/pages/*.jsx`) | integration | No page root declares its own viewport height | `src/pages/__tests__/*.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After component-only tasks | `npx vitest run <path/to/file.test.jsx>` |
| Full | After tasks touching pages | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: The shell

```
T1 → T2 → T3
```

---

## Task Breakdown

### T1: Give the app shell a bounded height

**What**: The authenticated shell becomes exactly one viewport tall and stops the document scrolling.
**Where**: `src/App.jsx` (modify), `src/__tests__/App.test.jsx` (new)
**Depends on**: None
**Reuses**: The existing `PrivateRoute` + nested `Routes` structure — only the wrapper element changes
**Requirement**: SHELL-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The authenticated shell renders `h-screen` **and** `overflow-hidden` (AC SHELL-01.1) — assert both, since either alone leaves the bug
- [ ] The inner routes render inside a `<main>` carrying `flex-1 min-w-0 overflow-y-auto` (AC SHELL-01.3)
- [ ] `<main>` is the **only** element in the rendered tree with `overflow-y-auto` (AC SHELL-01.3) — assert the count is 1, not merely that one exists
- [ ] The sidebar and `<main>` are siblings; the sidebar is not a descendant of `<main>` (AC SHELL-01.4)
- [ ] The shell carries no `transform`, `filter`, `backdrop-`, `perspective` or `contain` class (AC SHELL-04.1) — this is what keeps `fixed` popups anchored to the viewport
- [ ] `/signin` and `/signup` render with no shell wrapper (edge case)
- [ ] Gate passes: `npx vitest run src/__tests__/App.test.jsx`
- [ ] Test count: 8+ tests pass

**Tests**: integration
**Gate**: quick

**Commit**: `fix(shell): bound the app shell to the viewport height`

---

### T2: Make the sidebar fill the shell instead of the viewport

**What**: `h-screen` → `h-full`, so the nav is sized by its bounded parent.
**Where**: `src/components/Sidebar.jsx` (modify), `src/components/__tests__/Sidebar.test.jsx` (modify)
**Depends on**: T1
**Reuses**: Everything else about the sidebar — links, icons, tooltips, sign-out — is untouched
**Requirement**: SHELL-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The sidebar root carries `h-full` and no longer carries `h-screen` (AC SHELL-01.2) — assert the absence explicitly; leaving both would silently keep the old behaviour
- [ ] The sidebar root still carries `flex-shrink-0` (or equivalent) so it cannot be squeezed by a wide main region (edge case: narrow viewport)
- [ ] Every existing sidebar test still passes unchanged — links, tooltips and sign-out behaviour are untouched
- [ ] Gate passes: `npx vitest run src/components/__tests__/Sidebar.test.jsx`
- [ ] Test count: 3+ new assertions on top of the existing suite

**Tests**: component
**Gate**: quick

**Commit**: `fix(shell): size the sidebar from the shell, not the viewport`

---

### T3: Stop pages from fighting the shell

**What**: Audit all six page roots for self-declared viewport heights and second scroll containers; add the regression assertions.
**Where**: `src/pages/Home.jsx`, `Teams.jsx`, `Trainings.jsx`, `Games.jsx`, `Calendar.jsx`, `Settings.jsx` (modify only where an offending class exists), their `__tests__` files (modify)
**Depends on**: T2
**Reuses**: The existing page tests — this adds assertions rather than new files
**Requirement**: SHELL-03, SHELL-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] No page root declares `h-screen` or `min-h-screen` (AC SHELL-03.1) — one assertion per page, six in total, so a future page cannot regress silently
- [ ] Rendering each page inside the shell yields exactly one `overflow-y-auto` element (AC SHELL-03.2)
- [ ] The league table keeps its own horizontal overflow container (AC SHELL-03.3) — assert on `LeagueTable`, not on the page, so the assertion survives a page rework
- [ ] A page shorter than the viewport still renders the sidebar at `h-full` with no scrollbar class added (edge case)
- [ ] A popup opened from `Trainings` still renders `fixed inset-0` and `max-h-[85vh]` (AC SHELL-04.1, SHELL-04.2)
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 12+ tests pass

**Tests**: integration
**Gate**: build

**Commit**: `fix(shell): keep pages inside the shell's scroll region`

---

## Phase Execution Map

```
Phase 1:  T1 ──→ T2 ──→ T3
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Shell height | 1 file, one structural change | ✅ Granular |
| T2: Sidebar height | 1 file, one class | ✅ Granular |
| T3: Page audit | 6 pages, assertion-only unless an offender is found | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | App shell | integration | integration | ✅ OK |
| T2 | Component | component | component | ✅ OK |
| T3 | Pages | integration | integration | ✅ OK |
