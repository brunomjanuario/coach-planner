# Exercise Designer Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/29-exercise-designer/spec.md`
**Design**: `.specs/features/29-exercise-designer/design.md` — **read it before T1.** The Konva-writes/SVG-reads split and the jsdom constraint are decided there, not here.
**Status**: Not started
**Batches**: 9 tasks → **2 batches** (Phases 1+2 = 7 tasks; Phase 3 = 2 tasks). The skill will offer sub-agent delegation; either answer is fine, but batch 2 must not start until batch 1 reports every task complete.

---

## Test Coverage Matrix

> **The binding constraint: Konva requires a real canvas and jsdom has none.**
> No test in this feature renders a Konva `Stage`. All diagram behaviour is
> unit-tested in the pure model; the editor's tests mock `react-konva` and
> assert only that interactions call the model. Any task tempted to render a
> real canvas is doing the wrong thing — move the logic into the model instead.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Lib (`src/lib/exerciseDiagram.js`) | unit | Every mutation, clamping, serialize/deserialize, version and kind guards, size limits | `src/lib/__tests__/exerciseDiagram.test.js` | `npm test` |
| Services (`src/services/store.js`) | unit | Version-4 migration, idempotency, existing-data preservation | `src/services/__tests__/store.test.js` | `npm test` |
| Components (`src/components/DiagramView.jsx`) | component | Shape rendering, unknown-kind skip, empty/absent diagram, no Konva import | `src/components/__tests__/DiagramView.test.jsx` | `npm test` |
| Components (`src/components/ExerciseDiagramEditor.jsx`) | component (`react-konva` mocked) | Tool selection, callbacks reach the model, undo/clear, save/cancel, size refusal | `src/components/__tests__/ExerciseDiagramEditor.test.jsx` | `npm test` |
| Components (`src/components/ExerciseFields.jsx`) | component | Diagram carried through submit; cancel discards | `src/components/__tests__/ExerciseFields.test.jsx` | `npm test` |
| Build output | manual, recorded | Konva absent from the initial chunk | — | `npm run build` |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After lib- or component-only tasks | `npx vitest run <path/to/file.test.js(x)>` |
| Full | After tasks touching the exercise form or the store | `npm test` |
| Build | After phase completion | `npm run lint && npm run build && npm test` |

---

## Execution Plan

### Phase 1: Foundations — no drawing code yet

```
T1 → T2 → T3
```

### Phase 2: The editor

```
T3 → T4 → T5 → T6 → T7
```

### Phase 3: Integration

```
T7 → T8 → T9
```

---

## Task Breakdown

### T1: Bring the dependencies in and prove nothing broke

**What**: Bump React to `^19.2.0`, add `konva` and `react-konva`, and run the whole suite **before** any drawing code exists.
**Where**: `package.json`, `package-lock.json` (modify)
**Depends on**: None
**Reuses**: Nothing — this is the dependency step
**Requirement**: DRAW-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `react` and `react-dom` are `^19.2.0`; `react-konva@^19.2.5` and `konva@^10` install with **no peer-dependency warnings** — capture the install output in the commit body
- [ ] The full existing suite passes unchanged (1126+ tests) — this is the point of doing the bump alone: a later React regression cannot be mistaken for a drawing bug
- [ ] `npm run build` succeeds
- [ ] If the bump misbehaves, fall back to `react-konva@19.0.10` + `konva@^9` per `design.md`'s risk table, and record which path was taken
- [ ] Gate passes: `npm run lint && npm run build && npm test`

**Tests**: n/a (the existing suite is the gate)
**Gate**: build

**Commit**: `build: add konva and react-konva for exercise diagrams`

---

### T2: Model the diagram

**What**: The pure module that owns everything a diagram can be or do. No React, no Konva, no DOM.
**Where**: `src/lib/exerciseDiagram.js` (new), `src/lib/__tests__/exerciseDiagram.test.js` (new)
**Depends on**: T1
**Reuses**: `newId()` from `src/lib/id.js` (AD-003 — never `Math.random()`)
**Requirement**: DRAW-02, DRAW-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `createDiagram()` returns `{ v: 1, pitch: "full", shapes: [] }`
- [ ] `addShape`, `moveShape`, `removeShape`, `clearShapes` each return a **new** diagram and leave the input untouched — assert the input object is unchanged, which is what makes undo-by-stack correct
- [ ] `moveShape` clamps `x`/`y` into `0..1` (edge case: dragged off-pitch) — assert with values both below 0 and above 1
- [ ] `serialize`/`deserialize` round-trip a diagram containing every kind in `SHAPE_KINDS`
- [ ] `deserialize` returns `null` for an unknown `v` and never throws (edge case)
- [ ] `deserialize` drops shapes with an unknown `kind` and keeps the rest (edge case) — assert the survivors' count, not just that it did not throw
- [ ] `validate` rejects above 60 shapes **and** above 8192 serialized bytes, with a reason naming the limit (AC edge case) — one test per limit, each actually exceeding it
- [ ] `validate` accepts a diagram exactly at each limit, so the boundary is not off by one
- [ ] Every exported function is total — no input throws
- [ ] Gate passes: `npx vitest run src/lib/__tests__/exerciseDiagram.test.js`
- [ ] Test count: 28+ tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(trainings): model the exercise diagram`

---

### T3: Render a diagram as SVG

**What**: The read path — a pitch and its shapes, with no Konva anywhere in its module graph.
**Where**: `src/components/DiagramView.jsx` (new), `src/components/__tests__/DiagramView.test.jsx` (new)
**Depends on**: T2
**Reuses**: `exerciseDiagram.js`'s `deserialize` and `SHAPE_KINDS`
**Requirement**: DRAW-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Renders an `<svg>` with a fixed `viewBox`, so it scales with its container (AC DRAW-04.4)
- [ ] Renders one element per shape, positioned from normalised coordinates
- [ ] Draws the pitch as vector geometry for each `pitch` value — `full`, `half`, `blank` (three tests; `blank` must draw no pitch lines)
- [ ] An unknown shape kind is skipped and the rest render (edge case)
- [ ] A `null`/absent diagram renders nothing at all — not an empty frame (AC DRAW-04.2)
- [ ] The module graph imports no `konva` or `react-konva` — assert it, since a stray import is invisible until the bundle grows (AC DRAW-04.3)
- [ ] Renders successfully in jsdom with no canvas — which is the whole point of this component existing
- [ ] Gate passes: `npx vitest run src/components/__tests__/DiagramView.test.jsx`
- [ ] Test count: 14+ tests pass

**Tests**: component
**Gate**: quick

**Commit**: `feat(trainings): render an exercise diagram as SVG`

---

### T4: Stand up the editor shell

**What**: A stacked popup hosting a lazily-loaded Konva stage and the tool palette — no drawing behaviour yet.
**Where**: `src/components/ExerciseDiagramEditor.jsx` (new), `src/components/__tests__/ExerciseDiagramEditor.test.jsx` (new), `src/test/setup.js` (modify — add the `react-konva` mock)
**Depends on**: T3
**Reuses**: `PopupShell` (AD-009), `Button`/`PopupActions` from `27`
**Requirement**: DRAW-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] The editor renders through `PopupShell` with Save, Cancel, Undo and Clear actions
- [ ] `react-konva` is mocked for tests; the mock is documented in `setup.js` with **why** (jsdom has no canvas), so nobody later "fixes" it by unmocking
- [ ] The editor module is imported via `React.lazy` with a `Suspense` fallback (AC DRAW-04.3 — keeps Konva out of the initial chunk)
- [ ] A tool palette renders one control per entry in `SHAPE_KINDS` plus a select tool; selecting one marks it active
- [ ] Opening with no diagram starts from `createDiagram()` (AC DRAW-03 / P1.2)
- [ ] Opening with a stored diagram starts from it, with every shape present (AC DRAW-05.1)
- [ ] A lazy-load failure renders a message inside the popup instead of unmounting it (edge case: canvas unavailable)
- [ ] Gate passes: `npx vitest run src/components/__tests__/ExerciseDiagramEditor.test.jsx`
- [ ] Test count: 10+ tests pass

**Tests**: component (`react-konva` mocked)
**Gate**: quick

**Commit**: `feat(trainings): add the exercise diagram editor shell`

---

### T5: Place, move and delete markers

**What**: The marker tools — the minimum that makes the editor able to draw a drill.
**Where**: `src/components/ExerciseDiagramEditor.jsx` (modify), its test file (modify)
**Depends on**: T4
**Reuses**: `addShape`/`moveShape`/`removeShape` from T2 — the editor calls the model and holds no geometry logic of its own
**Requirement**: DRAW-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] With a marker tool active, a stage click adds a shape of that kind at that position (AC P1.3) — assert the resulting diagram, via the mocked stage's click callback
- [ ] The added position is normalised, not pixels (AC P1.4) — assert a value in `0..1` from a pixel-space input
- [ ] A drag callback calls `moveShape` and the shape's stored position updates (AC P1.4)
- [ ] A drag ending outside the pitch results in a clamped position (edge case) — the assertion belongs here as well as in T2, because this is where the wiring could bypass the model
- [ ] Selecting a shape and deleting removes it (AC P1.5)
- [ ] Deleting with nothing selected does nothing and throws nothing
- [ ] Each of `player-a`, `player-b`, `cone`, `ball`, `goal` can be placed
- [ ] Gate passes: `npx vitest run src/components/__tests__/ExerciseDiagramEditor.test.jsx`
- [ ] Test count: 14+ tests pass

**Tests**: component (`react-konva` mocked)
**Gate**: quick

**Commit**: `feat(trainings): place and move markers on a diagram`

---

### T6: Lines, arrows, labels, undo and clear

**What**: The path and text tools, plus the two history actions.
**Where**: `src/components/ExerciseDiagramEditor.jsx` (modify), its test file (modify)
**Depends on**: T5
**Reuses**: The same model calls; undo is a stack of whole diagrams per `design.md`, not per-tool inverses
**Requirement**: DRAW-03, DRAW-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] A freehand line and a straight arrow can each be added, storing normalised `points`
- [ ] A text label can be added with its text
- [ ] Undo reverts the last change and can be repeated to a depth of 20 (AC DRAW-05.3) — assert at the 20th and 21st steps, so the depth is a real bound rather than "some history"
- [ ] Undo is disabled with nothing to undo (AC DRAW-05.4)
- [ ] Clear removes every shape (AC DRAW-05.5)
- [ ] Clear is itself undoable, restoring every shape (AC DRAW-05.5) — the case most likely to be missed
- [ ] Undo state is in memory only and does not survive the popup closing
- [ ] Gate passes: `npx vitest run src/components/__tests__/ExerciseDiagramEditor.test.jsx`
- [ ] Test count: 14+ tests pass

**Tests**: component (`react-konva` mocked)
**Gate**: quick

**Commit**: `feat(trainings): add path tools, undo and clear`

---

### T7: Enforce the size guard at save

**What**: The editor refuses an oversized diagram and keeps the work.
**Where**: `src/components/ExerciseDiagramEditor.jsx` (modify), its test file (modify)
**Depends on**: T6
**Reuses**: `validate` from T2
**Requirement**: DRAW-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Saving a diagram over either limit is refused with a message naming the limit (edge case) — build a genuinely oversized diagram in the test; a guard nothing has tripped is not a guard
- [ ] After a refusal the editor stays open and every shape is still present (edge case)
- [ ] Saving a diagram at exactly the limit succeeds
- [ ] Cancel closes the editor and returns the diagram unchanged from what it was on open (AC P1.7)
- [ ] Gate passes: `npx vitest run src/components/__tests__/ExerciseDiagramEditor.test.jsx`
- [ ] Test count: 8+ tests pass

**Tests**: component (`react-konva` mocked)
**Gate**: quick

**Commit**: `feat(trainings): refuse oversized diagrams at save`

---

### T8: Persist the diagram with its exercise

**What**: The schema migration and the form wiring — the point at which a drawing survives a reload.
**Where**: `src/services/store.js` (modify), `src/services/__tests__/store.test.js` (modify), `src/components/ExerciseFields.jsx` (modify), `src/components/__tests__/ExerciseFields.test.jsx` (modify)
**Depends on**: T7
**Reuses**: The store's versioned migration registry (`src/services/store.js:35-63`); `ExerciseFields`' existing validate/submit flow
**Requirement**: DRAW-01, DRAW-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `SCHEMA_VERSION` is 4 and the migration sets `diagram: null` on every existing exercise (AC DRAW-01)
- [ ] The migration preserves every other field, including the legacy `image: ""` (AC — assert `image` explicitly; it is the field most likely to be "tidied away")
- [ ] Running the migration twice leaves the data identical (idempotency)
- [ ] A store already at version 4 is not re-migrated
- [ ] `ExerciseFields` renders a "Draw diagram" action that opens the editor for the exercise being edited (AC P1.1)
- [ ] A saved diagram is carried through `onAdd`'s payload alongside the untouched `image` field (AC P1.6)
- [ ] Cancelling the exercise form discards the diagram — it is written only when the exercise is saved (`design.md`: no partial saves)
- [ ] A diagram round-trips through `trainingService.update` and a store re-read (AC P1.6) — this is the reload proof
- [ ] Deleting an exercise removes its diagram with it, leaving no orphan (edge case)
- [ ] Gate passes: `npm test`
- [ ] Test count: 16+ tests pass

**Tests**: unit + component
**Gate**: full

**Commit**: `feat(trainings): save an exercise diagram with its exercise`

---

### T9: Show the diagram where a coach reads it

**What**: `DiagramView` fills the region `28` reserved, and the bundle claim is verified rather than assumed.
**Where**: `src/components/ExerciseDetailsPopup.jsx` (modify), `src/components/__tests__/ExerciseDetailsPopup.test.jsx` (modify)
**Depends on**: T8
**Reuses**: `DiagramView` from T3; the reserved diagram region from `28`
**Requirement**: DRAW-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] An exercise with a diagram renders it as SVG in the reserved region (AC DRAW-04.1)
- [ ] An exercise without one renders no diagram region (AC DRAW-04.2) — the negative case `28` deliberately left for this feature
- [ ] The rendered diagram is not editable and exposes no editing controls (AC DRAW-04.3)
- [ ] `ExerciseDetailsPopup` renders in jsdom with no canvas and no Konva in its module graph (AC DRAW-04.3)
- [ ] `npm run build` shows Konva in a separate lazy chunk, not the initial one — **record the chunk names and sizes in the commit body**, since the suite cannot check the bundle
- [ ] A stored diagram with a corrupt/unknown `v` renders as no diagram rather than throwing (edge case)
- [ ] Gate passes: `npm run lint && npm run build && npm test`
- [ ] Test count: 10+ tests pass

**Tests**: component
**Gate**: build

**Commit**: `feat(trainings): show an exercise's diagram in its details`

---

## Phase Execution Map

```
Phase 1:  T1 ──→ T2 ──→ T3
                          │
Phase 2:                  └──→ T4 ──→ T5 ──→ T6 ──→ T7
                                                     │
Phase 3:                                             └──→ T8 ──→ T9
```

Batch 1 = Phases 1+2 (T1–T7, 7 tasks). Batch 2 = Phase 3 (T8–T9, 2 tasks).

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Dependencies | `package.json` only, suite as the gate | ✅ Granular |
| T2: Diagram model | 1 pure module | ✅ Granular |
| T3: SVG viewer | 1 component, read-only | ✅ Granular |
| T4: Editor shell | 1 component, no drawing behaviour | ✅ Granular |
| T5: Marker tools | 1 tool family | ✅ Granular |
| T6: Paths + history | 1 tool family + 2 actions | ✅ Granular |
| T7: Size guard | 1 guard at 1 boundary | ✅ Granular |
| T8: Persistence | 1 migration + 1 form field | ✅ Granular |
| T9: Read integration | 1 component slot + bundle check | ✅ Granular |

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
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |

No task depends on a later phase. ✅

---

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Dependencies | existing suite | existing suite | ✅ OK |
| T2 | Lib | unit | unit | ✅ OK |
| T3 | Component | component | component | ✅ OK |
| T4 | Component | component (mocked) | component (mocked) | ✅ OK |
| T5 | Component | component (mocked) | component (mocked) | ✅ OK |
| T6 | Component | component (mocked) | component (mocked) | ✅ OK |
| T7 | Component | component (mocked) | component (mocked) | ✅ OK |
| T8 | Service + component | unit + component | unit + component | ✅ OK |
| T9 | Component | component | component | ✅ OK |
