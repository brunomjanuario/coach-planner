import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExerciseDiagramEditor from "../ExerciseDiagramEditor";
import { createDiagram, addShape, SHAPE_KINDS } from "../../lib/exerciseDiagram";

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
