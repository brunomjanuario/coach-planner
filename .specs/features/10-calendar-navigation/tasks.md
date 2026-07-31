# Calendar Navigation Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/10-calendar-navigation/spec.md`
**Design**: not required
**Status**: Draft
**Batches**: 6 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `CLAUDE.md` (Tailwind-first; `Calendar.jsx` named as an inline-style exception), `docs/09-styling.md`. No testing standards documented; strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Pure logic (`src/lib/*.js`) | unit | All branches; 1:1 to spec ACs; every listed edge case | `src/lib/__tests__/*.test.js` | `npm test` |
| Components (`src/components/*.jsx`) | component | Render + every AC-defined interaction; empty and error states | `src/components/__tests__/*.test.jsx` | `npm test` |
| Pages (`src/pages/*.jsx`) | integration | Happy path + every listed edge case + error path | `src/pages/__tests__/*.test.jsx` | `npm test` |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After tasks with unit/component tests only | `npx vitest run <path/to/file.test.js>` |
| Full | After tasks touching pages | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Real events

```
T1 → T2 → T3
```

### Phase 2: Navigation

```
T4 → T5 → T6
```

---

## Task Breakdown

### T1: Create the unified event feed

**What**: A pure function merging trainings and games into one calendar event list.
**Where**: `src/lib/calendarEvents.js` (new)
**Depends on**: None
**Reuses**: nothing
**Requirement**: CAL-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `toEvents(trainings, games, teams)` returns a uniform list of `{ id, type, date, title, teamName, sourceId }`
- [ ] `eventsForMonth(events, year, month)` returns only events in that month (AC CAL-01.1)
- [ ] Events carry a `type` of `"training"` or `"game"` (AC CAL-01.3)
- [ ] A training with no team gets `teamName: "Unassigned"`, never `undefined` (edge case)
- [ ] An invalid date is omitted from the feed rather than throwing (edge case)
- [ ] A month boundary does not leak events into an adjacent month's cells (edge case)
- [ ] An empty month returns an empty array, not `undefined` (edge case)
- [ ] Events on the same day order by time, ties broken deterministically
- [ ] Input is not mutated (AD-004)
- [ ] Gate passes: `npx vitest run src/lib/__tests__/calendarEvents.test.js`
- [ ] Test count: 14 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(calendar): add unified training and game event feed`

---

### T2: Replace mockEvents with real data

**What**: Delete the hard-coded array and render the real feed.
**Where**: `src/pages/Calendar.jsx` (modify)
**Depends on**: T1
**Reuses**: `src/lib/calendarEvents.js`, `trainingService`, `gameService`, `teamService`
**Requirement**: CAL-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The `mockEvents` array is deleted from the file (AC CAL-01.6)
- [ ] Trainings and games load through their services on mount
- [ ] Events render on their correct day cells with time and a team + type label (AC CAL-01.2)
- [ ] A training and a game on the same day both render, visually distinguished (AC CAL-01.3)
- [ ] Changing month recomputes the events (AC CAL-01.5)
- [ ] A day with more than three events shows three plus a "+N more" indicator (edge case)
- [ ] A month with no events renders the grid normally (edge case)
- [ ] Gate passes: `npm test`
- [ ] Test count: 12 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(calendar): render real trainings and games`

---

### T3: Convert Calendar to Tailwind

**What**: Replace every inline `style` object with utility classes.
**Where**: `src/pages/Calendar.jsx` (modify)
**Depends on**: T2
**Reuses**: The theme tokens from `02` T1; the Tailwind patterns in `docs/09-styling.md`
**Requirement**: CAL-03

**Tools**: MCP: `context7` (Tailwind 4 grid utilities) · Skill: NONE

**Done when**:
- [ ] No `style={{` remains in the file (AC CAL-03.1) — assert by source scan, satisfying AD-005
- [ ] The 7-column grid, today-highlight, event colours and spacing are visually equivalent to before (AC CAL-03.2)
- [ ] Event cells gain distinct hover and focus states, which the inline styles could not express (AC CAL-03.3)
- [ ] The now-unused `import "../App.css"` is removed — `App.css` is empty
- [ ] The calendar renders correctly at mobile width rather than overflowing
- [ ] T2's tests still pass unchanged — this task changes styling, not behaviour
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 12 tests pass (no change from T2)

**Tests**: integration (T2's suite is the regression guard)
**Gate**: build

**Commit**: `refactor(calendar): convert inline styles to Tailwind`

---

### T4: Make events clickable

**What**: Turn event cells into navigation controls carrying a query param.
**Where**: `src/pages/Calendar.jsx` (modify)
**Depends on**: T3
**Reuses**: `useNavigate` from React Router
**Requirement**: CAL-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Clicking a training event navigates to `/trainings?training=<id>` (AC CAL-04.1)
- [ ] Clicking a game event navigates to `/games?game=<id>` (AC CAL-04.2)
- [ ] Events are focusable and activate identically via Enter and Space (AC CAL-04.5)
- [ ] Each event is a real control with an accessible name, not a bare `<div onClick>`
- [ ] Clicking the day cell background does not navigate — only the event does
- [ ] Gate passes: `npm test`
- [ ] Test count: 18 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(calendar): make events clickable`

---

### T5: Handle training deep links

**What**: Read the query param on the trainings page and open the matching training.
**Where**: `src/pages/Trainings.jsx` (modify)
**Depends on**: T4
**Reuses**: `useSearchParams` from React Router; the existing `TrainingDetailsPopup` mount
**Requirement**: CAL-05

**Tools**: MCP: `context7` (React Router 7 `useSearchParams`) · Skill: NONE

**Done when**:
- [ ] `?training=<id>` opens that training's details popup on mount (AC CAL-04.1)
- [ ] The param is removed from the URL once the popup opens (AC CAL-04.4) — a refresh must not reopen it
- [ ] An id matching no training shows a not-found message rather than an empty popup (AC CAL-04.3)
- [ ] If the page's team filter would hide the target, the filter is cleared so the record is visible (edge case)
- [ ] Arriving with no param behaves exactly as before — regression guard
- [ ] Gate passes: `npm test`
- [ ] Test count: 26 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(trainings): open a training from a calendar deep link`

---

### T6: Handle game deep links

**What**: The same handling on the games page.
**Where**: `src/pages/Games.jsx` (modify)
**Depends on**: T5
**Reuses**: The pattern established in T5 — extract it if it duplicates cleanly
**Requirement**: CAL-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `?game=<id>` opens that game on mount (AC CAL-04.2)
- [ ] The param is removed from the URL once opened (AC CAL-04.4)
- [ ] An id matching no game shows a not-found message (AC CAL-04.3)
- [ ] A hiding team filter is cleared (edge case)
- [ ] The deep-link logic is shared with T5 rather than copy-pasted, if the extraction is clean
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 33 tests pass

**Tests**: integration
**Gate**: build

**Commit**: `feat(games): open a game from a calendar deep link`

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ──→ T2 ──→ T3
Phase 2:  T4 ──→ T5 ──→ T6
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Event feed | 2 pure functions, 1 file | ✅ Granular |
| T2: Real data | 1 page | ✅ Granular |
| T3: Tailwind conversion | 1 page, styling only | ✅ Granular — deliberately separate from T2 so a styling regression is isolated from a data change |
| T4: Clickable events | 1 page | ✅ Granular |
| T5: Training deep link | 1 page | ✅ Granular |
| T6: Game deep link | 1 page | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | Phase 1 → Phase 2 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Pure logic | unit | unit | ✅ OK |
| T2 | Page | integration | integration | ✅ OK |
| T3 | Page (styling) | integration | integration | ✅ OK — T2's suite is the regression guard; no new behaviour to assert |
| T4 | Page | integration | integration | ✅ OK |
| T5 | Page | integration | integration | ✅ OK |
| T6 | Page | integration | integration | ✅ OK |
