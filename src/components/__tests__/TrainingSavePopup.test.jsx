import { render, screen, within, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TrainingSavePopup from "../TrainingSavePopup";
import { teamService } from "../../services/teamService";
import { trainingService } from "../../services/trainingService";

afterEach(() => {
  vi.restoreAllMocks();
});

const sampleTeams = [
  { id: 1, club: "Amadora", name: "Sub-11" },
  { id: 2, club: "Areias", name: "Sub-19" },
];

function renderPopup(props = {}) {
  return render(
    <TrainingSavePopup onClose={() => {}} {...props} />
  );
}

test("loads teams via teamService.getAll rather than a teams prop", async () => {
  const getAllSpy = vi
    .spyOn(teamService, "getAll")
    .mockResolvedValue(sampleTeams);

  renderPopup();

  await screen.findByRole("option", { name: "Amadora Sub-11" });
  expect(getAllSpy).toHaveBeenCalledTimes(1);
});

test("renders every team as an option formatted as club + name", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);

  renderPopup();

  const select = await screen.findByRole("combobox");
  expect(
    within(select).getByRole("option", { name: "Amadora Sub-11" })
  ).toBeInTheDocument();
  expect(
    within(select).getByRole("option", { name: "Areias Sub-19" })
  ).toBeInTheDocument();
});

test("renders the select disabled while teams are still loading", () => {
  vi.spyOn(teamService, "getAll").mockReturnValue(new Promise(() => {}));

  renderPopup();

  expect(screen.getByRole("combobox")).toBeDisabled();
});

test("renders the select disabled with a message pointing at Teams when there are zero teams", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue([]);

  renderPopup();

  expect(await screen.findByText(/No teams yet/)).toBeInTheDocument();
  expect(screen.getByRole("combobox")).toBeDisabled();
});

test("enables the select once teams have loaded", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);

  renderPopup();

  await screen.findByRole("option", { name: "Amadora Sub-11" });
  expect(screen.getByRole("combobox")).toBeEnabled();
});

test("logs an error and stops loading when teamService.getAll rejects", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(teamService, "getAll").mockRejectedValueOnce(new Error("boom"));

  renderPopup();

  await screen.findByText(/No teams yet/);
  expect(errorSpy).toHaveBeenCalledWith("Failed to load teams:", expect.any(Error));
});

test("pre-selects the team matching the teamId prop once teams have loaded", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);

  renderPopup({ teamId: 2 });

  await screen.findByRole("option", { name: "Amadora Sub-11" });
  expect(screen.getByRole("combobox")).toHaveValue("2");
});

test("leaves the select empty when no teamId prop is passed", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);

  renderPopup();

  await screen.findByRole("option", { name: "Amadora Sub-11" });
  expect(screen.getByRole("combobox")).toHaveValue("");
});

test("leaves the select empty when the teamId prop matches no loaded team", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);

  renderPopup({ teamId: 999 });

  await screen.findByRole("option", { name: "Amadora Sub-11" });
  expect(screen.getByRole("combobox")).toHaveValue("");
});

test("does not default to the first team when teamId is undefined", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);

  renderPopup({ teamId: undefined });

  await screen.findByRole("option", { name: "Amadora Sub-11" });
  expect(screen.getByRole("combobox")).not.toHaveValue("1");
  expect(screen.getByRole("combobox")).toHaveValue("");
});

async function fillDateAndDuration(user, container) {
  await user.type(
    container.querySelector('[name="day"]'),
    "2027-01-01T10:00"
  );
}

test("blocks submission and shows a validation message when no team is selected", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const createSpy = vi.spyOn(trainingService, "create");
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await fillDateAndDuration(user, container);

  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(
    await screen.findByText("Please select a team.")
  ).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
  expect(createSpy).not.toHaveBeenCalled();
});

test("choosing a team clears the validation message", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit: vi.fn() });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await fillDateAndDuration(user, container);
  await user.click(screen.getByRole("button", { name: "Create" }));
  await screen.findByText("Please select a team.");

  await user.selectOptions(screen.getByRole("combobox"), "Amadora Sub-11");

  expect(screen.queryByText("Please select a team.")).not.toBeInTheDocument();
});

test("submits with the correct teamId when a team is chosen (AC TTA-03.2)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(screen.getByRole("combobox"), "Areias Sub-19");
  await fillDateAndDuration(user, container);

  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ teamId: 2 })
  );
});

test("invokes the onSubmit prop instead of calling trainingService.create directly (shadowed-callback fix)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const createSpy = vi.spyOn(trainingService, "create");
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(screen.getByRole("combobox"), "Amadora Sub-11");
  await fillDateAndDuration(user, container);

  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(createSpy).not.toHaveBeenCalled();
});

test("blocks submission with a clear message when the selected team no longer exists (edge case)", async () => {
  vi.spyOn(teamService, "getAll")
    .mockResolvedValueOnce(sampleTeams)
    .mockResolvedValueOnce([sampleTeams[1]]);
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(screen.getByRole("combobox"), "Amadora Sub-11");
  await fillDateAndDuration(user, container);

  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(
    await screen.findByText(
      "Selected team no longer exists. Please choose another team."
    )
  ).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("shows an error and does not close when the onSubmit prop rejects", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const onSubmit = vi.fn().mockRejectedValue(new Error("storage full"));
  const onClose = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit, onClose });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(screen.getByRole("combobox"), "Amadora Sub-11");
  await fillDateAndDuration(user, container);

  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(
    await screen.findByText("Failed to save the training. Please try again.")
  ).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
  expect(errorSpy).toHaveBeenCalledWith(
    "Failed to save training:",
    expect.any(Error)
  );
});

async function addExercise(user, { description, duration, players, repetitions } = {}) {
  await user.type(screen.getByLabelText(/description/i), description ?? "SSG");
  await user.type(screen.getByLabelText(/duration/i), duration ?? "20");
  if (players != null) {
    await user.type(screen.getByLabelText(/number of players/i), players);
  }
  if (repetitions != null) {
    await user.type(screen.getByLabelText(/repetitions/i), repetitions);
  }
  await user.click(screen.getByRole("button", { name: "Add" }));
}

test("renders an added exercise's duration, players and repetitions in the list, not just description", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  renderPopup({ onSubmit: vi.fn() });
  await screen.findByRole("option", { name: "Amadora Sub-11" });

  await addExercise(user, { description: "SSG", duration: "20", players: "8", repetitions: "3" });

  const item = screen.getByText(/SSG/).closest("li");
  expect(item).toHaveTextContent("20min");
  expect(item).toHaveTextContent("8 players");
  expect(item).toHaveTextContent("x3");
});

test("the saved training carries all four exercise fields (AC TFORM-01.2)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(screen.getByRole("combobox"), "Amadora Sub-11");
  await fillDateAndDuration(user, container);
  await addExercise(user, { description: "SSG", duration: "20", players: "8", repetitions: "3" });

  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({
      exercises: [
        expect.objectContaining({
          description: "SSG",
          duration: 20,
          numberOfPlayers: 8,
          repetitions: 3,
          image: "",
        }),
      ],
    })
  );
});

test("stamps trainingId on each added exercise so created records match the seeded shape", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(screen.getByRole("combobox"), "Amadora Sub-11");
  await fillDateAndDuration(user, container);
  await addExercise(user);

  await user.click(screen.getByRole("button", { name: "Create" }));

  const [[submitted]] = onSubmit.mock.calls;
  expect(submitted.exercises[0]).toHaveProperty("trainingId");
});

test("a saved training reloaded from the store returns every exercise field unchanged (AC TFORM-02.4)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit: (t) => trainingService.create(t) });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(screen.getByRole("combobox"), "Amadora Sub-11");
  await fillDateAndDuration(user, container);
  await addExercise(user, { description: "Custom SSG Drill", duration: "20", players: "8", repetitions: "3" });

  await user.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(async () => {
    const trainings = await trainingService.getAll();
    const found = trainings.find((t) =>
      t.exercises.some((ex) => ex.description === "Custom SSG Drill")
    );
    expect(found).toBeDefined();
    expect(found.exercises[0]).toMatchObject({
      description: "Custom SSG Drill",
      duration: 20,
      numberOfPlayers: 8,
      repetitions: 3,
      image: "",
    });
  });
});

test("renders through PopupShell with the exercise list inside the scroll region and Create outside it (AC POPUP-02.4)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  renderPopup({ onSubmit: vi.fn() });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await addExercise(user, { description: "SSG", duration: "20" });

  const dialog = screen.getByRole("dialog");
  const shellBody = dialog.querySelector(".overflow-y-auto.min-h-0");
  const exerciseList = screen.getByText(/SSG/).closest("ul");
  const createButton = screen.getByRole("button", { name: "Create" });

  expect(shellBody).toContainElement(exerciseList);
  expect(shellBody).not.toContainElement(createButton);
});

test("20+ exercises scroll within the popup without pushing the action buttons off-screen (edge case)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit: vi.fn() });
  await screen.findByRole("option", { name: "Amadora Sub-11" });

  for (let i = 0; i < 21; i++) {
    await addExercise(user, { description: `Ex${i}`, duration: "5" });
  }

  const list = container.querySelector("ul.overflow-y-auto");
  expect(list).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
});

test("an exercise's edit control loads its values into the editor (AC TFORM-04.1)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  renderPopup({ onSubmit: vi.fn() });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await addExercise(user, { description: "SSG", duration: "20", players: "8", repetitions: "3" });

  await user.click(screen.getByRole("button", { name: "Edit" }));

  expect(screen.getByLabelText(/description/i)).toHaveValue("SSG");
  expect(screen.getByLabelText(/duration/i)).toHaveValue(20);
  expect(screen.getByLabelText(/number of players/i)).toHaveValue(8);
  expect(screen.getByLabelText(/repetitions/i)).toHaveValue(3);
  expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
});

test("saving an edit updates the exercise in place, preserving id and list position (AC TFORM-04.2)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  renderPopup({ onSubmit: vi.fn() });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await addExercise(user, { description: "First", duration: "10" });
  await addExercise(user, { description: "Second", duration: "20" });
  const items = screen.getAllByRole("listitem");

  await user.click(within(items[0]).getByRole("button", { name: "Edit" }));
  const durationInput = screen.getByLabelText(/duration/i);
  await user.clear(durationInput);
  await user.type(durationInput, "15");
  await user.click(screen.getByRole("button", { name: "Save" }));

  const updatedItems = screen.getAllByRole("listitem");
  expect(updatedItems).toHaveLength(2);
  expect(updatedItems[0]).toHaveTextContent("First");
  expect(updatedItems[0]).toHaveTextContent("15min");
  expect(updatedItems[1]).toHaveTextContent("Second");
});

test("the editor's action label switches between Add and Save by mode", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  renderPopup({ onSubmit: vi.fn() });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();

  await addExercise(user, { description: "SSG", duration: "20" });
  await user.click(screen.getByRole("button", { name: "Edit" }));

  expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add" })).not.toBeInTheDocument();
});

test("cancelling an edit restores the original values and leaves the list unchanged (edge case)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  renderPopup({ onSubmit: vi.fn() });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await addExercise(user, { description: "SSG", duration: "20", players: "8", repetitions: "3" });

  await user.click(screen.getByRole("button", { name: "Edit" }));
  const durationInput = screen.getByLabelText(/duration/i);
  await user.clear(durationInput);
  await user.type(durationInput, "99");
  await user.click(screen.getAllByRole("button", { name: "Cancel" })[0]);

  const item = screen.getByText(/SSG/).closest("li");
  expect(item).toHaveTextContent("20min");
  expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
});

test("validation from ExerciseFields applies identically in edit mode", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  renderPopup({ onSubmit: vi.fn() });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await addExercise(user, { description: "SSG", duration: "20" });

  await user.click(screen.getByRole("button", { name: "Edit" }));
  const durationInput = screen.getByLabelText(/duration/i);
  await user.clear(durationInput);
  await user.type(durationInput, "0");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByText(/duration must be a positive number/i)
  ).toBeInTheDocument();
  const item = screen.getByText(/SSG/).closest("li");
  expect(item).toHaveTextContent("20min");
});

async function addThreeExercises(user) {
  await addExercise(user, { description: "First", duration: "10", players: "5", repetitions: "1" });
  await addExercise(user, { description: "Second", duration: "20", players: "6", repetitions: "2" });
  await addExercise(user, { description: "Third", duration: "30", players: "7", repetitions: "3" });
}

test("move-up swaps an exercise with the one above (AC TFORM-05.3)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  renderPopup({ onSubmit: vi.fn() });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await addThreeExercises(user);

  const items = screen.getAllByRole("listitem");
  await user.click(within(items[2]).getByRole("button", { name: "Move up" }));

  const reordered = screen.getAllByRole("listitem");
  expect(reordered[0]).toHaveTextContent("First");
  expect(reordered[1]).toHaveTextContent("Third");
  expect(reordered[2]).toHaveTextContent("Second");
});

test("move-down swaps an exercise with the one below", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  renderPopup({ onSubmit: vi.fn() });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await addThreeExercises(user);

  const items = screen.getAllByRole("listitem");
  await user.click(within(items[0]).getByRole("button", { name: "Move down" }));

  const reordered = screen.getAllByRole("listitem");
  expect(reordered[0]).toHaveTextContent("Second");
  expect(reordered[1]).toHaveTextContent("First");
  expect(reordered[2]).toHaveTextContent("Third");
});

test("move-up is disabled on the first exercise, no wrap-around (AC TFORM-05.4)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  renderPopup({ onSubmit: vi.fn() });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await addThreeExercises(user);

  const items = screen.getAllByRole("listitem");
  const moveUpFirst = within(items[0]).getByRole("button", { name: "Move up" });
  expect(moveUpFirst).toBeDisabled();

  await user.click(moveUpFirst);

  const unchanged = screen.getAllByRole("listitem");
  expect(unchanged[0]).toHaveTextContent("First");
});

test("move-down is disabled on the last exercise (AC TFORM-05.5)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  renderPopup({ onSubmit: vi.fn() });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await addThreeExercises(user);

  const items = screen.getAllByRole("listitem");
  const moveDownLast = within(items[2]).getByRole("button", { name: "Move down" });
  expect(moveDownLast).toBeDisabled();

  await user.click(moveDownLast);

  const unchanged = screen.getAllByRole("listitem");
  expect(unchanged[2]).toHaveTextContent("Third");
});

test("reordering preserves every exercise's field values and id", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  renderPopup({ onSubmit: vi.fn() });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await addThreeExercises(user);

  const items = screen.getAllByRole("listitem");
  await user.click(within(items[1]).getByRole("button", { name: "Move up" }));

  const reordered = screen.getAllByRole("listitem");
  expect(reordered[0]).toHaveTextContent("Second — 20min · 6 players · x2");
  expect(reordered[1]).toHaveTextContent("First — 10min · 5 players · x1");
});

test("the saved training persists the displayed order", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(screen.getByRole("combobox"), "Amadora Sub-11");
  await fillDateAndDuration(user, container);
  await addThreeExercises(user);
  const items = screen.getAllByRole("listitem");
  await user.click(within(items[2]).getByRole("button", { name: "Move up" }));

  await user.click(screen.getByRole("button", { name: "Create" }));

  const [[submitted]] = onSubmit.mock.calls;
  expect(submitted.exercises.map((ex) => ex.description)).toEqual([
    "First",
    "Third",
    "Second",
  ]);
});

test("move controls are reachable and operable by keyboard", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  renderPopup({ onSubmit: vi.fn() });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await addThreeExercises(user);

  const items = screen.getAllByRole("listitem");
  const moveUpButton = within(items[2]).getByRole("button", { name: "Move up" });
  moveUpButton.focus();
  expect(moveUpButton).toHaveFocus();
  await user.keyboard("{Enter}");

  const reordered = screen.getAllByRole("listitem");
  expect(reordered[1]).toHaveTextContent("Third");
});

test("displays the sum of duration times repetitions across exercises (AC TFORM-06.1)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit: vi.fn() });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await typeInto(user, container, "duration", "60");
  await addExercise(user, { description: "SSG", duration: "20", repetitions: "2" });

  expect(await screen.findByText(/Planned time 40min/)).toBeInTheDocument();
});

async function typeInto(user, container, name, value) {
  const input = container.querySelector(`[name="${name}"]`);
  await user.clear(input);
  await user.type(input, value);
}

test("warns and names the overage in minutes when the total exceeds the session duration (AC TFORM-06.2)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit: vi.fn() });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await typeInto(user, container, "duration", "60");
  await addExercise(user, { description: "SSG", duration: "50", repetitions: "2" });

  expect(
    await screen.findByText(/exceeds the session by 40 minutes/)
  ).toBeInTheDocument();
});

test("displays remaining minutes when the total is within the session duration (AC TFORM-06.3)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit: vi.fn() });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await typeInto(user, container, "duration", "60");
  await addExercise(user, { description: "SSG", duration: "20" });

  expect(await screen.findByText(/40 minutes remaining/)).toBeInTheDocument();
});

test("treats an exact match between planned time and session duration as within (0 minutes remaining), not exceeding (AC TFORM-06.3 boundary)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit: vi.fn() });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await typeInto(user, container, "duration", "60");
  await addExercise(user, { description: "SSG", duration: "60" });

  expect(await screen.findByText(/0 minutes remaining/)).toBeInTheDocument();
  expect(screen.queryByText(/exceeds the session/)).not.toBeInTheDocument();
});

test("recomputes the total when an exercise is added, edited or removed (AC TFORM-06.4)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit: vi.fn() });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await typeInto(user, container, "duration", "60");
  await addExercise(user, { description: "SSG", duration: "20" });
  expect(await screen.findByText(/Planned time 20min/)).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Edit" }));
  const durationInput = screen.getByLabelText(/duration/i);
  await user.clear(durationInput);
  await user.type(durationInput, "30");
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByText(/Planned time 30min/)).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Remove" }));
  expect(screen.queryByText(/Planned time/)).not.toBeInTheDocument();
});

test("still allows saving when the total exceeds the session duration (AC TFORM-06.5)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(screen.getByRole("combobox"), "Amadora Sub-11");
  await fillDateAndDuration(user, container);
  await typeInto(user, container, "duration", "60");
  await addExercise(user, { description: "SSG", duration: "90" });
  await screen.findByText(/exceeds the session by 30 minutes/);

  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(onSubmit).toHaveBeenCalledTimes(1);
});

test("cancelling the popup with values in the editor discards them without a prompt (edge case)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const confirmSpy = vi.spyOn(window, "confirm");
  const onClose = vi.fn();
  const user = userEvent.setup();
  renderPopup({ onSubmit: vi.fn(), onClose });
  await screen.findByRole("option", { name: "Amadora Sub-11" });

  await user.type(screen.getByLabelText(/description/i), "Unsaved exercise");

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onClose).toHaveBeenCalledTimes(1);
  expect(confirmSpy).not.toHaveBeenCalled();
});

const sampleTraining = {
  id: "train-1",
  teamId: 2,
  day: new Date(2027, 5, 15, 14, 30),
  duration: 60,
  exercises: [
    { id: "ex-1", trainingId: "train-1", description: "Rondo", duration: 15, numberOfPlayers: 8, repetitions: 2, image: "" },
  ],
};

test("passing a training prop pre-fills team, date, duration and exercises (AC TEDIT-01.1)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);

  const { container } = renderPopup({ training: sampleTraining });

  await screen.findByRole("option", { name: "Amadora Sub-11" });
  expect(screen.getByRole("combobox")).toHaveValue("2");
  expect(container.querySelector('[name="day"]')).toHaveValue("2027-06-15T14:30");
  expect(container.querySelector('[name="duration"]')).toHaveValue(60);
  expect(screen.getByText(/Rondo/)).toBeInTheDocument();
});

test("the heading reads 'Edit Training' and the action button 'Save' in edit mode (AC TEDIT-01.2)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);

  renderPopup({ training: sampleTraining });

  expect(
    await screen.findByRole("heading", { name: "Edit Training" })
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Create" })).not.toBeInTheDocument();
});

test("create mode still renders the 'Create Training' heading and 'Create' button", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);

  renderPopup();

  expect(
    await screen.findByRole("heading", { name: "Create Training" })
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
});

test("submitting in edit mode calls trainingService.update, never create (AC TEDIT-01.3)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const updateSpy = vi.spyOn(trainingService, "update").mockResolvedValue({});
  const createSpy = vi.spyOn(trainingService, "create");
  const user = userEvent.setup();
  renderPopup({
    training: sampleTraining,
    onSubmit: (t) => trainingService.update(t),
  });
  await screen.findByRole("option", { name: "Amadora Sub-11" });

  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(updateSpy).toHaveBeenCalledTimes(1);
  expect(createSpy).not.toHaveBeenCalled();
});

test("the training's id is preserved through the edit (AC TEDIT-01.4)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  renderPopup({ training: sampleTraining, onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });

  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ id: "train-1" })
  );
});

test("cancelling an edit calls onClose without calling trainingService.update (AC TEDIT-01.5)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const updateSpy = vi.spyOn(trainingService, "update");
  const onClose = vi.fn();
  const user = userEvent.setup();
  renderPopup({ training: sampleTraining, onSubmit: vi.fn(), onClose });
  await screen.findByRole("option", { name: "Amadora Sub-11" });

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onClose).toHaveBeenCalledTimes(1);
  expect(updateSpy).not.toHaveBeenCalled();
});

test("submitting an edit without touching the date stores the same instant (AC TEDIT-03.3)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  renderPopup({ training: sampleTraining, onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });

  await user.click(screen.getByRole("button", { name: "Save" }));

  const [[submitted]] = onSubmit.mock.calls;
  expect(submitted.day.getTime()).toBe(sampleTraining.day.getTime());
});

test("an invalid date blocks the save with a message (edge case)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const onSubmit = vi.fn();
  const { container } = renderPopup({ training: sampleTraining, onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  const dayInput = container.querySelector('[name="day"]');
  fireEvent.change(dayInput, { target: { value: "" } });

  fireEvent.submit(container.querySelector("form"));

  expect(
    await screen.findByText("Please enter a valid date and time.")
  ).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("removing all exercises during an edit saves an empty exercise list rather than blocking (edge case)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  renderPopup({ training: sampleTraining, onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });

  await user.click(screen.getByRole("button", { name: "Remove" }));
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ exercises: [] })
  );
});

// --- Diagram feature edge cases: deletion mid-edit, storage quota ---------
// (spec.md "Edge Cases": exercise deleted before saving; localStorage quota
// rejected). Both are exercised through the real trainingService against the
// real store — not a mocked onSubmit — because the point is what the actual
// save call site (this popup, via trainingService.update) does when the
// underlying store misbehaves.

test("saving an edit whose training was deleted in the meantime fails without corrupting the store (edge case)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const diagram = {
    v: 1,
    pitch: "full",
    shapes: [{ id: "s1", kind: "cone", x: 0.2, y: 0.4 }],
  };
  const created = await trainingService.create({
    teamId: 2,
    day: new Date("2030-01-01T10:00:00Z"),
    duration: 60,
    exercises: [
      { id: "e1", description: "SSG", duration: 20, image: "", diagram },
    ],
  });
  const survivor = await trainingService.create({
    teamId: 1,
    day: new Date("2030-02-01T10:00:00Z"),
    duration: 45,
    exercises: [],
  });
  const user = userEvent.setup();
  renderPopup({
    training: created,
    onSubmit: (t) => trainingService.update(t),
  });
  await screen.findByRole("option", { name: "Amadora Sub-11" });

  // The editor is open on `created`, but something else (another tab, a
  // concurrent delete) removes the training from the store before this
  // popup submits.
  await trainingService.delete(created.id);

  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByText("Failed to save the training. Please try again.")
  ).toBeInTheDocument();
  expect(errorSpy).toHaveBeenCalledWith(
    "Failed to save training:",
    expect.objectContaining({ name: "NotFoundError" })
  );
  // No orphan/partial write: the deleted training stays gone and the
  // untouched training survives exactly as it was.
  const all = await trainingService.getAll();
  expect(all.find((t) => t.id === created.id)).toBeUndefined();
  expect(all.find((t) => t.id === survivor.id)).toBeDefined();
});

test("a localStorage quota rejection while saving a diagram-carrying exercise surfaces the error and keeps the editor open (edge case)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const diagram = {
    v: 1,
    pitch: "full",
    shapes: [{ id: "s1", kind: "cone", x: 0.3, y: 0.3 }],
  };
  const created = await trainingService.create({
    teamId: 2,
    day: new Date("2030-01-01T10:00:00Z"),
    duration: 60,
    exercises: [
      { id: "e1", description: "SSG", duration: 20, image: "", diagram },
    ],
  });
  const user = userEvent.setup();
  renderPopup({
    training: created,
    onSubmit: (t) => trainingService.update(t),
  });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  expect(screen.getByText(/SSG/)).toBeInTheDocument();

  const setItemSpy = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByText("Failed to save the training. Please try again.")
  ).toBeInTheDocument();
  expect(errorSpy).toHaveBeenCalledWith(
    "Failed to save training:",
    expect.objectContaining({ name: "StorageQuotaError" })
  );
  // The editor/form stays mounted with the work intact, not discarded.
  expect(
    screen.getByRole("heading", { name: "Edit Training" })
  ).toBeInTheDocument();
  expect(screen.getByText(/SSG/)).toBeInTheDocument();
  setItemSpy.mockRestore();

  // The rejected write never landed: the diagram-carrying exercise is
  // exactly what it was before the failed save.
  const reread = await trainingService.getById(created.id);
  expect(reread.exercises[0].diagram).toEqual(diagram);
});
