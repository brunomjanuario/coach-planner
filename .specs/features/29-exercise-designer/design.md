# Exercise Designer Design

**Spec**: `.specs/features/29-exercise-designer/spec.md`
**Why a design phase**: a new runtime dependency, a schema change, a new data
model, and a testing problem (Konva needs a canvas; jsdom has none). Four
decisions that would otherwise be made silently inside a task.

## Architecture Overview

The feature splits along one line: **the diagram is data, and Konva is only an
input device for it.**

```
                         exerciseDiagram.js  (pure, no React, no Konva)
                         ├── createDiagram / addShape / moveShape / removeShape
                         ├── clampToPitch, normalise, denormalise
                         ├── serialize / deserialize / isValid
                         └── SHAPE_KINDS, LIMITS
                                    │
             ┌──────────────────────┴───────────────────────┐
             │                                              │
      write path                                      read path
             │                                              │
   ExerciseDiagramEditor.jsx                    DiagramView.jsx
   (React.lazy → react-konva)                   (plain inline SVG)
             │                                              │
   ExerciseFields.jsx  ──── exercise.diagram ────  ExerciseDetailsPopup.jsx
             │                                       (slot reserved by 28)
             ▼
      trainingService.update  →  store.js (SCHEMA_VERSION 4)
```

Everything that can be wrong about a diagram — its shape, its bounds, its size
limit, its version — lives in `exerciseDiagram.js`, which is a plain module with
no rendering in it. Both the editor and the viewer are thin.

## Code Reuse Analysis

### Existing components to leverage

| Existing | Used for |
|---|---|
| `PopupShell` | The editor is a stacked popup over `TrainingSavePopup`, the same way `GameSavePopup` stacks the reference managers (AD-009) |
| `Button` / `PopupActions` (`27`) | The editor's Save / Cancel / Undo / Clear row |
| `ExerciseDetailsPopup`'s reserved diagram region (`28`) | Where `DiagramView` mounts — `28` deliberately renders nothing there until this feature lands |
| `src/services/store.js` migration registry (`:35-63`) | The `diagram: null` backfill, as version 4 |
| `src/lib/id.js` (`newId`) | Shape ids, per AD-003 — never `Math.random()` |
| `ExerciseFields`'s existing validate/submit flow | The editor is one more field on the exercise being built, not a separate save |

### Integration points

- **`ExerciseFields.jsx`** gains a "Draw diagram" action and carries `diagram`
  through its `onAdd` payload, alongside the untouched `image: ""`.
- **`trainingService`** already round-trips whole exercise objects; a new field
  needs no service change beyond the migration.
- **`ExerciseDetailsPopup`** (from `28`) renders `DiagramView` when
  `exercise.diagram` is present.

## Components

### `src/lib/exerciseDiagram.js` (new, pure)

The whole model. No React, no Konva, no DOM.

- `createDiagram()` → `{ v: 1, pitch: "full", shapes: [] }`
- `addShape(diagram, kind, point)` → new diagram (immutable), id from `newId()`
- `moveShape(diagram, id, point)` → new diagram, position clamped to `0..1`
- `removeShape(diagram, id)`, `clearShapes(diagram)`
- `serialize(diagram)` / `deserialize(json)` — `deserialize` returns `null` for
  an unknown `v`, and silently drops shapes with an unknown `kind`
- `validate(diagram)` → `{ ok, reason }`, enforcing `LIMITS.maxShapes = 60` and
  `LIMITS.maxBytes = 8192`
- `SHAPE_KINDS` = `player-a`, `player-b`, `cone`, `ball`, `goal`, `line`,
  `arrow`, `text`

Every function is total: it returns a value for every input, never throws.

### `src/components/DiagramView.jsx` (new, read-only)

Renders a diagram as inline `<svg>` with a `viewBox` of `0 0 100 62` (a pitch's
approximate aspect). Because coordinates are normalised, the SVG scales to any
container with no recalculation. No Konva import anywhere in its module graph —
this is what keeps the read path testable in jsdom and out of the initial
bundle.

Also draws the pitch itself: touchlines, halfway line, centre circle, two boxes.
Vector geometry, not an asset.

### `src/components/ExerciseDiagramEditor.jsx` (new, write)

A `PopupShell` hosting a Konva `Stage`. Holds three pieces of state: the working
diagram, the active tool, and the undo stack (20 entries, in memory). Every
mutation goes through `exerciseDiagram.js` and pushes the previous diagram onto
the stack — so undo is a pop, not an inverse operation per tool.

Imported through `React.lazy` with a `Suspense` fallback, so Konva stays out of
the initial chunk.

### `src/components/ExerciseFields.jsx` (modify)

One added action and one added field in the submitted payload. The diagram is
edited in a stacked popup and returned to the form; it is written to storage
only when the exercise itself is saved, so Cancel on the exercise cancels the
diagram too.

## Data Models

```js
// Exercise (existing fields unchanged)
{
  id, trainingId, description, duration, numberOfPlayers, repetitions,
  image: "",          // legacy, still unused — deliberately untouched
  diagram: null,      // new
}

// Diagram
{
  v: 1,                       // diagram schema, independent of store schema
  pitch: "full" | "half" | "blank",
  shapes: [
    // markers
    { id, kind: "player-a", x: 0.31, y: 0.55, label: "9" },
    { id, kind: "cone",     x: 0.42, y: 0.10 },
    // paths — points are normalised, same space as markers
    { id, kind: "arrow", points: [[0.3,0.5],[0.6,0.4]] },
    { id, kind: "line",  points: [[0.1,0.1],[0.2,0.3],[0.4,0.2]] },
    { id, kind: "text",  x: 0.5, y: 0.9, text: "press here" },
  ],
}
```

`x`/`y` and every `points` entry are in `0..1` against the pitch, never pixels.
This is what lets a diagram drawn at 900px wide render correctly inside an
85vh-capped popup on a laptop.

`v` versions the *diagram*, separately from `store.js`'s `SCHEMA_VERSION`. A
future diagram change should not force a whole-store migration.

## Error Handling Strategy

| Failure | Handling |
|---|---|
| Diagram over 60 shapes / 8KB | `validate` returns `{ ok: false, reason }`; the editor shows it and stays open with the work intact |
| Unknown diagram `v` | `deserialize` returns `null` → renders as "no diagram", never throws |
| Unknown shape `kind` | Dropped on deserialize; the rest renders |
| Shape dragged off-pitch | `moveShape` clamps to `0..1` — the model enforces it, not the view |
| `localStorage` quota | The store's existing write-error path surfaces it; the editor stays open |
| Canvas unavailable | The lazy chunk's error boundary renders a message inside the popup rather than taking the popup down |
| Exercise deleted mid-edit | The save fails through the existing service path; nothing partial is written |

## Risks & Concerns

| Risk | Mitigation |
|---|---|
| **Konva cannot render in jsdom** — it needs a real canvas | No test renders a `Stage`. `react-konva` is mocked in the editor's tests; all real behaviour is unit-tested in `exerciseDiagram.js`, which has no canvas in it. This is the single most important consequence of the architecture. |
| **React version mismatch** — `react-konva@19.2.5` needs `react ^19.2.0`; repo is on `19.1.0` | T1 bumps React to `^19.2.0` and runs the full suite before any drawing code exists, so a React regression cannot be confused with a drawing bug. Fallback if the bump misbehaves: `react-konva@19.0.10` + `konva@9`, recorded here so the decision does not have to be rediscovered. |
| **Bundle size** — Konva is by far the largest dependency here | `React.lazy` on the editor only. Verified against the build output, not assumed. |
| **`localStorage` budget** (AD-002, ~5MB) | JSON not raster, plus a hard 8KB/60-shape cap. A 2KB diagram × 100 exercises is 200KB. |
| **Drag/pointer behaviour is untestable in jsdom** | Position logic is `moveShape`/`clampToPitch` in the pure module and is unit-tested there; the editor tests only assert that a drag callback calls it. |
| **Scope creep into a tactics product** | The Out of Scope table is explicit: no animation, no templates, no export, no sharing. |

## Tech Decisions (only non-obvious ones)

**Konva writes, SVG reads.** The obvious build uses one renderer for both. Two
things argue against it: the read path would then need a canvas (so it could not
be tested in jsdom, and would drag Konva into every view that shows an
exercise), and read is the common case — a diagram is drawn once and looked at
many times. Rendering normalised JSON as SVG is a few dozen lines and makes the
common path free.

**Normalised coordinates, not pixels.** Pixels are simpler while you are drawing
and wrong the moment the container changes width. Since the viewer is an SVG
with a fixed `viewBox`, normalised coordinates make scaling a non-event.

**Undo as a stack of whole diagrams, not inverse operations.** A diagram is
small enough that 20 copies are cheap, and per-tool inverse operations are where
undo bugs live. This is a case where the naive implementation is the correct one.

**A separate `diagram` field rather than reusing `image`.** `image` is a string
named for a raster. Putting JSON in it would mislead every future reader for the
sake of not adding a field.

**The diagram is saved with the exercise, not on its own.** Otherwise cancelling
an exercise would leave its diagram written — a partial save the user never
asked for.

## Tips

- Build `exerciseDiagram.js` and `DiagramView` **before** touching Konva. Both
  are fully testable, and together they prove the model works before the
  hardest-to-test part of the feature exists.
- Never `import "react-konva"` from a module the viewer's graph can reach. One
  stray import puts Konva back in the initial bundle and breaks jsdom tests.
- The size guard needs a test that actually exceeds the limit — a guard nothing
  has ever tripped is not a guard.
