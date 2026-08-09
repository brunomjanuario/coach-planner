import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExerciseFields from "../ExerciseFields";

afterEach(() => {
  vi.restoreAllMocks();
});

function renderFields(props = {}) {
  return render(<ExerciseFields onAdd={vi.fn()} {...props} />);
}

async function fillValid(user) {
  await user.type(screen.getByLabelText(/description/i), "SSG");
  await user.type(screen.getByLabelText(/duration/i), "20");
}

test("renders inputs for description, duration, number of players and repetitions (AC TFORM-01.1)", () => {
  renderFields();

  expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/number of players/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/repetitions/i)).toBeInTheDocument();
});

test("calls onAdd with all four values plus id and image when all fields are filled (AC TFORM-01.2, TFORM-02.5)", async () => {
  const onAdd = vi.fn();
  const user = userEvent.setup();
  renderFields({ onAdd });

  await user.type(screen.getByLabelText(/description/i), "SSG");
  await user.type(screen.getByLabelText(/duration/i), "20");
  await user.type(screen.getByLabelText(/number of players/i), "8");
  await user.type(screen.getByLabelText(/repetitions/i), "3");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(onAdd).toHaveBeenCalledTimes(1);
  const exercise = onAdd.mock.calls[0][0];
  expect(exercise).toMatchObject({
    description: "SSG",
    duration: 20,
    numberOfPlayers: 8,
    repetitions: 3,
    image: "",
  });
  expect(typeof exercise.id).toBe("string");
  expect(exercise.id.length).toBeGreaterThan(0);
});

test("emits null for omitted numeric fields, never 0 or undefined (AC TFORM-01.3)", async () => {
  const onAdd = vi.fn();
  const user = userEvent.setup();
  renderFields({ onAdd });

  await fillValid(user);
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(onAdd).toHaveBeenCalledWith(
    expect.objectContaining({ numberOfPlayers: null, repetitions: null })
  );
});

test("blocks the add and shows a field-level message when duration is zero (AC TFORM-03.1)", async () => {
  const onAdd = vi.fn();
  const user = userEvent.setup();
  renderFields({ onAdd });

  await user.type(screen.getByLabelText(/description/i), "SSG");
  await user.type(screen.getByLabelText(/duration/i), "0");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(onAdd).not.toHaveBeenCalled();
  expect(
    await screen.findByText(/duration must be a positive number/i)
  ).toBeInTheDocument();
});

test("blocks the add and shows a field-level message when duration is negative (AC TFORM-03.1)", async () => {
  const onAdd = vi.fn();
  const user = userEvent.setup();
  renderFields({ onAdd });

  await user.type(screen.getByLabelText(/description/i), "SSG");
  await user.type(screen.getByLabelText(/duration/i), "-5");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(onAdd).not.toHaveBeenCalled();
  expect(
    await screen.findByText(/duration must be a positive number/i)
  ).toBeInTheDocument();
});

test("blocks the add and shows a field-level message when duration is non-numeric (AC TFORM-03.1)", async () => {
  const onAdd = vi.fn();
  const user = userEvent.setup();
  renderFields({ onAdd });

  await user.type(screen.getByLabelText(/description/i), "SSG");
  const durationInput = screen.getByLabelText(/duration/i);
  await user.type(durationInput, "abc");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(onAdd).not.toHaveBeenCalled();
  expect(
    await screen.findByText(/duration must be a positive number/i)
  ).toBeInTheDocument();
});

test("blocks the add with a field-level message when number of players is less than 1 (AC TFORM-03.2)", async () => {
  const onAdd = vi.fn();
  const user = userEvent.setup();
  renderFields({ onAdd });

  await fillValid(user);
  await user.type(screen.getByLabelText(/number of players/i), "0");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(onAdd).not.toHaveBeenCalled();
  expect(
    await screen.findByText(/number of players must be at least 1/i)
  ).toBeInTheDocument();
});

test("blocks the add with a field-level message when repetitions is less than 1 (AC TFORM-03.3)", async () => {
  const onAdd = vi.fn();
  const user = userEvent.setup();
  renderFields({ onAdd });

  await fillValid(user);
  await user.type(screen.getByLabelText(/repetitions/i), "0");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(onAdd).not.toHaveBeenCalled();
  expect(
    await screen.findByText(/repetitions must be at least 1/i)
  ).toBeInTheDocument();
});

test("blocks the add when description is whitespace-only (AC TFORM-03.4)", async () => {
  const onAdd = vi.fn();
  const user = userEvent.setup();
  renderFields({ onAdd });

  await user.type(screen.getByLabelText(/description/i), "   ");
  await user.type(screen.getByLabelText(/duration/i), "20");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(onAdd).not.toHaveBeenCalled();
  expect(await screen.findByText(/description is required/i)).toBeInTheDocument();
});

test("correcting a blocked field clears only that field's message (AC TFORM-03.5)", async () => {
  const onAdd = vi.fn();
  const user = userEvent.setup();
  renderFields({ onAdd });

  await user.type(screen.getByLabelText(/description/i), "SSG");
  await user.type(screen.getByLabelText(/duration/i), "0");
  await user.type(screen.getByLabelText(/number of players/i), "0");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(
    await screen.findByText(/duration must be a positive number/i)
  ).toBeInTheDocument();
  expect(
    screen.getByText(/number of players must be at least 1/i)
  ).toBeInTheDocument();

  const durationInput = screen.getByLabelText(/duration/i);
  await user.clear(durationInput);
  await user.type(durationInput, "20");

  expect(
    screen.queryByText(/duration must be a positive number/i)
  ).not.toBeInTheDocument();
  expect(
    screen.getByText(/number of players must be at least 1/i)
  ).toBeInTheDocument();
});

test("onAdd is not called on a blocked submit", async () => {
  const onAdd = vi.fn();
  const user = userEvent.setup();
  renderFields({ onAdd });

  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(onAdd).not.toHaveBeenCalled();
});

test("clears the fields after a successful add", async () => {
  const onAdd = vi.fn();
  const user = userEvent.setup();
  renderFields({ onAdd });

  await fillValid(user);
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(screen.getByLabelText(/description/i)).toHaveValue("");
  expect(screen.getByLabelText(/duration/i)).toHaveValue(null);
});

// --- T8: diagram wiring (AC P1.1, P1.6) ------------------------------------

test('renders a "Draw diagram" action that opens the diagram editor (AC P1.1)', async () => {
  const user = userEvent.setup();
  renderFields();

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Draw diagram" }));

  expect(await screen.findByRole("dialog")).toBeInTheDocument();
});

test("a diagram saved in the editor is carried through onAdd's payload alongside the untouched image field (AC P1.6)", async () => {
  const onAdd = vi.fn();
  const user = userEvent.setup();
  renderFields({ onAdd });

  await fillValid(user);
  await user.click(screen.getByRole("button", { name: "Draw diagram" }));
  await screen.findByTestId("diagram-stage");

  await user.click(screen.getByRole("button", { name: "Cone" }));
  fireEvent.click(screen.getByTestId("diagram-stage"), { clientX: 300, clientY: 186 });
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(onAdd).toHaveBeenCalledTimes(1);
  const exercise = onAdd.mock.calls[0][0];
  expect(exercise.image).toBe("");
  expect(exercise.diagram).toMatchObject({
    v: 1,
    shapes: [expect.objectContaining({ kind: "cone" })],
  });
});

test("opening the editor for an exercise with no diagram starts empty, and an exercise's stored diagram is passed back in on edit", async () => {
  const user = userEvent.setup();
  const storedDiagram = { v: 1, pitch: "full", shapes: [{ id: "s1", kind: "ball", x: 0.4, y: 0.4 }] };
  renderFields({
    exercise: {
      id: "e1",
      description: "SSG",
      duration: 20,
      numberOfPlayers: 8,
      repetitions: 3,
      image: "",
      diagram: storedDiagram,
    },
    onCancelEdit: () => {},
  });

  await user.click(screen.getByRole("button", { name: "Draw diagram" }));

  const shapeNodes = await screen.findAllByTestId("konva-shape");
  expect(shapeNodes).toHaveLength(1);
  expect(shapeNodes[0]).toHaveAttribute("data-shape-kind", "ball");
});

test("cancelling the exercise form after editing the diagram discards it — onAdd is never called (design.md: no partial saves)", async () => {
  const onAdd = vi.fn();
  const onCancelEdit = vi.fn();
  const user = userEvent.setup();
  renderFields({
    exercise: {
      id: "e1",
      description: "SSG",
      duration: 20,
      numberOfPlayers: 8,
      repetitions: 3,
      image: "",
      diagram: null,
    },
    onAdd,
    onCancelEdit,
  });

  await user.click(screen.getByRole("button", { name: "Draw diagram" }));
  const dialog = await screen.findByRole("dialog");
  await within(dialog).findByTestId("diagram-stage");
  await user.click(within(dialog).getByRole("button", { name: "Cone" }));
  fireEvent.click(within(dialog).getByTestId("diagram-stage"), { clientX: 300, clientY: 186 });
  await user.click(within(dialog).getByRole("button", { name: "Save" }));

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onCancelEdit).toHaveBeenCalledTimes(1);
  expect(onAdd).not.toHaveBeenCalled();
});

test("closing the diagram editor's own Cancel leaves the exercise's diagram unchanged, and Add omits any in-editor-only change", async () => {
  const onAdd = vi.fn();
  const user = userEvent.setup();
  renderFields({ onAdd });

  await fillValid(user);
  await user.click(screen.getByRole("button", { name: "Draw diagram" }));
  await screen.findByTestId("diagram-stage");
  await user.click(screen.getByRole("button", { name: "Cone" }));
  fireEvent.click(screen.getByTestId("diagram-stage"), { clientX: 300, clientY: 186 });
  // Cancel the diagram popup itself (not Save) — the in-progress shape must
  // not reach the exercise.
  await user.click(screen.getByRole("button", { name: "Cancel" }));

  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(onAdd).toHaveBeenCalledTimes(1);
  expect(onAdd.mock.calls[0][0].diagram).toBeNull();
});

test("Add is primary; when editing, Cancel is secondary and Save is primary (AC BTN-04.1)", () => {
  renderFields();
  expect(screen.getByRole("button", { name: "Add" }).className).toMatch(/bg-blue-600/);

  renderFields({
    exercise: { id: "e1", description: "SSG", duration: 20, numberOfPlayers: 8, repetitions: 3 },
    onCancelEdit: () => {},
  });
  const cancelButton = screen.getByRole("button", { name: "Cancel" });
  const saveButton = screen.getByRole("button", { name: "Save" });
  expect(cancelButton.className).toMatch(/border/);
  expect(cancelButton.className).not.toMatch(/bg-gray-300/);
  expect(saveButton.className).toMatch(/bg-blue-600/);
});
