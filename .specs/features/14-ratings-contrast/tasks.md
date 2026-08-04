# Ratings Contrast Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/14-ratings-contrast/spec.md`
**Design**: not required
**Status**: Draft
**Batches**: 2 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. jsdom does not compute contrast; tests assert the text-colour class is present on the element that owns the light background. The measured ratio is a manual check recorded in the task, per candidate lesson L-003.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Components (`src/components/*.jsx`) | component | Class presence on every light-background element, in every state | `src/components/__tests__/*.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After each component task | `npx vitest run <path/to/file.test.jsx>` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Fix both components

```
T1 → T2
```

---

## Task Breakdown

### T1: Make the squad ranking readable

**What**: Dark text on the ranking rows and the unselected filter buttons.
**Where**: `src/components/SquadRanking.jsx` (modify), `src/components/__tests__/SquadRanking.test.jsx` (modify)
**Depends on**: None
**Reuses**: The `text-black` convention popups already use on light panels
**Requirement**: CONTR-01, CONTR-02, CONTR-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The ranking `<li>` sets a dark text colour on the element that carries `bg-gray-100`, so both the name span and the figure span inherit it (AC CONTR-01.1)
- [ ] Unselected filter buttons carry a dark text colour alongside `bg-gray-200` (AC CONTR-02.1)
- [ ] The selected filter button still renders `bg-blue-600 text-white` (AC CONTR-01.3) — assert it, so a blanket find-and-replace cannot pass
- [ ] The "—" placeholder for an unrated player is inside the darkened container (edge case)
- [ ] A wrapping long player name carries the colour on every line — the colour is set on the row, not on a fixed-width span (edge case)
- [ ] Manual check recorded in the commit body: measured contrast for `gray-900` on `gray-100` and on `gray-200`, in **both** `prefers-color-scheme` variants (AC CONTR-04)
- [ ] Gate passes: `npx vitest run src/components/__tests__/SquadRanking.test.jsx`
- [ ] Test count: existing counts hold, 5+ new tests pass

**Tests**: component
**Gate**: quick

**Commit**: `fix(teams): make the squad ranking readable on the dark page`

---

### T2: Make the rating history readable

**What**: Same fix inside `PlayerCard`'s dark surface.
**Where**: `src/components/PlayerRatingHistory.jsx` (modify), `src/components/__tests__/PlayerRatingHistory.test.jsx` (modify)
**Depends on**: None (ordered after T1 only to keep one component per commit)
**Reuses**: The colour chosen in T1
**Requirement**: CONTR-03, CONTR-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The history row sets the same dark text colour on its `bg-gray-100` container (AC CONTR-03.1)
- [ ] Row controls stay distinguishable from row text (AC CONTR-03.2)
- [ ] The empty-history message stays on the dark surface and keeps a light colour — assert it was **not** darkened (AC CONTR-03.3)
- [ ] Hover and focus states keep readable text (edge case)
- [ ] A sweep confirms no other component rendered outside a `text-black` popup panel still pairs a `bg-gray-*` surface with inherited white text
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: existing counts hold, 4+ new tests pass

**Tests**: component
**Gate**: build

**Commit**: `fix(teams): make the player rating history readable`

---

## Phase Execution Map

```
Phase 1:  T1 ──→ T2
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Squad ranking | 1 component | ✅ Granular |
| T2: Rating history | 1 component | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | None | T1 → T2 | ✅ Sequential for commit hygiene, not data dependency |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Component | component | component | ✅ OK |
| T2 | Component | component | component | ✅ OK |
