import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useSearchParams } from "react-router-dom";
import Trainings from "../Trainings";
import { teamService } from "../../services/teamService";
import { trainingService } from "../../services/trainingService";
import { toInputValue } from "../../lib/datetime";

afterEach(() => {
  vi.restoreAllMocks();
});

function SearchParamsDisplay() {
  const [searchParams] = useSearchParams();
  return <div data-testid="search-params">{searchParams.toString()}</div>;
}

function DeepLinkTrigger({ paramName }) {
  const [, setSearchParams] = useSearchParams();
  return (
    <button
      onClick={(e) => setSearchParams({ [paramName]: e.target.dataset.id })}
      data-testid="deep-link-trigger"
    >
      trigger
    </button>
  );
}

function renderTrainings(initialEntries = ["/trainings"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Trainings />
      <SearchParamsDisplay />
      <DeepLinkTrigger paramName="training" />
    </MemoryRouter>
  );
}

function getTeamsColumn(container) {
  return container.querySelector(".text-center.overflow-y-auto");
}

function getFutureList() {
  return screen.getByRole("heading", { name: /^Next Trainings/ }).nextElementSibling;
}

function getPastList() {
  return screen.getByRole("heading", { name: /^Past Trainings/ }).nextElementSibling;
}

function getUnassignedList() {
  return screen.getByRole("heading", { name: /^Unassigned/ }).nextElementSibling;
}

function getFormFor(headingText) {
  return screen
    .getByRole("heading", { name: headingText })
    .closest("div")
    .querySelector("form");
}

async function typeInto(user, form, name, value) {
  const input = form.querySelector(`[name="${name}"]`);
  await user.clear(input);
  await user.type(input, value);
}

async function openCreatePopup(user, container) {
  await user.click(container.querySelector(".bg-blue-500"));
}

async function selectTeamInForm(user, form, label) {
  const select = form.querySelector('[name="teamId"]');
  await within(form).findByRole("option", { name: label });
  await user.selectOptions(select, label);
}

test("renders teams returned by teamService.getAll on mount", async () => {
  const { container } = renderTrainings();

  expect(await screen.findByRole("button", { name: "Amadora Sub-11" })).toBeInTheDocument();
  expect(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  ).toBeInTheDocument();
});

test("logs an error and does not crash when teamService.getAll rejects", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(teamService, "getAll").mockRejectedValueOnce(new Error("boom"));

  const { container } = renderTrainings();

  await waitFor(() => {
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to load teams:",
      expect.any(Error)
    );
  });
  expect(
    within(getTeamsColumn(container)).queryByText("Amadora Sub-11")
  ).not.toBeInTheDocument();
});

test("loads and splits all trainings into past and future buckets on mount when no team is selected", async () => {
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });
  expect(within(getFutureList()).queryAllByRole("listitem")).toHaveLength(0);
});

test("selecting a team filters both trainings lists to that team's trainings only", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });

  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );

  await waitFor(() => {
    expect(within(getPastList()).queryAllByRole("listitem")).toHaveLength(0);
  });
  expect(within(getFutureList()).queryAllByRole("listitem")).toHaveLength(0);
});

test("deselecting the selected team reverts to showing all trainings", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });

  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );
  await waitFor(() => {
    expect(within(getPastList()).queryAllByRole("listitem")).toHaveLength(0);
  });

  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );

  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });
});

test("creating a training with a future date refreshes the Next Trainings list without a manual reload", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await openCreatePopup(user, container);

  const form = getFormFor("Create Training");
  await selectTeamInForm(user, form, "Amadora Sub-11");
  await typeInto(user, form, "day", "2027-01-01T10:00");
  await typeInto(user, form, "duration", "61");
  await user.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(() => {
    expect(within(getFutureList()).getAllByRole("listitem")).toHaveLength(1);
  });
  expect(within(getFutureList()).getByText(/61 min/)).toBeInTheDocument();
});

test("creating a training with a past date immediately places it under Past Trainings", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });

  await openCreatePopup(user, container);

  const form = getFormFor("Create Training");
  await selectTeamInForm(user, form, "Amadora Sub-11");
  await typeInto(user, form, "day", "2020-01-01T10:00");
  await typeInto(user, form, "duration", "62");
  await user.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(3);
  });
});

test("creating a training while a team filter is active preserves the filter and does not leak other teams' trainings", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );
  await waitFor(() => {
    expect(within(getPastList()).queryAllByRole("listitem")).toHaveLength(0);
  });

  await openCreatePopup(user, container);

  const form = getFormFor("Create Training");
  await selectTeamInForm(user, form, "Areias Sub-19");
  await typeInto(user, form, "day", "2027-01-01T10:00");
  await typeInto(user, form, "duration", "63");
  await user.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(() => {
    expect(within(getFutureList()).getAllByRole("listitem")).toHaveLength(1);
  });
  expect(within(getPastList()).queryAllByRole("listitem")).toHaveLength(0);
});

test("canceling the create-training popup does not add a training and preserves the current team filter", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });

  await openCreatePopup(user, container);
  await user.click(screen.getByRole("button", { name: "Cancel" }));

  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });
  expect(within(getFutureList()).queryAllByRole("listitem")).toHaveLength(0);
  expect(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  ).toHaveAttribute("aria-current", "true");
});

test("renders no React key warnings for the team filter and training lists", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });

  const keyWarning = errorSpy.mock.calls.find((call) =>
    String(call[0]).includes('unique "key" prop')
  );
  expect(keyWarning).toBeUndefined();
});

test("renders an empty-state message for Next Trainings when there are none", async () => {
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  expect(await screen.findByText("No upcoming trainings.")).toBeInTheDocument();
});

test("renders an empty-state message for Past Trainings when the filtered team has none", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );

  expect(
    await screen.findByText("No past trainings.")
  ).toBeInTheDocument();
});

test("marks the selected team row with aria-current", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );

  expect(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  ).toHaveAttribute("aria-current", "true");
});

test("clicking the selected team again clears aria-current from its row", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );

  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );

  expect(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  ).not.toHaveAttribute("aria-current");
});

test("creating a future training removes the Next Trainings empty-state message", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await screen.findByText("No upcoming trainings.");

  await openCreatePopup(user, container);
  const form = getFormFor("Create Training");
  await selectTeamInForm(user, form, "Amadora Sub-11");
  await typeInto(user, form, "day", "2027-01-01T10:00");
  await typeInto(user, form, "duration", "61");
  await user.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(() => {
    expect(screen.queryByText("No upcoming trainings.")).not.toBeInTheDocument();
  });
});

test("renders an empty-state message for the team filter when there are no teams", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([]);

  renderTrainings();

  expect(await screen.findByText("No teams yet.")).toBeInTheDocument();
});

test("disables the create-training button with a message pointing at Teams when there are no teams (edge case)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([]);
  const { container } = renderTrainings();

  await screen.findByText("No teams yet. Add one on the Teams page first.");

  expect(container.querySelector(".bg-blue-500")).toBeDisabled();
});

test("keeps the create-training button enabled once teams have loaded", async () => {
  const { container } = renderTrainings();

  await screen.findByRole("button", { name: "Amadora Sub-11" });

  expect(container.querySelector(".bg-blue-500")).toBeEnabled();
});

test("creating a training for a different team than the active filter keeps the filter and names the target team (AC TTA-04.3)", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );
  await waitFor(() => {
    expect(within(getPastList()).queryAllByRole("listitem")).toHaveLength(0);
  });

  await openCreatePopup(user, container);
  const form = getFormFor("Create Training");
  await selectTeamInForm(user, form, "Amadora Sub-11");
  await typeInto(user, form, "day", "2027-01-01T10:00");
  await typeInto(user, form, "duration", "70");
  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(
    await screen.findByText(/Training created for Amadora Sub-11/)
  ).toBeInTheDocument();
  expect(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  ).toHaveAttribute("aria-current", "true");
  expect(within(getFutureList()).queryAllByRole("listitem")).toHaveLength(0);
});

test("opening the create popup again clears a previous different-team message", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );

  await openCreatePopup(user, container);
  let form = getFormFor("Create Training");
  await selectTeamInForm(user, form, "Amadora Sub-11");
  await typeInto(user, form, "day", "2027-01-01T10:00");
  await typeInto(user, form, "duration", "70");
  await user.click(screen.getByRole("button", { name: "Create" }));
  await screen.findByText(/Training created for Amadora Sub-11/);

  await openCreatePopup(user, container);

  expect(
    screen.queryByText(/Training created for Amadora Sub-11/)
  ).not.toBeInTheDocument();
});

test("does not render the Unassigned bucket when every training has a valid team (AC TTA-05.2)", async () => {
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  expect(screen.queryByRole("heading", { name: /^Unassigned/ })).not.toBeInTheDocument();
});

test("renders a training with a null teamId in the Unassigned bucket (AC TTA-05.1)", async () => {
  await trainingService.create({
    teamId: null,
    day: new Date("2030-06-01T10:00:00Z"),
    duration: 45,
    exercises: [],
  });

  renderTrainings();

  await screen.findByRole("heading", { name: /^Unassigned/ });
  expect(within(getUnassignedList()).getByText(/45 min/)).toBeInTheDocument();
});

test("renders a training with a dangling teamId in the Unassigned bucket (edge case)", async () => {
  await trainingService.create({
    teamId: "no-such-team",
    day: new Date("2030-06-01T10:00:00Z"),
    duration: 46,
    exercises: [],
  });

  renderTrainings();

  await screen.findByRole("heading", { name: /^Unassigned/ });
  expect(within(getUnassignedList()).getByText(/46 min/)).toBeInTheDocument();
});

test("the Unassigned bucket's assign control lists teams formatted as club + name", async () => {
  await trainingService.create({
    teamId: null,
    day: new Date("2030-06-01T10:00:00Z"),
    duration: 47,
    exercises: [],
  });

  const { container } = renderTrainings();
  await screen.findByRole("heading", { name: /^Unassigned/ });

  const assignSelect = container.querySelector("li select");
  expect(
    within(assignSelect).getByRole("option", { name: "Amadora Sub-11" })
  ).toBeInTheDocument();
  expect(
    within(assignSelect).getByRole("option", { name: "Areias Sub-19" })
  ).toBeInTheDocument();
});

test("assigning a team to an unassigned training persists it and removes it from the bucket (AC TTA-05.3)", async () => {
  await trainingService.create({
    teamId: null,
    day: new Date("2030-06-01T10:00:00Z"),
    duration: 48,
    exercises: [],
  });
  const user = userEvent.setup();
  renderTrainings();
  await screen.findByRole("heading", { name: /^Unassigned/ });
  const row = within(getUnassignedList()).getByText(/48 min/).closest("li");

  await user.selectOptions(
    within(row).getByRole("combobox"),
    "Amadora Sub-11"
  );

  await waitFor(() => {
    expect(screen.queryByRole("heading", { name: /^Unassigned/ })).not.toBeInTheDocument();
  });
});

test("a training reassigned to the active filter's team appears in its filtered list", async () => {
  const created = await trainingService.create({
    teamId: null,
    day: new Date("2030-06-01T10:00:00Z"),
    duration: 49,
    exercises: [],
  });
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("heading", { name: /^Unassigned/ });
  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );

  const row = within(getUnassignedList()).getByText(/49 min/).closest("li");
  await user.selectOptions(
    within(row).getByRole("combobox"),
    "Amadora Sub-11"
  );

  await waitFor(() => {
    expect(within(getFutureList()).getByText(/49 min/)).toBeInTheDocument();
  });
  expect(created.teamId).toBeNull();
});

test("the unassigned list renders each training as a TrainingCard with the assign-to-team select beside it (AC TCARD-04.3)", async () => {
  await trainingService.create({
    teamId: null,
    day: new Date("2030-06-01T10:00:00Z"),
    duration: 67,
    exercises: [],
  });

  renderTrainings();
  await screen.findByRole("heading", { name: /^Unassigned/ });

  const row = within(getUnassignedList()).getByText(/67 min/).closest("li");
  expect(within(row).getByRole("button")).toBeInTheDocument();
  expect(within(row).getByRole("combobox")).toBeInTheDocument();
});

test("operating the assign-to-team select does not open the details popup (edge case)", async () => {
  await trainingService.create({
    teamId: null,
    day: new Date("2030-06-01T10:00:00Z"),
    duration: 68,
    exercises: [],
  });
  const user = userEvent.setup();
  renderTrainings();
  await screen.findByRole("heading", { name: /^Unassigned/ });
  const row = within(getUnassignedList()).getByText(/68 min/).closest("li");

  await user.selectOptions(
    within(row).getByRole("combobox"),
    "Amadora Sub-11"
  );

  expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /Training #/ })).not.toBeInTheDocument();
});

async function addExerciseInForm(user, form, { description, duration, players, repetitions } = {}) {
  await user.type(within(form).getByLabelText(/description/i), description ?? "Corrida");
  await user.type(within(form).getByLabelText(/duration/i), duration ?? "10");
  if (players != null) {
    await user.type(within(form).getByLabelText(/number of players/i), players);
  }
  if (repetitions != null) {
    await user.type(within(form).getByLabelText(/repetitions/i), repetitions);
  }
  await user.click(within(form).getByRole("button", { name: "Add" }));
}

test("a training with three fully-populated exercises survives create and reload with every field unchanged (AC TFORM-02.4)", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await openCreatePopup(user, container);
  const form = getFormFor("Create Training");
  await selectTeamInForm(user, form, "Amadora Sub-11");
  await typeInto(user, form, "day", "2027-03-01T10:00");
  await typeInto(user, form, "duration", "90");
  await addExerciseInForm(user, form, {
    description: "Roundtrip Warmup",
    duration: "10",
    players: "20",
    repetitions: "1",
  });
  await addExerciseInForm(user, form, {
    description: "Roundtrip SSG",
    duration: "20",
    players: "16",
    repetitions: "2",
  });
  await addExerciseInForm(user, form, {
    description: "Roundtrip Match",
    duration: "15",
    players: "22",
    repetitions: "3",
  });
  await user.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(async () => {
    const trainings = await trainingService.getAll();
    const created = trainings.find((t) =>
      t.exercises.some((ex) => ex.description === "Roundtrip Warmup")
    );
    expect(created).toBeDefined();
    expect(created.exercises).toHaveLength(3);
    expect(created.exercises[0]).toMatchObject({
      description: "Roundtrip Warmup",
      duration: 10,
      numberOfPlayers: 20,
      repetitions: 1,
      image: "",
    });
    expect(created.exercises[1]).toMatchObject({
      description: "Roundtrip SSG",
      duration: 20,
      numberOfPlayers: 16,
      repetitions: 2,
      image: "",
    });
    expect(created.exercises[2]).toMatchObject({
      description: "Roundtrip Match",
      duration: 15,
      numberOfPlayers: 22,
      repetitions: 3,
      image: "",
    });
  });
});

test("null numeric fields survive the round trip as null, not 0 or undefined (AC TFORM-01.3)", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await openCreatePopup(user, container);
  const form = getFormFor("Create Training");
  await selectTeamInForm(user, form, "Amadora Sub-11");
  await typeInto(user, form, "day", "2027-03-02T10:00");
  await typeInto(user, form, "duration", "60");
  await addExerciseInForm(user, form, {
    description: "Sparse Roundtrip Exercise",
    duration: "12",
  });
  await user.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(async () => {
    const trainings = await trainingService.getAll();
    const created = trainings.find((t) =>
      t.exercises.some((ex) => ex.description === "Sparse Roundtrip Exercise")
    );
    expect(created).toBeDefined();
    expect(created.exercises[0].numberOfPlayers).toBeNull();
    expect(created.exercises[0].repetitions).toBeNull();
  });
});

test("exercise ids are unique across two exercises added in the same tick (AC TFORM-02.5)", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await openCreatePopup(user, container);
  const form = getFormFor("Create Training");
  await selectTeamInForm(user, form, "Amadora Sub-11");
  await typeInto(user, form, "day", "2027-03-03T10:00");
  await typeInto(user, form, "duration", "60");
  await addExerciseInForm(user, form, { description: "Unique Id A", duration: "5" });
  await addExerciseInForm(user, form, { description: "Unique Id B", duration: "5" });
  await user.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(async () => {
    const trainings = await trainingService.getAll();
    const created = trainings.find((t) =>
      t.exercises.some((ex) => ex.description === "Unique Id A")
    );
    expect(created).toBeDefined();
    const [exA, exB] = created.exercises;
    expect(exA.id).not.toBe(exB.id);
  });
});

test("training.day is still a Date after the round trip (regression guard on 01 PERSIST-05)", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await openCreatePopup(user, container);
  const form = getFormFor("Create Training");
  await selectTeamInForm(user, form, "Amadora Sub-11");
  await typeInto(user, form, "day", "2027-03-04T10:00");
  await typeInto(user, form, "duration", "60");
  await addExerciseInForm(user, form, { description: "Date Guard Exercise", duration: "5" });
  await user.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(async () => {
    const trainings = await trainingService.getAll();
    const created = trainings.find((t) =>
      t.exercises.some((ex) => ex.description === "Date Guard Exercise")
    );
    expect(created).toBeDefined();
    expect(created.day).toBeInstanceOf(Date);
  });
});

test("renders no React key warnings for the Unassigned bucket", async () => {
  await trainingService.create({
    teamId: null,
    day: new Date("2030-06-01T10:00:00Z"),
    duration: 50,
    exercises: [],
  });
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  renderTrainings();
  await screen.findByRole("heading", { name: /^Unassigned/ });

  const keyWarning = errorSpy.mock.calls.find((call) =>
    String(call[0]).includes('unique "key" prop')
  );
  expect(keyWarning).toBeUndefined();
});

test("renders a card with Training #N, a formatted date and the duration in minutes (AC TNUM-04.1, superseded by TCARD-01/05's structured card)", async () => {
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });

  const row = within(getPastList()).getAllByRole("listitem")[0];
  expect(row.textContent).toMatch(/^Training #\d+/);
  expect(row.textContent).toMatch(/\d+ min/);
});

test("the past list renders each training as a TrainingCard button (AC TCARD-04.2)", async () => {
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });

  const buttons = within(getPastList()).getAllByRole("button");
  expect(buttons).toHaveLength(2);
});

test("the future list renders each training as a TrainingCard button (AC TCARD-04.1)", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await openCreatePopup(user, container);
  const form = getFormFor("Create Training");
  await selectTeamInForm(user, form, "Amadora Sub-11");
  await typeInto(user, form, "day", "2027-01-01T10:00");
  await typeInto(user, form, "duration", "61");
  await user.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(() => {
    expect(within(getFutureList()).getAllByRole("button")).toHaveLength(1);
  });
});

test("past cards render the muted treatment; upcoming cards do not", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });
  await openCreatePopup(user, container);
  const form = getFormFor("Create Training");
  await selectTeamInForm(user, form, "Amadora Sub-11");
  await typeInto(user, form, "day", "2027-01-01T10:00");
  await typeInto(user, form, "duration", "61");
  await user.click(screen.getByRole("button", { name: "Create" }));
  await waitFor(() => {
    expect(within(getFutureList()).getAllByRole("button")).toHaveLength(1);
  });

  const pastButton = within(getPastList()).getAllByRole("button")[0];
  const futureButton = within(getFutureList()).getAllByRole("button")[0];
  expect(pastButton.className).toContain("bg-lightgrey");
  expect(futureButton.className).toContain("bg-lightblack");
});

test("a training with a dangling teamId resolves to 'Unassigned' on its card", async () => {
  await trainingService.create({
    teamId: "no-such-team",
    day: new Date("2020-06-01T10:00:00Z"),
    duration: 64,
    exercises: [],
  });

  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getByText(/64 min/)).toBeInTheDocument();
  });

  const row = within(getPastList()).getByText(/64 min/).closest("li");
  expect(within(row).getByText("Unassigned")).toBeInTheDocument();
});

test("clicking a card opens the details popup for that exact training, by id (regression guard on 06 TEDIT-04)", async () => {
  const [seedTeam] = await teamService.getAll();
  const created = await trainingService.create({
    teamId: seedTeam.id,
    day: new Date("2020-05-01T10:00:00Z"),
    duration: 65,
    exercises: [],
  });
  const user = userEvent.setup();
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  const row = await within(getPastList()).findByText(/65 min/);

  await user.click(row.closest("button"));

  const heading = await screen.findByRole("heading", { name: /Training #/ });
  const allTrainings = await trainingService.getAllNumbered();
  const opened = allTrainings.find(
    (t) => `Training #${t.number ?? "—"}` === heading.textContent
  );
  expect(opened.id).toBe(created.id);
});

test("a training with a valid teamId resolves to the team's club + name on its card", async () => {
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });

  const row = within(getPastList()).getAllByRole("listitem")[0];
  expect(within(row).getByText("Amadora Sub-11")).toBeInTheDocument();
});

test("clicking a card in the future list opens the details popup for that exact training, by id", async () => {
  const [seedTeam] = await teamService.getAll();
  const created = await trainingService.create({
    teamId: seedTeam.id,
    day: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
    duration: 66,
    exercises: [],
  });
  const user = userEvent.setup();
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  const row = await within(getFutureList()).findByText(/66 min/);

  await user.click(row.closest("button"));

  const heading = await screen.findByRole("heading", { name: /Training #/ });
  const allTrainings = await trainingService.getAllNumbered();
  const opened = allTrainings.find(
    (t) => `Training #${t.number ?? "—"}` === heading.textContent
  );
  expect(opened.id).toBe(created.id);
});

test("a past card's accessible name identifies it by number, date and team (AC TCARD-03.5)", async () => {
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("button")).toHaveLength(2);
  });

  const button = within(getPastList()).getAllByRole("button")[0];
  expect(button).toHaveAccessibleName(/Training #/);
  expect(button).toHaveAccessibleName(/Amadora Sub-11/);
});

test("renders no React key warnings for the future and past lists across a team-filter change (edge case)", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });

  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );
  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );

  const keyWarning = errorSpy.mock.calls.find((call) =>
    String(call[0]).includes('unique "key" prop')
  );
  expect(keyWarning).toBeUndefined();
});

test("keyboard activation (Enter) opens the details popup for the focused card (AC TCARD-03.2)", async () => {
  const user = userEvent.setup();
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });
  const button = within(getPastList()).getAllByRole("button")[0];

  button.focus();
  await user.keyboard("{Enter}");

  expect(await screen.findByRole("button", { name: "Close" })).toBeInTheDocument();
});

test("no row renders a raw UUID id (AC TNUM-04.2)", async () => {
  await trainingService.create({
    teamId: null,
    day: new Date("2030-06-01T10:00:00Z"),
    duration: 51,
    exercises: [],
  });

  renderTrainings();
  await screen.findByRole("heading", { name: /^Unassigned/ });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });

  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  expect(getPastList().textContent).not.toMatch(uuidPattern);
  expect(getUnassignedList().textContent).not.toMatch(uuidPattern);
});

test("no row renders a Date.toString() form — the string 'GMT' is absent", async () => {
  await trainingService.create({
    teamId: null,
    day: new Date("2030-06-01T10:00:00Z"),
    duration: 52,
    exercises: [],
  });

  renderTrainings();
  await screen.findByRole("heading", { name: /^Unassigned/ });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });

  expect(getPastList().textContent).not.toMatch("GMT");
  expect(getUnassignedList().textContent).not.toMatch("GMT");
});

test("renders 'Invalid date' rather than crashing when a training's day is invalid (AC TNUM-04.3)", async () => {
  vi.spyOn(trainingService, "getAllNumbered").mockResolvedValueOnce([
    { id: "bad-day", teamId: 1, number: 3, day: new Date("not-a-date"), duration: 33 },
  ]);

  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  expect(await screen.findByText(/Invalid date/)).toBeInTheDocument();
});

test("renders '—' for the number of an unassigned training (AC TNUM-01.5)", async () => {
  await trainingService.create({
    teamId: null,
    day: new Date("2030-06-01T10:00:00Z"),
    duration: 53,
    exercises: [],
  });

  renderTrainings();
  await screen.findByRole("heading", { name: /^Unassigned/ });

  const row = within(getUnassignedList()).getByText(/53 min/).closest("li");
  expect(row).toHaveTextContent("Training #—");
});

test("future-only and past-only filtered views keep team-wide numbers instead of restarting at 1 (edge case)", async () => {
  const [seedTeam] = await teamService.getAll();
  const future = await trainingService.create({
    teamId: seedTeam.id,
    day: new Date(Date.now() + 24 * 60 * 60 * 1000),
    duration: 54,
    exercises: [],
  });
  const numbered = await trainingService.getAllNumbered(seedTeam.id);
  const expectedNumber = numbered.find((t) => t.id === future.id).number;
  expect(expectedNumber).toBe(3);

  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  const futureRow = (await within(getFutureList()).findByText(/54 min/)).closest("li");
  expect(futureRow.textContent).toContain(`Training #${expectedNumber}`);
});

test("the number shown in the details popup matches the number on the row that opened it (edge case)", async () => {
  const user = userEvent.setup();
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });

  const row = within(getPastList()).getAllByRole("listitem")[0];
  const rowNumber = row.textContent.match(/Training #(\d+|—)/)[1];
  await user.click(within(row).getByRole("button"));

  expect(
    await screen.findByRole("heading", { name: `Training #${rowNumber}` })
  ).toBeInTheDocument();
});

test("clicking Edit in the details popup closes the details popup and opens the form in edit mode for that training (AC TEDIT-04.1)", async () => {
  const user = userEvent.setup();
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });
  const row = within(getPastList()).getAllByRole("listitem")[0];
  await user.click(within(row).getByRole("button"));
  await screen.findByRole("button", { name: "Edit" });

  await user.click(screen.getByRole("button", { name: "Edit" }));

  expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  expect(
    await screen.findByRole("heading", { name: "Edit Training" })
  ).toBeInTheDocument();
});

test("the edit form receives the same training the details popup was showing, by id not index", async () => {
  const user = userEvent.setup();
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });

  const rows = within(getPastList()).getAllByRole("listitem");
  const targetRow = rows[1];
  await user.click(within(targetRow).getByRole("button"));
  const detailsHeading = await screen.findByRole("heading", { name: /Training #/ });
  const trainingNumber = detailsHeading.textContent.match(/Training #(\d+|—)/)[1];
  const allTrainings = await trainingService.getAllNumbered();
  const targetTraining = allTrainings.find(
    (t) => String(t.number) === trainingNumber
  );

  await user.click(screen.getByRole("button", { name: "Edit" }));

  const form = (
    await screen.findByRole("heading", { name: "Edit Training" })
  ).closest("div").querySelector("form");
  expect(form.querySelector('[name="day"]')).toHaveValue(
    toInputValue(targetTraining.day)
  );
});

test("deleting a training removes it and renumbers the remaining team trainings contiguously (AC TEDIT-05.4, AC TEDIT-05.5)", async () => {
  const [seedTeam] = await teamService.getAll();
  await trainingService.create({
    teamId: seedTeam.id,
    day: new Date("2025-01-01T10:00:00Z"),
    duration: 55,
    exercises: [],
  });
  const user = userEvent.setup();
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(3);
  });

  const rows = within(getPastList()).getAllByRole("listitem");
  await user.click(within(rows[0]).getByRole("button"));
  await screen.findByRole("button", { name: "Delete" });
  await user.click(screen.getByRole("button", { name: "Delete" }));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });
  const remainingTrainings = await trainingService.getAllNumbered(seedTeam.id);
  expect(remainingTrainings.map((t) => t.number).sort()).toEqual([1, 2]);
  const allTrainings = await trainingService.getAll();
  expect(allTrainings).toHaveLength(2);
});

test("deleting a training closes both the details popup and the confirmation dialog", async () => {
  const user = userEvent.setup();
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });
  const row = within(getPastList()).getAllByRole("listitem")[0];
  await user.click(within(row).getByRole("button"));
  await user.click(await screen.findByRole("button", { name: "Delete" }));

  await user.click(screen.getByRole("button", { name: "Submit" }));

  await waitFor(() => {
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });
  expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
});

test("cancelling a delete leaves the training list unchanged", async () => {
  const user = userEvent.setup();
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });
  const row = within(getPastList()).getAllByRole("listitem")[0];
  await user.click(within(row).getByRole("button"));
  await user.click(await screen.findByRole("button", { name: "Delete" }));

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
});

test("reopening the details popup after an edit shows the updated values (edge case)", async () => {
  const user = userEvent.setup();
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });
  const row = within(getPastList()).getAllByRole("listitem")[0];
  await user.click(within(row).getByRole("button"));
  await user.click(await screen.findByRole("button", { name: "Edit" }));

  const form = getFormFor("Edit Training");
  await typeInto(user, form, "duration", "77");
  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(async () => {
    expect(within(getPastList()).getByText(/77 min/)).toBeInTheDocument();
  });
  await user.click(within(getPastList()).getByText(/77 min/));

  expect(
    await screen.findByText((_, el) => el?.textContent === "77")
  ).toBeInTheDocument();
});

test("editing refreshes both training lists without a page reload (AC TEDIT-06.1)", async () => {
  const user = userEvent.setup();
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });
  const row = within(getPastList()).getAllByRole("listitem")[0];
  await user.click(within(row).getByRole("button"));
  await user.click(await screen.findByRole("button", { name: "Edit" }));
  const form = getFormFor("Edit Training");
  await typeInto(user, form, "duration", "81");

  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => {
    expect(within(getPastList()).getByText(/81 min/)).toBeInTheDocument();
  });
  expect(screen.queryByRole("heading", { name: "Edit Training" })).not.toBeInTheDocument();
});

test("an edit that moves a training from past to future jumps it to Next Trainings (AC TEDIT-06.2)", async () => {
  const user = userEvent.setup();
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });
  const row = within(getPastList()).getAllByRole("listitem")[0];
  await user.click(within(row).getByRole("button"));
  await user.click(await screen.findByRole("button", { name: "Edit" }));
  const form = getFormFor("Edit Training");
  await typeInto(user, form, "day", "2030-01-01T10:00");

  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(1);
  });
  expect(within(getFutureList()).getAllByRole("listitem")).toHaveLength(1);
});

test("an edit that changes a training's team re-applies the active filter, removing it from the filtered list (AC TEDIT-06.3)", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });
  const row = within(getPastList()).getAllByRole("listitem")[0];
  await user.click(within(row).getByRole("button"));
  await user.click(await screen.findByRole("button", { name: "Edit" }));
  const form = getFormFor("Edit Training");
  await selectTeamInForm(user, form, "Areias Sub-19");

  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(1);
  });
});

test("editing a training out of the active team filter keeps the filter and reports where it went (edge case, same as AC TTA-04.3)", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });
  const row = within(getPastList()).getAllByRole("listitem")[0];
  await user.click(within(row).getByRole("button"));
  await user.click(await screen.findByRole("button", { name: "Edit" }));
  const form = getFormFor("Edit Training");
  await selectTeamInForm(user, form, "Areias Sub-19");

  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByText(/Training moved to Areias Sub-19/)
  ).toBeInTheDocument();
  expect(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  ).toHaveAttribute("aria-current", "true");
});

test("editing a training deleted in another tab fails with a clear message and does not re-create it (edge case)", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const user = userEvent.setup();
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });
  const row = within(getPastList()).getAllByRole("listitem")[0];
  await user.click(within(row).getByRole("button"));
  await user.click(await screen.findByRole("button", { name: "Edit" }));
  await screen.findByRole("heading", { name: "Edit Training" });
  const beforeCount = (await trainingService.getAll()).length;
  vi.spyOn(trainingService, "update").mockRejectedValueOnce(
    new Error("Training not found")
  );

  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByText("Failed to save the training. Please try again.")
  ).toBeInTheDocument();
  const afterCount = (await trainingService.getAll()).length;
  expect(afterCount).toBe(beforeCount);
  expect(errorSpy).toHaveBeenCalledWith("Failed to save training:", expect.any(Error));
});

test("opens the matching training's details popup from a ?training=<id> deep link (AC CAL-04.1)", async () => {
  const created = await trainingService.create({
    teamId: 1,
    day: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    duration: 45,
    exercises: [],
  });

  renderTrainings([`/trainings?training=${created.id}`]);

  expect(
    await screen.findByRole("button", { name: "Close" })
  ).toBeInTheDocument();
  expect(screen.getByText("45")).toBeInTheDocument();
});

test("removes the training param from the URL once the popup opens, so a refresh does not reopen it (AC CAL-04.4)", async () => {
  const created = await trainingService.create({
    teamId: 1,
    day: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    duration: 45,
    exercises: [],
  });

  renderTrainings([`/trainings?training=${created.id}`]);
  await screen.findByRole("button", { name: "Close" });

  await waitFor(() => {
    expect(screen.getByTestId("search-params")).toHaveTextContent("");
  });
});

test("shows a not-found message rather than an empty popup when the deep-linked id matches no training (AC CAL-04.3)", async () => {
  renderTrainings(["/trainings?training=does-not-exist"]);

  expect(
    await screen.findByText("That training no longer exists.")
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Close" })
  ).not.toBeInTheDocument();
});

test("clears the team filter when it would hide the deep-linked training (edge case)", async () => {
  const user = userEvent.setup();
  const created = await trainingService.create({
    teamId: 2,
    day: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    duration: 20,
    exercises: [],
  });

  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );
  await waitFor(() => {
    expect(
      within(getTeamsColumn(container)).getByText("Amadora Sub-11")
    ).toHaveAttribute("aria-current", "true");
  });

  const trigger = screen.getByTestId("deep-link-trigger");
  trigger.dataset.id = String(created.id);
  await user.click(trigger);

  expect(
    await screen.findByRole("button", { name: "Close" })
  ).toBeInTheDocument();
  expect(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  ).not.toHaveAttribute("aria-current", "true");
});

test("arriving with no deep-link param behaves exactly as before (regression guard)", async () => {
  const { container } = renderTrainings();

  await screen.findByRole("button", { name: "Amadora Sub-11" });
  expect(
    screen.queryByRole("button", { name: "Close" })
  ).not.toBeInTheDocument();
  expect(screen.queryByText("That training no longer exists.")).toBeNull();
  expect(container).toBeTruthy();
});

test("twelve upcoming trainings all render in the DOM with no per-section cap (AC TLAY-01.1)", async () => {
  const [seedTeam] = await teamService.getAll();
  for (let i = 0; i < 12; i++) {
    await trainingService.create({
      teamId: seedTeam.id,
      day: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
      duration: 60,
      exercises: [],
    });
  }

  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await waitFor(() => {
    expect(within(getFutureList()).getAllByRole("listitem")).toHaveLength(12);
  });
});

test("twelve past trainings all render in the DOM with no per-section cap (AC TLAY-01.1)", async () => {
  const [seedTeam] = await teamService.getAll();
  for (let i = 0; i < 12; i++) {
    await trainingService.create({
      teamId: seedTeam.id,
      day: new Date("2020-01-01T10:00:00Z").getTime() + i * 24 * 60 * 60 * 1000,
      duration: 60,
      exercises: [],
    });
  }

  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await waitFor(() => {
    // 2 seeded past trainings + 12 newly created ones.
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(14);
  });
});

test("the page contains no h-screen or per-list overflow-y-auto container (AC TLAY-01.2, TLAY-01.3)", async () => {
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });

  expect(container.querySelector(".h-screen")).not.toBeInTheDocument();
  expect(getFutureList().className).not.toMatch(/overflow-y-auto/);
  expect(getPastList().className).not.toMatch(/overflow-y-auto/);
  const futureUl = within(getFutureList()).queryByRole("list");
  const pastUl = within(getPastList()).getByRole("list");
  expect(futureUl?.className ?? "").not.toMatch(/overflow-y-auto/);
  expect(pastUl.className).not.toMatch(/overflow-y-auto/);
});

test("each heading renders its section's count, not just its label (AC TLAY-02)", async () => {
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });

  expect(screen.getByRole("heading", { name: "Next Trainings (0)" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Past Trainings (2)" })).toBeInTheDocument();
});

test("an empty section renders its existing message and a zero count (AC TLAY-01.5)", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Past Trainings (0)" })).toBeInTheDocument();
  });
  expect(screen.getByRole("heading", { name: "Next Trainings (0)" })).toBeInTheDocument();
  expect(within(getPastList()).getByText("No past trainings.")).toBeInTheDocument();
  expect(within(getFutureList()).getByText("No upcoming trainings.")).toBeInTheDocument();
});

test("the unassigned section is uncapped and stays above the future/past sections (edge case)", async () => {
  for (let i = 0; i < 12; i++) {
    await trainingService.create({
      teamId: null,
      day: new Date("2030-06-01T10:00:00Z").getTime() + i * 1000,
      duration: 60,
      exercises: [],
    });
  }

  const { container } = renderTrainings();
  await screen.findByRole("heading", { name: /^Unassigned/ });

  await waitFor(() => {
    expect(within(getUnassignedList()).getAllByRole("listitem")).toHaveLength(12);
  });
  const unassignedHeading = screen.getByRole("heading", { name: /^Unassigned/ });
  const nextHeading = screen.getByRole("heading", { name: /^Next Trainings/ });
  expect(
    unassignedHeading.compareDocumentPosition(nextHeading) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
  expect(container).toBeTruthy();
});

test("creating a training updates the section count with no page reload (edge case)", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Next Trainings (0)" })).toBeInTheDocument();
  });

  await openCreatePopup(user, container);
  const form = getFormFor("Create Training");
  await selectTeamInForm(user, form, "Amadora Sub-11");
  await typeInto(user, form, "day", "2027-01-01T10:00");
  await typeInto(user, form, "duration", "61");
  await user.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Next Trainings (1)" })).toBeInTheDocument();
  });
});

test("deleting a training updates the section count with no page reload (edge case)", async () => {
  const user = userEvent.setup();
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Past Trainings (2)" })).toBeInTheDocument();
  });
  const row = within(getPastList()).getAllByRole("listitem")[0];
  await user.click(within(row).getByRole("button"));
  await user.click(await screen.findByRole("button", { name: "Delete" }));

  await user.click(screen.getByRole("button", { name: "Submit" }));

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Past Trainings (1)" })).toBeInTheDocument();
  });
});

test("editing a training's date moves it between sections and updates both counts with no page reload (edge case)", async () => {
  const user = userEvent.setup();
  renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Past Trainings (2)" })).toBeInTheDocument();
  });
  const row = within(getPastList()).getAllByRole("listitem")[0];
  await user.click(within(row).getByRole("button"));
  await user.click(await screen.findByRole("button", { name: "Edit" }));
  const form = getFormFor("Edit Training");
  await typeInto(user, form, "day", "2030-01-01T10:00");

  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Past Trainings (1)" })).toBeInTheDocument();
  });
  expect(screen.getByRole("heading", { name: "Next Trainings (1)" })).toBeInTheDocument();
});

test("the filter message and deep-link error still render in place after the layout change (edge case)", async () => {
  renderTrainings(["/trainings?training=does-not-exist"]);

  expect(
    await screen.findByText("That training no longer exists.")
  ).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /^Next Trainings/ })).toBeInTheDocument();
});

test("the create-training different-team message still renders in place after the layout change (edge case)", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );

  await openCreatePopup(user, container);
  const form = getFormFor("Create Training");
  await selectTeamInForm(user, form, "Amadora Sub-11");
  await typeInto(user, form, "day", "2027-01-01T10:00");
  await typeInto(user, form, "duration", "70");
  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(
    await screen.findByText(/Training created for Amadora Sub-11/)
  ).toBeInTheDocument();
});

test("selecting a team updates the future/past counts to reflect the filtered set (regression guard on TLAY-02)", async () => {
  const user = userEvent.setup();
  const { container } = renderTrainings();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Past Trainings (2)" })).toBeInTheDocument();
  });

  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Past Trainings (0)" })).toBeInTheDocument();
  });
});
