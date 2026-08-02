import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Teams from "../Teams";
import { teamService } from "../../services/teamService";
import { gameService } from "../../services/gameService";
import { cardService } from "../../services/cardService";
import { ratingService } from "../../services/ratingService";
import { SUSPENSION_THRESHOLD } from "../../lib/playerCards";

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

test("renders no React key warnings for the teams and players lists", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const user = userEvent.setup();
  render(<Teams />);
  await screen.findByText("Amadora Sub-11");
  await selectTeamByName(user, "Amadora Sub-11");
  await screen.findByText("1 João");

  const keyWarning = errorSpy.mock.calls.find((call) =>
    String(call[0]).includes('unique "key" prop')
  );
  expect(keyWarning).toBeUndefined();
});

test("renders an empty-state message when there are no teams", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([]);

  render(<Teams />);

  expect(await screen.findByText("No teams yet.")).toBeInTheDocument();
});

test("renders a message asking to select a team when no team is selected", async () => {
  render(<Teams />);
  await screen.findByText("Amadora Sub-11");

  expect(
    within(getColumn("Players")).getByText("Select a team to see its players.")
  ).toBeInTheDocument();
});

test("renders an empty-state message when the selected team has no players", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue([
    { id: 999, club: "Empty", name: "Team", season: "24/25", players: [] },
  ]);
  const user = userEvent.setup();
  render(<Teams />);
  await screen.findByText("Empty Team");

  await selectTeamByName(user, "Empty Team");

  expect(
    within(getColumn("Players")).getByText("No players yet.")
  ).toBeInTheDocument();
});

test("selecting a different team clears the previously selected player", async () => {
  const user = userEvent.setup();
  render(<Teams />);
  await screen.findByText("Amadora Sub-11");
  await selectTeamByName(user, "Amadora Sub-11");
  await user.click(within(getColumn("Players")).getByText("1 João"));
  expect(within(getColumn("Edit")).getByText("15")).toBeInTheDocument();

  await selectTeamByName(user, "Areias Sub-19");

  expect(within(getColumn("Edit")).queryByText("15")).not.toBeInTheDocument();
});

test("marks the selected team row with aria-current", async () => {
  const user = userEvent.setup();
  render(<Teams />);
  await screen.findByText("Amadora Sub-11");

  await selectTeamByName(user, "Amadora Sub-11");

  expect(
    within(getColumn("Teams")).getByText("Amadora Sub-11").closest("button")
  ).toHaveAttribute("aria-current", "true");
});

test("marks the selected player row with aria-current", async () => {
  const user = userEvent.setup();
  render(<Teams />);
  await screen.findByText("Amadora Sub-11");
  await selectTeamByName(user, "Amadora Sub-11");

  await user.click(within(getColumn("Players")).getByText("1 João"));

  expect(
    within(getColumn("Players")).getByText("1 João").closest("button")
  ).toHaveAttribute("aria-current", "true");
});

async function bookYellows(player, game, count) {
  for (let i = 0; i < count; i++) {
    await cardService.record({ playerId: player.id, gameId: game.id, type: "yellow" });
  }
}

test("marks a suspended player in the players list so the coach sees it without opening their card", async () => {
  const [team] = await teamService.getAll();
  const player = team.players[1];
  const game = await gameService.create({
    teamId: team.id,
    opponent: "Rivals FC",
    date: new Date("2030-01-01T10:00:00Z"),
    isHome: true,
    competition: "League",
  });
  await bookYellows(player, game, SUSPENSION_THRESHOLD);
  const user = userEvent.setup();
  render(<Teams />);
  await screen.findByText("Amadora Sub-11");

  await selectTeamByName(user, "Amadora Sub-11");

  const row = (await within(getColumn("Players")).findByText(`${player.shirtNumber} ${player.name}`)).closest("button");
  expect(within(row).getByText("Suspended")).toBeInTheDocument();
});

test("does not mark a player who is not suspended", async () => {
  const [team] = await teamService.getAll();
  const user = userEvent.setup();
  render(<Teams />);
  await screen.findByText("Amadora Sub-11");

  await selectTeamByName(user, "Amadora Sub-11");

  const row = (await within(getColumn("Players")).findByText(`${team.players[1].shirtNumber} ${team.players[1].name}`)).closest("button");
  expect(within(row).queryByText("Suspended")).not.toBeInTheDocument();
});

test("does not mark an approaching (not yet suspended) player as Suspended", async () => {
  const [team] = await teamService.getAll();
  const player = team.players[1];
  const game = await gameService.create({
    teamId: team.id,
    opponent: "Rivals FC",
    date: new Date("2030-01-01T10:00:00Z"),
    isHome: true,
    competition: "League",
  });
  await bookYellows(player, game, SUSPENSION_THRESHOLD - 1);
  const user = userEvent.setup();
  render(<Teams />);
  await screen.findByText("Amadora Sub-11");

  await selectTeamByName(user, "Amadora Sub-11");
  await waitFor(async () => {
    const games = await gameService.getAll(team.id);
    expect(games.some((g) => g.id === game.id)).toBe(true);
  });

  const row = (await within(getColumn("Players")).findByText(`${player.shirtNumber} ${player.name}`)).closest("button");
  expect(within(row).queryByText("Suspended")).not.toBeInTheDocument();
});

test("no Squad Ranking is shown before a team is selected", async () => {
  render(<Teams />);
  await screen.findByText("Amadora Sub-11");

  expect(screen.queryByRole("heading", { name: "Squad Ranking" })).not.toBeInTheDocument();
});

test("selecting a team shows its Squad Ranking ordered by average, highest first (AC RATE-09.1)", async () => {
  const [team] = await teamService.getAll();
  const [p1, p2] = team.players;
  const game = await gameService.create({
    teamId: team.id,
    opponent: "Rivals FC",
    date: new Date("2030-01-01T10:00:00Z"),
    isHome: true,
    competition: "League",
  });
  await ratingService.setRating({ playerId: p1.id, eventType: "game", eventId: game.id, value: 3 });
  await ratingService.setRating({ playerId: p2.id, eventType: "game", eventId: game.id, value: 9 });
  const user = userEvent.setup();
  render(<Teams />);
  await screen.findByText("Amadora Sub-11");

  await selectTeamByName(user, "Amadora Sub-11");

  const ranking = getColumn("Players").querySelector("ol");
  await waitFor(() => {
    expect(within(ranking).getAllByRole("listitem")[0]).toHaveTextContent(`#${p2.shirtNumber}`);
  });
});

test("a selected team with no rated players shows the Squad Ranking empty state", async () => {
  const user = userEvent.setup();
  render(<Teams />);
  await screen.findByText("Amadora Sub-11");

  await selectTeamByName(user, "Amadora Sub-11");

  expect(await within(getColumn("Players")).findByText("No rated players yet.")).toBeInTheDocument();
});

test("switching to a different team recomputes the Squad Ranking for the newly selected team", async () => {
  const teams = await teamService.getAll();
  const [teamA] = teams;
  const gameA = await gameService.create({
    teamId: teamA.id,
    opponent: "Rivals FC",
    date: new Date("2030-01-01T10:00:00Z"),
    isHome: true,
    competition: "League",
  });
  await ratingService.setRating({
    playerId: teamA.players[0].id,
    eventType: "game",
    eventId: gameA.id,
    value: 6,
  });
  const user = userEvent.setup();
  render(<Teams />);
  await screen.findByText("Amadora Sub-11");
  await selectTeamByName(user, "Amadora Sub-11");
  await within(getColumn("Players")).findByText("6.0");

  await selectTeamByName(user, "Areias Sub-19");

  expect(
    await within(getColumn("Players")).findByText("No rated players yet.")
  ).toBeInTheDocument();
});

test("the Training/Game toggle in Squad Ranking recomputes the order within the Teams page", async () => {
  const [team] = await teamService.getAll();
  const [p1, p2] = team.players;
  const game = await gameService.create({
    teamId: team.id,
    opponent: "Rivals FC",
    date: new Date("2030-01-01T10:00:00Z"),
    isHome: true,
    competition: "League",
  });
  await ratingService.setRating({ playerId: p1.id, eventType: "game", eventId: game.id, value: 9 });
  await ratingService.setRating({ playerId: p2.id, eventType: "game", eventId: game.id, value: 2 });
  const user = userEvent.setup();
  render(<Teams />);
  await screen.findByText("Amadora Sub-11");
  await selectTeamByName(user, "Amadora Sub-11");
  await within(getColumn("Players")).findByText(`#${p1.shirtNumber}`, { exact: false });

  await user.click(within(getColumn("Players")).getByRole("button", { name: "Training" }));

  expect(
    await within(getColumn("Players")).findByText("No rated players yet.")
  ).toBeInTheDocument();
});

test("logs an error and does not crash when loading suspensions fails", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(gameService, "getAll").mockRejectedValueOnce(new Error("boom"));
  const user = userEvent.setup();
  render(<Teams />);
  await screen.findByText("Amadora Sub-11");

  await selectTeamByName(user, "Amadora Sub-11");

  await waitFor(() => {
    expect(errorSpy).toHaveBeenCalledWith("Failed to load suspensions:", expect.any(Error));
  });
  expect(within(getColumn("Players")).getByText("1 João")).toBeInTheDocument();
});
