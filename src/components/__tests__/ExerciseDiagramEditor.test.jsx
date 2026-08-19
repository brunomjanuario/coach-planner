import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExerciseDiagramEditor from "../ExerciseDiagramEditor";
import {
  createDiagram,
  addShape,
  orientationOf,
  SHAPE_KINDS,
  LIMITS,
  DEFAULT_ORIENTATION,
} from "../../lib/exerciseDiagram";

async function renderEditor(props = {}) {
  const utils = render(
    <ExerciseDiagramEditor diagram={null} onSave={() => {}} onClose={() => {}} {...props} />
  );
  await screen.findByTestId("diagram-stage");
  return utils;
}

test("renders through PopupShell as a dialog", async () => {
  await renderEditor();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

test("renders Save, Cancel, Undo and Clear actions", async () => {
  await renderEditor();
  expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
});

test("the editor module is behind a Suspense fallback before react-konva resolves", () => {
  // A never-resolving loader keeps the component suspended, so the fallback
  // must be what renders first (AC DRAW-04.3 — Konva is lazy-loaded, not in
  // the initial render).
  render(
    <ExerciseDiagramEditor
      diagram={null}
      onSave={() => {}}
      onClose={() => {}}
      konvaLoader={() => new Promise(() => {})}
    />
  );
  expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
  expect(screen.queryByTestId("diagram-stage")).not.toBeInTheDocument();
});

test("a tool palette renders one control per SHAPE_KINDS entry plus a select tool", async () => {
  await renderEditor();
  const toolbar = screen.getByRole("toolbar", { name: "Diagram tools" });
  expect(within(toolbar).getByRole("button", { name: "Select" })).toBeInTheDocument();
  for (const kind of SHAPE_KINDS) {
    // e.g. "player-a" -> /player.a/i, matches a "Player A" button without
    // coupling the test to the implementation's exact label wording.
    const namePattern = new RegExp(kind.replace(/-/g, ".?"), "i");
    expect(within(toolbar).getByRole("button", { name: namePattern })).toBeInTheDocument();
  }
  // one button per tool: SHAPE_KINDS + select, no more, no fewer
  expect(within(toolbar).getAllByRole("button")).toHaveLength(SHAPE_KINDS.length + 1);
});

test("selecting a tool marks it active via aria-pressed", async () => {
  const user = userEvent.setup();
  await renderEditor();
  const toolbar = screen.getByRole("toolbar", { name: "Diagram tools" });
  const selectButton = within(toolbar).getByRole("button", { name: "Select" });
  const coneButton = within(toolbar).getByRole("button", { name: "Cone" });

  expect(selectButton).toHaveAttribute("aria-pressed", "true");
  expect(coneButton).toHaveAttribute("aria-pressed", "false");

  await user.click(coneButton);

  expect(coneButton).toHaveAttribute("aria-pressed", "true");
  expect(selectButton).toHaveAttribute("aria-pressed", "false");
});

test("opening with no diagram starts from createDiagram() — an empty pitch (AC P1.2)", async () => {
  await renderEditor({ diagram: null });
  expect(screen.queryAllByTestId("konva-shape")).toHaveLength(0);
});

test("opening with a stored diagram starts from it, with every shape present (AC DRAW-05.1)", async () => {
  let stored = createDiagram();
  stored = addShape(stored, "cone", { x: 0.2, y: 0.2 });
  stored = addShape(stored, "player-a", { x: 0.5, y: 0.5 });
  stored = addShape(stored, "ball", { x: 0.8, y: 0.1 });

  await renderEditor({ diagram: stored });

  const shapeNodes = screen.getAllByTestId("konva-shape");
  expect(shapeNodes).toHaveLength(3);
  expect(shapeNodes.map((n) => n.getAttribute("data-shape-kind"))).toEqual([
    "cone",
    "player-a",
    "ball",
  ]);
});

test("a lazy-load failure renders a message inside the popup instead of unmounting it (edge case)", async () => {
  render(
    <ExerciseDiagramEditor
      diagram={null}
      onSave={() => {}}
      onClose={() => {}}
      konvaLoader={() => Promise.reject(new Error("canvas unavailable"))}
    />
  );

  expect(await screen.findByRole("alert")).toHaveTextContent(/could not load/i);
  // the popup itself is still mounted, not torn down by the failure
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
});

test("clicking Cancel calls onClose", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  await renderEditor({ onClose });

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onClose).toHaveBeenCalledTimes(1);
});

test("clicking Save calls onSave with the working diagram and then onClose", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const onClose = vi.fn();
  await renderEditor({ onSave, onClose });

  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSave).toHaveBeenCalledTimes(1);
  expect(onSave.mock.calls[0][0]).toMatchObject({ v: 1, pitch: "full", shapes: [] });
  expect(onClose).toHaveBeenCalledTimes(1);
});

// --- T5: place, move and delete markers -----------------------------------

test("with a marker tool active, a stage click adds a shape of that kind at that position (AC P1.3)", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  await renderEditor({ onSave });

  await user.click(screen.getByRole("button", { name: "Cone" }));
  fireEvent.click(screen.getByTestId("diagram-stage"), { clientX: 300, clientY: 186 });
  await user.click(screen.getByRole("button", { name: "Save" }));

  const saved = onSave.mock.calls[0][0];
  expect(saved.shapes).toHaveLength(1);
  expect(saved.shapes[0]).toMatchObject({ kind: "cone" });
});

test("the added position is normalised (0..1), not raw pixels, from a pixel-space stage click (AC P1.4)", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  await renderEditor({ onSave });

  await user.click(screen.getByRole("button", { name: "Ball" }));
  // stage is 600x372 (STAGE_SIZE) -> clicking at half-width/half-height
  // must store 0.5/0.5, not 300/186.
  fireEvent.click(screen.getByTestId("diagram-stage"), { clientX: 300, clientY: 186 });
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSave.mock.calls[0][0].shapes[0]).toMatchObject({ x: 0.5, y: 0.5 });
});

test("a drag callback calls moveShape and the shape's stored position updates (AC P1.4)", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const diagram = addShape(createDiagram(), "cone", { x: 0.1, y: 0.1 });
  await renderEditor({ diagram, onSave });

  const shapeNode = screen.getByTestId("konva-shape");
  fireEvent.mouseUp(shapeNode, { clientX: 450, clientY: 279 }); // 600*0.75, 372*0.75

  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSave.mock.calls[0][0].shapes[0]).toMatchObject({ x: 0.75, y: 0.75 });
});

test("a drag ending outside the pitch results in a clamped position (edge case)", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const diagram = addShape(createDiagram(), "cone", { x: 0.5, y: 0.5 });
  await renderEditor({ diagram, onSave });

  const shapeNode = screen.getByTestId("konva-shape");
  fireEvent.mouseUp(shapeNode, { clientX: 900, clientY: -50 });

  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSave.mock.calls[0][0].shapes[0]).toMatchObject({ x: 1, y: 0 });
});

test("selecting a shape and deleting removes it (AC P1.5)", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const diagram = addShape(createDiagram(), "cone", { x: 0.2, y: 0.2 });
  await renderEditor({ diagram, onSave });

  await user.click(screen.getByTestId("konva-shape"));
  await user.click(screen.getByRole("button", { name: "Delete" }));
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSave.mock.calls[0][0].shapes).toHaveLength(0);
});

test("the Delete control is disabled with nothing selected, and deleting does nothing (edge case)", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const diagram = addShape(createDiagram(), "cone", { x: 0.2, y: 0.2 });
  await renderEditor({ diagram, onSave });

  const deleteButton = screen.getByRole("button", { name: "Delete" });
  expect(deleteButton).toBeDisabled();

  await user.click(deleteButton);
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSave.mock.calls[0][0].shapes).toHaveLength(1);
});

test.each(["player-a", "player-b", "cone", "ball", "goal"])(
  "the %s marker can be placed on the stage",
  async (kind) => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    await renderEditor({ onSave });

    const toolbar = screen.getByRole("toolbar", { name: "Diagram tools" });
    const namePattern = new RegExp(kind.replace(/-/g, ".?"), "i");
    await user.click(within(toolbar).getByRole("button", { name: namePattern }));
    fireEvent.click(screen.getByTestId("diagram-stage"), { clientX: 60, clientY: 62 });
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave.mock.calls[0][0].shapes[0].kind).toBe(kind);
  }
);

// --- T6: lines, arrows, labels, undo and clear -----------------------------

test("a freehand line can be added, storing normalised points", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  await renderEditor({ onSave });

  await user.click(screen.getByRole("button", { name: "Line" }));
  const stage = screen.getByTestId("diagram-stage");
  fireEvent.mouseDown(stage, { clientX: 60, clientY: 93 }); // 0.1, 0.25
  fireEvent.mouseMove(stage, { clientX: 120, clientY: 186 }); // 0.2, 0.5
  fireEvent.mouseUp(stage, { clientX: 240, clientY: 279 }); // 0.4, 0.75

  await user.click(screen.getByRole("button", { name: "Save" }));

  const shape = onSave.mock.calls[0][0].shapes[0];
  expect(shape.kind).toBe("line");
  expect(shape.points).toEqual([
    [0.1, 0.25],
    [0.2, 0.5],
    [0.4, 0.75],
  ]);
});

test("a straight arrow can be added, storing only its start and end normalised points", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  await renderEditor({ onSave });

  await user.click(screen.getByRole("button", { name: "Arrow" }));
  const stage = screen.getByTestId("diagram-stage");
  fireEvent.mouseDown(stage, { clientX: 180, clientY: 186 }); // 0.3, 0.5
  fireEvent.mouseMove(stage, { clientX: 300, clientY: 200 }); // intermediate move ignored — arrow is straight
  fireEvent.mouseUp(stage, { clientX: 360, clientY: 279 }); // 0.6, 0.75

  await user.click(screen.getByRole("button", { name: "Save" }));

  const shape = onSave.mock.calls[0][0].shapes[0];
  expect(shape.kind).toBe("arrow");
  expect(shape.points).toEqual([
    [0.3, 0.5],
    [0.6, 0.75],
  ]);
});

test("a text label can be added with its text", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  vi.spyOn(window, "prompt").mockReturnValue("press here");
  await renderEditor({ onSave });

  await user.click(screen.getByRole("button", { name: "Text" }));
  fireEvent.click(screen.getByTestId("diagram-stage"), { clientX: 300, clientY: 186 });
  await user.click(screen.getByRole("button", { name: "Save" }));

  const shape = onSave.mock.calls[0][0].shapes[0];
  expect(shape).toMatchObject({ kind: "text", text: "press here", x: 0.5, y: 0.5 });

  window.prompt.mockRestore();
});

test("Undo is disabled with nothing to undo (AC DRAW-05.4)", async () => {
  await renderEditor();
  expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
});

test("undo reverts the last change and can be repeated to a depth of 20, bounded at the 21st (AC DRAW-05.3)", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  await renderEditor({ onSave });

  await user.click(screen.getByRole("button", { name: "Cone" }));
  const stage = screen.getByTestId("diagram-stage");
  for (let i = 0; i < 21; i += 1) {
    fireEvent.click(stage, { clientX: 10 + i, clientY: 10 });
  }

  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(onSave.mock.calls[0][0].shapes).toHaveLength(21);
  onSave.mockClear();

  const undoButton = screen.getByRole("button", { name: "Undo" });
  for (let i = 0; i < 20; i += 1) {
    await user.click(undoButton);
  }

  // the 20th undo lands on the oldest diagram still in the (20-deep) stack:
  // 1 shape, not 0 — the very first addition fell out of the bound.
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(onSave.mock.calls[0][0].shapes).toHaveLength(1);
  onSave.mockClear();

  // 21st undo: nothing left on the stack, so it is a real bound, not "some history".
  expect(undoButton).toBeDisabled();
  await user.click(undoButton);
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(onSave.mock.calls[0][0].shapes).toHaveLength(1);
});

test("undo state is in memory only — a freshly opened editor has nothing to undo even with existing shapes", async () => {
  const diagram = addShape(addShape(createDiagram(), "cone", { x: 0.1, y: 0.1 }), "ball", {
    x: 0.2,
    y: 0.2,
  });
  await renderEditor({ diagram });

  expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
});

test("Clear removes every shape (AC DRAW-05.5)", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const diagram = addShape(addShape(createDiagram(), "cone", { x: 0.1, y: 0.1 }), "ball", {
    x: 0.2,
    y: 0.2,
  });
  await renderEditor({ diagram, onSave });

  await user.click(screen.getByRole("button", { name: "Clear" }));
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSave.mock.calls[0][0].shapes).toHaveLength(0);
});

test("Clear is itself undoable, restoring every shape (AC DRAW-05.5)", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const diagram = addShape(addShape(createDiagram(), "cone", { x: 0.1, y: 0.1 }), "ball", {
    x: 0.2,
    y: 0.2,
  });
  await renderEditor({ diagram, onSave });

  await user.click(screen.getByRole("button", { name: "Clear" }));
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await user.click(screen.getByRole("button", { name: "Save" }));

  const saved = onSave.mock.calls[0][0];
  expect(saved.shapes).toHaveLength(2);
  expect(saved.shapes.map((s) => s.kind)).toEqual(["cone", "ball"]);
});

// --- T7: size guard at save --------------------------------------------

test("saving a diagram over the shape-count limit is refused, naming the limit (edge case)", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const onClose = vi.fn();
  let diagram = createDiagram();
  for (let i = 0; i < LIMITS.maxShapes + 1; i += 1) {
    diagram = addShape(diagram, "cone", { x: 0.1, y: 0.1 });
  }
  await renderEditor({ diagram, onSave, onClose });

  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSave).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent(String(LIMITS.maxShapes));
});

test("saving a diagram over the byte limit is refused, naming the limit (edge case)", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const onClose = vi.fn();
  const diagram = addShape(createDiagram(), "text", {
    x: 0.5,
    y: 0.5,
    text: "x".repeat(LIMITS.maxBytes),
  });
  await renderEditor({ diagram, onSave, onClose });

  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSave).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent(String(LIMITS.maxBytes));
});

test("after a refusal the editor stays open and every shape is still present (edge case)", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  let diagram = createDiagram();
  for (let i = 0; i < LIMITS.maxShapes + 1; i += 1) {
    diagram = addShape(diagram, "cone", { x: 0.1, y: 0.1 });
  }
  await renderEditor({ diagram, onClose });

  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getAllByTestId("konva-shape")).toHaveLength(LIMITS.maxShapes + 1);
});

test("saving a diagram at exactly the shape-count limit succeeds", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const onClose = vi.fn();
  let diagram = createDiagram();
  for (let i = 0; i < LIMITS.maxShapes; i += 1) {
    diagram = addShape(diagram, "cone", { x: 0.1, y: 0.1 });
  }
  await renderEditor({ diagram, onSave, onClose });

  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSave).toHaveBeenCalledTimes(1);
  expect(onSave.mock.calls[0][0].shapes).toHaveLength(LIMITS.maxShapes);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("Cancel closes the editor and returns the diagram unchanged from what it was on open (AC P1.7)", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const onClose = vi.fn();
  const original = addShape(createDiagram(), "cone", { x: 0.2, y: 0.2 });
  const originalSnapshot = JSON.parse(JSON.stringify(original));

  await renderEditor({ diagram: original, onSave, onClose });

  // make an in-editor change before cancelling
  await user.click(screen.getByRole("button", { name: "Ball" }));
  fireEvent.click(screen.getByTestId("diagram-stage"), { clientX: 300, clientY: 186 });

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onSave).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledTimes(1);
  // the diagram object the popup was opened with is exactly what it was —
  // the in-editor edit only ever touched the editor's own working copy.
  expect(original).toEqual(originalSnapshot);
});

// --- what is actually drawn on the canvas ---------------------------------
// These cover the class of bug the rest of this file cannot see: a diagram
// whose state is perfectly correct but that draws nothing, or that draws a
// marker somewhere other than where it is stored.

test("every marker's Group carries its own position, so a drag reports a position and not an offset", async () => {
  // A Group left at the origin with the marker positioned inside it makes
  // Konva's onDragEnd report the drag *delta* — the marker then teleports
  // to roughly the distance dragged, measured from the top-left corner.
  const diagram = addShape(createDiagram(), "cone", { x: 0.25, y: 0.5 });
  await renderEditor({ diagram });

  const group = screen.getByTestId("konva-shape");
  // stage is 600x372 in jsdom (STAGE_SIZE, since there is no layout to
  // measure): 0.25 * 600 = 150, 0.5 * 372 = 186.
  expect(group).toHaveAttribute("data-konva-x", "150");
  expect(group).toHaveAttribute("data-konva-y", "186");
});

test("a path shape's Group stays at the origin — its points are already in stage space", async () => {
  const diagram = addShape(createDiagram(), "line", {
    points: [
      [0.1, 0.1],
      [0.9, 0.9],
    ],
  });
  await renderEditor({ diagram });

  const group = screen.getByTestId("konva-shape");
  expect(group).toHaveAttribute("data-konva-x", "0");
  expect(group).toHaveAttribute("data-konva-y", "0");
});

test.each(SHAPE_KINDS)("a %s is drawn with a fill or a stroke, never invisible", async (kind) => {
  const point = kind === "line" || kind === "arrow"
    ? { points: [[0.2, 0.2], [0.8, 0.8]] }
    : { x: 0.5, y: 0.5, text: "label" };
  const diagram = addShape(createDiagram(), kind, point);
  await renderEditor({ diagram });

  const group = screen.getByTestId("konva-shape");
  // A Konva node with neither fill nor stroke paints nothing at all, so a
  // shape can be present in state, hit-testable, and still not there.
  const painted = Array.from(group.querySelectorAll("*")).some(
    (node) => node.hasAttribute("data-konva-fill") || node.hasAttribute("data-konva-stroke")
  );
  expect(painted).toBe(true);
});

test("the pitch is drawn behind the shapes, so the coach draws onto a pitch", async () => {
  await renderEditor({ diagram: createDiagram("full") });

  const stage = screen.getByTestId("diagram-stage");
  const grass = within(stage)
    .getAllByTestId("konva-rect")
    .find((node) => node.getAttribute("data-konva-fill"));
  expect(grass).toBeDefined();
  // the centre circle and halfway line only exist on a full pitch
  expect(within(stage).getAllByTestId("konva-line").length).toBeGreaterThan(0);
  expect(within(stage).getAllByTestId("konva-circle").length).toBeGreaterThan(0);
});

test("a blank pitch draws the grass but no markings", async () => {
  await renderEditor({ diagram: createDiagram("blank") });

  const stage = screen.getByTestId("diagram-stage");
  expect(within(stage).getAllByTestId("konva-rect")).toHaveLength(1);
  expect(within(stage).queryAllByTestId("konva-circle")).toHaveLength(0);
});

test("the selected shape is marked on the canvas, not only in the Delete button's state", async () => {
  const user = userEvent.setup();
  const diagram = addShape(createDiagram(), "cone", { x: 0.3, y: 0.3 });
  await renderEditor({ diagram });

  const group = screen.getByTestId("konva-shape");
  expect(group).toHaveAttribute("data-selected", "false");
  // one child: the cone body, with nothing highlighting it
  const before = group.children.length;

  await user.click(group);

  expect(group).toHaveAttribute("data-selected", "true");
  expect(group.children.length).toBeGreaterThan(before);
});

test("clicking empty grass with the select tool clears the selection", async () => {
  const user = userEvent.setup();
  const diagram = addShape(createDiagram(), "cone", { x: 0.3, y: 0.3 });
  await renderEditor({ diagram });

  await user.click(screen.getByTestId("konva-shape"));
  expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();

  fireEvent.click(screen.getByTestId("diagram-stage"), { clientX: 500, clientY: 300 });

  expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
});

test("an in-progress line is previewed while the drag is still going", async () => {
  const user = userEvent.setup();
  await renderEditor();

  await user.click(screen.getByRole("button", { name: "Line" }));
  const stage = screen.getByTestId("diagram-stage");
  fireEvent.mouseDown(stage, { clientX: 60, clientY: 93 });
  fireEvent.mouseMove(stage, { clientX: 240, clientY: 279 });

  // nothing committed to the diagram yet, but the coach can see the line
  expect(screen.queryAllByTestId("konva-shape")).toHaveLength(0);
  expect(screen.getByTestId("konva-drawing-preview")).toBeInTheDocument();

  fireEvent.mouseUp(stage, { clientX: 300, clientY: 300 });

  expect(screen.getAllByTestId("konva-shape")).toHaveLength(1);
  expect(screen.queryByTestId("konva-drawing-preview")).not.toBeInTheDocument();
});

// --- rotating a goal ------------------------------------------------------

test("Rotate is disabled with nothing selected and no goal tool active", async () => {
  await renderEditor();
  expect(screen.getByRole("button", { name: "Rotate" })).toBeDisabled();
});

test("Rotate is disabled for a shape that has no orientation", async () => {
  const user = userEvent.setup();
  const diagram = addShape(createDiagram(), "cone", { x: 0.3, y: 0.3 });
  await renderEditor({ diagram });

  await user.click(screen.getByTestId("konva-shape"));

  expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Rotate" })).toBeDisabled();
});

test("a selected goal can be rotated, and the stored orientation flips", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const diagram = addShape(createDiagram(), "goal", { x: 0.9, y: 0.5 });
  await renderEditor({ diagram, onSave });

  // select with a bare click: the react-konva mock turns any mouseup on a
  // shape into an onDragEnd, and userEvent's click sends one at (0, 0),
  // which would move the goal before we could assert it had not moved.
  fireEvent.click(screen.getByTestId("konva-shape"));
  await user.click(screen.getByRole("button", { name: "Rotate" }));
  await user.click(screen.getByRole("button", { name: "Save" }));

  const shape = onSave.mock.calls[0][0].shapes[0];
  expect(orientationOf(shape)).toBe("vertical");
  // rotating is a turn, not a move
  expect(shape).toMatchObject({ x: 0.9, y: 0.5 });
});

test("rotating is undoable like any other change (AC DRAW-05.3)", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const diagram = addShape(createDiagram(), "goal", { x: 0.5, y: 0.5 });
  await renderEditor({ diagram, onSave });

  await user.click(screen.getByTestId("konva-shape"));
  await user.click(screen.getByRole("button", { name: "Rotate" }));
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(orientationOf(onSave.mock.calls[0][0].shapes[0])).toBe(DEFAULT_ORIENTATION);
});

test("a goal is placed horizontally by default", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  await renderEditor({ onSave });

  await user.click(screen.getByRole("button", { name: "Goal" }));
  fireEvent.click(screen.getByTestId("diagram-stage"), { clientX: 300, clientY: 186 });
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(orientationOf(onSave.mock.calls[0][0].shapes[0])).toBe("horizontal");
});

test("with the Goal tool active, Rotate sets which way the next goal goes down", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  await renderEditor({ onSave });

  await user.click(screen.getByRole("button", { name: "Goal" }));
  await user.click(screen.getByRole("button", { name: "Rotate" }));
  const stage = screen.getByTestId("diagram-stage");
  fireEvent.click(stage, { clientX: 60, clientY: 186 });
  fireEvent.click(stage, { clientX: 540, clientY: 186 });
  await user.click(screen.getByRole("button", { name: "Save" }));

  // both goals go down the way the tool was set — one rotation, not one per goal
  const shapes = onSave.mock.calls[0][0].shapes;
  expect(shapes).toHaveLength(2);
  expect(shapes.map(orientationOf)).toEqual(["vertical", "vertical"]);
});

test("rotating a placed goal also sets which way the next one goes down", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const diagram = addShape(createDiagram(), "goal", { x: 0.1, y: 0.5 });
  await renderEditor({ diagram, onSave });

  await user.click(screen.getByTestId("konva-shape"));
  await user.click(screen.getByRole("button", { name: "Rotate" }));

  await user.click(screen.getByRole("button", { name: "Goal" }));
  fireEvent.click(screen.getByTestId("diagram-stage"), { clientX: 540, clientY: 186 });
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSave.mock.calls[0][0].shapes.map(orientationOf)).toEqual([
    "vertical",
    "vertical",
  ]);
});

test("a rotated goal is drawn turned, not just recorded as turned", async () => {
  const user = userEvent.setup();
  const diagram = addShape(createDiagram(), "goal", { x: 0.5, y: 0.5 });
  await renderEditor({ diagram });

  const flat = within(screen.getByTestId("konva-shape")).getByTestId("konva-rect");
  const flatWidth = Number(flat.getAttribute("data-konva-width"));
  const flatHeight = Number(flat.getAttribute("data-konva-height"));
  expect(flatWidth).toBeGreaterThan(flatHeight);

  await user.click(screen.getByTestId("konva-shape"));
  await user.click(screen.getByRole("button", { name: "Rotate" }));

  const turned = within(screen.getByTestId("konva-shape")).getByTestId("konva-rect");
  expect(Number(turned.getAttribute("data-konva-width"))).toBe(flatHeight);
  expect(Number(turned.getAttribute("data-konva-height"))).toBe(flatWidth);
});
