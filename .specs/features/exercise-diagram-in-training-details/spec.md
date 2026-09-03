# Exercise Diagram in Training Details Specification

## Problem Statement

A coach opening a training's details (`TrainingDetailsPopup`) sees each exercise
as a single one-line text row; the exercise's diagram is only visible after
clicking that row to open `ExerciseDetailsPopup`. The diagram is the most
scannable, at-a-glance part of an exercise ("what does the drill look like"),
yet it is the one thing you cannot see without an extra click. The coach wants
the diagram to render directly on the training details screen — visible like a
photo, no click required.

## Goals

- [ ] Each exercise that has a diagram shows a read-only diagram preview inline
      in the training details view, with no click-through required.
- [ ] The change reuses the existing read path (`DiagramView` / `deserialize`)
      — no new rendering engine, no Konva in this path, no raster/image asset.
- [ ] Exercises without a (usable) diagram render exactly as they do today — no
      empty frame, no placeholder box.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Editing a diagram from the training details view | The editor (`ExerciseDiagramEditor`, feature 29) stays behind the exercise's edit flow. This feature is read-only surfacing only. |
| Changing `ExerciseDetailsPopup` | It already renders the diagram (feature 29, P2). The click-through detail view stays exactly as-is; this feature adds the preview one level up. |
| A lightbox / zoom / full-screen diagram view | "Appear on the screen" is satisfied by an inline preview. Zoom is a separate interaction. |
| Rendering diagrams anywhere else (TrainingCard, Calendar, PDF export) | Those surfaces are out of the stated request (the training details screen). PDF export already has its own path (feature 41). |
| Any change to the diagram storage format or the `diagram` field | The field and its SVG read path already exist (feature 29). |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here — nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| "on the screen, on the training details" = inside `TrainingDetailsPopup`, one preview per exercise in the existing exercise list | Render the preview attached to each exercise's list item | That popup is the "training details" surface; the diagram belongs to an exercise, and exercises are already listed there one per row. | n |
| Preview is a bounded thumbnail, not full-bleed | Constrained width (a small preview sized to keep the exercise list scannable), preserving the diagram's fixed aspect ratio via `DiagramView`'s viewBox | The list may hold several exercises inside a height-capped popup (`PopupShell`, 85vh + scroll); a full-size diagram per row would bury the text. Coordinates are normalised 0–1 so any width renders correctly (feature 29). | n |
| "as a photo or something like that" = the existing read-only vector `DiagramView`, not a raster image | Reuse `DiagramView` (inline SVG) | Feature 29 explicitly anticipated "any future list preview" reusing the SVG read path; there is no raster representation of a diagram, and introducing one is out of scope. | n |
| The existing click-to-open behavior is kept | Clicking the exercise still opens `ExerciseDetailsPopup`; the preview does not replace or remove that affordance | The detail popup shows the full labelled fields plus its own diagram; the preview is additive, not a replacement. | n |
| An exercise with no diagram, or a corrupt/unrecognised diagram, shows no preview region | `deserialize(diagram) == null` → render nothing for that exercise (row text unchanged) | Matches the established "no empty frame" rule (feature 28 diagram slot, feature 29 read path); `deserialize` is total and returns `null` for absent/corrupt/unknown-version data. | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: See each exercise's diagram inline in training details ⭐ MVP

**User Story**: As a coach, I want each exercise's diagram to render directly in
the training details popup so that I can see what every drill looks like without
opening each exercise one by one.

**Why P1**: This is the entire request. Without it the diagram stays one click
away, which is the pain point.

**Acceptance Criteria**:

1. WHEN `TrainingDetailsPopup` renders a training whose exercise has a usable
   diagram (`deserialize(exercise.diagram)` is non-null) THEN the system SHALL
   render that exercise's diagram as a read-only `DiagramView` (inline SVG)
   within that exercise's item in the exercise list.
2. WHEN a training has multiple exercises with diagrams THEN the system SHALL
   render each exercise's own diagram against that exercise (no diagram shown
   against the wrong exercise, none shared).
3. WHEN a diagram preview is rendered THEN it SHALL be read-only — it SHALL NOT
   expose any editing control and SHALL NOT import Konva / `react-konva` into
   this path (the `DiagramView` SVG read path only).
4. WHEN the diagram preview is rendered THEN it SHALL be bounded to a preview
   size (constrained width) rather than filling the popup, so the exercise
   list's text remains readable.

**Independent Test**: Render `TrainingDetailsPopup` with a training whose
exercise carries a valid diagram; assert a `DiagramView` (e.g. its
`data-testid="diagram-view"` / `role="img"` "Exercise diagram") appears without
any click, and assert no editor/Konva is present.

---

### P2: Exercises without a diagram are unchanged

**User Story**: As a coach, I want exercises that have no diagram to look exactly
as they do today so that the list is not cluttered with empty boxes.

**Why P2**: Guards against a regression the feature could easily introduce (an
empty frame per diagram-less exercise). Not the headline value, but required for
correctness.

**Acceptance Criteria**:

1. WHEN an exercise has no diagram (`exercise.diagram` is null/absent) THEN the
   system SHALL render no diagram region for that exercise.
2. WHEN an exercise's diagram is corrupt or has an unrecognised schema version
   (`deserialize` returns null) THEN the system SHALL render no diagram region
   for it and SHALL NOT throw.
3. WHEN a training has no exercises at all THEN the exercise list SHALL render
   its existing "No exercises" state unchanged.

**Independent Test**: Render `TrainingDetailsPopup` with (a) an exercise with
`diagram: null`, (b) an exercise with a malformed diagram, and (c) a training
with no exercises; assert no `diagram-view` SVG renders in any case and nothing
throws.

---

### P3: Preview does not break the existing exercise interactions

**User Story**: As a coach, I want the existing exercise row behavior — opening
the full details, exporting, rating, deleting — to keep working with the preview
present so that nothing I already rely on regresses.

**Why P3**: Additive-safety. The popup already has several behaviors (open
detail, Export PDF, Rate squad, Delete); the preview must not interfere.

**Acceptance Criteria**:

1. WHEN a coach clicks an exercise that has a diagram preview THEN the system
   SHALL still open `ExerciseDetailsPopup` for that exercise (the preview does
   not suppress or replace the click-to-open affordance).
2. WHEN the preview is present THEN the popup's existing actions (Close, Rate
   squad, Export PDF, Edit, Delete) SHALL remain functional and unchanged.

**Independent Test**: With a diagram-bearing exercise rendered, click the
exercise and assert `ExerciseDetailsPopup` opens; assert the footer actions are
still present and operable.

---

## Edge Cases

- WHEN an exercise's `diagram` is present but `deserialize` returns null
  (corrupt JSON, unknown version, unknown-only shapes reduced to empty) THEN no
  preview region renders and no error is thrown.
- WHEN several exercises each have a diagram inside a height-capped popup THEN
  the previews SHALL scroll within `PopupShell`'s existing scroll region and
  SHALL NOT push the footer actions off-screen (the popup's height cap is
  owned by `PopupShell`, AD-009).
- WHEN a diagram preview is rendered at a narrow popup width THEN every shape
  SHALL keep its correct relative position (normalised 0–1 coordinates via
  `DiagramView`'s fixed viewBox — feature 29).
- WHEN the same exercise data is shown here and in `ExerciseDetailsPopup` THEN
  both SHALL render the same diagram from the same `exercise.diagram` (single
  source, no divergence).

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| TDIAG-01 | P1: Inline diagram preview renders for diagram-bearing exercises | Execute | Pending |
| TDIAG-02 | P1: Each exercise shows its own diagram, correctly associated | Execute | Pending |
| TDIAG-03 | P1: Preview is read-only, SVG read path only (no Konva/editor) | Execute | Pending |
| TDIAG-04 | P1: Preview is bounded to a preview size, list text stays readable | Execute | Pending |
| TDIAG-05 | P2: No diagram → no region rendered | Execute | Pending |
| TDIAG-06 | P2: Corrupt/unrecognised diagram → no region, no throw | Execute | Pending |
| TDIAG-07 | P2: No-exercises state renders unchanged | Execute | Pending |
| TDIAG-08 | P3: Clicking a diagram-bearing exercise still opens `ExerciseDetailsPopup` | Execute | Pending |
| TDIAG-09 | P3: Existing popup footer actions remain functional | Execute | Pending |

**ID format:** `TDIAG-[NUMBER]`

**Status values:** Pending → Implementing → Verified

**Coverage:** 9 total, all mapped to the single-component Execute (Design/Tasks
skipped — see below).

---

## Sizing note (why Design and Tasks are skipped)

Small/Medium: the change is confined to `src/components/TrainingDetailsPopup.jsx`
(render a `DiagramView` per diagram-bearing exercise in the existing list) plus
its co-located test `src/components/__tests__/TrainingDetailsPopup.test.jsx`.
Both building blocks already exist and are proven:

- `DiagramView` (`src/components/DiagramView.jsx`) — read-only inline-SVG
  renderer; returns `null` for a null/corrupt diagram.
- `deserialize` (`src/lib/exerciseDiagram.js`) — total function, returns `null`
  for absent/corrupt/unknown-version data; the "has a diagram" test used by
  `ExerciseDetailsPopup` (`deserialize(current.diagram) != null`).

No architectural decisions, no new patterns, no data-layer change. Per the
skill's auto-sizing, Design and Tasks add no value here and are skipped; Execute
lists its atomic steps inline.

---

## Success Criteria

- [ ] Opening a training whose exercises have diagrams shows those diagrams on
      the training details screen with zero clicks.
- [ ] No empty frame or placeholder appears for exercises lacking a usable
      diagram; the no-exercises state is unchanged.
- [ ] Clicking an exercise still opens its full `ExerciseDetailsPopup`, and all
      existing popup actions still work.
- [ ] `npm run lint`, `npm run build`, and `npm test -- --run` all pass; the new
      behavior is covered by tests derived from the acceptance criteria above.
