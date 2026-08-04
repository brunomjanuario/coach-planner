import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TeamPopup from "../TeamPopup";
import { teamService } from "../../services/teamService";

afterEach(() => {
  vi.restoreAllMocks();
});

async function fillRequiredFields(user, container) {
  await user.type(container.querySelector('[name="name"]'), "Sub-15");
  await user.type(container.querySelector('[name="club"]'), "TestClub");
  await user.type(container.querySelector('[name="season"]'), "24/25");
}

test("renders through PopupShell as an accessible dialog titled Team Form", () => {
  render(<TeamPopup team={null} onClose={() => {}} />);

  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(screen.getByText("Team Form")).toBeInTheDocument();
});

test("renders at natural height with no forced tall box (AC POPUP-03)", () => {
  render(<TeamPopup team={null} onClose={() => {}} />);

  const panel = screen.getByRole("dialog");
  expect(panel.className).toMatch(/max-h-\[85vh\]/);
});

test("the form fields sit inside the scroll region while Cancel/Submit stay outside it (AC POPUP-02.4)", () => {
  const { container } = render(<TeamPopup team={null} onClose={() => {}} />);

  const shellBody = screen.getByRole("dialog").querySelector(".overflow-y-auto.min-h-0");
  const form = container.querySelector("form");
  const cancelButton = screen.getByRole("button", { name: "Cancel" });
  const submitButton = screen.getByRole("button", { name: "Submit" });

  expect(shellBody).toContainElement(form);
  expect(shellBody).not.toContainElement(cancelButton);
  expect(shellBody).not.toContainElement(submitButton);
});

test("the Submit button in the footer still submits the form fields inside the scroll region", async () => {
  const createSpy = vi.spyOn(teamService, "create").mockImplementation(() => {});
  const onClose = vi.fn();
  const user = userEvent.setup();
  const { container } = render(<TeamPopup team={null} onClose={onClose} />);
  await fillRequiredFields(user, container);

  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(createSpy).toHaveBeenCalledWith(
    expect.objectContaining({ name: "Sub-15", club: "TestClub", season: "24/25" })
  );
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("editing an existing team calls teamService.update and never create", async () => {
  const updateSpy = vi.spyOn(teamService, "update").mockImplementation(() => {});
  const createSpy = vi.spyOn(teamService, "create");
  const team = { id: 1, name: "Sub-11", club: "Amadora", season: "24/25", players: [] };
  const user = userEvent.setup();
  render(<TeamPopup team={team} onClose={() => {}} />);

  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(updateSpy).toHaveBeenCalledTimes(1);
  expect(createSpy).not.toHaveBeenCalled();
});

test("clicking Cancel calls onClose without submitting", async () => {
  const createSpy = vi.spyOn(teamService, "create");
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<TeamPopup team={null} onClose={onClose} />);

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onClose).toHaveBeenCalledTimes(1);
  expect(createSpy).not.toHaveBeenCalled();
});
