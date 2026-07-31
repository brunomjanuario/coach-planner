import { render, screen, within } from "@testing-library/react";
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
