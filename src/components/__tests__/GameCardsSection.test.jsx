import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GameCardsSection from "../GameCardsSection";
import { teamService } from "../../services/teamService";
import { cardService } from "../../services/cardService";
import { gameService } from "../../services/gameService";

afterEach(() => {
  vi.restoreAllMocks();
});

function label(player) {
  return `#${player.shirtNumber} ${player.name}`;
}

async function seedGame(teamId) {
  return gameService.create({
    teamId,
    opponent: "Rivals FC",
    date: new Date("2030-01-01T10:00:00Z"),
    isHome: true,
    competition: "League",
  });
}

test("lists the game team's squad with yellow and red controls per player (AC CARD-02)", async () => {
  const [team] = await teamService.getAll();
  const game = await seedGame(team.id);

  render(<GameCardsSection game={game} />);

  for (const player of team.players) {
    expect(
      await screen.findByRole("button", { name: `Add yellow card to ${label(player)}` })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Add red card to ${label(player)}` })
    ).toBeInTheDocument();
  }
});

test("adding a card persists it against the (player, game) pair", async () => {
  const [team] = await teamService.getAll();
  const game = await seedGame(team.id);
  const player = team.players[1];
  const user = userEvent.setup();
  render(<GameCardsSection game={game} />);
  await screen.findByRole("button", { name: `Add yellow card to ${label(player)}` });

  await user.click(
    screen.getByRole("button", { name: `Add yellow card to ${label(player)}` })
  );

  await waitFor(async () => {
    const cards = await cardService.getByGame(game.id);
    expect(cards).toHaveLength(1);
  });
  const cards = await cardService.getByGame(game.id);
  expect(cards[0]).toMatchObject({ playerId: player.id, gameId: game.id, type: "yellow" });
});

test("adding a red card persists it as type red", async () => {
  const [team] = await teamService.getAll();
  const game = await seedGame(team.id);
  const player = team.players[1];
  const user = userEvent.setup();
  render(<GameCardsSection game={game} />);
  await screen.findByRole("button", { name: `Add red card to ${label(player)}` });

  await user.click(
    screen.getByRole("button", { name: `Add red card to ${label(player)}` })
  );

  await waitFor(async () => {
    const cards = await cardService.getByGame(game.id);
    expect(cards[0]).toMatchObject({ type: "red" });
  });
});

test("removing a card deletes only that record", async () => {
  const [team] = await teamService.getAll();
  const game = await seedGame(team.id);
  const player = team.players[1];
  const user = userEvent.setup();
  render(<GameCardsSection game={game} />);
  await screen.findByRole("button", { name: `Add yellow card to ${label(player)}` });
  await user.click(
    screen.getByRole("button", { name: `Add yellow card to ${label(player)}` })
  );
  await screen.findByRole("button", { name: `Remove yellow card from ${label(player)}` });
  await user.click(
    screen.getByRole("button", { name: `Add red card to ${label(player)}` })
  );
  await screen.findByRole("button", { name: `Remove red card from ${label(player)}` });

  await user.click(
    screen.getByRole("button", { name: `Remove yellow card from ${label(player)}` })
  );

  await waitFor(async () => {
    const cards = await cardService.getByGame(game.id);
    expect(cards).toHaveLength(1);
  });
  const cards = await cardService.getByGame(game.id);
  expect(cards[0].type).toBe("red");
});

test("existing cards for the game are shown when the popup reopens", async () => {
  const [team] = await teamService.getAll();
  const game = await seedGame(team.id);
  const player = team.players[1];
  await cardService.record({ playerId: player.id, gameId: game.id, type: "yellow" });

  render(<GameCardsSection game={game} />);

  expect(
    await screen.findByRole("button", { name: `Remove yellow card from ${label(player)}` })
  ).toBeInTheDocument();
});

test("cards persist independently of the scoreline — clearing the result leaves cards intact (edge case)", async () => {
  const [team] = await teamService.getAll();
  const game = await seedGame(team.id);
  const player = team.players[1];
  const user = userEvent.setup();
  const { rerender } = render(<GameCardsSection game={game} />);
  await screen.findByRole("button", { name: `Add yellow card to ${label(player)}` });
  await user.click(
    screen.getByRole("button", { name: `Add yellow card to ${label(player)}` })
  );
  await screen.findByRole("button", { name: `Remove yellow card from ${label(player)}` });

  await gameService.recordResult(game.id, { us: 2, them: 1 });
  await gameService.clearResult(game.id);
  rerender(<GameCardsSection game={{ ...game, usScore: null, themScore: null }} />);

  expect(
    screen.getByRole("button", { name: `Remove yellow card from ${label(player)}` })
  ).toBeInTheDocument();
  const cards = await cardService.getByGame(game.id);
  expect(cards).toHaveLength(1);
});

test("renders an empty state rather than an empty control block when the game has no team", async () => {
  const game = await seedGame(null);

  render(<GameCardsSection game={game} />);

  expect(await screen.findByText("No players to book.")).toBeInTheDocument();
});

test("renders an empty state when the team has no players", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue([
    { id: "empty-team", club: "Empty", name: "FC", season: "23/24", players: [] },
  ]);
  const game = await seedGame("empty-team");

  render(<GameCardsSection game={game} />);

  expect(await screen.findByText("No players to book.")).toBeInTheDocument();
});

test("logs an error and still renders when teamService.getAll rejects", async () => {
  const [team] = await teamService.getAll();
  const game = await seedGame(team.id);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(teamService, "getAll").mockRejectedValueOnce(new Error("boom"));

  render(<GameCardsSection game={game} />);

  await waitFor(() => {
    expect(errorSpy).toHaveBeenCalledWith("Failed to load team:", expect.any(Error));
  });
  expect(await screen.findByText("No players to book.")).toBeInTheDocument();
});
