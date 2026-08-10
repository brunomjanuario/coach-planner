import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReferenceListsPopup from "../ReferenceListsPopup";
import { opponentService } from "../../services/opponentService";
import { competitionService } from "../../services/competitionService";
import { gameService } from "../../services/gameService";
import { StorageQuotaError } from "../../lib/storage";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockLists({ opponents = [], competitions = [], games = [] } = {}) {
  vi.spyOn(opponentService, "getAll").mockResolvedValue(opponents);
  vi.spyOn(competitionService, "getAll").mockResolvedValue(competitions);
  vi.spyOn(gameService, "getAll").mockResolvedValue(games);
}

function renderPopup(props = {}) {
  return render(<ReferenceListsPopup onClose={() => {}} {...props} />);
}

test("renders through PopupShell titled 'Manage lists', capping at 85vh with only the body scrolling (AC GREF-01.4)", async () => {
  mockLists();
  renderPopup();

  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("Manage lists")).toBeInTheDocument();
  expect(dialog.className).toMatch(/max-h-\[85vh\]/);
  expect(dialog.querySelector(".overflow-y-auto.min-h-0")).toBeInTheDocument();
});

test("shows an Opponents tab and a Competitions tab with Opponents active by default (AC GREF-01.2)", async () => {
  mockLists({ opponents: [{ id: "1", name: "Benfica" }] });
  renderPopup();

  await screen.findByText("Benfica");
  expect(screen.getByRole("tab", { name: "Opponents" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  expect(screen.getByRole("tab", { name: "Competitions" })).toHaveAttribute(
    "aria-selected",
    "false"
  );
});

test("selecting Competitions renders the competitions list and removes the opponents list from the document (AC GREF-01.3)", async () => {
  mockLists({
    opponents: [{ id: "1", name: "Benfica" }],
    competitions: [{ id: "1", name: "Cup" }],
  });
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("Benfica");

  await user.click(screen.getByRole("tab", { name: "Competitions" }));

  expect(await screen.findByText("Cup")).toBeInTheDocument();
  expect(screen.queryByText("Benfica")).not.toBeInTheDocument();
});

test("an initialTab prop of 'competitions' opens the popup on that tab (AC GREF-03.1, GREF-03.2)", async () => {
  mockLists({ competitions: [{ id: "1", name: "Cup" }] });
  renderPopup({ initialTab: "competitions" });

  await screen.findByText("Cup");
  expect(screen.getByRole("tab", { name: "Competitions" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
});

test("the Opponents tab counts usage from game.opponent (AC GREF-02.4)", async () => {
  mockLists({
    opponents: [{ id: "1", name: "Benfica" }],
    games: [
      { id: "g1", opponent: "Benfica", competition: "Cup" },
      { id: "g2", opponent: "Benfica", competition: "Cup" },
      { id: "g3", opponent: "Porto", competition: "Benfica" },
    ],
  });
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("Benfica");

  await user.click(screen.getByRole("button", { name: "Delete Benfica" }));

  expect(
    await screen.findByText('Delete "Benfica"? 2 games use this opponent.')
  ).toBeInTheDocument();
});

test("the Competitions tab counts usage from game.competition, not game.opponent (AC GREF-02.4)", async () => {
  mockLists({
    competitions: [{ id: "1", name: "Benfica" }],
    games: [
      { id: "g1", opponent: "Benfica", competition: "Cup" },
      { id: "g2", opponent: "Porto", competition: "Benfica" },
    ],
  });
  const user = userEvent.setup();
  renderPopup({ initialTab: "competitions" });
  await screen.findByText("Benfica");

  await user.click(screen.getByRole("button", { name: "Delete Benfica" }));

  expect(
    await screen.findByText('Delete "Benfica"? 1 game use this competition.')
  ).toBeInTheDocument();
});

test("a name present in both lists is managed independently on each tab (edge case)", async () => {
  mockLists({
    opponents: [{ id: "o1", name: "Sporting" }],
    competitions: [{ id: "c1", name: "Sporting" }],
    games: [{ id: "g1", opponent: "Sporting", competition: "Cup" }],
  });
  vi.spyOn(opponentService, "delete").mockResolvedValue();
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("Sporting");

  vi.spyOn(opponentService, "getAll").mockResolvedValue([]);
  await user.click(screen.getByRole("button", { name: "Delete Sporting" }));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  await screen.findByText("No opponents yet. Add your first one below.");

  await user.click(screen.getByRole("tab", { name: "Competitions" }));

  expect(await screen.findByText("Sporting")).toBeInTheDocument();
});

test("switching tabs with a delete confirmation open closes the confirmation (edge case)", async () => {
  mockLists({
    opponents: [{ id: "1", name: "Benfica" }],
    competitions: [{ id: "1", name: "Cup" }],
  });
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("Benfica");

  await user.click(screen.getByRole("button", { name: "Delete Benfica" }));
  await screen.findByText('Delete "Benfica"? 0 games use this opponent.');

  await user.click(screen.getByRole("tab", { name: "Competitions" }));

  expect(
    screen.queryByText('Delete "Benfica"? 0 games use this opponent.')
  ).not.toBeInTheDocument();
});

test("switching tabs with a rename in progress discards that edit (edge case)", async () => {
  mockLists({
    opponents: [{ id: "1", name: "Benfica" }],
    competitions: [{ id: "1", name: "Cup" }],
  });
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("Benfica");

  await user.click(screen.getByRole("button", { name: "Rename Benfica" }));
  const input = screen.getByLabelText("Rename Benfica");
  await user.clear(input);
  await user.type(input, "Something Else");

  await user.click(screen.getByRole("tab", { name: "Competitions" }));
  await screen.findByText("Cup");
  await user.click(screen.getByRole("tab", { name: "Opponents" }));

  expect(await screen.findByText("Benfica")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Rename Benfica" }));
  expect(screen.getByLabelText("Rename Benfica")).toHaveValue("Benfica");
});

test("adding an opponent calls opponentService.create then re-reads the list (AC GREF-02.1)", async () => {
  const getAllSpy = vi
    .spyOn(opponentService, "getAll")
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ id: "1", name: "Porto" }]);
  vi.spyOn(competitionService, "getAll").mockResolvedValue([]);
  vi.spyOn(gameService, "getAll").mockResolvedValue([]);
  const createSpy = vi
    .spyOn(opponentService, "create")
    .mockResolvedValue({ id: "1", name: "Porto" });
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("No opponents yet. Add your first one below.");

  await user.type(screen.getByLabelText("New opponent"), "Porto");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(await screen.findByText("Porto")).toBeInTheDocument();
  expect(createSpy).toHaveBeenCalledWith("Porto");
  expect(getAllSpy).toHaveBeenCalledTimes(2);
});

test("a rejected competition create renders the service's error message and creates nothing (AC GREF-02.2)", async () => {
  mockLists({ competitions: [{ id: "1", name: "Cup" }] });
  vi.spyOn(competitionService, "create").mockRejectedValue(
    new Error('A competition named "Cup" already exists.')
  );
  const user = userEvent.setup();
  renderPopup({ initialTab: "competitions" });
  await screen.findByText("Cup");

  await user.type(screen.getByLabelText("New competition"), "Cup");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(
    await screen.findByText('A competition named "Cup" already exists.')
  ).toBeInTheDocument();
});

test("the Close button calls onClose", async () => {
  mockLists();
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<ReferenceListsPopup onClose={onClose} />);
  await screen.findByRole("dialog");

  await user.click(screen.getByRole("button", { name: "Close" }));

  expect(onClose).toHaveBeenCalled();
});

test("an empty opponents list renders its own empty message while competitions has entries (edge case)", async () => {
  mockLists({ opponents: [], competitions: [{ id: "1", name: "Cup" }] });
  renderPopup();

  expect(
    await screen.findByText("No opponents yet. Add your first one below.")
  ).toBeInTheDocument();
});

test("cancelling a delete on the Competitions tab removes nothing (AC GREF-02.5)", async () => {
  mockLists({ competitions: [{ id: "1", name: "Cup" }] });
  const deleteSpy = vi.spyOn(competitionService, "delete");
  const user = userEvent.setup();
  renderPopup({ initialTab: "competitions" });
  await screen.findByText("Cup");

  await user.click(screen.getByRole("button", { name: "Delete Cup" }));
  await screen.findByText('Delete "Cup"? 0 games use this competition.');
  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.getByText("Cup")).toBeInTheDocument();
  expect(deleteSpy).not.toHaveBeenCalled();
});

test("an empty opponent name is rejected via the real service's validation message (AC GREF-02.2)", async () => {
  mockLists();
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("No opponents yet. Add your first one below.");

  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(
    await screen.findByText("Opponent name cannot be empty.")
  ).toBeInTheDocument();
});

test("a storage-quota failure on create surfaces an error rather than appearing to succeed (edge case)", async () => {
  mockLists();
  const createSpy = vi
    .spyOn(opponentService, "create")
    .mockRejectedValue(new StorageQuotaError("opponents"));
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("No opponents yet. Add your first one below.");

  await user.type(screen.getByLabelText("New opponent"), "Porto");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(await screen.findByText(/storage quota exceeded/i)).toBeInTheDocument();
  expect(createSpy).toHaveBeenCalledTimes(1);
  expect(
    screen.getByText("No opponents yet. Add your first one below.")
  ).toBeInTheDocument();
});

test("Close is secondary, Add is primary (AC BTN-04.1)", async () => {
  mockLists({ opponents: [{ id: "1", name: "Benfica" }] });
  renderPopup();
  await screen.findByText("Benfica");

  const closeButton = screen.getByRole("button", { name: "Close" });
  const addButton = screen.getByRole("button", { name: "Add" });
  expect(closeButton.className).toMatch(/border/);
  expect(closeButton.className).not.toMatch(/bg-gray-300/);
  expect(addButton.className).toMatch(/bg-blue-600/);
});
