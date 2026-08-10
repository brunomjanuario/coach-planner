# Asset Pipeline Fix Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/34-asset-pipeline-fix/spec.md`
**Design**: not required — a documented, single correct fix (`docs/09-styling.md` already names it)
**Status**: Not started
**Batches**: 3 tasks → 1 batch, execute inline

---

## Test Coverage Matrix

> No dedicated testing-standards doc beyond `CLAUDE.md`'s command list. Guidelines found: none — strong defaults applied, floored against existing test depth (which for these two files' `<img>` elements is currently zero — no `TeamCard.test.jsx` exists at all, and `PlayerCard.test.jsx` asserts nothing about its image).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Components (`TeamCard.jsx`, `PlayerCard.jsx`) | component | `src` resolves via import (not the literal source-tree string) and `alt` text present, for each component | `src/components/__tests__/TeamCard.test.jsx` (new), `src/components/__tests__/PlayerCard.test.jsx` (modify) | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After a single component task | `npx vitest run <path/to/file.test.jsx>` |
| Build | After the final task — must prove the actual production-build claim | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Fix both components, then prove the build claim

```
T1 → T2 → T3
```

---

## Task Breakdown

### T1: Fix TeamCard's image import and add alt text

**What**: Replace the raw string `src` with an ES module import; add `alt`.
**Where**: `src/components/TeamCard.jsx` (modify), `src/components/__tests__/TeamCard.test.jsx` (new)
**Depends on**: None
**Reuses**: `docs/09-styling.md`'s already-documented fix pattern
**Requirement**: ASSET-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `import logo from "../assets/images/logo.png"` replaces the literal string; `<img src={logo} />`
- [ ] `<img>` carries `alt={`${team.club} ${team.name} crest`}`
- [ ] New `TeamCard.test.jsx` asserts the rendered `<img>`'s `src` is not the literal string `"src/assets/images/logo.png"` (proving it went through Vite's asset pipeline, not a raw path) and asserts the `alt` text (AC ASSET-01.2, ASSET-01.3)
- [ ] Gate passes: `npx vitest run src/components/__tests__/TeamCard.test.jsx`
- [ ] Test count: 2+ tests pass

**Tests**: component
**Gate**: quick

**Commit**: `fix(teams): import TeamCard's crest image instead of a raw path`

---

### T2: Fix PlayerCard's image import and add alt text

**What**: Same fix, `PlayerCard.jsx`.
**Where**: `src/components/PlayerCard.jsx` (modify), `src/components/__tests__/PlayerCard.test.jsx` (modify)
**Depends on**: None (independent of T1, sequenced only for single-worker inline execution)
**Reuses**: same pattern as T1
**Requirement**: ASSET-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `import avatar from "../assets/images/person.png"` replaces the literal string; `<img src={avatar} />`
- [ ] `<img>` carries `alt={`${player.name} avatar`}`
- [ ] `PlayerCard.test.jsx` gains an assertion that the rendered `<img>`'s `src` is not the literal string `"src/assets/images/person.png"`, and asserts the `alt` text (AC ASSET-01.2, ASSET-01.3)
- [ ] Gate passes: `npx vitest run src/components/__tests__/PlayerCard.test.jsx`
- [ ] Test count: existing count + 2

**Tests**: component
**Gate**: quick

**Commit**: `fix(teams): import PlayerCard's avatar image instead of a raw path`

---

### T3: Prove the production-build claim

**What**: Run a real production build and confirm both images are actually emitted into `dist/assets/`, closing the gap a component test alone can't prove (jsdom never runs a real Vite build).
**Where**: no source change — verification only, recorded in the commit body
**Depends on**: T1, T2
**Reuses**: `npm run build`
**Requirement**: ASSET-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `npm run build` succeeds
- [ ] `dist/assets/` contains a fingerprinted file for each image (`ls dist/assets/ | grep -i 'logo\|person'` or equivalent, recorded in the commit body)
- [ ] The literal string `src/assets/images/` no longer appears anywhere in `dist/` (`grep -r "src/assets/images" dist/` returns nothing) — this is the actual AC ASSET-01.1 proof; a component-level test cannot make this claim on its own
- [ ] Gate passes: `npm run lint && npm run build && npm test`

**Tests**: none (build-level verification, not unit-testable in jsdom)
**Gate**: build

**Commit**: `docs(assets): record the production-build proof for feature 34`

---

## Phase Execution Map

```
Phase 1:  T1 ──→ T2 ──→ T3
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: TeamCard | 1 component | ✅ Granular |
| T2: PlayerCard | 1 component | ✅ Granular |
| T3: Build proof | verification only | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (start) | ✅ Match |
| T2 | None | T1 → T2 | ✅ Match (sequenced for inline single-worker execution, not a true dependency) |
| T3 | T1, T2 | T2 → T3 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Component | component | component | ✅ OK |
| T2 | Component | component | component | ✅ OK |
| T3 | Build verification | none (build gate) | none, build gate | ✅ OK |
