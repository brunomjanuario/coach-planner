import { render, screen, within, waitFor } from "@testing-library/react";
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
