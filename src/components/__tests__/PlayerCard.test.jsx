import { render, screen, waitFor } from "@testing-library/react";
import PlayerCard from "../PlayerCard";
import { teamService } from "../../services/teamService";
import { cardService } from "../../services/cardService";
import { gameService } from "../../services/gameService";

afterEach(() => {
  vi.restoreAllMocks();
});

function statValue(label) {
  return screen.getByText(label).nextElementSibling;
}

async function seedGameForTeam(teamId) {
  return gameService.create({
    teamId,
    opponent: "Rivals FC",
    date: new Date("2030-01-01T10:00:00Z"),
    isHome: true,
    competition: "League",
  });
}

test("renders yellow and red totals beside Goals and Conceded Goals (AC CARD-04.1)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const game = await seedGameForTeam(player.teamId);
  await cardService.record({ playerId: player.id, gameId: game.id, type: "yellow" });
  await cardService.record({ playerId: player.id, gameId: game.id, type: "red" });

  render(<PlayerCard player={player} onClose={() => {}} onUpdated={() => {}} />);

  await waitFor(() => {
    expect(statValue("Yellow Cards")).toHaveTextContent("1");
  });
  expect(statValue("Red Cards")).toHaveTextContent("1");
  expect(statValue("Goals")).toHaveTextContent(String(player.goals));
  expect(statValue("Conceded Goals")).toHaveTextContent(String(player.concededGoals));
});

test("a player with no cards shows 0, not blank (AC CARD-04.2)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];

  render(<PlayerCard player={player} onClose={() => {}} onUpdated={() => {}} />);

  await waitFor(() => {
    expect(statValue("Yellow Cards")).toHaveTextContent("0");
  });
  expect(statValue("Red Cards")).toHaveTextContent("0");
});

test("totals recompute after a card is added, with no page reload (AC CARD-04.3)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const game = await seedGameForTeam(player.teamId);
  const { unmount } = render(
    <PlayerCard player={player} onClose={() => {}} onUpdated={() => {}} />
  );
  await waitFor(() => expect(statValue("Yellow Cards")).toHaveTextContent("0"));
  unmount();

  await cardService.record({ playerId: player.id, gameId: game.id, type: "yellow" });
  render(<PlayerCard player={player} onClose={() => {}} onUpdated={() => {}} />);

  await waitFor(() => {
    expect(statValue("Yellow Cards")).toHaveTextContent("1");
  });
});

test("totals recompute after a card is removed, with no page reload (AC CARD-04.3)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const game = await seedGameForTeam(player.teamId);
  const card = await cardService.record({ playerId: player.id, gameId: game.id, type: "red" });
  const { unmount } = render(
    <PlayerCard player={player} onClose={() => {}} onUpdated={() => {}} />
  );
  await waitFor(() => expect(statValue("Red Cards")).toHaveTextContent("1"));
  unmount();

  await cardService.remove(card.id);
  render(<PlayerCard player={player} onClose={() => {}} onUpdated={() => {}} />);

  await waitFor(() => {
    expect(statValue("Red Cards")).toHaveTextContent("0");
  });
});

test("cards stay attached to the games they occurred in after a player moves teams (edge case)", async () => {
  const teams = await teamService.getAll();
  const [teamA, teamB] = teams.filter((t) => t.players.length > 0);
  const player = teamA.players[1];
  const gameForOldTeam = await seedGameForTeam(teamA.id);
  const card = await cardService.record({
    playerId: player.id,
    gameId: gameForOldTeam.id,
    type: "yellow",
  });
  const movedPlayer = { ...player, teamId: teamB.id };

  render(<PlayerCard player={movedPlayer} onClose={() => {}} onUpdated={() => {}} />);

  await waitFor(() => {
    expect(statValue("Yellow Cards")).toHaveTextContent("0");
  });
  const stillAttached = await cardService.getByPlayer(player.id);
  expect(stillAttached.find((c) => c.id === card.id)).toMatchObject({
    gameId: gameForOldTeam.id,
  });
});

test("logs an error and still renders when loading cards fails", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(cardService, "getByPlayer").mockRejectedValueOnce(new Error("boom"));

  render(<PlayerCard player={player} onClose={() => {}} onUpdated={() => {}} />);

  await waitFor(() => {
    expect(errorSpy).toHaveBeenCalledWith("Failed to load cards:", expect.any(Error));
  });
  expect(statValue("Yellow Cards")).toHaveTextContent("0");
});
