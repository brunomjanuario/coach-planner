# Settings Tabs Polish Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/31-settings-tabs-polish/spec.md`
**Design**: not required
**Status**: Not started
**Batches**: 3 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> Colour and layout cannot be measured in jsdom. Every visual AC is asserted as
> **which classes each state renders**, and the contrast claim is hand-verified
> once and recorded in the component doc comment.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Components (`src/components/Tabs.jsx`) | component | Active/inactive class sets, equal font weight, focus ring on both states, all `23` ARIA + keyboard ACs re-asserted | `src/components/__tests__/Tabs.test.jsx` | `npm test` |
| Pages (`src/pages/Settings.jsx`) | integration | `?tab=` allow-list guard proven independently | `src/pages/__tests__/Settings.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After component-only tasks | `npx vitest run src/components/__tests__/Tabs.test.jsx` |
| Full | After tasks touching the page | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Restyle and re-prove

```
T1 → T2 → T3
```

---

## Task Breakdown

### T1: Restyle the tab strip as a segmented control

**What**: A filled track with a lifted active pill, replacing the hairline underline.
**Where**: `src/components/Tabs.jsx` (modify), `src/components/__tests__/Tabs.test.jsx` (modify)
**Depends on**: None
**Reuses**: The component's entire behaviour — only its class strings change. `Tile`'s focus-ring convention
**Requirement**: TABUI-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The strip renders a background and radius class and no longer uses `border-b-2` as the selected indicator (AC TABUI-01.1) — assert the absence, since keeping both would leave the hairline
- [ ] The active tab carries the pill class set; the inactive tab does not (AC TABUI-01.2, TABUI-01.3)
- [ ] Switching the active tab swaps those class sets — asserted in one test that renders, switches and re-checks, not two independent renders
- [ ] Neither state carries `font-semibold`, so no tab's width changes on select (AC TABUI-01.4)
- [ ] The focus-ring class is present on both the active and the inactive tab (AC TABUI-01.5) — assert both; a ring that vanishes on the active pill is the likely regression
- [ ] The inactive tab carries a hover class (AC TABUI-01.3)
- [ ] The stray blank line inside the `tablist` element is removed
- [ ] A long label does not force truncation and the strip keeps its horizontal-scroll class (edge case)
- [ ] The doc comment records the hand-verified contrast ratios for both states
- [ ] Gate passes: `npx vitest run src/components/__tests__/Tabs.test.jsx`
- [ ] Test count: 10+ tests pass

**Tests**: component
**Gate**: quick

**Commit**: `style(settings): make the tab strip a segmented control`

---

### T2: Re-prove every behaviour `23` shipped

**What**: Re-assert the ARIA and keyboard contract against the restyled component, rather than trusting that a class change could not break it.
**Where**: `src/components/__tests__/Tabs.test.jsx` (modify)
**Depends on**: T1
**Reuses**: `23`'s own ACs (SETT-01, SETT-05) as the checklist
**Requirement**: TABUI-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `role="tablist"`, one `role="tab"` per entry, exactly one `role="tabpanel"` in the document (AC TABUI-02.1)
- [ ] The active tab alone is `aria-selected="true"` and the inactive one is explicitly `"false"`, not absent (AC TABUI-02.2)
- [ ] Left/Right move focus and wrap in **both** directions (AC TABUI-02.3)
- [ ] Inactive tabs carry `tabIndex={-1}` so the strip is one tab stop (AC TABUI-02.4)
- [ ] Clicking calls `onChange` with the tab id and the component holds no state of its own (AC TABUI-02.5)
- [ ] A single-tab strip renders it active and survives an arrow press (edge case)
- [ ] Gate passes: `npx vitest run src/components/__tests__/Tabs.test.jsx`
- [ ] Test count: 12+ tests pass

**Tests**: component
**Gate**: quick

**Commit**: `test(settings): re-prove the tab contract after the restyle`

---

### T3: Close `23`'s `?tab=` test-strength gap

**What**: Make `Settings.jsx`'s own allow-list load-bearing in the suite, closing the item carried in STATE.md's Handoff.
**Where**: `src/pages/Settings.jsx` (modify only if needed), `src/pages/__tests__/Settings.test.jsx` (modify)
**Depends on**: T2
**Reuses**: The existing `?tab=` tests as the starting point
**Requirement**: TABUI-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Removing `TAB_IDS.includes(tabParam) ? tabParam : "profile"` from `Settings.jsx` makes at least one test fail — **perform the mutation, observe the red, revert it**, and record the failing test's name in the commit body (AC TABUI-03.1)
- [ ] An unrecognised `?tab=` value still renders the Profile panel (AC TABUI-03.2)
- [ ] A missing `?tab=` still renders Profile
- [ ] `/settings?tab=advanced` still renders Advanced, and selecting a tab still updates the URL without a reload
- [ ] STATE.md's carried-forward open item (2) is marked resolved in the Handoff
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 6+ tests pass

**Tests**: integration
**Gate**: build

**Commit**: `test(settings): make the tab allow-list load-bearing`

---

## Phase Execution Map

```
Phase 1:  T1 ──→ T2 ──→ T3
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Restyle | 1 component, class strings only | ✅ Granular |
| T2: Re-prove contract | tests only | ✅ Granular |
| T3: Close the `23` gap | 1 page test, one guard | ✅ Granular |

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
| T2 | Component | component | component | ✅ OK |
| T3 | Page | integration | integration | ✅ OK |
