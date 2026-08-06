import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CompetitionsPopup from "../CompetitionsPopup";
import { competitionService } from "../../services/competitionService";
import { StorageQuotaError } from "../../lib/storage";

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPopup(props = {}) {
  return render(<CompetitionsPopup onClose={() => {}} {...props} />);
}

test("renders through PopupShell with the title 'Competitions'", async () => {
  vi.spyOn(competitionService, "getAll").mockResolvedValue([]);

  renderPopup();

  expect(await screen.findByRole("dialog")).toBeInTheDocument();
  expect(screen.getByText("Competitions")).toBeInTheDocument();
});

test("lists every stored competition (AC COMP-03.1)", async () => {
  vi.spyOn(competitionService, "getAll").mockResolvedValue([
    { id: "1", name: "District League" },
    { id: "2", name: "Cup" },
  ]);

  renderPopup();

  expect(await screen.findByText("District League")).toBeInTheDocument();
  expect(screen.getByText("Cup")).toBeInTheDocument();
});

test("an empty list renders the invitation state (AC COMP-03.7)", async () => {
  vi.spyOn(competitionService, "getAll").mockResolvedValue([]);

  renderPopup();

  expect(
    await screen.findByText("No competitions yet. Add your first one below.")
  ).toBeInTheDocument();
});

test("submitting a name adds it and the list updates without a reload (AC COMP-03.2)", async () => {
  const getAllSpy = vi
    .spyOn(competitionService, "getAll")
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ id: "1", name: "Cup" }]);
  vi.spyOn(competitionService, "create").mockResolvedValue({
    id: "1",
    name: "Cup",
  });
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("No competitions yet. Add your first one below.");

  await user.type(screen.getByLabelText("New competition"), "Cup");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(await screen.findByText("Cup")).toBeInTheDocument();
  expect(competitionService.create).toHaveBeenCalledWith("Cup");
  expect(getAllSpy).toHaveBeenCalledTimes(2);
});

test("submitting a name clears the input on success", async () => {
  vi.spyOn(competitionService, "getAll")
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ id: "1", name: "Cup" }]);
  vi.spyOn(competitionService, "create").mockResolvedValue({
    id: "1",
    name: "Cup",
  });
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("No competitions yet. Add your first one below.");
  const input = screen.getByLabelText("New competition");

  await user.type(input, "Cup");
  await user.click(screen.getByRole("button", { name: "Add" }));
  await screen.findByText("Cup");

  expect(input).toHaveValue("");
});

test("a rejected name renders the reason and keeps the typed value in the field (AC COMP-03.8)", async () => {
  vi.spyOn(competitionService, "getAll").mockResolvedValue([
    { id: "1", name: "Cup" },
  ]);
  vi.spyOn(competitionService, "create").mockRejectedValue(
    new Error('A competition named "Cup" already exists.')
  );
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("Cup");
  const input = screen.getByLabelText("New competition");

  await user.type(input, "Cup");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(
    await screen.findByText('A competition named "Cup" already exists.')
  ).toBeInTheDocument();
  expect(input).toHaveValue("Cup");
});

test("a storage-quota failure surfaces an error rather than appearing to succeed (edge case)", async () => {
  vi.spyOn(competitionService, "getAll").mockResolvedValue([]);
  const createSpy = vi
    .spyOn(competitionService, "create")
    .mockRejectedValue(new StorageQuotaError("competitions"));
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("No competitions yet. Add your first one below.");

  await user.type(screen.getByLabelText("New competition"), "Cup");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(
    await screen.findByText(/storage quota exceeded/i)
  ).toBeInTheDocument();
  expect(createSpy).toHaveBeenCalledTimes(1);
  expect(
    screen.getByText("No competitions yet. Add your first one below.")
  ).toBeInTheDocument();
});

test("a long name wraps rather than overflowing (edge case)", async () => {
  const longName = "A".repeat(200);
  vi.spyOn(competitionService, "getAll").mockResolvedValue([
    { id: "1", name: longName },
  ]);

  renderPopup();

  const item = await screen.findByText(longName);
  expect(item).toHaveClass("break-words");
});

test("renders through PopupShell with the create form in the footer, outside the scrollable body", async () => {
  vi.spyOn(competitionService, "getAll").mockResolvedValue([
    { id: "1", name: "Cup" },
  ]);

  renderPopup();
  await screen.findByText("Cup");

  const shellBody = screen
    .getByRole("dialog")
    .querySelector(".overflow-y-auto.min-h-0");
  const form = screen.getByLabelText("New competition").closest("form");

  expect(shellBody).toContainElement(screen.getByText("Cup"));
  expect(shellBody).not.toContainElement(form);
});

test("an empty name is rejected via the service's own validation message", async () => {
  vi.spyOn(competitionService, "getAll").mockResolvedValue([]);
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("No competitions yet. Add your first one below.");

  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(
    await screen.findByText("Competition name cannot be empty.")
  ).toBeInTheDocument();
});

test("typing after a rejected submission clears the inline error", async () => {
  vi.spyOn(competitionService, "getAll").mockResolvedValue([
    { id: "1", name: "Cup" },
  ]);
  vi.spyOn(competitionService, "create").mockRejectedValue(
    new Error('A competition named "Cup" already exists.')
  );
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("Cup");
  const input = screen.getByLabelText("New competition");

  await user.type(input, "Cup");
  await user.click(screen.getByRole("button", { name: "Add" }));
  await screen.findByText('A competition named "Cup" already exists.');

  await user.type(input, "s");

  expect(
    screen.queryByText('A competition named "Cup" already exists.')
  ).not.toBeInTheDocument();
});

test("renaming a competition calls competitionService.update, awaits it, then re-reads the list (AC COMP-04.3, AD-004)", async () => {
  const getAllSpy = vi
    .spyOn(competitionService, "getAll")
    .mockResolvedValueOnce([{ id: "1", name: "Cup" }])
    .mockResolvedValueOnce([{ id: "1", name: "Cup Renamed" }]);
  const updateSpy = vi
    .spyOn(competitionService, "update")
    .mockResolvedValue({ id: "1", name: "Cup Renamed" });
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("Cup");

  await user.click(screen.getByRole("button", { name: "Rename Cup" }));
  const input = screen.getByLabelText("Rename Cup");
  await user.clear(input);
  await user.type(input, "Cup Renamed");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByText("Cup Renamed")).toBeInTheDocument();
  expect(updateSpy).toHaveBeenCalledWith({ id: "1", name: "Cup Renamed" });
  expect(getAllSpy).toHaveBeenCalledTimes(2);
});

test("a rejected rename renders the reason and keeps the typed value, leaving the original name shown until fixed", async () => {
  vi.spyOn(competitionService, "getAll").mockResolvedValue([
    { id: "1", name: "Cup" },
    { id: "2", name: "League" },
  ]);
  vi.spyOn(competitionService, "update").mockRejectedValue(
    new Error('A competition named "League" already exists.')
  );
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("Cup");

  await user.click(screen.getByRole("button", { name: "Rename Cup" }));
  const input = screen.getByLabelText("Rename Cup");
  await user.clear(input);
  await user.type(input, "League");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByText('A competition named "League" already exists.')
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Rename Cup")).toHaveValue("League");
});

test("cancelling a rename discards the change and does not call update", async () => {
  const updateSpy = vi.spyOn(competitionService, "update");
  vi.spyOn(competitionService, "getAll").mockResolvedValue([
    { id: "1", name: "Cup" },
  ]);
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("Cup");

  await user.click(screen.getByRole("button", { name: "Rename Cup" }));
  const input = screen.getByLabelText("Rename Cup");
  await user.clear(input);
  await user.type(input, "Something Else");
  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.getByText("Cup")).toBeInTheDocument();
  expect(updateSpy).not.toHaveBeenCalled();
});

test("a 20-item list scrolls inside the shell with the create form still reachable (regression guard on POPUP-02)", async () => {
  const many = Array.from({ length: 20 }, (_, i) => ({
    id: String(i),
    name: `Competition ${i}`,
  }));
  vi.spyOn(competitionService, "getAll").mockResolvedValue(many);

  renderPopup();
  await screen.findByText("Competition 0");

  const shellBody = screen
    .getByRole("dialog")
    .querySelector(".overflow-y-auto.min-h-0");
  const addButton = screen.getByRole("button", { name: "Add" });
  const input = screen.getByLabelText("New competition");

  expect(shellBody).not.toContainElement(addButton);
  expect(shellBody).not.toContainElement(input);
  expect(addButton).toBeInTheDocument();
});

test("Close is secondary, Add is primary, and the inline rename row uses the same variants (AC BTN-04.1)", async () => {
  vi.spyOn(competitionService, "getAll").mockResolvedValue([{ id: "1", name: "Cup" }]);
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("Cup");

  const closeButton = screen.getByRole("button", { name: "Close" });
  const addButton = screen.getByRole("button", { name: "Add" });
  expect(closeButton.className).toMatch(/border/);
  expect(closeButton.className).not.toMatch(/bg-gray-300/);
  expect(addButton.className).toMatch(/bg-blue-600/);

  await user.click(screen.getByRole("button", { name: "Rename Cup" }));
  const saveButton = screen.getByRole("button", { name: "Save" });
  const cancelButton = screen.getByRole("button", { name: "Cancel" });
  expect(saveButton.className).toMatch(/bg-blue-600/);
  expect(cancelButton.className).toMatch(/border/);
  expect(cancelButton.className).not.toMatch(/bg-gray-300/);
});
