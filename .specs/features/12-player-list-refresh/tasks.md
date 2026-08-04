# Player List Refresh Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/12-player-list-refresh/spec.md`
**Design**: not required
**Status**: Draft
**Batches**: 3 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `CLAUDE.md` (stale in places — `src/model/mock.js` no longer exists; the store is `src/services/store.js` over `src/model/seed.js`), `.specs/STATE.md` AD-004.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Components (`src/components/*.jsx`) | component | Render + every AC-defined interaction; error states | `src/components/__tests__/*.test.jsx` | `npm test` |
| Pages (`src/pages/*.jsx`) | integration | Happy path + every listed edge case + error path | `src/pages/__tests__/*.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After tasks with component tests only | `npx vitest run <path/to/file.test.jsx>` |
| Full | After tasks touching pages | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Await the writes, then refresh

```
T1 → T2 → T3
```

---

## Task Breakdown

### T1: Await player writes in `PlayerPopup`

**What**: Make the submit handler `async`, await the service call, and surface failures instead of closing.
**Where**: `src/components/PlayerPopup.jsx` (modify), `src/components/__tests__/PlayerPopup.test.jsx` (new — the component has no test file today)
**Depends on**: None
**Reuses**: The inline-error pattern in `GameSavePopup.jsx:93-96`
**Requirement**: PREF-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `handleSubmit` is `async` and `await`s `teamService.addPlayer` / `updatePlayer` before calling `onClose` (AC PREF-03.1)
- [ ] `onClose` is not called when the service rejects — assert with a rejecting spy (AC edge case)
- [ ] A rejected write renders an inline error message and leaves the form values intact
- [ ] Editing an existing player calls `updatePlayer` and never `addPlayer` — assert both spies
- [ ] Creating calls `addPlayer` with the `teamId` prop and never `updatePlayer`
- [ ] Cancelling calls neither service method (AC PREF-04.4)
- [ ] Gate passes: `npx vitest run src/components/__tests__/PlayerPopup.test.jsx`
- [ ] Test count: 8+ tests pass

**Tests**: component
**Gate**: quick

**Commit**: `fix(players): await player writes before closing the form`

---

### T2: Refresh the squad after a delete

**What**: Give `PlayerCard` an `onDeleted` callback distinct from `onClose`, await the delete, and have `Teams.jsx` re-read.
**Where**: `src/components/PlayerCard.jsx` (modify), `src/pages/Teams.jsx` (modify)
**Depends on**: None (independent of T1; ordered after it only to keep one file per commit)
**Reuses**: `refreshAndResyncPlayer()` in `Teams.jsx:86-97`
**Requirement**: PREF-01, PREF-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `deletePlayer` `await`s `teamService.deletePlayer` before invoking any callback (AC PREF-02) — assert ordering with a deferred-promise spy, not just that both were called
- [ ] `PlayerCard` calls a new `onDeleted` prop on success; `onClose` keeps meaning "close the card" only
- [ ] `Teams.jsx` passes `onDeleted` so the player list re-reads (AC PREF-01.1)
- [ ] After a delete the player selection is cleared and the team stays selected (AC PREF-01.3)
- [ ] After a delete the squad ranking no longer lists the player (AC PREF-01.4)
- [ ] A rejecting `deletePlayer` keeps the player listed and renders an inline error; the card does not close (AC PREF-01.5)
- [ ] Deleting the last player renders "No players yet." (edge case)
- [ ] Cascades still run — `cardService.removeByPlayer` and `ratingService.removeByPlayer` are still reached (regression guard on `08`/`09`)
- [ ] Gate passes: `npm test`
- [ ] Test count: 10+ tests pass

**Tests**: integration
**Gate**: full

**Commit**: `fix(players): refresh the squad list after deleting a player`

---

### T3: Refresh the squad after an add, and guard the add control

**What**: Await the popup close path on `Teams.jsx` and disable Add-player when no team is selected.
**Where**: `src/pages/Teams.jsx` (modify)
**Depends on**: T1
**Reuses**: The disabled-with-title pattern in `Trainings.jsx:141-148`
**Requirement**: PREF-04, PREF-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A newly added player appears in the list with no page reload (AC PREF-04.2)
- [ ] An edited player's new values appear in both the list and the open player card (AC PREF-04.3)
- [ ] The refresh runs after the write resolves — assert with a deferred-promise spy (AC PREF-03.1)
- [ ] The Add-player control is disabled with an explanatory `title` when `selectedTeam` is null (AC PREF-05)
- [ ] Adding a player to a team other than the selected one leaves the selected team's list unchanged (edge case)
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 8+ tests pass

**Tests**: integration
**Gate**: build

**Commit**: `fix(players): refresh the squad list after adding a player`

---

## Phase Execution Map

```
Phase 1:  T1 ──→ T2 ──→ T3
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Await writes in the popup | 1 component | ✅ Granular |
| T2: Delete refresh | 1 component + its only caller | ⚠️ OK — a new prop and its single caller; splitting ships a dead prop |
| T3: Add refresh + guard | 1 page | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | None | T1 → T2 | ✅ Sequential for commit hygiene, not data dependency |
| T3 | T1 | T2 → T3 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Component | component | component | ✅ OK |
| T2 | Component + Page | integration (highest) | integration | ✅ OK |
| T3 | Page | integration | integration | ✅ OK |
