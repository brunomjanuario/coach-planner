# Settings Tabs Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/23-settings-tabs/spec.md`
**Design**: not required
**Status**: Complete
**Batches**: 3 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. `src/pages/Settings.jsx` has no test file today; T1 creates one.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Components (`src/components/*.jsx`) | component | Selection, keyboard movement, ARIA wiring | `src/components/__tests__/*.test.jsx` | `npm test` |
| Pages (`src/pages/*.jsx`) | integration | Tab routing + reset behaviour preserved | `src/pages/__tests__/*.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After component-only tasks | `npx vitest run <path/to/file.test.jsx>` |
| Full | After tasks touching the page | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Tabs

```
T1 → T2 → T3
```

---

## Task Breakdown

### T1: Add the tab strip

**What**: An accessible two-tab control.
**Where**: `src/components/Tabs.jsx` (new), `src/components/__tests__/Tabs.test.jsx` (new)
**Depends on**: None
**Reuses**: The focusable-control conventions from `SelectableListItem` (`02`)
**Requirement**: SETT-01, SETT-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `Tabs({ tabs, active, onChange })` renders a `role="tablist"` with one `role="tab"` per entry (AC SETT-01.1)
- [x] Only the active tab carries `aria-selected="true"` (AC SETT-01.4) — assert the inactive one is `false`, not merely absent
- [x] Exactly one `role="tabpanel"` is in the document (AC SETT-01.5)
- [x] The active tab's panel is wired to it via `aria-controls`/`aria-labelledby`
- [x] Left/Right arrow keys move focus between tabs and wrap at the ends (AC SETT-05.4) — assert wrapping in both directions
- [x] A visible focus indicator class is present (AC SETT-05.5)
- [x] Clicking a tab calls `onChange` with that tab's id and does not change state on its own — the parent owns the state
- [x] The strip stays reachable at a narrow width (edge case)
- [x] Gate passes: `npx vitest run src/components/__tests__/Tabs.test.jsx`
- [x] Test count: 12+ tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(settings): add an accessible tab strip`

---

### T2: Split the settings page into Profile and Advanced

**What**: Two panels; the reset action moves into Advanced verbatim.
**Where**: `src/pages/Settings.jsx` (modify), `src/pages/__tests__/Settings.test.jsx` (new)
**Depends on**: T1
**Reuses**: `Tabs`; the existing reset button and `ConfirmationPopup` wiring, moved without edits
**Requirement**: SETT-01, SETT-02, SETT-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] The page opens on Profile and the reset button is **not** in the document (AC SETT-01.2) — assert absence, which is the security property of the change
- [x] The Profile panel shows the signed-in user's name and email read-only, from `useAuth` (AC SETT-03)
- [x] The Advanced panel holds the reset action with a sentence explaining what it does (AC SETT-02.1, SETT-02.5)
- [x] Reset still confirms, still clears and re-seeds, still does nothing on cancel (AC SETT-02.2–SETT-02.4) — port the behaviour into the new test file, since none exists today
- [x] After a reset the page stays on Advanced (edge case)
- [x] Switching tabs shows one panel and hides the other (AC SETT-01.3)
- [x] Gate passes: `npm test`
- [x] Test count: 12+ tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(settings): split settings into Profile and Advanced tabs`

---

### T3: Make the active tab linkable

**What**: `?tab=` in the URL, in both directions.
**Where**: `src/pages/Settings.jsx` (modify)
**Depends on**: T2
**Reuses**: `useSearchParams` from React Router — the same query-param approach `useDeepLinkPopup` uses
**Requirement**: SETT-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `/settings?tab=advanced` opens the Advanced panel (AC SETT-04.1)
- [x] Selecting a tab updates the URL with no page reload (AC SETT-04.2)
- [x] An unrecognised tab value falls back to Profile without an error (AC SETT-04.3) — assert with a junk value, not just a missing one
- [x] A missing `tab` param opens Profile
- [x] Reopening the page with the same URL restores the same tab (edge case)
- [x] Gate passes: `npm run lint && npm run build && npm test`
- [x] Test count: 8+ tests pass

**Tests**: integration
**Gate**: build

**Commit**: `feat(settings): make the active settings tab linkable`

---

## Phase Execution Map

```
Phase 1:  T1 ──→ T2 ──→ T3
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Tab strip | 1 new component | ✅ Granular |
| T2: Page split | 1 page, one structural change | ✅ Granular |
| T3: URL sync | 1 page, one concern | ✅ Granular |

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
| T1 | Component | component | component | ✅ OK |
| T2 | Page | integration | integration | ✅ OK |
| T3 | Page | integration | integration | ✅ OK |
