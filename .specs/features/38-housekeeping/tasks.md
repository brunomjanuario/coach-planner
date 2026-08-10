# Housekeeping Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/38-housekeeping/spec.md`
**Design**: not required
**Status**: Not started
**Batches**: 3 tasks → 1 batch, execute inline

---

## Test Coverage Matrix

> No dedicated testing-standards doc beyond `CLAUDE.md`'s command list. Guidelines found: none — strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Pages (`NotFound.jsx`, new) + routing (`App.jsx`) | integration | The 3 P1 ACs + the edge case | `src/__tests__/App.test.jsx` (modify) | `npm test` |
| Services (`trainingService.getAllNumbered`) | unit | Behavior-unchanged regression guard; existing suite is the floor | `src/pages/__tests__/Trainings.test.jsx` (existing coverage; no new test required — see T3) | `npm test` |
| Config (dead import removal) | none | build gate only | — | `npm run build` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | n/a | — |
| Full | After T1 | `npm test` |
| Build | After T2, T3 (final task) | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: The one user-visible fix

```
T1
```

### Phase 2: Pure hygiene

```
T2 → T3
```

---

## Task Breakdown

### T1: Add a catch-all route rendering a NotFound page

**What**: New `src/pages/NotFound.jsx` (heading, message, link to `/`); `App.jsx`'s inner `<Routes>` gains `<Route path="*" element={<NotFound />} />`.
**Where**: `src/pages/NotFound.jsx` (new), `src/App.jsx` (modify), `src/__tests__/App.test.jsx` (modify)
**Depends on**: None
**Reuses**: The Tailwind conventions every other page already uses (no inline `style`, matching `docs/09-styling.md`'s documented pattern)
**Requirement**: HOUSE-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `NotFound.jsx` renders a heading, a short message, and a `<Link to="/">` back home
- [ ] `App.jsx`'s inner `<Routes>` includes `<Route path="*" element={<NotFound />} />` as its last route
- [ ] Navigating to an unmatched authenticated path renders `NotFound`'s content, not a blank `<main>` (AC HOUSE-01.1)
- [ ] The rendered content includes a link to `/` (AC HOUSE-01.2)
- [ ] A defined route (e.g. `/teams`) still renders its own page, unaffected (AC HOUSE-01.3, regression guard)
- [ ] An unauthenticated visit to an unmatched path still redirects to `/signin` before the catch-all is ever reached (edge case)
- [ ] Gate passes: `npm test`
- [ ] Test count: existing count + 3

**Tests**: integration
**Gate**: full

**Commit**: `feat(app): render a NotFound page for unmatched authenticated routes`

---

### T2: Remove the dead App.css import

**What**: Delete the `import "./App.css"` line from `App.jsx` and `pages/Calendar.jsx`.
**Where**: `src/App.jsx` (modify), `src/pages/Calendar.jsx` (modify)
**Depends on**: T1 (same file, `App.jsx` — sequenced to avoid two tasks racing edits, not a functional dependency)
**Reuses**: n/a
**Requirement**: HOUSE-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `grep -rn "App.css" src` returns nothing (AC HOUSE-02.1)
- [ ] `src/App.css` itself is left in place, empty, per spec.md's Out of Scope note
- [ ] Gate passes: `npm run lint && npm run build`
- [ ] No test changes needed — removing a dead import has no observable behavior to test

**Tests**: none
**Gate**: build

**Commit**: `chore(app): remove the dead App.css import`

---

### T3: Match trainingService.getAllNumbered's null-check to gameService's convention

**What**: `teamId ? numbered.filter(...) : numbered` → `teamId != null ? numbered.filter(...) : numbered`.
**Where**: `src/services/trainingService.js` (modify)
**Depends on**: T2
**Reuses**: `gameService.getAll`'s exact existing convention (`teamId != null ? ... : ...`)
**Requirement**: HOUSE-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The filter condition reads `teamId != null`
- [ ] The full existing `Trainings.test.jsx` suite (which already exercises `getAllNumbered` with and without a `teamId`) stays green with no modification — this is the regression guard proving behavior is unchanged for every id this app can actually produce (AC HOUSE-02.2)
- [ ] Gate passes: `npm run lint && npm run build && npm test` (final task in the batch)
- [ ] Test count: unchanged (no new test — a one-line convention fix with no new observable behavior; the existing suite is the proof)

**Tests**: unit (proven by existing coverage, per the matrix)
**Gate**: build

**Commit**: `refactor(trainings): match getAllNumbered's null-check to gameService's convention`

---

## Phase Execution Map

```
Phase 1:  T1
                  │
Phase 2:          └──→ T2 ──→ T3
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: NotFound route | 1 new page, 1 route | ✅ Granular |
| T2: Dead import removal | 2 files, one line each | ✅ Granular |
| T3: Null-check fix | 1 file, one line | ✅ Granular |

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

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Page + routing | integration | integration | ✅ OK |
| T2 | Config | none | none | ✅ OK |
| T3 | Service | unit (proven by existing coverage) | unit | ✅ OK |
