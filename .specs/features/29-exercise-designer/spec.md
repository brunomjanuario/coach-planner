# Exercise Designer Specification

**Scope:** Complex · **Design:** required — see `design.md` · **Depends on:** 01-persistence-layer, 04-training-form, 27-popup-button-system, 28-training-exercise-details

## Problem Statement

An exercise is currently four fields of text: a description, a duration, a
player count and a repetition count (`src/components/ExerciseFields.jsx`). That
describes the *parameters* of a drill and nothing about its *shape* — where the
players start, which way they move, where the cones and goals go. Coaches draw
that; this app has no way to record it.

The `Exercise` record has carried an unused `image: ""` field since the seed
data was written (`src/model/seed.js:149`), so the intent has been there from
the start with no implementation behind it.

Everything is stored in `localStorage` under a ~5MB ceiling (AD-002). A raster
image per exercise would spend that budget fast and could never be edited after
it was drawn, so how the drawing is *stored* is as much of the problem as how
it is made.

## Goals

- [ ] A coach can draw a drill on a pitch and save it with the exercise
- [ ] A saved drawing can be reopened and changed, not just replaced
- [ ] A drawing survives a reload and costs kilobytes, not megabytes
- [ ] Viewing a drawing does not require loading the editor

## Out of Scope

| Feature | Reason |
|---|---|
| Animating a drill (players moving over time) | A different product. Static diagrams first. |
| A library of reusable diagram templates | Depends on exercises being shared across trainings, which they are not (`trainingId` owns them). |
| Importing or uploading an image | Deliberate: raster in `localStorage` is the thing this feature is designed to avoid. |
| Exporting a diagram as PNG/PDF | Real, but a separate concern from creating one. |
| Freehand pressure/smoothing effects | Nice-to-have polish on a tool that does not exist yet. |
| Multi-user or collaborative editing | No backend (AD-002). |
| Drawing on games or trainings (not exercises) | The request is exercises. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Library | **react-konva** (canvas), with Konva | User decision. Gives draggable objects and hit-testing out of the box, which a marker-based tactics board needs and a freehand-only tool cannot provide. | **y** |
| React version | React is bumped to `^19.2.0` so `react-konva@19.2.5` and `konva@10` install cleanly | Verified: `react-konva@19.2.5` declares `react: ^19.2.0`, and this repo is on `19.1.0`. The alternative — pinning `react-konva@19.0.10` + `konva@9` — takes an already-superseded line to avoid a patch-level React bump. | n |
| Storage format | A compact JSON `diagram` object on the exercise, **not** a raster image | Editable, diffable, kilobytes. This is the decision the 5MB ceiling forces. | n |
| The legacy `image` field | Left exactly as it is, unused | Repurposing a field whose name says "image" for JSON would mislead every future reader. | n |
| Schema | `SCHEMA_VERSION` 3 → 4, migration sets `diagram: null` on every existing exercise | The store already has a versioned migration registry (`src/services/store.js:35-63`). | n |
| Reading a diagram | Rendered as **SVG** from the same JSON, with no Konva involved | The read path (exercise details, and any future list preview) then costs nothing, works in jsdom, and is testable. Konva is loaded only when the editor opens. | n |
| Editor loading | `React.lazy` — Konva is not in the initial bundle | It is the largest dependency in the app and is needed by one popup. | n |
| Testing strategy | All diagram behaviour lives in a pure module and is unit-tested; the Konva editor is tested with `react-konva` mocked; **no test renders a real canvas** | Konva needs a real canvas, which jsdom does not have. Stated up front so no task tries and no test is named for something it cannot do. | n |
| Size guard | A diagram is rejected above 60 shapes or 8KB serialized, with a message | Without a bound, one exercise can eat the whole storage budget and the failure surfaces as a silent write error somewhere else entirely. | n |
| Pitch backgrounds | Full pitch, half pitch, blank — drawn as vector geometry, not an image asset | Keeps the diagram self-contained and the bundle free of a pitch PNG. | n |
| Tools in v1 | Select/move, player marker (two colours), cone, ball, goal, freehand line, straight arrow, text label, delete, undo | Enough to draw a real drill. Anything more is polish on top of a working tool. | n |
| Undo depth | 20 steps, in memory only, discarded on close | Persisting an undo stack is a different feature. 20 covers a drawing session. |  n |
| Coordinate space | Normalised 0–1 against the pitch, not pixels | A diagram drawn on a laptop must render correctly in a narrower popup. Pixel coordinates would not survive it. | n |

**Open questions:** none — all resolved or logged above. Design decisions that
required working through rather than choosing (module boundaries, the shape
model, the Konva/SVG split) are in `design.md`.

---

## User Stories

### P1: Draw and save a diagram ⭐ MVP

**User Story**: As a coach, I want to draw a drill on a pitch so that the
exercise records what it actually looks like, not just its numbers.

**Why P1**: This is the request. Without saving, drawing is a toy.

**Acceptance Criteria**:

1. WHEN the exercise form is open THEN it SHALL offer an action that opens the
   diagram editor for that exercise
2. WHEN the editor opens for an exercise with no diagram THEN it SHALL show an
   empty pitch and the tool palette
3. WHEN a marker tool is selected and the pitch is clicked THEN a shape of that
   kind SHALL be added at that position
4. WHEN a shape is dragged THEN its stored position SHALL update to the drop
   position, in normalised coordinates
5. WHEN a shape is selected and deleted THEN it SHALL be removed from the
   diagram
6. WHEN the editor is saved THEN the diagram SHALL be written to the exercise
   and SHALL survive a page reload
7. WHEN the editor is cancelled THEN the exercise's diagram SHALL be exactly
   what it was before the editor opened

**Independent Test**: Open the editor, add three markers, save, reload, reopen —
the three markers are in the same places.

---

### P2: See a diagram without opening the editor

**User Story**: As a coach reviewing a session, I want to see the drill's
diagram in the exercise details so that I do not have to open an editor to look
at a picture.

**Why P2**: The diagram is worth more read than written, but it cannot be read
before it can be written.

**Acceptance Criteria**:

1. WHEN an exercise with a diagram is opened in `ExerciseDetailsPopup` THEN the
   diagram SHALL render as an SVG in the region `28` reserved
2. WHEN an exercise has no diagram THEN no diagram region SHALL render
3. WHEN a diagram is rendered read-only THEN it SHALL NOT be editable and SHALL
   NOT load Konva
4. WHEN a diagram is rendered at a narrower width THEN every shape SHALL keep
   its relative position on the pitch

**Independent Test**: Render `ExerciseDetailsPopup` for an exercise with a
three-shape diagram; assert three SVG shapes and that no Konva module was
imported.

---

### P3: Edit an existing diagram

**User Story**: As a coach, I want to adjust a drill I drew last week so that I
can refine it instead of redrawing it.

**Why P3**: The payoff of storing JSON rather than an image — but the feature
ships useful without it.

**Acceptance Criteria**:

1. WHEN the editor opens for an exercise that has a diagram THEN every stored
   shape SHALL be present and in its stored position
2. WHEN a change is saved THEN the stored diagram SHALL reflect it
3. WHEN Undo is used THEN the last change SHALL be reverted, up to 20 steps
4. WHEN Undo is used with nothing to undo THEN the action SHALL be disabled
5. WHEN Clear is used THEN every shape SHALL be removed, and this SHALL itself
   be undoable

---

## Edge Cases

- WHEN a diagram exceeds 60 shapes or 8KB serialized THEN the save SHALL be
  refused with a message naming the limit, and the editor SHALL stay open with
  the work intact
- WHEN a stored diagram has an unrecognised schema version THEN it SHALL render
  as no diagram rather than throwing
- WHEN a stored diagram contains an unknown shape kind THEN that shape SHALL be
  skipped and the rest SHALL render
- WHEN a shape is dragged outside the pitch THEN its position SHALL be clamped
  to the pitch bounds
- WHEN the editor is opened for an exercise that is deleted before saving THEN
  the save SHALL fail without corrupting the store
- WHEN `localStorage` rejects the write (quota) THEN the existing store error
  path SHALL surface it and the editor SHALL stay open
- WHEN an exercise is deleted THEN its diagram SHALL go with it — no orphan
- WHEN the browser cannot construct a canvas THEN the editor SHALL show a
  message rather than crashing the popup

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| DRAW-01 | *(foundation)* Dependency + schema | Design | Pending |
| DRAW-02 | P1: Diagram model and persistence | Design | Pending |
| DRAW-03 | P1: The editor | Design | Pending |
| DRAW-04 | P2: Read-only SVG rendering | Design | Pending |
| DRAW-05 | P3: Editing an existing diagram | Design | Pending |
| DRAW-06 | Edge cases: size and corruption guards | Design | Pending |

**Coverage:** 6 total, mapped in `tasks.md`

---

## Success Criteria

- [ ] A coach can draw a 3v2 rondo, save it, reload, and see it unchanged
- [ ] A typical diagram serializes under 2KB
- [ ] Konva is absent from the initial bundle — verified in the build output
- [ ] The read path renders in jsdom with no canvas
