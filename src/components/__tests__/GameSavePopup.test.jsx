import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GameSavePopup from "../GameSavePopup";
import { teamService } from "../../services/teamService";
import { gameService } from "../../services/gameService";

afterEach(() => {
  vi.restoreAllMocks();
});

const sampleTeams = [
  { id: 1, club: "Amadora", name: "Sub-11" },
  { id: 2, club: "Areias", name: "Sub-19" },
];

function renderPopup(props = {}) {
  return render(<GameSavePopup onClose={() => {}} {...props} />);
}

async function fillRequiredFields(user, container, { opponent = "Benfica" } = {}) {
  await user.type(screen.getByLabelText(/opponent/i), opponent);
  await user.type(
    container.querySelector('[name="date"]'),
    "2027-01-01T10:00"
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

test("blocks submission and shows a validation message when no team is selected (AC GAME-03.2)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const createSpy = vi.spyOn(gameService, "create");
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await fillRequiredFields(user, container);

  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(await screen.findByText("Please select a team.")).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
  expect(createSpy).not.toHaveBeenCalled();
});

test("blocks submission with a message when the opponent is empty (AC GAME-03.3)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const createSpy = vi.spyOn(gameService, "create");
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(screen.getByRole("combobox"), "Amadora Sub-11");
  await user.type(container.querySelector('[name="date"]'), "2027-01-01T10:00");

  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(
    await screen.findByText("Please enter the opponent.")
  ).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
  expect(createSpy).not.toHaveBeenCalled();
});

test("blocks submission with a message when the opponent is whitespace-only (AC GAME-03.3)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(screen.getByRole("combobox"), "Amadora Sub-11");
  await user.type(screen.getByLabelText(/opponent/i), "   ");
  await user.type(container.querySelector('[name="date"]'), "2027-01-01T10:00");

  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(
    await screen.findByText("Please enter the opponent.")
  ).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("submitting persists team, opponent, date, home/away and competition (AC GAME-03.1)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(screen.getByRole("combobox"), "Areias Sub-19");
  await fillRequiredFields(user, container, { opponent: "Benfica" });
  await user.click(screen.getByLabelText(/home game/i));
  await user.type(screen.getByLabelText(/competition/i), "District League");

  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({
      teamId: 2,
      opponent: "Benfica",
      isHome: false,
      competition: "District League",
    })
  );
  const [[submitted]] = onSubmit.mock.calls;
  expect(submitted.date).toBeInstanceOf(Date);
});

test("invokes the onSubmit prop instead of calling gameService.create directly", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const createSpy = vi.spyOn(gameService, "create");
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(screen.getByRole("combobox"), "Amadora Sub-11");
  await fillRequiredFields(user, container);

  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(createSpy).not.toHaveBeenCalled();
});

test("cancelling the popup calls onClose without submitting and leaves the store untouched", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const createSpy = vi.spyOn(gameService, "create");
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  renderPopup({ onSubmit, onClose });
  await screen.findByRole("option", { name: "Amadora Sub-11" });

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSubmit).not.toHaveBeenCalled();
  expect(createSpy).not.toHaveBeenCalled();
});

test("an invalid/empty date blocks the save with a message (edge case)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(screen.getByRole("combobox"), "Amadora Sub-11");
  await user.type(screen.getByLabelText(/opponent/i), "Benfica");
  fireEvent.change(container.querySelector('[name="date"]'), {
    target: { value: "" },
  });

  fireEvent.submit(container.querySelector("form"));

  expect(
    await screen.findByText("Please enter a valid date and time.")
  ).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

const sampleGame = {
  id: "game-1",
  teamId: 2,
  opponent: "Sporting",
  date: new Date(2027, 5, 15, 14, 30),
  isHome: false,
  competition: "Cup",
  usScore: null,
  themScore: null,
};

test("an optional game prop opens the popup in edit mode, pre-filling every field including the date via toInputValue", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);

  const { container } = renderPopup({ game: sampleGame });

  await screen.findByRole("option", { name: "Amadora Sub-11" });
  expect(screen.getByRole("combobox")).toHaveValue("2");
  expect(screen.getByLabelText(/opponent/i)).toHaveValue("Sporting");
  expect(container.querySelector('[name="date"]')).toHaveValue(
    "2027-06-15T14:30"
  );
  expect(screen.getByLabelText(/home game/i)).not.toBeChecked();
  expect(screen.getByLabelText(/competition/i)).toHaveValue("Cup");
});

test("the heading reads 'Edit Game' and the action button 'Save' in edit mode", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);

  renderPopup({ game: sampleGame });

  expect(
    await screen.findByRole("heading", { name: "Edit Game" })
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Create" })).not.toBeInTheDocument();
});

test("create mode still renders the 'Create Game' heading and 'Create' button", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);

  renderPopup();

  expect(
    await screen.findByRole("heading", { name: "Create Game" })
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
});
