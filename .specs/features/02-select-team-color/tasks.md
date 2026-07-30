# Selected-Team Colour Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/02-select-team-color/spec.md`
**Design**: not required
**Status**: Draft
**Batches**: 4 tasks → 1 batch, execute inline (no sub-agents)

> This feature depends on `00-test-harness` only. It does **not** need the
> persistence layer, so it can ship as the first user-visible improvement.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `CLAUDE.md` (styling conventions, Tailwind-first), `docs/09-styling.md`. No testing standards documented; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Components (`src/components/*.jsx`) | component | Render + every AC-defined interaction; empty and error states | `src/components/__tests__/*.test.jsx` | `npm test` |
| Pages (`src/pages/*.jsx`) | integration | Happy path + every listed edge case | `src/pages/__tests__/*.test.jsx` | `npm test` |
| Theme tokens (`src/index.css`) | none | — (build gate only) | — | build gate only |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After tasks with component tests only | `npx vitest run <path/to/file.test.jsx>` |
| Full | After tasks touching pages | `npm test` |
| Build | After phase completion or CSS-only tasks | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Tokens and component

```
T1 → T2
```

### Phase 2: Adoption

```
T3 → T4
```

---

## Task Breakdown

### T1: Add selection theme tokens

**What**: Define accent, selected and hover colour tokens in the Tailwind `@theme` block.
**Where**: `src/index.css` (modify)
**Depends on**: None
**Reuses**: The existing `@theme` block holding `--color-lightblack` and `--color-lightgrey`
**Requirement**: SELECT-01

**Tools**: MCP: `context7` (Tailwind 4 `@theme` token syntax) · Skill: NONE

**Done when**:
- [ ] `--color-selected` and `--color-selected-border` added to `@theme`
- [ ] `--color-hover` added, distinct from both `--color-selected` and the surface
- [ ] Contrast of selected background against its text meets WCAG AA (4.5:1)
- [ ] Existing `lightblack` / `lightgrey` tokens unchanged — nothing else re-styles
- [ ] Gate passes: `npm run lint && npm run build && npm test`

**Tests**: none (matrix: theme tokens → none) — verified through T2
**Gate**: build

**Commit**: `style(theme): add selection colour tokens`

---

### T2: Create the SelectableListItem component

**What**: One reusable row handling selected, hover, keyboard and ARIA state.
**Where**: `src/components/SelectableListItem.jsx` (new)
**Depends on**: T1
**Reuses**: The row markup currently duplicated in `Teams.jsx` and `Trainings.jsx`
**Requirement**: SELECT-01, SELECT-02, SELECT-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Props: `selected`, `onSelect`, `children`
- [ ] Selected renders accent background + left border bar (AC SELECT-01.1)
- [ ] Hover-not-selected renders the hover token, visually distinct (AC SELECT-01.2)
- [ ] Selected + hovered keeps selected styling dominant (AC SELECT-01.3)
- [ ] Sets `aria-current="true"` only when selected (AC SELECT-01.5)
- [ ] Click invokes `onSelect` exactly once (AC SELECT-03.2)
- [ ] Enter and Space each invoke `onSelect` (AC SELECT-03.3)
- [ ] Row is focusable and reachable by Tab
- [ ] Long content wraps with the border bar spanning full height (edge case)
- [ ] Gate passes: `npx vitest run src/components/__tests__/SelectableListItem.test.jsx`
- [ ] Test count: 9 tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(ui): add SelectableListItem with distinct selected state`

---

### T3: Adopt the component in the Teams page

**What**: Replace both hand-rolled lists (teams and players) with `SelectableListItem`.
**Where**: `src/pages/Teams.jsx` (modify)
**Depends on**: T2
**Reuses**: `src/components/SelectableListItem.jsx`
**Requirement**: SELECT-03, SELECT-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The teams list renders through `SelectableListItem` with `key={team.id}`
- [ ] The players list renders through it with `key={player.id}`
- [ ] Zero React key warnings in the console for this page (AC SELECT-04.1)
- [ ] Empty teams list renders an empty-state message (edge case)
- [ ] Empty/absent selected team renders a "select a team" message in the players column (edge case)
- [ ] Selecting a team still clears the player selection — existing behaviour preserved
- [ ] Gate passes: `npm test`
- [ ] Test count: 7 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `refactor(teams): use SelectableListItem for team and player lists`

---

### T4: Adopt the component in the Trainings page

**What**: Replace the team filter list with `SelectableListItem`.
**Where**: `src/pages/Trainings.jsx` (modify)
**Depends on**: T2
**Reuses**: `src/components/SelectableListItem.jsx`
**Requirement**: SELECT-03, SELECT-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The team filter list renders through `SelectableListItem` with `key={team.id}`
- [ ] The two training lists get `key={training.id}` (they are not selectable rows — keys only)
- [ ] Zero React key warnings on this page
- [ ] Click-to-deselect still works — clicking the selected team clears the filter
- [ ] Empty future/past lists render empty-state messages (edge case: the shipped seed leaves "Next Trainings" empty)
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 6 tests pass

**Tests**: integration
**Gate**: build

**Commit**: `refactor(trainings): use SelectableListItem for the team filter`

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
| T1: Theme tokens | 1 file, CSS only | ✅ Granular |
| T2: SelectableListItem | 1 component | ✅ Granular |
| T3: Teams adoption | 1 file | ✅ Granular |
| T4: Trainings adoption | 1 file | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | Phase 1 → Phase 2 | ✅ Match |
| T4 | T2 | Phase 1 → Phase 2 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Theme tokens (CSS) | none | none | ✅ OK |
| T2 | Component | component | component | ✅ OK |
| T3 | Page | integration | integration | ✅ OK |
| T4 | Page | integration | integration | ✅ OK |
