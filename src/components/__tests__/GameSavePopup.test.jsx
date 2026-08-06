import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GameSavePopup from "../GameSavePopup";
import { teamService } from "../../services/teamService";
import { opponentService } from "../../services/opponentService";
import { competitionService } from "../../services/competitionService";
import { gameService } from "../../services/gameService";

afterEach(() => {
  vi.restoreAllMocks();
});

const sampleTeams = [
  { id: 1, club: "Amadora", name: "Sub-11" },
  { id: 2, club: "Areias", name: "Sub-19" },
];

const sampleOpponents = [
  { id: "o1", name: "Benfica" },
  { id: "o2", name: "Sporting" },
];

const sampleCompetitions = [
  { id: "c1", name: "District League" },
  { id: "c2", name: "Cup" },
];

function mockLists({
  teams = sampleTeams,
  opponents = sampleOpponents,
  competitions = sampleCompetitions,
} = {}) {
  vi.spyOn(teamService, "getAll").mockResolvedValue(teams);
  vi.spyOn(opponentService, "getAll").mockResolvedValue(opponents);
  vi.spyOn(competitionService, "getAll").mockResolvedValue(competitions);
}

function renderPopup(props = {}) {
  return render(<GameSavePopup onClose={() => {}} {...props} />);
}

function teamSelect() {
  return screen.getByLabelText(/^team$/i);
}

function opponentSelect() {
  return screen.getByLabelText(/^opponent$/i);
}

function competitionSelect() {
  return screen.getByLabelText(/^competition$/i);
}

async function fillRequiredFields(user, container, { opponent = "Benfica" } = {}) {
  await user.selectOptions(opponentSelect(), opponent);
  await user.type(
    container.querySelector('[name="date"]'),
    "2027-01-01T10:00"
  );
}

test("loads teams via teamService.getAll rather than a teams prop", async () => {
  mockLists();
  const getAllSpy = teamService.getAll;

  renderPopup();

  await screen.findByRole("option", { name: "Amadora Sub-11" });
  expect(getAllSpy).toHaveBeenCalledTimes(1);
});

test("renders every team as an option formatted as club + name", async () => {
  mockLists();

  renderPopup();

  await screen.findByRole("option", { name: "Amadora Sub-11" });
  const select = teamSelect();
  expect(
    within(select).getByRole("option", { name: "Amadora Sub-11" })
  ).toBeInTheDocument();
  expect(
    within(select).getByRole("option", { name: "Areias Sub-19" })
  ).toBeInTheDocument();
});

test("the form fields sit inside the scroll region while Cancel/Create stay outside it (AC POPUP-02.4)", async () => {
  mockLists();
  const { container } = renderPopup();
  await screen.findByRole("option", { name: "Amadora Sub-11" });

  const shellBody = screen.getByRole("dialog").querySelector(".overflow-y-auto.min-h-0");
  const form = container.querySelector("form");
  const cancelButton = screen.getByRole("button", { name: "Cancel" });
  const createButton = screen.getByRole("button", { name: "Create" });

  expect(shellBody).toContainElement(form);
  expect(shellBody).not.toContainElement(cancelButton);
  expect(shellBody).not.toContainElement(createButton);
});

test("blocks submission and shows a validation message when no team is selected (AC GAME-03.2)", async () => {
  mockLists();
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

test("blocks submission with a message when no opponent is selected (AC GSEL-01.3)", async () => {
  mockLists();
  const createSpy = vi.spyOn(gameService, "create");
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(teamSelect(), "Amadora Sub-11");
  await user.type(container.querySelector('[name="date"]'), "2027-01-01T10:00");

  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(
    await screen.findByText("Please enter the opponent.")
  ).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
  expect(createSpy).not.toHaveBeenCalled();
});

test("submitting persists team, opponent, date, home/away and competition (AC GAME-03.1)", async () => {
  mockLists();
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(teamSelect(), "Areias Sub-19");
  await fillRequiredFields(user, container, { opponent: "Benfica" });
  await user.click(screen.getByLabelText(/home game/i));
  await user.selectOptions(competitionSelect(), "District League");

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
  mockLists();
  const createSpy = vi.spyOn(gameService, "create");
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(teamSelect(), "Amadora Sub-11");
  await fillRequiredFields(user, container);

  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(createSpy).not.toHaveBeenCalled();
});

test("cancelling the popup calls onClose without submitting and leaves the store untouched", async () => {
  mockLists();
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
  mockLists();
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(teamSelect(), "Amadora Sub-11");
  await user.selectOptions(opponentSelect(), "Benfica");
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
  mockLists();

  const { container } = renderPopup({ game: sampleGame });

  await screen.findByRole("option", { name: "Amadora Sub-11" });
  expect(teamSelect()).toHaveValue("2");
  expect(opponentSelect()).toHaveValue("Sporting");
  expect(container.querySelector('[name="date"]')).toHaveValue(
    "2027-06-15T14:30"
  );
  expect(screen.getByLabelText(/home game/i)).not.toBeChecked();
  expect(competitionSelect()).toHaveValue("Cup");
});

test("the heading reads 'Edit Game' and the action button 'Save' in edit mode", async () => {
  mockLists();

  renderPopup({ game: sampleGame });

  expect(
    await screen.findByRole("heading", { name: "Edit Game" })
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Create" })).not.toBeInTheDocument();
});

test("create mode still renders the 'Create Game' heading and 'Create' button", async () => {
  mockLists();

  renderPopup();

  expect(
    await screen.findByRole("heading", { name: "Create Game" })
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
});

test("the opponent field is a select populated from opponentService.getAll, alphabetically (AC GSEL-01.1)", async () => {
  mockLists({
    opponents: [
      { id: "1", name: "Sporting" },
      { id: "2", name: "Benfica" },
    ],
  });

  renderPopup();

  await screen.findByRole("option", { name: "Amadora Sub-11" });
  const options = within(opponentSelect())
    .getAllByRole("option")
    .map((o) => o.textContent);
  expect(options).toEqual(["Select an opponent", "Benfica", "Sporting", "Add new…"]);
});

test("an empty opponents list offers only the placeholder and 'Add new…', stays enabled so 'Add new…' is reachable, and points at the manager (AC GSEL-01.4, superseded by the T4 add-new edge case)", async () => {
  mockLists({ opponents: [] });

  renderPopup();

  await screen.findByRole("option", { name: "Amadora Sub-11" });
  const options = within(opponentSelect())
    .getAllByRole("option")
    .map((o) => o.textContent);
  expect(options).toEqual(["Select an opponent", "Add new…"]);
  expect(opponentSelect()).not.toBeDisabled();
  expect(
    screen.getByText(/No opponents yet\. Add one from the Opponents manager/)
  ).toBeInTheDocument();
});

test("editing a game whose opponent is not in the list shows it marked and preserves it through an untouched save (AC GSEL-01.5)", async () => {
  mockLists({ opponents: [{ id: "1", name: "Benfica" }] });
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  renderPopup({ game: { ...sampleGame, opponent: "Legacy FC" }, onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });

  expect(opponentSelect()).toHaveValue("Legacy FC");
  expect(
    within(opponentSelect()).getByRole("option", { name: "Legacy FC (not in list)" })
  ).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ opponent: "Legacy FC" })
  );
});

test("a stored opponent matching a list entry only by case renders as that entry, not a second option (edge case)", async () => {
  mockLists({ opponents: [{ id: "1", name: "Benfica" }] });

  renderPopup({ game: { ...sampleGame, opponent: "benfica" } });

  await screen.findByRole("option", { name: "Amadora Sub-11" });
  const options = within(opponentSelect()).getAllByRole("option");
  expect(options.filter((o) => o.textContent.toLowerCase() === "benfica")).toHaveLength(1);
  // The select must actually render as selecting the list's entry (exact
  // casing), not sit blank because "benfica" matches no <option value>.
  expect(opponentSelect()).toHaveValue("Benfica");
});

test("a stored competition matching a list entry only by case renders as that entry, not a second option (edge case)", async () => {
  mockLists({ competitions: [{ id: "1", name: "Cup" }] });

  renderPopup({ game: { ...sampleGame, competition: "cup" } });

  await screen.findByRole("option", { name: "Amadora Sub-11" });
  const options = within(competitionSelect()).getAllByRole("option");
  expect(options.filter((o) => o.textContent.toLowerCase() === "cup")).toHaveLength(1);
  expect(competitionSelect()).toHaveValue("Cup");
});

test("the competition field is a select populated from competitionService.getAll, alphabetically (AC GSEL-02.1)", async () => {
  mockLists({
    competitions: [
      { id: "1", name: "League" },
      { id: "2", name: "Cup" },
    ],
  });

  renderPopup();

  await screen.findByRole("option", { name: "Amadora Sub-11" });
  const options = within(competitionSelect())
    .getAllByRole("option")
    .map((o) => o.textContent);
  expect(options).toEqual(["None", "Cup", "League", "Add new…"]);
});

test("selecting 'None' stores an empty competition (AC GSEL-02.2, GSEL-02.3)", async () => {
  mockLists();
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(teamSelect(), "Amadora Sub-11");
  await fillRequiredFields(user, container);
  await user.selectOptions(competitionSelect(), "District League");
  await user.selectOptions(competitionSelect(), "None");

  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ competition: "" })
  );
});

test("selecting a competition stores its name (AC GSEL-02.4)", async () => {
  mockLists();
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const { container } = renderPopup({ onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(teamSelect(), "Amadora Sub-11");
  await fillRequiredFields(user, container);
  await user.selectOptions(competitionSelect(), "Cup");

  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ competition: "Cup" })
  );
});

test("a legacy stored competition is shown marked and preserved through an untouched save (AC GSEL-02.5)", async () => {
  mockLists({ competitions: [{ id: "1", name: "Cup" }] });
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  renderPopup({ game: { ...sampleGame, competition: "Legacy League" }, onSubmit });
  await screen.findByRole("option", { name: "Amadora Sub-11" });

  expect(competitionSelect()).toHaveValue("Legacy League");
  expect(
    within(competitionSelect()).getByRole("option", {
      name: "Legacy League (not in list)",
    })
  ).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ competition: "Legacy League" })
  );
});

test("an empty competitions list offers only 'None' and points at the manager (AC GSEL-02.6)", async () => {
  mockLists({ competitions: [] });

  renderPopup();

  await screen.findByRole("option", { name: "Amadora Sub-11" });
  const options = within(competitionSelect())
    .getAllByRole("option")
    .map((o) => o.textContent);
  expect(options).toEqual(["None", "Add new…"]);
  expect(
    screen.getByText(/No competitions yet\. Add one from the Competitions manager/)
  ).toBeInTheDocument();
});

test("choosing 'Add new…' on the opponent select opens the opponents manager over the form (AC GSEL-01.6)", async () => {
  mockLists();
  const user = userEvent.setup();
  renderPopup();
  await screen.findByRole("option", { name: "Amadora Sub-11" });

  await user.selectOptions(opponentSelect(), "Add new…");

  const dialogs = screen.getAllByRole("dialog");
  expect(dialogs).toHaveLength(2);
  expect(within(dialogs[1]).getByText("Opponents")).toBeInTheDocument();
});

test("choosing 'Add new…' on the competition select opens the competitions manager over the form (AC GSEL-01.6)", async () => {
  mockLists();
  const user = userEvent.setup();
  renderPopup();
  await screen.findByRole("option", { name: "Amadora Sub-11" });

  await user.selectOptions(competitionSelect(), "Add new…");

  const dialogs = screen.getAllByRole("dialog");
  expect(dialogs).toHaveLength(2);
  expect(within(dialogs[1]).getByText("Competitions")).toBeInTheDocument();
});

test("the stacked manager is interactive above the form (regression guard on 13's nested-popup edge case)", async () => {
  mockLists();
  const user = userEvent.setup();
  renderPopup();
  await screen.findByRole("option", { name: "Amadora Sub-11" });

  await user.selectOptions(opponentSelect(), "Add new…");
  const dialog = screen.getAllByRole("dialog")[1];
  const input = within(dialog).getByLabelText("New opponent");
  await user.type(input, "Porto");

  expect(input).toHaveValue("Porto");
});

test("closing the opponents manager without adding anything leaves every form value untouched, including the date field (edge case)", async () => {
  mockLists();
  const user = userEvent.setup();
  const { container } = renderPopup();
  await screen.findByRole("option", { name: "Amadora Sub-11" });
  await user.selectOptions(teamSelect(), "Amadora Sub-11");
  await user.selectOptions(opponentSelect(), "Benfica");
  await user.selectOptions(competitionSelect(), "Cup");
  await user.type(container.querySelector('[name="date"]'), "2027-01-01T10:15");
  await user.click(screen.getByLabelText(/home game/i));

  await user.selectOptions(opponentSelect(), "Add new…");
  const dialog = screen.getAllByRole("dialog")[1];
  await user.click(within(dialog).getByRole("button", { name: "Close" }));

  expect(teamSelect()).toHaveValue("1");
  expect(opponentSelect()).toHaveValue("Benfica");
  expect(competitionSelect()).toHaveValue("Cup");
  expect(container.querySelector('[name="date"]')).toHaveValue("2027-01-01T10:15");
  expect(screen.getByLabelText(/home game/i)).not.toBeChecked();
});

test("closing the opponents manager re-reads the list and selects a name added there with no second interaction (edge case)", async () => {
  mockLists({ opponents: [{ id: "1", name: "Benfica" }] });
  let opponentsData = [{ id: "1", name: "Benfica" }];
  vi.spyOn(opponentService, "getAll").mockImplementation(async () => [...opponentsData]);
  vi.spyOn(opponentService, "create").mockImplementation(async (name) => {
    const created = { id: "new", name };
    opponentsData = [...opponentsData, created];
    return created;
  });
  const user = userEvent.setup();
  renderPopup();
  await screen.findByRole("option", { name: "Amadora Sub-11" });

  await user.selectOptions(opponentSelect(), "Add new…");
  const dialog = screen.getAllByRole("dialog")[1];
  await user.type(within(dialog).getByLabelText("New opponent"), "Porto");
  await user.click(within(dialog).getByRole("button", { name: "Add" }));
  await within(dialog).findByText("Porto");
  await user.click(within(dialog).getByRole("button", { name: "Close" }));

  expect(opponentSelect()).toHaveValue("Porto");
});

test("closing the competitions manager re-reads the list and selects a name added there with no second interaction (edge case)", async () => {
  mockLists({ competitions: [{ id: "1", name: "Cup" }] });
  let competitionsData = [{ id: "1", name: "Cup" }];
  vi.spyOn(competitionService, "getAll").mockImplementation(async () => [
    ...competitionsData,
  ]);
  vi.spyOn(competitionService, "create").mockImplementation(async (name) => {
    const created = { id: "new", name };
    competitionsData = [...competitionsData, created];
    return created;
  });
  const user = userEvent.setup();
  renderPopup();
  await screen.findByRole("option", { name: "Amadora Sub-11" });

  await user.selectOptions(competitionSelect(), "Add new…");
  const dialog = screen.getAllByRole("dialog")[1];
  await user.type(within(dialog).getByLabelText("New competition"), "Taça");
  await user.click(within(dialog).getByRole("button", { name: "Add" }));
  await within(dialog).findByText("Taça");
  await user.click(within(dialog).getByRole("button", { name: "Close" }));

  expect(competitionSelect()).toHaveValue("Taça");
});

test("the form contains no type=\"text\" input for opponent or competition", async () => {
  mockLists();
  const { container } = renderPopup();
  await screen.findByRole("option", { name: "Amadora Sub-11" });

  expect(container.querySelector('input[name="opponent"]')).toBeNull();
  expect(container.querySelector('input[name="competition"]')).toBeNull();
  expect(opponentSelect().tagName).toBe("SELECT");
  expect(competitionSelect().tagName).toBe("SELECT");
});

test("Cancel is secondary and Save/Create is primary, submitting the detached form by id (AC BTN-01.5)", async () => {
  mockLists();
  const { container } = renderPopup();
  await screen.findByRole("option", { name: "Amadora Sub-11" });

  const cancelButton = screen.getByRole("button", { name: "Cancel" });
  const createButton = screen.getByRole("button", { name: "Create" });
  const form = container.querySelector("form");

  expect(cancelButton.className).toMatch(/border/);
  expect(createButton.className).toMatch(/bg-blue-600/);
  expect(createButton).toHaveAttribute("type", "submit");
  expect(createButton).toHaveAttribute("form", form.id);
});
