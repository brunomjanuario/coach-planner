# Popup Button System Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/27-popup-button-system/spec.md`
**Design**: not required
**Status**: Not started
**Batches**: 5 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> Colour *contrast* cannot be measured in jsdom. Tests assert which classes each
> variant renders and that the offending pair is absent; the 4.5:1 claim is
> hand-verified once at T1 and recorded in the component doc comment.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Components (`src/components/Button.jsx`) | component | Every variant, disabled, type/form forwarding, unknown-variant fallback | `src/components/__tests__/Button.test.jsx` | `npm test` |
| Components (`src/components/PopupActions.jsx`) | component | Ordering, single row, wrapping class, absent-destructive case | `src/components/__tests__/PopupActions.test.jsx` | `npm test` |
| Components (migrated popups) | component | Existing behaviour unchanged + new variant assertions | `src/components/__tests__/*Popup.test.jsx` | `npm test` |
| Source tree | lint-style guard | `bg-gray-300 text-white` appears zero times | asserted in `Button.test.jsx` via a source read | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After component-only tasks | `npx vitest run <path/to/file.test.jsx>` |
| Full | After migration tasks | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: The primitives

```
T1 → T2
```

### Phase 2: Migration

```
T2 → T3 → T4 → T5
```

---

## Task Breakdown

### T1: Build the Button component

**What**: One button with four variants, a focus ring, a disabled state and prop forwarding.
**Where**: `src/components/Button.jsx` (new), `src/components/__tests__/Button.test.jsx` (new)
**Depends on**: None
**Reuses**: The `focus:outline-2 focus:outline-blue-500` convention already in `Tile.jsx` and `Tabs.jsx`
**Requirement**: BTN-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `variant="secondary"` renders dark text on a light background with a border, and does **not** render `bg-gray-300` or `text-white` (AC BTN-01.1) — assert the absence, which is the actual bug
- [ ] `primary`, `danger` and `ghost` each render their own distinct background/text class set (AC BTN-01.1)
- [ ] Every variant carries a `focus-visible` outline class (AC BTN-01.2)
- [ ] `disabled` renders a reduced-opacity and `cursor-not-allowed` class **and** the click handler does not fire (AC BTN-01.3) — assert the handler, not only the class
- [ ] `type` defaults to `"button"` and is forwarded when given (AC BTN-01.4)
- [ ] `form` is forwarded so `<Button type="submit" form={id}>` submits a detached form (AC BTN-01.5)
- [ ] An unrecognised `variant` falls back to `secondary` rather than rendering unstyled (edge case) — assert with a junk value
- [ ] A long label is not truncated (no `truncate`/`whitespace-nowrap` class) (edge case)
- [ ] The doc comment records the hand-verified contrast ratio for each variant, since the suite cannot check it
- [ ] Gate passes: `npx vitest run src/components/__tests__/Button.test.jsx`
- [ ] Test count: 14+ tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(ui): add a shared Button with readable variants`

---

### T2: Build the PopupActions row

**What**: The action row owning order, gap and wrapping so eleven popups stop deciding it individually.
**Where**: `src/components/PopupActions.jsx` (new), `src/components/__tests__/PopupActions.test.jsx` (new)
**Depends on**: T1
**Reuses**: `PopupShell`'s `footer` slot — `PopupActions` is what goes in it
**Requirement**: BTN-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `<PopupActions destructive={…}>` puts destructive content on the left and the rest right-aligned in one flex row (AC BTN-02.1)
- [ ] With no destructive content the row renders no empty left slot and no gap (edge case) — assert the DOM, not just the visual
- [ ] The row carries a wrapping class so it reflows instead of overflowing (AC BTN-02.5)
- [ ] A single "Close" child renders right-aligned and not stretched (edge case)
- [ ] Gate passes: `npx vitest run src/components/__tests__/PopupActions.test.jsx`
- [ ] Test count: 6+ tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(ui): add a shared popup action row`

---

### T3: Restyle the Games popups

**What**: `GameResultPopup`'s five-button, two-row, five-colour footer becomes one row with one destructive weight; `GameSavePopup` follows.
**Where**: `src/components/GameResultPopup.jsx`, `src/components/GameSavePopup.jsx` (modify), their `__tests__` files (modify)
**Depends on**: T2
**Reuses**: `Button`, `PopupActions`
**Requirement**: BTN-02, BTN-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] "Clear Result" and "Delete Game" both render as `danger` in **one** action row; the footer contains exactly one row element (AC BTN-02.2) — assert the row count, since the defect was the second row
- [ ] Neither `bg-red-800` nor a second red shade remains (AC BTN-02.2)
- [ ] "Rate squad" renders `secondary` and carries no green background class (AC BTN-02.3)
- [ ] With no saved result, the destructive slot holds only "Delete Game" and leaves no gap (edge case)
- [ ] `GameSavePopup`'s Cancel/Save row uses `secondary`/`primary`, and Save still submits the detached form by `form` id (AC BTN-01.5)
- [ ] Every existing `GameResultPopup` and `GameSavePopup` test passes with no behavioural edit — same labels, same handlers (AC BTN-04.2)
- [ ] Gate passes: `npm test`
- [ ] Test count: 10+ tests pass

**Tests**: component
**Gate**: full

**Commit**: `fix(games): give the game popups one coherent action row`

---

### T4: Migrate the remaining nine popups

**What**: `TrainingDetailsPopup`, `TrainingSavePopup`, `ExerciseFields`, `TeamPopup`, `PlayerPopup`, `SquadRatingPopup`, `RivalRowPopup`, `OpponentsPopup`, `CompetitionsPopup`, `ConfirmationPopup`.
**Where**: those ten files (modify), their `__tests__` files (modify)
**Depends on**: T3
**Reuses**: `Button`, `PopupActions`
**Requirement**: BTN-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `TrainingDetailsPopup` renders Delete as `danger`, Edit as `primary`, Close and "Rate squad" as `secondary` (AC BTN-02.4) — assert all four, since this popup had four colours
- [ ] Every footer action button in all ten files is a `Button` (AC BTN-04.1)
- [ ] `ConfirmationPopup`'s confirm button is `danger` and its cancel is `secondary` — it is the last line before a destructive action, so its own contrast matters most
- [ ] The managers' inline rename Save/Cancel buttons are migrated too, not just the footer ones (they are the same grey-on-white pair)
- [ ] Every existing test in all ten files passes with no behavioural edit (AC BTN-04.2)
- [ ] Gate passes: `npm test`
- [ ] Test count: the full suite passes with no net loss

**Tests**: component
**Gate**: full

**Commit**: `refactor(ui): migrate every popup to the shared Button`

---

### T5: Close the door on the old style

**What**: A test that fails if the grey-on-white pair ever comes back.
**Where**: `src/components/__tests__/Button.test.jsx` (modify)
**Depends on**: T4
**Reuses**: Node's `fs` in the test, the same way a lint-style guard would
**Requirement**: BTN-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A test reads every `.jsx` under `src/` and asserts `bg-gray-300 text-white` appears zero times (AC BTN-01.6)
- [ ] The test names the offending file(s) in its failure message, so a future regression is one line to diagnose
- [ ] The guard is verified to actually fail by temporarily reintroducing the pair during implementation (record this in the commit body — the suite cannot prove a guard works without seeing it go red once)
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 1+ test passes

**Tests**: component
**Gate**: build

**Commit**: `test(ui): guard against the grey-on-white button returning`

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
| T1: Button | 1 new component | ✅ Granular |
| T2: PopupActions | 1 new component | ✅ Granular |
| T3: Games popups | 2 files, the reported defect | ✅ Granular |
| T4: Remaining popups | 10 files, one mechanical substitution each | ✅ Granular |
| T5: Regression guard | 1 test | ✅ Granular |

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
| T3 | Components | component | component | ✅ OK |
| T4 | Components | component | component | ✅ OK |
| T5 | Source guard | component | component | ✅ OK |
