import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OpponentsPopup from "../OpponentsPopup";
import { opponentService } from "../../services/opponentService";
import { StorageQuotaError } from "../../lib/storage";

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPopup(props = {}) {
  return render(<OpponentsPopup onClose={() => {}} {...props} />);
}

test("renders through PopupShell with the title 'Opponents'", async () => {
  vi.spyOn(opponentService, "getAll").mockResolvedValue([]);

  renderPopup();

  expect(await screen.findByRole("dialog")).toBeInTheDocument();
  expect(screen.getByText("Opponents")).toBeInTheDocument();
});

test("lists every stored opponent (AC OPP-03.1)", async () => {
  vi.spyOn(opponentService, "getAll").mockResolvedValue([
    { id: "1", name: "Benfica" },
    { id: "2", name: "Porto" },
  ]);

  renderPopup();

  expect(await screen.findByText("Benfica")).toBeInTheDocument();
  expect(screen.getByText("Porto")).toBeInTheDocument();
});

test("an empty list renders the invitation state (AC OPP-03.7)", async () => {
  vi.spyOn(opponentService, "getAll").mockResolvedValue([]);

  renderPopup();

  expect(
    await screen.findByText("No opponents yet. Add your first one below.")
  ).toBeInTheDocument();
});

test("submitting a name adds it and the list updates without a reload (AC OPP-03.2)", async () => {
  const getAllSpy = vi
    .spyOn(opponentService, "getAll")
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ id: "1", name: "Porto" }]);
  vi.spyOn(opponentService, "create").mockResolvedValue({
    id: "1",
    name: "Porto",
  });
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("No opponents yet. Add your first one below.");

  await user.type(screen.getByLabelText("New opponent"), "Porto");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(await screen.findByText("Porto")).toBeInTheDocument();
  expect(opponentService.create).toHaveBeenCalledWith("Porto");
  expect(getAllSpy).toHaveBeenCalledTimes(2);
});

test("submitting a name clears the input on success", async () => {
  vi.spyOn(opponentService, "getAll")
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ id: "1", name: "Porto" }]);
  vi.spyOn(opponentService, "create").mockResolvedValue({
    id: "1",
    name: "Porto",
  });
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("No opponents yet. Add your first one below.");
  const input = screen.getByLabelText("New opponent");

  await user.type(input, "Porto");
  await user.click(screen.getByRole("button", { name: "Add" }));
  await screen.findByText("Porto");

  expect(input).toHaveValue("");
});

test("a rejected name renders the reason and keeps the typed value in the field (AC OPP-03.8)", async () => {
  vi.spyOn(opponentService, "getAll").mockResolvedValue([
    { id: "1", name: "Porto" },
  ]);
  vi.spyOn(opponentService, "create").mockRejectedValue(
    new Error('An opponent named "Porto" already exists.')
  );
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("Porto");
  const input = screen.getByLabelText("New opponent");

  await user.type(input, "Porto");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(
    await screen.findByText('An opponent named "Porto" already exists.')
  ).toBeInTheDocument();
  expect(input).toHaveValue("Porto");
});

test("a storage-quota failure surfaces an error rather than appearing to succeed (edge case)", async () => {
  vi.spyOn(opponentService, "getAll").mockResolvedValue([]);
  const createSpy = vi
    .spyOn(opponentService, "create")
    .mockRejectedValue(new StorageQuotaError("opponents"));
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("No opponents yet. Add your first one below.");

  await user.type(screen.getByLabelText("New opponent"), "Porto");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(
    await screen.findByText(/storage quota exceeded/i)
  ).toBeInTheDocument();
  expect(createSpy).toHaveBeenCalledTimes(1);
  expect(
    screen.getByText("No opponents yet. Add your first one below.")
  ).toBeInTheDocument();
});

test("a long name wraps rather than overflowing (edge case)", async () => {
  const longName = "A".repeat(200);
  vi.spyOn(opponentService, "getAll").mockResolvedValue([
    { id: "1", name: longName },
  ]);

  renderPopup();

  const item = await screen.findByText(longName);
  expect(item).toHaveClass("break-words");
});

test("renders through PopupShell with the create form in the footer, outside the scrollable body", async () => {
  vi.spyOn(opponentService, "getAll").mockResolvedValue([
    { id: "1", name: "Porto" },
  ]);

  renderPopup();
  await screen.findByText("Porto");

  const shellBody = screen
    .getByRole("dialog")
    .querySelector(".overflow-y-auto.min-h-0");
  const form = screen.getByLabelText("New opponent").closest("form");

  expect(shellBody).toContainElement(screen.getByText("Porto"));
  expect(shellBody).not.toContainElement(form);
});

test("an empty name is rejected via the service's own validation message", async () => {
  vi.spyOn(opponentService, "getAll").mockResolvedValue([]);
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("No opponents yet. Add your first one below.");

  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(
    await screen.findByText("Opponent name cannot be empty.")
  ).toBeInTheDocument();
});

test("typing after a rejected submission clears the inline error", async () => {
  vi.spyOn(opponentService, "getAll").mockResolvedValue([
    { id: "1", name: "Porto" },
  ]);
  vi.spyOn(opponentService, "create").mockRejectedValue(
    new Error('An opponent named "Porto" already exists.')
  );
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("Porto");
  const input = screen.getByLabelText("New opponent");

  await user.type(input, "Porto");
  await user.click(screen.getByRole("button", { name: "Add" }));
  await screen.findByText('An opponent named "Porto" already exists.');

  await user.type(input, "s");

  expect(
    screen.queryByText('An opponent named "Porto" already exists.')
  ).not.toBeInTheDocument();
});

test("renaming an opponent calls opponentService.update, awaits it, then re-reads the list (AC OPP-04.3, AD-004)", async () => {
  const getAllSpy = vi
    .spyOn(opponentService, "getAll")
    .mockResolvedValueOnce([{ id: "1", name: "Porto" }])
    .mockResolvedValueOnce([{ id: "1", name: "FC Porto" }]);
  const updateSpy = vi
    .spyOn(opponentService, "update")
    .mockResolvedValue({ id: "1", name: "FC Porto" });
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("Porto");

  await user.click(screen.getByRole("button", { name: "Rename Porto" }));
  const input = screen.getByLabelText("Rename Porto");
  await user.clear(input);
  await user.type(input, "FC Porto");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByText("FC Porto")).toBeInTheDocument();
  expect(updateSpy).toHaveBeenCalledWith({ id: "1", name: "FC Porto" });
  expect(getAllSpy).toHaveBeenCalledTimes(2);
});

test("a rejected rename renders the reason and keeps the typed value", async () => {
  vi.spyOn(opponentService, "getAll").mockResolvedValue([
    { id: "1", name: "Porto" },
    { id: "2", name: "Braga" },
  ]);
  vi.spyOn(opponentService, "update").mockRejectedValue(
    new Error('An opponent named "Braga" already exists.')
  );
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("Porto");

  await user.click(screen.getByRole("button", { name: "Rename Porto" }));
  const input = screen.getByLabelText("Rename Porto");
  await user.clear(input);
  await user.type(input, "Braga");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByText('An opponent named "Braga" already exists.')
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Rename Porto")).toHaveValue("Braga");
});

test("cancelling a rename discards the change and does not call update", async () => {
  const updateSpy = vi.spyOn(opponentService, "update");
  vi.spyOn(opponentService, "getAll").mockResolvedValue([
    { id: "1", name: "Porto" },
  ]);
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("Porto");

  await user.click(screen.getByRole("button", { name: "Rename Porto" }));
  const input = screen.getByLabelText("Rename Porto");
  await user.clear(input);
  await user.type(input, "Something Else");
  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.getByText("Porto")).toBeInTheDocument();
  expect(updateSpy).not.toHaveBeenCalled();
});

test("a 20-item list scrolls inside the shell with the create form still reachable (regression guard on POPUP-02)", async () => {
  const many = Array.from({ length: 20 }, (_, i) => ({
    id: String(i),
    name: `Opponent ${i}`,
  }));
  vi.spyOn(opponentService, "getAll").mockResolvedValue(many);

  renderPopup();
  await screen.findByText("Opponent 0");

  const shellBody = screen
    .getByRole("dialog")
    .querySelector(".overflow-y-auto.min-h-0");
  const addButton = screen.getByRole("button", { name: "Add" });
  const input = screen.getByLabelText("New opponent");

  expect(shellBody).not.toContainElement(addButton);
  expect(shellBody).not.toContainElement(input);
  expect(addButton).toBeInTheDocument();
});

test("Close is secondary, Add is primary, and the inline rename row uses the same variants (AC BTN-04.1)", async () => {
  vi.spyOn(opponentService, "getAll").mockResolvedValue([{ id: "1", name: "Porto" }]);
  const user = userEvent.setup();
  renderPopup();
  await screen.findByText("Porto");

  const closeButton = screen.getByRole("button", { name: "Close" });
  const addButton = screen.getByRole("button", { name: "Add" });
  expect(closeButton.className).toMatch(/border/);
  expect(closeButton.className).not.toMatch(/bg-gray-300/);
  expect(addButton.className).toMatch(/bg-blue-600/);

  await user.click(screen.getByRole("button", { name: "Rename Porto" }));
  const saveButton = screen.getByRole("button", { name: "Save" });
  const cancelButton = screen.getByRole("button", { name: "Cancel" });
  expect(saveButton.className).toMatch(/bg-blue-600/);
  expect(cancelButton.className).toMatch(/border/);
  expect(cancelButton.className).not.toMatch(/bg-gray-300/);
});
