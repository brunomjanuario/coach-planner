import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlayerPopup from "../PlayerPopup";
import { teamService } from "../../services/teamService";

afterEach(() => {
  vi.restoreAllMocks();
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function nameInput(container) {
  return container.querySelector('[name="name"]');
}

async function fillRequiredFields(user, container) {
  await user.type(nameInput(container), "Test Player");
  await user.type(container.querySelector('[name="age"]'), "20");
  await user.type(container.querySelector('[name="shirtNumber"]'), "9");
  await user.type(container.querySelector('[name="position"]'), "ST");
}

test("renders through PopupShell as an accessible dialog at natural height (AC POPUP-03)", () => {
  render(<PlayerPopup player={null} teamId={1} onClose={() => {}} />);

  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(dialog.className).toMatch(/max-h-\[85vh\]/);
  expect(screen.getByText("Player Form")).toBeInTheDocument();
});

test("the form fields sit inside the scroll region while Cancel/Submit stay outside it (AC POPUP-02.4)", () => {
  const { container } = render(<PlayerPopup player={null} teamId={1} onClose={() => {}} />);

  const shellBody = screen.getByRole("dialog").querySelector(".overflow-y-auto.min-h-0");
  const form = container.querySelector("form");
  const cancelButton = screen.getByRole("button", { name: "Cancel" });
  const submitButton = screen.getByRole("button", { name: "Submit" });

  expect(shellBody).toContainElement(form);
  expect(shellBody).not.toContainElement(cancelButton);
  expect(shellBody).not.toContainElement(submitButton);
});

test("creating a player awaits teamService.addPlayer before calling onClose (AC PREF-03.1)", async () => {
  const { promise, resolve } = deferred();
  const addPlayerSpy = vi.spyOn(teamService, "addPlayer").mockReturnValue(promise);
  const onClose = vi.fn();
  const user = userEvent.setup();
  const { container } = render(<PlayerPopup player={null} teamId={1} onClose={onClose} />);
  await fillRequiredFields(user, container);

  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(addPlayerSpy).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();

  resolve({ id: "p1", name: "Test Player" });
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});

test("a rejected create does not call onClose and renders an inline error (edge case)", async () => {
  vi.spyOn(teamService, "addPlayer").mockRejectedValue(new Error("boom"));
  const onClose = vi.fn();
  const user = userEvent.setup();
  const { container } = render(<PlayerPopup player={null} teamId={1} onClose={onClose} />);
  await fillRequiredFields(user, container);

  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(await screen.findByText(/failed to save the player/i)).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
  expect(nameInput(container)).toHaveValue("Test Player");
});

test("editing an existing player calls updatePlayer and never addPlayer", async () => {
  const updateSpy = vi.spyOn(teamService, "updatePlayer").mockResolvedValue({});
  const addSpy = vi.spyOn(teamService, "addPlayer");
  const onClose = vi.fn();
  const user = userEvent.setup();
  const player = {
    id: 5,
    teamId: 1,
    name: "Existing",
    age: 22,
    shirtNumber: 7,
    goals: 0,
    assists: 0,
    concededGoals: 0,
    position: "CM",
  };
  render(<PlayerPopup player={player} teamId={1} onClose={onClose} />);

  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(updateSpy).toHaveBeenCalledTimes(1);
  expect(addSpy).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("creating a new player calls addPlayer with the teamId prop and never updatePlayer", async () => {
  const addSpy = vi.spyOn(teamService, "addPlayer").mockResolvedValue({});
  const updateSpy = vi.spyOn(teamService, "updatePlayer");
  const onClose = vi.fn();
  const user = userEvent.setup();
  const { container } = render(<PlayerPopup player={null} teamId={3} onClose={onClose} />);
  await fillRequiredFields(user, container);

  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(addSpy).toHaveBeenCalledWith(3, expect.objectContaining({ name: "Test Player" }));
  expect(updateSpy).not.toHaveBeenCalled();
});

test("cancelling calls neither addPlayer nor updatePlayer (AC PREF-04.4)", async () => {
  const addSpy = vi.spyOn(teamService, "addPlayer");
  const updateSpy = vi.spyOn(teamService, "updatePlayer");
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<PlayerPopup player={null} teamId={1} onClose={onClose} />);

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(addSpy).not.toHaveBeenCalled();
  expect(updateSpy).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("a rejected update keeps the popup open with an inline error", async () => {
  vi.spyOn(teamService, "updatePlayer").mockRejectedValue(new Error("boom"));
  const onClose = vi.fn();
  const user = userEvent.setup();
  const player = {
    id: 5,
    teamId: 1,
    name: "Existing",
    age: 22,
    shirtNumber: 7,
    goals: 0,
    assists: 0,
    concededGoals: 0,
    position: "CM",
  };
  render(<PlayerPopup player={player} teamId={1} onClose={onClose} />);

  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(await screen.findByText(/failed to save the player/i)).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});

test("Cancel is secondary and Submit is primary (AC BTN-04.1)", () => {
  render(<PlayerPopup player={null} teamId={1} onClose={() => {}} />);

  const cancelButton = screen.getByRole("button", { name: "Cancel" });
  const submitButton = screen.getByRole("button", { name: "Submit" });

  expect(cancelButton.className).toMatch(/border/);
  expect(cancelButton.className).not.toMatch(/bg-gray-300/);
  expect(submitButton.className).toMatch(/bg-blue-600/);
});
