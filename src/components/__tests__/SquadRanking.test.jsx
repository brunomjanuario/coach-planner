import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SquadRanking from "../SquadRanking";
import { teamService } from "../../services/teamService";
import { gameService } from "../../services/gameService";
import { trainingService } from "../../services/trainingService";
import { ratingService } from "../../services/ratingService";

afterEach(() => {
  vi.restoreAllMocks();
});

async function seedGame(teamId) {
  return gameService.create({
    teamId,
    opponent: "Rivals FC",
    date: new Date("2030-01-01T10:00:00Z"),
    isHome: true,
    competition: "League",
  });
}

async function seedTraining(teamId) {
  return trainingService.create({
    teamId,
    day: new Date("2030-01-02T10:00:00Z"),
    duration: 60,
    exercises: [],
  });
}

function rankingItems() {
  return within(screen.getByRole("list")).getAllByRole("listitem");
}

test("lists the team's players ordered by average rating, highest first (AC RATE-09.1)", async () => {
  const teams = await teamService.getAll();
  const team = teams.find((t) => t.players.length >= 3);
  const [p1, p2, p3] = team.players;
  const game = await seedGame(team.id);
  await ratingService.setRating({ playerId: p1.id, eventType: "game", eventId: game.id, value: 4 });
  await ratingService.setRating({ playerId: p2.id, eventType: "game", eventId: game.id, value: 9 });
  await ratingService.setRating({ playerId: p3.id, eventType: "game", eventId: game.id, value: 7 });

  render(<SquadRanking team={team} />);

  const items = await waitFor(() => {
    const found = rankingItems();
    expect(found.length).toBeGreaterThan(0);
    return found;
  });
  expect(items[0]).toHaveTextContent(`#${p2.shirtNumber}`);
  expect(items[0]).toHaveTextContent("9.0");
  expect(items[1]).toHaveTextContent(`#${p3.shirtNumber}`);
  expect(items[2]).toHaveTextContent(`#${p1.shirtNumber}`);
});

test("unrated players sort last and show — rather than a 0 average (AC RATE-09.3)", async () => {
  const teams = await teamService.getAll();
  const team = teams.find((t) => t.players.length >= 2);
  const unrated = team.players[team.players.length - 1];
  const rest = team.players.slice(0, -1);
  const game = await seedGame(team.id);
  for (const player of rest) {
    await ratingService.setRating({
      playerId: player.id,
      eventType: "game",
      eventId: game.id,
      value: 5,
    });
  }

  render(<SquadRanking team={team} />);

  const items = await waitFor(() => {
    const found = rankingItems();
    expect(found).toHaveLength(team.players.length);
    return found;
  });
  const last = items[items.length - 1];
  expect(last).toHaveTextContent(`#${unrated.shirtNumber}`);
  expect(last).toHaveTextContent("—");
});

test("equal averages order deterministically (AC RATE-09.2)", async () => {
  const teams = await teamService.getAll();
  const team = teams.find((t) => t.players.length >= 2);
  const [p1, p2] = team.players;
  const game = await seedGame(team.id);
  await ratingService.setRating({ playerId: p1.id, eventType: "game", eventId: game.id, value: 6 });
  await ratingService.setRating({ playerId: p2.id, eventType: "game", eventId: game.id, value: 6 });

  const { unmount } = render(<SquadRanking team={team} />);
  const firstOrder = await waitFor(() => {
    const found = rankingItems().map((i) => i.textContent);
    expect(found.length).toBeGreaterThan(0);
    return found;
  });
  unmount();

  render(<SquadRanking team={team} />);
  const secondOrder = await waitFor(() => {
    const found = rankingItems().map((i) => i.textContent);
    expect(found.length).toBeGreaterThan(0);
    return found;
  });

  expect(secondOrder).toEqual(firstOrder);
});

test("a training-only toggle recomputes the order from training ratings only (AC RATE-09.4)", async () => {
  const teams = await teamService.getAll();
  const team = teams.find((t) => t.players.length >= 2);
  const [p1, p2] = team.players;
  const game = await seedGame(team.id);
  const training = await seedTraining(team.id);
  // p1 is the better game performer, p2 the better training performer.
  await ratingService.setRating({ playerId: p1.id, eventType: "game", eventId: game.id, value: 9 });
  await ratingService.setRating({ playerId: p2.id, eventType: "game", eventId: game.id, value: 3 });
  await ratingService.setRating({ playerId: p1.id, eventType: "training", eventId: training.id, value: 2 });
  await ratingService.setRating({ playerId: p2.id, eventType: "training", eventId: training.id, value: 8 });
  const user = userEvent.setup();
  render(<SquadRanking team={team} />);
  await waitFor(() => {
    expect(rankingItems()[0]).toHaveTextContent(`#${p1.shirtNumber}`);
  });

  await user.click(screen.getByRole("button", { name: "Training" }));

  await waitFor(() => {
    expect(rankingItems()[0]).toHaveTextContent(`#${p2.shirtNumber}`);
  });
  expect(rankingItems()[0]).toHaveTextContent("8.0");
});

test("a game-only toggle recomputes the order from game ratings only (AC RATE-09.4)", async () => {
  const teams = await teamService.getAll();
  const team = teams.find((t) => t.players.length >= 2);
  const [p1, p2] = team.players;
  const game = await seedGame(team.id);
  const training = await seedTraining(team.id);
  await ratingService.setRating({ playerId: p1.id, eventType: "game", eventId: game.id, value: 9 });
  await ratingService.setRating({ playerId: p2.id, eventType: "game", eventId: game.id, value: 3 });
  await ratingService.setRating({ playerId: p1.id, eventType: "training", eventId: training.id, value: 2 });
  await ratingService.setRating({ playerId: p2.id, eventType: "training", eventId: training.id, value: 8 });
  const user = userEvent.setup();
  render(<SquadRanking team={team} />);
  await screen.findByRole("button", { name: "Training" });

  await user.click(screen.getByRole("button", { name: "Game" }));

  await waitFor(() => {
    expect(rankingItems()[0]).toHaveTextContent(`#${p1.shirtNumber}`);
  });
  expect(rankingItems()[0]).toHaveTextContent("9.0");
});

test("toggling back to Combined restores the combined figures", async () => {
  const teams = await teamService.getAll();
  const team = teams.find((t) => t.players.length >= 2);
  const [p1, p2] = team.players;
  const game = await seedGame(team.id);
  await ratingService.setRating({ playerId: p1.id, eventType: "game", eventId: game.id, value: 9 });
  await ratingService.setRating({ playerId: p2.id, eventType: "game", eventId: game.id, value: 3 });
  const user = userEvent.setup();
  render(<SquadRanking team={team} />);
  await waitFor(() => {
    expect(rankingItems()[0]).toHaveTextContent(`#${p1.shirtNumber}`);
  });

  await user.click(screen.getByRole("button", { name: "Training" }));
  await waitFor(() => {
    expect(screen.getByText("No rated players yet.")).toBeInTheDocument();
  });

  await user.click(screen.getByRole("button", { name: "Combined" }));

  await waitFor(() => {
    expect(rankingItems()[0]).toHaveTextContent(`#${p1.shirtNumber}`);
  });
  expect(rankingItems()[0]).toHaveTextContent("9.0");
});

test("a team with no rated players renders an empty state rather than an arbitrary order", async () => {
  const teams = await teamService.getAll();
  const team = teams.find((t) => t.players.length > 0);

  render(<SquadRanking team={team} />);

  expect(await screen.findByText("No rated players yet.")).toBeInTheDocument();
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
});

test("a team with no players at all renders the empty state without crashing", async () => {
  const team = { id: "empty", club: "Empty", name: "FC", season: "24/25", players: [] };

  render(<SquadRanking team={team} />);

  expect(await screen.findByText("No rated players yet.")).toBeInTheDocument();
});

test("no team selected renders nothing", async () => {
  const { container } = render(<SquadRanking team={null} />);

  await waitFor(() => {
    expect(container).toBeEmptyDOMElement();
  });
});

test("numbers each row by rank position", async () => {
  const teams = await teamService.getAll();
  const team = teams.find((t) => t.players.length >= 2);
  const [p1, p2] = team.players;
  const game = await seedGame(team.id);
  await ratingService.setRating({ playerId: p1.id, eventType: "game", eventId: game.id, value: 9 });
  await ratingService.setRating({ playerId: p2.id, eventType: "game", eventId: game.id, value: 3 });

  render(<SquadRanking team={team} />);

  const items = await waitFor(() => {
    const found = rankingItems();
    expect(found.length).toBeGreaterThan(0);
    return found;
  });
  expect(items[0]).toHaveTextContent(/^1\./);
  expect(items[1]).toHaveTextContent(/^2\./);
});

test("ranking rows carry a dark text colour on the light row background (AC CONTR-01.1)", async () => {
  const teams = await teamService.getAll();
  const team = teams.find((t) => t.players.length >= 1);
  const [p1] = team.players;
  const game = await seedGame(team.id);
  await ratingService.setRating({ playerId: p1.id, eventType: "game", eventId: game.id, value: 7 });

  render(<SquadRanking team={team} />);

  const items = await waitFor(() => {
    const found = rankingItems();
    expect(found.length).toBeGreaterThan(0);
    return found;
  });
  const row = items[0];
  expect(row.className).toContain("bg-gray-100");
  expect(row.className).toContain("text-gray-900");
});

test("unselected filter buttons carry a dark text colour on their light background (AC CONTR-02.1)", async () => {
  const teams = await teamService.getAll();
  const team = teams.find((t) => t.players.length > 0);

  render(<SquadRanking team={team} />);

  const trainingButton = await screen.findByRole("button", { name: "Training" });
  const gameButton = screen.getByRole("button", { name: "Game" });
  expect(trainingButton.className).toContain("bg-gray-200");
  expect(trainingButton.className).toContain("text-gray-900");
  expect(gameButton.className).toContain("bg-gray-200");
  expect(gameButton.className).toContain("text-gray-900");
});

test("the selected filter button keeps white text on blue, not the dark colour (AC CONTR-01.3)", async () => {
  const teams = await teamService.getAll();
  const team = teams.find((t) => t.players.length > 0);

  render(<SquadRanking team={team} />);

  const combinedButton = await screen.findByRole("button", { name: "Combined" });
  expect(combinedButton.className).toContain("bg-blue-600");
  expect(combinedButton.className).toContain("text-white");
  expect(combinedButton.className).not.toContain("text-gray-900");
});

test("an unrated player's — placeholder sits inside the darkened row (edge case)", async () => {
  const teams = await teamService.getAll();
  const team = teams.find((t) => t.players.length >= 2);
  const unrated = team.players[team.players.length - 1];
  const rest = team.players.slice(0, -1);
  const game = await seedGame(team.id);
  for (const player of rest) {
    await ratingService.setRating({ playerId: player.id, eventType: "game", eventId: game.id, value: 5 });
  }

  render(<SquadRanking team={team} />);

  const items = await waitFor(() => {
    const found = rankingItems();
    expect(found).toHaveLength(team.players.length);
    return found;
  });
  const last = items[items.length - 1];
  expect(last).toHaveTextContent(`#${unrated.shirtNumber}`);
  expect(within(last).getByText("—")).toBeInTheDocument();
  expect(last.className).toContain("text-gray-900");
});

test("a wrapping long player name is coloured on the row, not on a fixed-width span (edge case)", async () => {
  const teams = await teamService.getAll();
  const team = teams.find((t) => t.players.length > 0);
  const player = team.players[0];
  player.name = "A Very Long Player Name That Should Wrap Across Multiple Lines In The Row";
  const game = await seedGame(team.id);
  await ratingService.setRating({ playerId: player.id, eventType: "game", eventId: game.id, value: 6 });

  render(<SquadRanking team={team} />);

  const items = await waitFor(() => {
    const found = rankingItems();
    expect(found.length).toBeGreaterThan(0);
    return found;
  });
  const row = items.find((item) => item.textContent.includes(player.name));
  expect(row.className).toContain("text-gray-900");
  const nameSpan = within(row).getByText(new RegExp(player.name));
  expect(nameSpan.className).not.toContain("text-gray-900");
});

test("logs an error and still renders when loading ratings fails", async () => {
  const teams = await teamService.getAll();
  const team = teams.find((t) => t.players.length > 0);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(ratingService, "getByPlayer").mockRejectedValueOnce(new Error("boom"));

  render(<SquadRanking team={team} />);

  await waitFor(() => {
    expect(errorSpy).toHaveBeenCalledWith("Failed to load squad ranking:", expect.any(Error));
  });
  expect(screen.getByRole("heading", { name: "Squad Ranking" })).toBeInTheDocument();
});
