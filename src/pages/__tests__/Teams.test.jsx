import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Teams from "../Teams";
import { teamService } from "../../services/teamService";

afterEach(() => {
  vi.restoreAllMocks();
});

function getColumn(headingText) {
  return screen.getByText(headingText).closest(".p-4");
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

async function selectTeamByName(user, text) {
  await user.click(within(getColumn("Teams")).getByText(text));
}

test("renders teams returned by teamService.getAll on mount", async () => {
  render(<Teams />);

  expect(await screen.findByText("Amadora Sub-11")).toBeInTheDocument();
  expect(screen.getByText("Areias Sub-19")).toBeInTheDocument();
});

test("logs an error and does not crash when teamService.getAll rejects", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(teamService, "getAll").mockRejectedValueOnce(new Error("boom"));

  render(<Teams />);

  await waitFor(() => {
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to load teams:",
      expect.any(Error)
    );
  });
  expect(screen.getByRole("heading", { name: "Teams" })).toBeInTheDocument();
  expect(screen.queryByText("Amadora Sub-11")).not.toBeInTheDocument();
});

test("selecting a team displays its players list", async () => {
  const user = userEvent.setup();
  render(<Teams />);
  await screen.findByText("Amadora Sub-11");

  await selectTeamByName(user, "Amadora Sub-11");

  const playersColumn = getColumn("Players");
  expect(within(playersColumn).getByText("1 João")).toBeInTheDocument();
  expect(within(playersColumn).getAllByText(/João/)).toHaveLength(5);
});

test("creating a team via the popup refreshes the team list without a manual reload", async () => {
  const user = userEvent.setup();
  render(<Teams />);
  await screen.findByText("Amadora Sub-11");

  await user.click(
    getColumn("Teams").querySelector(".tabler-icon-shield-plus")
  );

  const form = getFormFor("Team Form");
  await typeInto(user, form, "name", "Sub-15");
  await typeInto(user, form, "club", "TestClub");
  await typeInto(user, form, "season", "24/25");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(
    await within(getColumn("Teams")).findByText("TestClub Sub-15")
  ).toBeInTheDocument();
});

test("adding a player to the selected team refreshes the players list immediately", async () => {
  const user = userEvent.setup();
  render(<Teams />);
  await screen.findByText("Amadora Sub-11");
  await selectTeamByName(user, "Amadora Sub-11");

  await user.click(
    getColumn("Players").querySelector(".tabler-icon-users-plus")
  );

  const form = getFormFor("Player Form");
  await typeInto(user, form, "name", "TestPlayer");
  await typeInto(user, form, "age", "16");
  await typeInto(user, form, "shirtNumber", "99");
  await typeInto(user, form, "position", "GK");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(
    await within(getColumn("Players")).findByText("99 TestPlayer")
  ).toBeInTheDocument();
});

test("editing the selected team's details updates the list and the edit panel without losing the selection", async () => {
  const user = userEvent.setup();
  render(<Teams />);
  await screen.findByText("Amadora Sub-11");
  await selectTeamByName(user, "Amadora Sub-11");

  await user.click(getColumn("Edit").querySelector(".tabler-icon-edit"));

  const form = getFormFor("Team Form");
  await typeInto(user, form, "name", "Sub-11B");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  await waitFor(() => {
    expect(
      within(getColumn("Teams")).getByText("Amadora Sub-11B")
    ).toBeInTheDocument();
    expect(
      within(getColumn("Edit")).getByText("Amadora Sub-11B")
    ).toBeInTheDocument();
  });
});

test("editing the selected player's details updates the displayed player without needing to reselect", async () => {
  const user = userEvent.setup();
  render(<Teams />);
  await screen.findByText("Amadora Sub-11");
  await selectTeamByName(user, "Amadora Sub-11");

  await user.click(within(getColumn("Players")).getByText("1 João"));
  expect(within(getColumn("Edit")).getByText("15")).toBeInTheDocument();

  await user.click(getColumn("Edit").querySelector(".tabler-icon-edit"));

  const form = getFormFor("Player Form");
  await typeInto(user, form, "age", "17");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  await waitFor(() => {
    expect(within(getColumn("Edit")).getByText("17")).toBeInTheDocument();
  });
});

test("deleting the selected team clears the selection and removes it from the team list", async () => {
  const user = userEvent.setup();
  render(<Teams />);
  await screen.findByText("Amadora Sub-11");
  await selectTeamByName(user, "Amadora Sub-11");

  await user.click(getColumn("Edit").querySelector(".tabler-icon-trash"));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  await waitFor(() => {
    expect(screen.queryByText("Amadora Sub-11")).not.toBeInTheDocument();
  });
});
