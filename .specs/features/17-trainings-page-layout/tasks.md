# Trainings Page Layout Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/17-trainings-page-layout/spec.md`
**Design**: not required
**Status**: Draft
**Batches**: 3 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. jsdom computes no layout: height, scrolling and responsive-stacking ACs are asserted as class presence and DOM structure, and the visual result is a recorded manual check (candidate lesson L-003).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Pure logic (`src/lib/*.js`) | unit | Ordering, including invalid dates | `src/lib/__tests__/*.test.js` | `npm test` |
| Pages (`src/pages/*.jsx`) | integration | Every AC + every listed edge case | `src/pages/__tests__/*.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After unit-only tasks | `npx vitest run <path/to/file.test.js>` |
| Full | After tasks touching the page | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Ordering, then layout

```
T1 → T2 → T3
```

---

## Task Breakdown

### T1: Order each section

**What**: Pure sorting for the two buckets, with a defined place for invalid dates.
**Where**: `src/lib/trainingDisplay.js` (modify — created by `16` T1), `src/lib/__tests__/trainingDisplay.test.js` (modify)
**Depends on**: None
**Reuses**: The `splitTrainings`/`isFuture` logic currently inline in `pages/Trainings.jsx:10-26` — move it here rather than duplicating it
**Requirement**: TLAY-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `splitTrainings(trainings, now)` returns `{ upcoming, past }` with `upcoming` soonest-first and `past` most-recent-first (AC TLAY-05.1, TLAY-05.2)
- [ ] `now` is injected rather than read from `new Date()` inside the function, so the boundary is testable without faking timers
- [ ] A training with an invalid `day` lands in `past` and does not disturb the ordering of the valid ones (AC TLAY-05.3) — assert the full resulting order, not just membership
- [ ] A training dated exactly `now` lands in `upcoming`, matching today's `>=` comparison
- [ ] Input array is not mutated
- [ ] Gate passes: `npx vitest run src/lib/__tests__/trainingDisplay.test.js`
- [ ] Test count: 10+ new tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(lib): order training sections and move splitting out of the page`

---

### T2: Remove the height caps and add the counts

**What**: One page scroll, full sections, counted headings.
**Where**: `src/pages/Trainings.jsx` (modify), `src/pages/__tests__/Trainings.test.jsx` (modify)
**Depends on**: T1
**Reuses**: `splitTrainings` from T1
**Requirement**: TLAY-01, TLAY-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Twelve trainings all render in the DOM with no per-section cap (AC TLAY-01.1) — assert the rendered card count equals the data length, in both sections
- [ ] The page-level `h-screen` and the two list `overflow-y-auto` containers are gone (AC TLAY-01.2, TLAY-01.3)
- [ ] Each heading renders its section's count (AC TLAY-02) — assert the number, not just that a heading exists
- [ ] An empty section renders its existing message and a zero count (AC TLAY-01.5)
- [ ] The unassigned section is uncapped too and stays above the others (edge case)
- [ ] Create, edit and delete update the counts with no reload (edge case)
- [ ] The filter message and deep-link error still render in place (edge case)
- [ ] Gate passes: `npm test`
- [ ] Test count: 12+ tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(trainings): show every training and count each section`

---

### T3: Rework the column layout

**What**: A fixed-width, responsive team filter beside the content.
**Where**: `src/pages/Trainings.jsx` (modify)
**Depends on**: T2
**Reuses**: nothing
**Requirement**: TLAY-03, TLAY-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The team filter is a fixed-width column at desktop width and stacks above the content at narrow width (AC TLAY-03.1, TLAY-03.2) — assert the responsive classes
- [ ] No element carries both `flex-1` and `flex-3` (AC TLAY-03.5) — assert against the rendered class list, so the ambiguity cannot come back
- [ ] Selecting a team filters both sections and their counts (AC TLAY-03.3)
- [ ] Clicking the selected team again clears the filter and restores every training (AC TLAY-03.4)
- [ ] With no teams, the "No teams yet." state and the disabled add button are unchanged (edge case)
- [ ] Filtering to a team with no trainings shows both empty states with zero counts (edge case)
- [ ] Manual check recorded in the commit body: the page has one vertical scrollbar at 1280×800 and at 480×800
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 10+ tests pass

**Tests**: integration
**Gate**: build

**Commit**: `feat(trainings): give the team filter its own column`

---

## Phase Execution Map

```
Phase 1:  T1 ──→ T2 ──→ T3
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Ordering | 1 module | ✅ Granular |
| T2: Uncap + counts | 1 page, one concern (what is visible) | ✅ Granular |
| T3: Columns | 1 page, one concern (where it sits) | ✅ Granular |

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
| T1 | Pure logic | unit | unit | ✅ OK |
| T2 | Page | integration | integration | ✅ OK |
| T3 | Page | integration | integration | ✅ OK |
