# Scrollable Popup Shell Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/13-popup-shell/spec.md`
**Design**: not required
**Status**: Done — verified PASS (see `validation.md`)
**Batches**: 5 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Note: jsdom computes no layout, so height/overflow ACs are asserted as class presence and DOM structure, not as measured pixels (see candidate lesson L-003 — name the tests after what they actually assert).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Components (`src/components/*.jsx`) | component | Render + every AC-defined structural guarantee; empty/no-footer states | `src/components/__tests__/*.test.jsx` | `npm test` |
| Pages (`src/pages/*.jsx`) | integration | Popups still open, submit and close from their real call sites | `src/pages/__tests__/*.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After tasks with component tests only | `npx vitest run <path/to/file.test.jsx>` |
| Full | After migration tasks | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: The shell

```
T1
```

### Phase 2: Migration

```
T2 → T3 → T4 → T5
```

---

## Task Breakdown

### T1: Add `PopupShell` ✅ Complete (`31a5593`)

**What**: One component owning the overlay, the height cap, the scroll region and the pinned title/action rows.
**Where**: `src/components/PopupShell.jsx` (new), `src/components/__tests__/PopupShell.test.jsx` (new)
**Depends on**: None
**Reuses**: The overlay/panel classes currently duplicated in all nine popups
**Requirement**: POPUP-01, POPUP-02, POPUP-03, POPUP-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `PopupShell({ title, children, footer, width })` renders overlay → panel → title row → scrollable body → action row (AC POPUP-04.1)
- [ ] The panel carries `max-h-[85vh]` and `flex flex-col` so the body can shrink (AC POPUP-01)
- [ ] The body region carries `overflow-y-auto` and `min-h-0`; without `min-h-0` a flex child refuses to shrink and the cap silently does nothing (AC POPUP-02.2)
- [ ] The title row and action row are **siblings of** the scroll region, never inside it (AC POPUP-02.3, POPUP-02.4) — assert by DOM containment, not by class
- [ ] Omitting `footer` renders no action row and no divider (edge case)
- [ ] `width` overrides `max-w-md`; the default is `max-w-md` (AC POPUP-04.4)
- [ ] The overlay keeps `z-50` so nested popups still stack (edge case)
- [ ] A `role="dialog"` with `aria-modal="true"` and the title wired via `aria-labelledby`
- [ ] Gate passes: `npx vitest run src/components/__tests__/PopupShell.test.jsx`
- [ ] Test count: 10+ tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(components): add a scrollable PopupShell`

---

### T2: Migrate the small popups ✅ Complete (`3560297`, follow-up `bc4c571`)

**What**: Move `ConfirmationPopup`, `TeamPopup`, `PlayerPopup` onto the shell.
**Where**: `src/components/ConfirmationPopup.jsx`, `TeamPopup.jsx`, `PlayerPopup.jsx` (modify)
**Depends on**: T1
**Reuses**: `PopupShell`
**Requirement**: POPUP-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Each renders through `PopupShell`; interior markup is moved verbatim (AC POPUP-05.2)
- [ ] Cancel/submit buttons move into `footer`
- [ ] Every existing test for these three passes; any that asserted the removed overlay markup is rewritten to assert the shell instead (AC POPUP-05.3)
- [ ] A short confirmation renders at natural height — no fixed-height box (AC POPUP-03)
- [ ] `ConfirmationPopup` still stacks correctly when opened from inside another popup (edge case)
- [ ] Gate passes: `npm test`
- [ ] Test count: existing counts hold, 4+ new tests pass

**Tests**: component
**Gate**: full

**Commit**: `refactor(components): move the small popups onto PopupShell`

---

### T3: Migrate the training popups ✅ Complete (`e21371f`)

**What**: `TrainingSavePopup` and `TrainingDetailsPopup` — the two that motivated the feature.
**Where**: `src/components/TrainingSavePopup.jsx`, `TrainingDetailsPopup.jsx` (modify)
**Depends on**: T1
**Reuses**: `PopupShell`
**Requirement**: POPUP-05, POPUP-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Both render through `PopupShell` with their action rows in `footer` (AC POPUP-02.4)
- [ ] The exercise list in `TrainingSavePopup` sits inside the scroll region while Create/Save stays outside it — assert by DOM containment
- [ ] The exercise list in `TrainingDetailsPopup` likewise
- [ ] The full `04`/`06` test suites for these components pass unchanged in behaviour (AC POPUP-05.3)
- [ ] Adding eight exercises does not move the submit button out of the shell's footer (the failure this feature exists for)
- [ ] Gate passes: `npm test`
- [ ] Test count: existing counts hold, 4+ new tests pass

**Tests**: component
**Gate**: full

**Commit**: `refactor(trainings): move the training popups onto PopupShell`

---

### T4: Migrate the game and rating popups ✅ Complete (`147836c`, follow-up `bc4c571`)

**What**: `GameSavePopup`, `GameResultPopup`, `RivalRowPopup`, `SquadRatingPopup`.
**Where**: those four files (modify)
**Depends on**: T1
**Reuses**: `PopupShell`
**Requirement**: POPUP-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] All four render through `PopupShell` (AC POPUP-05.2)
- [ ] `SquadRatingPopup`'s per-player rating list is the scroll region — a 25-player squad keeps Save on screen
- [ ] A wide element inside a body scrolls horizontally without widening the panel (edge case)
- [ ] The `07`/`09` test suites for these components pass unchanged in behaviour
- [ ] Gate passes: `npm test`
- [ ] Test count: existing counts hold, 4+ new tests pass

**Tests**: component
**Gate**: full

**Commit**: `refactor(games): move the game and rating popups onto PopupShell`

---

### T5: Prove the duplication is gone ✅ Complete (`e76cc00`)

**What**: Remove the last copies and lock the invariant in a test.
**Where**: `src/components/__tests__/PopupShell.test.jsx` (modify), any straggler popup
**Depends on**: T2, T3, T4
**Reuses**: nothing
**Requirement**: POPUP-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A test reads `src/components/*.jsx` and asserts the `fixed inset-0` overlay markup appears only in `PopupShell.jsx` (AC POPUP-05.5)
- [ ] The same test names each of the nine migrated popups explicitly, so deleting one from the list is a visible diff rather than a silent gap
- [ ] Every page-level popup interaction still works end to end — trainings, games, teams (AC POPUP-05.2)
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 3+ new tests pass

**Tests**: integration
**Gate**: build

**Commit**: `test(components): assert the popup overlay is defined once`

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1
Phase 2:  T2 ──┐
          T3 ──┼──→ T5
          T4 ──┘
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: The shell | 1 new component | ✅ Granular |
| T2: Small popups | 3 mechanical migrations | ⚠️ OK — identical transform, one commit keeps the diff readable |
| T3: Training popups | 2 components | ✅ Granular |
| T4: Game/rating popups | 4 mechanical migrations | ⚠️ OK — same rationale as T2 |
| T5: Invariant test | 1 test file | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | Phase 1 → Phase 2 | ✅ Match |
| T3 | T1 | Phase 1 → Phase 2 | ✅ Match |
| T4 | T1 | Phase 1 → Phase 2 | ✅ Match |
| T5 | T2, T3, T4 | T2/T3/T4 → T5 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Component | component | component | ✅ OK |
| T2–T4 | Components | component | component | ✅ OK |
| T5 | Components + Pages | integration (highest) | integration | ✅ OK |
