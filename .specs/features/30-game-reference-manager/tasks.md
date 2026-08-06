# Game Reference Manager Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/30-game-reference-manager/spec.md`
**Design**: not required — the one modelling question (UI merge vs. foreign key) is settled in the spec's Assumptions table against AD-010
**Status**: Not started
**Batches**: 5 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> This is a consolidation, so the coverage bar is *no loss*. `20`'s and `21`'s
> existing assertions are ported before anything is deleted — the old test files
> are the specification of what must survive.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Components (`src/components/ReferenceListManager.jsx`) | component | Add, rename, delete-with-count, errors, empty state — parameterised over both nouns | `src/components/__tests__/ReferenceListManager.test.jsx` | `npm test` |
| Components (`src/components/ReferenceListsPopup.jsx`) | component | Tabs, default tab, panel isolation, cross-tab state reset | `src/components/__tests__/ReferenceListsPopup.test.jsx` | `npm test` |
| Components (`src/components/GameSavePopup.jsx`) | component | "Add new…" opens the right tab; auto-select on close; untouched-close | `src/components/__tests__/GameSavePopup.test.jsx` | `npm test` |
| Pages (`src/pages/Games.jsx`) | integration | One button, popup opens, games re-read on close | `src/pages/__tests__/Games.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After component-only tasks | `npx vitest run <path/to/file.test.jsx>` |
| Full | After tasks touching the page or the game form | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Extract

```
T1 → T2
```

### Phase 2: Adopt and retire

```
T2 → T3 → T4 → T5
```

---

## Task Breakdown

### T1: Extract the shared list manager

**What**: One component holding the add/rename/delete flow that `OpponentsPopup` and `CompetitionsPopup` each implement separately.
**Where**: `src/components/ReferenceListManager.jsx` (new), `src/components/__tests__/ReferenceListManager.test.jsx` (new)
**Depends on**: None
**Reuses**: The body of `OpponentsPopup.jsx:104-223` verbatim where possible — this is an extraction, not a rewrite. `Button`/`PopupActions` from `27`
**Requirement**: GREF-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `ReferenceListManager({ items, nouns, onCreate, onRename, onDelete, usageCount })` renders the list, the add form and the per-row rename/delete controls
- [ ] Adding a name calls `onCreate` and the rendered list reflects the result (AC GREF-02.1)
- [ ] A rejected create renders the thrown error's message and creates nothing (AC GREF-02.2) — assert the absence of a new row, not only the message
- [ ] A rename calls `onRename` and leaves edit mode; a rejected one keeps edit mode and shows its error (AC GREF-02.3)
- [ ] Requesting a delete shows a confirmation quoting `usageCount`, with correct singular *and* plural wording (AC GREF-02.4) — assert both, at counts 1 and 2
- [ ] Cancelling a delete removes nothing (AC GREF-02.5)
- [ ] An empty list renders the `nouns`-derived empty message (AC GREF-02.6)
- [ ] Row controls keep their `aria-label`s (`Rename X`, `Delete X`)
- [ ] The component is asserted with **both** noun sets, so a hard-coded "opponent" fails the test
- [ ] Gate passes: `npx vitest run src/components/__tests__/ReferenceListManager.test.jsx`
- [ ] Test count: 18+ tests pass

**Tests**: component
**Gate**: quick

**Commit**: `refactor(games): extract the shared reference-list manager`

---

### T2: Host both lists in one tabbed popup

**What**: The merged popup, wiring each tab's manager to its own service.
**Where**: `src/components/ReferenceListsPopup.jsx` (new), `src/components/__tests__/ReferenceListsPopup.test.jsx` (new)
**Depends on**: T1
**Reuses**: `Tabs` from `23` (ARIA and keyboard already tested there), `PopupShell` (AD-009), `opponentService`/`competitionService`, the games-usage counting from both old popups
**Requirement**: GREF-01, GREF-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The popup renders an Opponents tab and a Competitions tab with Opponents active by default (AC GREF-01.2)
- [ ] Selecting Competitions renders the competitions list and removes the opponents list from the document (AC GREF-01.3) — assert the removal, since a hidden-but-mounted panel would pass a presence-only test
- [ ] An `initialTab` prop opens the popup on the named tab (AC GREF-03.1, GREF-03.2)
- [ ] It renders through `PopupShell`, capping at 85vh with only the body scrolling (AC GREF-01.4)
- [ ] Each tab counts *its own* usage when deleting — an opponent's count comes from `game.opponent`, a competition's from `game.competition` (AC GREF-02.4)
- [ ] Switching tabs with a delete confirmation open closes the confirmation (edge case)
- [ ] Switching tabs with a rename in progress discards that edit (edge case)
- [ ] A name present in both lists is managed independently on each tab (edge case)
- [ ] Gate passes: `npx vitest run src/components/__tests__/ReferenceListsPopup.test.jsx`
- [ ] Test count: 14+ tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(games): manage opponents and competitions in one popup`

---

### T3: Collapse the Games header to one button

**What**: Two header buttons become one; the page opens the merged popup.
**Where**: `src/pages/Games.jsx` (modify), `src/pages/__tests__/Games.test.jsx` (modify)
**Depends on**: T2
**Reuses**: The existing on-close handler that re-reads games after a manager closes
**Requirement**: GREF-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The header renders one "Manage lists" button (AC GREF-01.1)
- [ ] Neither a "Competitions" nor an "Opponents" button remains (AC GREF-01.1) — assert both absences; this is the observable half of the merge
- [ ] Activating it opens the merged popup on the Opponents tab (AC GREF-01.2)
- [ ] Closing it re-reads the page's games, as both old handlers did (AC GREF-01.5)
- [ ] Gate passes: `npm test`
- [ ] Test count: 6+ tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(games): replace two list buttons with one manager`

---

### T4: Point the game form's "Add new…" at the merged popup

**What**: Both select shortcuts open the one popup, on the right tab, preserving `22`'s auto-select.
**Where**: `src/components/GameSavePopup.jsx` (modify), `src/components/__tests__/GameSavePopup.test.jsx` (modify)
**Depends on**: T3
**Reuses**: The existing `handleCloseOpponentsManager`/`handleCloseCompetitionsManager` diff-and-select logic, merged into one close handler that runs both diffs
**Requirement**: GREF-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] "Add new…" on Opponent opens the popup with the Opponents tab active (AC GREF-03.1)
- [ ] "Add new…" on Competition opens it with the Competitions tab active (AC GREF-03.2)
- [ ] A name added while open becomes the matching field's selected value on close (AC GREF-03.3)
- [ ] Closing with nothing added leaves **both** fields unchanged (AC GREF-03.4) — assert opponent and competition, the exact gap `22`'s Verifier caught the first time
- [ ] Adding one of each in a single visit updates both fields (AC GREF-03.5)
- [ ] The game form stays mounted behind the popup (edge case)
- [ ] Gate passes: `npm test`
- [ ] Test count: 10+ tests pass

**Tests**: component
**Gate**: full

**Commit**: `feat(games): open the merged manager from the game form`

---

### T5: Retire the two old popups

**What**: Delete `OpponentsPopup` and `CompetitionsPopup` and their now-duplicated tests, only after every assertion has a home.
**Where**: `src/components/OpponentsPopup.jsx`, `src/components/CompetitionsPopup.jsx`, `src/components/__tests__/OpponentsPopup.test.jsx`, `src/components/__tests__/CompetitionsPopup.test.jsx` (delete)
**Depends on**: T4
**Reuses**: Nothing — this is the removal step
**Requirement**: GREF-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Every behavioural assertion in the two deleted test files has an equivalent in `ReferenceListManager.test.jsx` or `ReferenceListsPopup.test.jsx` — **audit this file by file before deleting**, and record the mapping in the commit body
- [ ] No source file imports either deleted component
- [ ] The total test count after deletion is not lower than before this feature started
- [ ] Gate passes: `npm run lint && npm run build && npm test`

**Tests**: n/a (removal; the gate is the whole suite)
**Gate**: build

**Commit**: `refactor(games): remove the superseded list popups`

---

## Phase Execution Map

```
Phase 1:  T1 ──→ T2
                  │
Phase 2:          └──→ T3 ──→ T4 ──→ T5
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Extract manager | 1 new component, mechanical extraction | ✅ Granular |
| T2: Tabbed popup | 1 new component | ✅ Granular |
| T3: Games header | 1 page, one control | ✅ Granular |
| T4: Game form wiring | 1 component, one handler | ✅ Granular |
| T5: Deletion | 4 files removed | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Component | component | component | ✅ OK |
| T2 | Component | component | component | ✅ OK |
| T3 | Page | integration | integration | ✅ OK |
| T4 | Component | component | component | ✅ OK |
| T5 | Removal | full-suite gate | full-suite gate | ✅ OK |
