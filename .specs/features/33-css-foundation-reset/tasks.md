# CSS Foundation Reset Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/33-css-foundation-reset/design.md`
**Status**: Approved
**Batches**: 6 tasks → 1 batch, execute inline (no sub-agents)

---

## Test Coverage Matrix

> Generated from codebase sampling (`CLAUDE.md`, `docs/`, existing `*.test.jsx`/`*.test.js` files — no dedicated testing-standards doc found beyond `CLAUDE.md`'s command list). Guidelines found: none beyond repo convention — strong defaults applied, floored against existing test depth for the same layers.
>
> **Structural exception, stated once here rather than per-task:** this feature's actual defect (a CSS cascade result) is not observable in jsdom, which does not apply the real stylesheet cascade — confirmed during design research and the direct cause the bug shipped past 1413 passing tests. Every task below therefore pairs its Vitest coverage (class-string presence — the ceiling jsdom allows) with a **required real-browser verification step** in "Done when", using the Browser pane tool per this session's `<preview_tools>` instructions. Class-string tests alone are Test Adequacy Review "shallow" — the browser check is what actually proves the rendered pixel.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Global CSS (`src/index.css`) | static/source (Vitest, text-based) | No bare element selector outside `@layer`; guard test proven against the exact original defect | `src/lib/__tests__/cssFoundation.test.js` | `npm test` |
| Components (`App.jsx`, `Sidebar.jsx`, `Tile.jsx`, `NextGameCard.jsx`, `StatTile.jsx`, `ListTile.jsx`, `SquadRanking.jsx`, `Settings.jsx`, `PlayerRatingHistory.jsx`) | component | Every changed class string asserted; existing tests updated where they asserted the old (now-replaced) class, per the same discipline `31-settings-tabs-polish` used for its restyle | `src/components/__tests__/*.test.jsx`, `src/pages/__tests__/*.test.jsx`, `src/__tests__/App.test.jsx` | `npm test` |

**Coverage Expectation values used**: Global CSS is an entity/config-layer artifact (strong default: build gate + the one guard test this feature specifically adds, since jsdom cannot exercise a real gate here). Components follow this repo's existing floor — every class-string change gets a citing assertion, matching how `31-settings-tabs-polish` proved its own restyle.

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After a single component-only task | `npx vitest run <path/to/file.test.jsx>` |
| Full | After tasks touching multiple components or a page | `npm test` |
| Build | After phase completion, and after T1 (global CSS + app root) | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: The reset itself

```
T1 → T2
```

### Phase 2: Everything that depended on the scaffold

```
T3 → T4
```

### Phase 3: Guard and documentation

```
T5 → T6
```

---

## Task Breakdown

### T1: Delete the scaffold CSS; give the app root its one explicit background/text pair

**What**: Remove every unlayered/scaffold rule from `src/index.css` (`h1` size override, `:root`'s color/background + `color-scheme`, the `prefers-color-scheme: light` block, the `@layer base { button {...} }` block). Add `bg-neutral-950 text-gray-100` to `App.jsx`'s authenticated wrapper div, replacing the removed `:root` values via explicit Tailwind utilities and ordinary CSS inheritance.
**Where**: `src/index.css` (modify), `src/App.jsx` (modify)
**Depends on**: None
**Reuses**: Tailwind's own `preflight.css` button reset (`background-color: transparent; color: inherit`) — becomes the effective default once the scaffold override is deleted, verified by reading `node_modules/tailwindcss/preflight.css` directly, not assumed
**Requirement**: CSSF-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `h1 { font-size: 3.2em }` is gone from `index.css`
- [ ] `:root`'s `color-scheme`, `color`, `background-color` are gone
- [ ] The entire `@media (prefers-color-scheme: light)` block is gone
- [ ] The entire `@layer base { button {...} }` block is gone
- [ ] `App.jsx`'s `<div className="flex w-screen h-screen overflow-hidden">` gains `bg-neutral-950 text-gray-100`
- [ ] `body`'s non-color rules (`margin`, `display: flex`, `place-items: center`, `min-width`, `min-height`) and `:root`'s non-color rules (font stack, `line-height`, `font-weight`, font-smoothing) are untouched
- [ ] `a:hover` is left in place for now (removed in T2, together with its replacement, so the sidebar is never mid-commit without a working hover)
- [ ] Existing `App.test.jsx` shell-selector tests (`.h-screen.overflow-hidden`, `<main>` classes) still pass unchanged — the new classes are additive
- [ ] Settings' `<h1 className="text-xl">` computes to `20px`, not `51.2px` — verified live in the Browser pane (navigate to `/settings`, `getComputedStyle`), not just by class presence
- [ ] `Tabs.jsx`'s inactive tab (feature 31) computes a background other than `rgb(26, 26, 26)` — verified live in the Browser pane
- [ ] The app's page background computes to `rgb(10, 10, 10)` (`neutral-950`), not `rgb(128, 128, 128)` (the removed `grey`) — verified live on at least two routes (`/`, `/teams`)
- [ ] Gate passes: `npm run lint && npm run build && npm test`

**Tests**: none (global CSS + a shared shell wrapper; the real proof is the browser verification above, per this matrix's structural exception)
**Gate**: build

**Commit**: `fix(css): remove the unlayered Vite scaffold overriding h1/button/root color`

---

### T2: Replace the global sidebar hover rule with an explicit utility

**What**: Delete the now-orphaned `a:hover` rule from `index.css`; add `hover:bg-lightgrey rounded-xl` directly to each of `Sidebar.jsx`'s six `<Link>` elements.
**Where**: `src/index.css` (modify), `src/components/Sidebar.jsx` (modify), `src/components/__tests__/Sidebar.test.jsx` (modify)
**Depends on**: T1
**Reuses**: `--color-lightgrey` token (already `hover:bg-lightgrey` on every icon button in `TeamCard`/`PlayerCard`/`ReferenceListManager`); `rounded-xl` (`0.75rem`/`12px`, an exact match for the deleted rule's radius)
**Requirement**: CSSF-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `a:hover` is gone from `index.css` — zero bare element selectors remain outside `@layer` (proven by T5's guard, but confirm by eye here too)
- [ ] Each of the six `Sidebar` `<Link>` elements carries `hover:bg-lightgrey rounded-xl`
- [ ] A new/updated `Sidebar.test.jsx` assertion confirms each link's `className` matches `/hover:bg-lightgrey/` and `/rounded-xl/`
- [ ] Verified live in the Browser pane: hovering a sidebar icon shows the grey rounded pill, matching the pre-change appearance
- [ ] Gate passes: `npx vitest run src/components/__tests__/Sidebar.test.jsx`
- [ ] Test count: existing count + at least 1 new/modified assertion

**Tests**: component
**Gate**: quick

**Commit**: `refactor(sidebar): replace the global a:hover rule with an explicit utility`

---

### T3: Give the Tile family an explicit dark surface

**What**: `Tile.jsx`'s `TILE_CLASS` and `INTERACTIVE_CLASS`, and `NextGameCard.jsx`'s matching hand-copied variant, gain `bg-lightblack` and swap `hover:bg-gray-50` → `hover:bg-hover`. `Tile.jsx`, `NextGameCard.jsx`, `StatTile.jsx`, `ListTile.jsx` swap every `text-gray-500` → `text-gray-400`.

**Found during implementation, not anticipated at design time**: `StatTile.jsx`/`ListTile.jsx`'s `text-blue-600` empty-state/row links measured 3.47–3.83:1 against the new explicit dark surfaces — below AA, same defect class as the gray shades (an explicit-but-too-dim color) but missed by the design audit because it wasn't a gray. Bumped to `text-blue-400` (measured 6.80–7.79:1). Included in this task rather than opening a new one since it's the same two files, same commit, same root cause.
**Where**: `src/components/Tile.jsx`, `src/components/NextGameCard.jsx`, `src/components/StatTile.jsx`, `src/components/ListTile.jsx` (all modify), `src/components/__tests__/Tile.test.jsx` (modify)
**Depends on**: T1
**Reuses**: `--color-lightblack`, `--color-hover` — the exact surface/hover convention `TeamCard`/`PlayerCard`/`TrainingCard` already use
**Requirement**: CSSF-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `Tile.jsx`'s `TILE_CLASS` includes `bg-lightblack`; `INTERACTIVE_CLASS` uses `hover:bg-hover`, not `hover:bg-gray-50`
- [ ] `NextGameCard.jsx`'s two class strings (empty-state div, button) get the same treatment
- [ ] `Tile.test.jsx:63,71`'s `hover:bg-gray-50` assertions are updated to `hover:bg-hover` — this is a deliberate, spec-driven behavior change (documented in `design.md`'s Tile-family entry), not a weakened assertion
- [ ] Every `text-gray-500` in these four files is `text-gray-400`; `LeaderTile.jsx` (already correct) is unmodified
- [ ] Verified live in the Browser pane on `/`: Home's dashboard tiles render as filled dark cards, not bare-bordered boxes on grey, and their label/breakdown text is legible (computed contrast ≥ 4.5:1, spot-checked with the same luminance formula used during design research)
- [ ] Gate passes: `npm test`
- [ ] Test count: not lower than before this task

**Tests**: component
**Gate**: full

**Commit**: `style(dashboard): give the Tile family an explicit dark surface`

---

### T4: Bump the remaining too-dim text colors

**What**: `SquadRanking.jsx:85`, `Settings.jsx:181`, `PlayerRatingHistory.jsx:78` — `text-gray-500`/`text-gray-600` → `text-gray-400`.

**Found during implementation, not anticipated at design time**: `PlayerRatingHistory.jsx:102`'s delete-rating icon button was also `text-gray-500` (measured 3.71:1 on `bg-lightblack`), missed by the design audit because it wasn't paired with visible text content in the grep pass. Bumped alongside its sibling in the same file.
**Where**: `src/components/SquadRanking.jsx`, `src/pages/Settings.jsx`, `src/components/PlayerRatingHistory.jsx` (modify), `src/components/__tests__/SquadRanking.test.jsx`, `src/components/__tests__/PlayerRatingHistory.test.jsx` (modify)
**Depends on**: T1
**Reuses**: n/a — one-line class swaps, same fix as T3, different files
**Requirement**: CSSF-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] All three files' identified lines use `text-gray-400`
- [ ] `SquadRanking.test.jsx:281` and `PlayerRatingHistory.test.jsx:299`'s `text-gray-500` assertions are updated to `text-gray-400`
- [ ] Confirmed unmodified (per design.md's explicit out-of-scope list): `ExerciseDetailsPopup.jsx`, `SquadRatingPopup.jsx`, `TrainingSavePopup.jsx`, `TrainingDetailsPopup.jsx`, `GameCardsSection.jsx`, `Calendar.jsx`, `TeamFilterBar.jsx` — all render on an explicit `bg-white`/`bg-gray-100` surface, not the app's new dark background
- [ ] Verified live in the Browser pane: Teams page (`SquadRanking`, empty-ranking state), Settings Advanced tab, and a player card with no rating history all show legible grey text
- [ ] Gate passes: `npm test`
- [ ] Test count: not lower than before this task

**Tests**: component
**Gate**: full

**Commit**: `fix(contrast): bump text-gray-500/600 to text-gray-400 on the dark background`

---

### T5: Add the CSS-foundation regression guard

**What**: A Vitest test that reads `src/index.css` as text and fails if any bare element selector (`h1`, `button`, `a`, etc.) sits outside an `@layer` block.
**Where**: `src/lib/__tests__/cssFoundation.test.js` (new)
**Depends on**: T1, T2 (must run against the fully cleaned file)
**Reuses**: nothing — new test infrastructure; the one deliberate exception in this repo to "test a `src/lib/*.js` sibling," noted inline in the file
**Requirement**: CSSF-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The test passes against the current (post-T1/T2) `index.css`
- [ ] A dedicated test case temporarily constructs a string containing the exact original defect (`h1 { font-size: 3.2em }`, unlayered) and asserts the guard's parsing logic flags it — proving the regex catches the real defect shape, not a hypothetical one (per `design.md`'s Risks & Concerns row)
- [ ] A dedicated test case confirms a selector properly inside `@layer base {...}` does NOT trip the guard (the `a:hover`-inside-`@layer` shape, even though T2 chose to delete it rather than keep it — the guard must still tolerate the layered form for any future legitimate use)
- [ ] Manually verified during implementation (per spec P3's Independent Test): temporarily reintroduce the real `h1 { font-size: 3.2em }` unlayered into the actual `src/index.css`, run `npx vitest run src/lib/__tests__/cssFoundation.test.js`, confirm it fails naming `h1`, then revert — record the result in the commit body
- [ ] Gate passes: `npx vitest run src/lib/__tests__/cssFoundation.test.js`
- [ ] Test count: 4+ tests pass

**Tests**: unit (static/source)
**Gate**: quick

**Commit**: `test(css): add a regression guard against unlayered element selectors`

---

### T6: Update docs and record AD-017

**What**: Rewrite `docs/09-styling.md`'s scaffold-CSS description and "Dark and light mode" section to describe the post-reset baseline; append `AD-017` to `.specs/STATE.md`; update `spec.md`'s Requirement Traceability to Verified.
**Where**: `docs/09-styling.md` (modify), `.specs/STATE.md` (modify), `.specs/features/33-css-foundation-reset/spec.md` (modify)
**Depends on**: T1, T2, T3, T4, T5
**Reuses**: `.specs/STATE.md`'s existing `AD-NNN` entry format
**Requirement**: n/a (documentation, not a spec AC)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `docs/09-styling.md`'s "Global element styles" section no longer describes the deleted scaffold rules as present
- [ ] The "Dark and light mode" section is rewritten to state the app is dark-only, no `prefers-color-scheme` branch
- [ ] `.specs/STATE.md` gains `AD-017` (dark-only; no unlayered element selectors; background/text set once on the app root), dated today, `status: active`
- [ ] `spec.md`'s Requirement Traceability table marks CSSF-01/02/03 as Verified (pending the Verifier's actual pass — see note below)
- [ ] Gate passes: `npm run lint && npm run build && npm test` (docs-only changes, but re-run the full gate as this is the last task in the batch)

**Tests**: none (documentation)
**Gate**: build

**Commit**: `docs(css): record AD-017 and the post-reset styling baseline`

---

## Phase Execution Map

```
Phase 1:  T1 ──→ T2
                  │
Phase 2:          ├──→ T3
                  └──→ T4
                        │
Phase 3:                └──→ T5 ──→ T6
```

Note: T3 and T4 both depend only on T1 and could run in either order; listed sequentially because this is single-worker inline execution (no intra-phase parallelism per the skill's execution model), not because T4 needs T3's output.

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Delete scaffold + app-root bg/text | 2 tightly-coupled files, one behavioral change | ✅ Granular |
| T2: Sidebar hover | 2 files (CSS deletion + its one consumer) | ✅ Granular |
| T3: Tile family surface | 4 files, one design decision | ✅ Granular (cohesive, matches precedent of feature 27's multi-file Button rollout) |
| T4: Remaining text-color bumps | 3 files, one-line changes each | ✅ Granular |
| T5: Regression guard | 1 new test file | ✅ Granular |
| T6: Docs | 3 doc files | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T1 | T1 → T3 | ✅ Match |
| T4 | T1 | T1 → T4 | ✅ Match |
| T5 | T1, T2 | T2 → T5 (T1 transitively satisfied via T2) | ✅ Match |
| T6 | T1, T2, T3, T4, T5 | T5 → T6 (all prior tasks transitively satisfied) | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Global CSS + shared shell component | none (build gate + browser verification) | none, build gate | ✅ OK |
| T2 | Component | component | component | ✅ OK |
| T3 | Component | component | component | ✅ OK |
| T4 | Component | component | component | ✅ OK |
| T5 | Global CSS (guard test itself) | static/source | unit | ✅ OK |
| T6 | Documentation | none | none, build gate | ✅ OK |
