# Dashboard Tile Lists Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/25-dashboard-tile-lists/spec.md`
**Design**: not required — the two modelling questions (what a click does, where the row data comes from) are settled in the spec's Assumptions table
**Status**: Not started
**Batches**: 6 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Lib (`src/lib/dashboardStats.js`) | unit | Row selection, upcoming/past fallback, overflow arithmetic, ordering | `src/lib/__tests__/dashboardStats.test.js` | `npm test` |
| Components (`src/components/ListTile.jsx`) | component | Rows, count, overflow indicator, empty and loading variants, focus | `src/components/__tests__/ListTile.test.jsx` | `npm test` |
| Pages (`src/pages/Home.jsx`) | integration | Wiring, team-filter scoping, navigation targets | `src/pages/__tests__/Home.test.jsx` | `npm test` |
| Pages (`src/pages/Teams.jsx`) | integration | `?team=` in both directions, unknown id, absent param | `src/pages/__tests__/Teams.test.jsx` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After lib- or component-only tasks | `npx vitest run <path/to/file.test.js(x)>` |
| Full | After tasks touching pages | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Data and surface

```
T1 → T2
```

### Phase 2: Wiring

```
T2 → T3 → T4 → T5 → T6
```

---

## Task Breakdown

### T1: Pick the rows a tile shows

**What**: Pure selectors that turn a collection into `{ entries, overflow, basis }`, where `basis` is `"upcoming"` or `"past"`.
**Where**: `src/lib/dashboardStats.js` (modify), `src/lib/__tests__/dashboardStats.test.js` (modify)
**Depends on**: None
**Reuses**: The `{ entries, overflow }` shape the ranking functions already return, so `ListTile` and `LeaderTile` consume the same contract
**Requirement**: DTILE-01, DTILE-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `teamRows(teams, limit)` returns up to `limit` teams ordered alphabetically by `club name`, case-insensitively (AC DTILE-01.1)
- [ ] `upcomingRows(records, now, limit)` returns the soonest-first upcoming records with `basis: "upcoming"` (AC DTILE-01.2, DTILE-01.3)
- [ ] With zero upcoming records it returns the most recent past records with `basis: "past"` (edge case) — assert the `basis` value, not only the entries
- [ ] With neither, it returns zero entries and `overflow: 0` so the caller renders an empty state, never a "+0 more" (edge case)
- [ ] `overflow` equals total minus rows returned, and is `0` when the total is exactly `limit` (AC DTILE-01.4, edge case)
- [ ] Records with an unparseable or missing date are excluded rather than sorted arbitrarily
- [ ] Gate passes: `npx vitest run src/lib/__tests__/dashboardStats.test.js`
- [ ] Test count: 14+ tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(dashboard): select the records a tile lists`

---

### T2: Build the ListTile

**What**: A tile that renders a count, up to N linked rows, an overflow indicator and the existing empty/loading states.
**Where**: `src/components/ListTile.jsx` (new), `src/components/__tests__/ListTile.test.jsx` (new)
**Depends on**: T1
**Reuses**: `Tile` for the surface (AD from `18`), `LeaderTile`'s entries/overflow contract, `StatTile`'s empty-state and skeleton markup
**Requirement**: DTILE-01, DTILE-02, DTILE-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Renders the count in the label row **and** the rows beneath it (AC DTILE-01.1) — assert both, since "not *just* a count" means the count stays
- [ ] Renders at most `limit` rows and a "+N more" indicator whose N is the given overflow (AC DTILE-01.4)
- [ ] Renders no indicator when overflow is 0 (edge case)
- [ ] Each row is a `Link` carrying a visible focus class and activating on Enter (AC DTILE-03.4)
- [ ] With zero entries it renders the empty label and its `emptyHref` link, matching `StatTile`'s existing markup (AC DTILE-01.5)
- [ ] While `loading` it renders the same skeleton height as `StatTile`'s, so the grid does not jump (edge case) — assert the skeleton class, which is what the suite can actually check
- [ ] A `basis: "past"` tile renders a "most recent" note; an `"upcoming"` one does not (edge case)
- [ ] A long row label wraps and carries no truncation class (edge case)
- [ ] Gate passes: `npx vitest run src/components/__tests__/ListTile.test.jsx`
- [ ] Test count: 14+ tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(dashboard): add a tile that lists its records`

---

### T3: Add the `?team=` deep link to the Teams page

**What**: The one destination that cannot yet be linked to.
**Where**: `src/pages/Teams.jsx` (modify), `src/pages/__tests__/Teams.test.jsx` (modify)
**Depends on**: T2
**Reuses**: `useSearchParams`, exactly as `src/pages/Settings.jsx:204-214` does for `?tab=`
**Requirement**: DTILE-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `/teams?team=<id>` opens with that team selected and its players listed (AC DTILE-04.1)
- [ ] Selecting a team updates the URL to `?team=<id>` with no reload (AC DTILE-04.2)
- [ ] An unknown id opens with no team selected and throws nothing (AC DTILE-04.3) — assert with a junk id, not just a missing param
- [ ] With no `?team=` the page behaves exactly as before (AC DTILE-04.4) — the existing tests must pass unedited
- [ ] Deleting the selected team clears the param rather than leaving a dangling one
- [ ] Gate passes: `npm test`
- [ ] Test count: 8+ tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(teams): make the selected team linkable`

---

### T4: Turn the Teams tile into a list

**What**: The first Overview tile switches from `StatTile` to `ListTile`.
**Where**: `src/pages/Home.jsx` (modify), `src/pages/__tests__/Home.test.jsx` (modify)
**Depends on**: T3
**Reuses**: `teamRows` from T1, `ListTile` from T2, the `?team=` link from T3
**Requirement**: DTILE-01, DTILE-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] With 5 teams the tile shows 3 rows and "+2 more" (AC DTILE-01.1, DTILE-01.4)
- [ ] Clicking a row navigates to `/teams?team=<id>` and that team is selected on arrival (AC DTILE-03.1) — assert the destination state, not only the href
- [ ] With a team filter active the tile lists only that team, matching its count of 1 (AC DTILE-01.6)
- [ ] With no teams the existing empty state and "Add one" link render unchanged (AC DTILE-01.5)
- [ ] Gate passes: `npm test`
- [ ] Test count: 8+ tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(dashboard): list teams on the Teams tile`

---

### T5: Turn the Trainings and Games tiles into lists

**What**: The two remaining count tiles, including the upcoming/past fallback.
**Where**: `src/pages/Home.jsx` (modify), `src/pages/__tests__/Home.test.jsx` (modify)
**Depends on**: T4
**Reuses**: `upcomingRows` from T1; the `?training=` and `?game=` params already handled by `useDeepLinkPopup`
**Requirement**: DTILE-01, DTILE-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The Trainings tile lists up to 3 upcoming trainings, soonest first, each with number and date (AC DTILE-01.2)
- [ ] A training with no number renders its date alone, not "Training #undefined" (edge case)
- [ ] The Games tile lists up to 3 upcoming games, soonest first, each with opponent and date (AC DTILE-01.3)
- [ ] With no upcoming records, each tile shows the most recent past ones and a "most recent" note (edge case) — one test per tile, both bases asserted
- [ ] Clicking a training row lands on `/trainings?training=<id>` with the details popup open (AC DTILE-03.2)
- [ ] Clicking a game row lands on `/games?game=<id>` with the game popup open (AC DTILE-03.3)
- [ ] Both tiles keep their existing breakdown line (`past · upcoming`, `played · upcoming`) (AC DTILE-02)
- [ ] Both tiles' rows respect the active team filter (AC DTILE-01.6)
- [ ] Gate passes: `npm test`
- [ ] Test count: 14+ tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(dashboard): list trainings and games on their tiles`

---

### T6: Prove the deleted-record path

**What**: A row pointing at a record deleted since load must land softly.
**Where**: `src/pages/__tests__/Home.test.jsx`, `src/pages/__tests__/Trainings.test.jsx` (modify)
**Depends on**: T5
**Reuses**: The existing `deepLinkNotFound` message on Trainings and Games
**Requirement**: DTILE-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Navigating to `?training=<deleted id>` shows "That training no longer exists." and no error (AC DTILE-03.5)
- [ ] Navigating to `?game=<deleted id>` shows the equivalent games message (AC DTILE-03.5)
- [ ] A tile does not render a row for a record its own collection no longer contains (Assumptions: dangling references)
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 5+ tests pass

**Tests**: integration
**Gate**: build

**Commit**: `test(dashboard): cover deleted records behind tile rows`

---

## Phase Execution Map

```
Phase 1:  T1 ──→ T2
                  │
Phase 2:          └──→ T3 ──→ T4 ──→ T5 ──→ T6
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Row selectors | 1 lib module, pure functions | ✅ Granular |
| T2: ListTile | 1 new component | ✅ Granular |
| T3: Teams deep link | 1 page, one concern | ✅ Granular |
| T4: Teams tile | 1 tile | ✅ Granular |
| T5: Trainings + Games tiles | 2 tiles, one shared selector | ✅ Granular |
| T6: Deleted-record path | tests only | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Lib | unit | unit | ✅ OK |
| T2 | Component | component | component | ✅ OK |
| T3 | Page | integration | integration | ✅ OK |
| T4 | Page | integration | integration | ✅ OK |
| T5 | Page | integration | integration | ✅ OK |
| T6 | Pages | integration | integration | ✅ OK |
