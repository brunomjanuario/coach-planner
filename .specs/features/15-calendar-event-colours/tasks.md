# Calendar Event Colours Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/15-calendar-event-colours/spec.md`
**Design**: not required
**Status**: Draft
**Batches**: 3 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. The colour claims are asserted as class/style presence, not as rendered pixels (jsdom computes no paint — candidate lesson L-003).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Pure logic (`src/lib/*.js`) | unit | Every mapped type + the fallback | `src/lib/__tests__/*.test.js` | `npm test` |
| Pages (`src/pages/*.jsx`) | integration | Chips, legend, and every listed edge case | `src/pages/__tests__/*.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After unit-only tasks | `npx vitest run <path/to/file.test.js>` |
| Full | After tasks touching the page | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Mapping, then UI

```
T1 → T2 → T3
```

---

## Task Breakdown

### T1: Add the event-style mapping

**What**: One exported map from event type to its chip styles, with a neutral fallback.
**Where**: `src/lib/calendarEvents.js` (modify), `src/lib/__tests__/calendarEvents.test.js` (modify)
**Depends on**: None
**Reuses**: The `type` field `toEvents` already sets on every event
**Requirement**: CALCOL-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `EVENT_STYLES` maps `game` → orange and `training` → blue, each carrying background, border and text classes (AC CALCOL-01)
- [ ] Each entry carries a human label ("Game", "Training") — the legend and the accessible name both read it, so they cannot drift apart (AC CALCOL-04.2)
- [ ] `eventStyle(type)` returns the neutral fallback for an unknown or missing type, never `undefined` (AC CALCOL-03) — assert with a type that is not in the map
- [ ] Every entry sets an explicit text colour rather than inheriting (assumption: swatches must not depend on the panel background)
- [ ] The map is the only place these class strings appear
- [ ] Gate passes: `npx vitest run src/lib/__tests__/calendarEvents.test.js`
- [ ] Test count: 6+ new tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(calendar): add an event-type style mapping`

---

### T2: Colour the day-cell chips

**What**: Replace the inline ternary with the mapping, and name the type accessibly.
**Where**: `src/pages/Calendar.jsx` (modify), `src/pages/__tests__/Calendar.test.jsx` (modify)
**Depends on**: T1
**Reuses**: `eventStyle` from T1
**Requirement**: CALCOL-01, CALCOL-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A game chip renders the orange style and a training chip the blue style — the reverse of today's mapping (AC CALCOL-01.1, CALCOL-01.2)
- [ ] Both chips render the type-coloured left border (AC CALCOL-01.3)
- [ ] Each chip's accessible name includes type, time and title (AC CALCOL-01.5)
- [ ] The inline `event.type === "game" ? ... : ...` ternary is gone from `Calendar.jsx`
- [ ] Clicking a chip still navigates to the right deep link — regression guard on `10`'s CALNAV requirements
- [ ] The "+N more" indicator is unchanged and carries no event colour (edge case)
- [ ] A chip on today's cell stays identifiable against the `bg-blue-50` today highlight (edge case) — note that the today highlight and the training colour are both blue; assert the chip is still distinguishable from its cell
- [ ] Gate passes: `npm test`
- [ ] Test count: 8+ new tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(calendar): colour events by type — orange games, blue trainings`

---

### T3: Add the legend

**What**: A header legend generated from the mapping.
**Where**: `src/pages/Calendar.jsx` (modify), `src/pages/__tests__/Calendar.test.jsx` (modify)
**Depends on**: T1, T2
**Reuses**: `EVENT_STYLES` labels from T1
**Requirement**: CALCOL-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The legend renders one labelled swatch per mapped type, in the calendar header (AC CALCOL-04.1)
- [ ] The legend is produced by iterating the mapping — a test that adds a mapping entry sees a third legend item without touching the page (AC CALCOL-04.3)
- [ ] The neutral fallback is **not** listed in the legend — it is a degradation path, not an event type
- [ ] The legend does not disturb the month navigation controls at a narrow viewport
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 5+ new tests pass

**Tests**: integration
**Gate**: build

**Commit**: `feat(calendar): add an event-type legend`

---

## Phase Execution Map

```
Phase 1:  T1 ──→ T2 ──→ T3
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Mapping | 1 module, one export pair | ✅ Granular |
| T2: Chips | 1 page, one render path | ✅ Granular |
| T3: Legend | 1 page, one added block | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T1, T2 | T2 → T3 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Pure logic | unit | unit | ✅ OK |
| T2 | Page | integration | integration | ✅ OK |
| T3 | Page | integration | integration | ✅ OK |
