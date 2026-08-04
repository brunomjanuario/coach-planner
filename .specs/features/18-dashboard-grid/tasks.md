# Dashboard Grid Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/18-dashboard-grid/spec.md`
**Design**: not required
**Status**: Draft
**Batches**: 4 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Height and column-count ACs are asserted as class presence and DOM structure; the visual result is a recorded manual check at the three breakpoints (candidate lesson L-003).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Components (`src/components/*.jsx`) | component | Every variant: loading, empty, populated, interactive | `src/components/__tests__/*.test.jsx` | `npm test` |
| Pages (`src/pages/*.jsx`) | integration | Section structure, tile membership, filter behaviour | `src/pages/__tests__/*.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After component-only tasks | `npx vitest run <path/to/file.test.jsx>` |
| Full | After tasks touching the page | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: The shared surface

```
T1 → T2
```

### Phase 2: The grid

```
T3 → T4
```

---

## Task Breakdown

### T1: Extract the shared `Tile` surface

**What**: One component owning border, radius, padding, full-cell height, the label row and the interactive/focus styling.
**Where**: `src/components/Tile.jsx` (new), `src/components/__tests__/Tile.test.jsx` (new)
**Depends on**: None
**Reuses**: The `TILE_CLASS` and `INTERACTIVE_CLASS` strings currently duplicated in `StatTile.jsx` and `LeaderTile.jsx`
**Requirement**: DGRID-04, DGRID-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `Tile({ label, note, children, href, onClick })` renders the surface, the label row and the body (AC DGRID-04.1)
- [ ] The surface carries `h-full` so a stretched grid cell is filled (AC DGRID-01.2)
- [ ] Passing `href` renders a `Link`, `onClick` renders a `button`, neither renders a `div` — and focus/hover styling comes from the shared definition in all three cases (AC DGRID-04.4)
- [ ] Passing both `href` and `onClick` is a defined outcome, not an accident — pick one and assert it
- [ ] The label is rendered as the same element and typography for every variant
- [ ] Gate passes: `npx vitest run src/components/__tests__/Tile.test.jsx`
- [ ] Test count: 8+ tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(dashboard): extract a shared Tile surface`

---

### T2: Move `StatTile` and `LeaderTile` onto `Tile`

**What**: Both tile types render their bodies inside the shared surface; their local copies go.
**Where**: `src/components/StatTile.jsx`, `src/components/LeaderTile.jsx` (modify), their test files (modify)
**Depends on**: T1
**Reuses**: `Tile`
**Requirement**: DGRID-04, DGRID-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Both render through `Tile`; neither declares `TILE_CLASS` (AC DGRID-04.5) — assert with a test that greps the component sources, so a re-introduced copy fails the gate
- [ ] Loading, empty and populated variants all render the same surface (AC DGRID-05, DGRID-04.3)
- [ ] The loading skeleton reserves the populated state's height rather than collapsing (AC DGRID-05.2)
- [ ] Every existing `11` test for both components passes; assertions that named removed markup are rewritten against the shared surface
- [ ] `StatTile`'s empty-state signpost link and `LeaderTile`'s overflow line are unchanged in behaviour
- [ ] Gate passes: `npm test`
- [ ] Test count: existing counts hold, 8+ new tests pass

**Tests**: component
**Gate**: full

**Commit**: `refactor(dashboard): render both tile types through Tile`

---

### T3: Group the tiles into sections

**What**: Overview and Leaders, each with a real heading.
**Where**: `src/pages/Home.jsx` (modify), `src/pages/__tests__/Home.test.jsx` (modify)
**Depends on**: T2
**Reuses**: nothing
**Requirement**: DGRID-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Overview holds Teams, Training, Games and Next Event; Leaders holds Most Goals, Most Games, Most Cards and Top Rated (AC DGRID-03.1, DGRID-03.2) — assert membership per section, not just that headings exist
- [ ] Both headings are heading elements (AC DGRID-03.3)
- [ ] The team filter sits above both sections and still filters the data feeding both (AC DGRID-03.4)
- [ ] Every tile's data binding is unchanged — regression guard on `11`'s DASH requirements
- [ ] Gate passes: `npm test`
- [ ] Test count: 8+ tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(dashboard): group tiles into Overview and Leaders`

---

### T4: Make the grid symmetric and responsive

**What**: Four-up equal-height rows that reflow to two and one.
**Where**: `src/pages/Home.jsx` (modify)
**Depends on**: T3
**Reuses**: nothing
**Requirement**: DGRID-01, DGRID-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Each section's grid carries `auto-rows-fr` and the 1/2/4 responsive column classes (AC DGRID-01.1, DGRID-02)
- [ ] Each section holds exactly four tiles, so no cell is empty at four columns (AC DGRID-02.3)
- [ ] `gap-10` is replaced with a gap consistent with the tiles' padding (AC DGRID-01.5)
- [ ] A fresh install with no data renders all eight tiles in their empty states with their signpost links intact (edge case)
- [ ] A long Next Event value wraps inside its tile (edge case)
- [ ] Manual check recorded in the commit body: bottom edges aligned per row at 1280px, 768px and 375px, and no layout shift between loading and loaded
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 8+ tests pass

**Tests**: integration
**Gate**: build

**Commit**: `feat(dashboard): make the tile grid symmetric and responsive`

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ──→ T2
Phase 2:  T3 ──→ T4
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Shared surface | 1 new component | ✅ Granular |
| T2: Migration | 2 components, one mechanical transform | ⚠️ OK — migrating one and not the other leaves the duplication the task exists to remove |
| T3: Sections | 1 page, one structural change | ✅ Granular |
| T4: Grid | 1 page, one styling change | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | Phase 1 → Phase 2 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Component | component | component | ✅ OK |
| T2 | Components | component | component | ✅ OK |
| T3 | Page | integration | integration | ✅ OK |
| T4 | Page | integration | integration | ✅ OK |
