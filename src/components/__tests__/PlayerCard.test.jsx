import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlayerCard from "../PlayerCard";
import { teamService } from "../../services/teamService";
import { cardService } from "../../services/cardService";
import { gameService } from "../../services/gameService";
import { ratingService } from "../../services/ratingService";
import { SUSPENSION_THRESHOLD } from "../../lib/playerCards";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

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

async function seedGameForTeamAt(teamId, date) {
  return gameService.create({
    teamId,
    opponent: "Rivals FC",
    date,
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

async function bookYellows(player, game, count) {
  for (let i = 0; i < count; i++) {
    await cardService.record({ playerId: player.id, gameId: game.id, type: "yellow" });
  }
}

test("renders a distinct amber warning naming how many yellows remain at one below the threshold (AC CARD-05.1)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const game = await seedGameForTeam(player.teamId);
  await bookYellows(player, game, SUSPENSION_THRESHOLD - 1);

  render(<PlayerCard player={player} onClose={() => {}} onUpdated={() => {}} />);

  const warning = await screen.findByRole("alert");
  expect(warning).toHaveTextContent("1 yellow card away from a ban");
  expect(warning.className).toMatch(/amber/);
});

test("renders a distinct red warning at the suspension threshold (AC CARD-05.2)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const game = await seedGameForTeam(player.teamId);
  await bookYellows(player, game, SUSPENSION_THRESHOLD);

  render(<PlayerCard player={player} onClose={() => {}} onUpdated={() => {}} />);

  const warning = await screen.findByRole("alert");
  expect(warning).toHaveTextContent("Suspended");
  expect(warning.className).toMatch(/red/);
});

test("a red card triggers the suspended warning regardless of yellow count (AC CARD-05.3)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const game = await seedGameForTeam(player.teamId);
  await cardService.record({ playerId: player.id, gameId: game.id, type: "red" });

  render(<PlayerCard player={player} onClose={() => {}} onUpdated={() => {}} />);

  const warning = await screen.findByRole("alert");
  expect(warning).toHaveTextContent("Suspended");
});

test("renders no warning at all below the warning band (AC CARD-05.4)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const game = await seedGameForTeam(player.teamId);
  await bookYellows(player, game, SUSPENSION_THRESHOLD - 2);

  render(<PlayerCard player={player} onClose={() => {}} onUpdated={() => {}} />);

  await waitFor(() => {
    expect(statValue("Yellow Cards")).toHaveTextContent(String(SUSPENSION_THRESHOLD - 2));
  });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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

test("displays average rating to one decimal place (AC RATE-03.1)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const gameA = await seedGameForTeam(player.teamId);
  const gameB = await seedGameForTeam(player.teamId);
  await ratingService.setRating({
    playerId: player.id,
    eventType: "game",
    eventId: gameA.id,
    value: 6,
  });
  await ratingService.setRating({
    playerId: player.id,
    eventType: "game",
    eventId: gameB.id,
    value: 9,
  });

  render(<PlayerCard player={player} onClose={() => {}} onUpdated={() => {}} />);

  await waitFor(() => {
    expect(statValue("Average Rating")).toHaveTextContent("7.5");
  });
});

test("a player with no ratings shows — rather than 0.0 (AC RATE-03.2)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];

  render(<PlayerCard player={player} onClose={() => {}} onUpdated={() => {}} />);

  await waitFor(() => {
    expect(statValue("Average Rating")).toHaveTextContent("—");
  });
  expect(statValue("Form")).toHaveTextContent("—");
});

test("form is the mean of the last 5 rated events by date, most recent first (AC RATE-03.3)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const dates = [1, 2, 3, 4, 5, 6].map((d) => new Date(`2031-01-0${d}T10:00:00Z`));
  const games = [];
  for (const date of dates) {
    games.push(await seedGameForTeamAt(player.teamId, date));
  }
  const values = [0, 10, 10, 10, 10, 10];
  for (let i = 0; i < games.length; i++) {
    await ratingService.setRating({
      playerId: player.id,
      eventType: "game",
      eventId: games[i].id,
      value: values[i],
    });
  }

  render(<PlayerCard player={player} onClose={() => {}} onUpdated={() => {}} />);

  await waitFor(() => {
    expect(statValue("Form")).toHaveTextContent("10.0");
  });
  expect(statValue("Form")).toHaveTextContent("5");
  expect(statValue("Average Rating")).toHaveTextContent("8.3");
});

test("fewer than 5 rated events computes form over what exists, labelled with the count (AC RATE-03.4)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const game1 = await seedGameForTeam(player.teamId);
  const game2 = await seedGameForTeam(player.teamId);
  const game3 = await seedGameForTeam(player.teamId);
  await ratingService.setRating({
    playerId: player.id,
    eventType: "game",
    eventId: game1.id,
    value: 4,
  });
  await ratingService.setRating({
    playerId: player.id,
    eventType: "game",
    eventId: game2.id,
    value: 6,
  });
  await ratingService.setRating({
    playerId: player.id,
    eventType: "game",
    eventId: game3.id,
    value: 8,
  });

  render(<PlayerCard player={player} onClose={() => {}} onUpdated={() => {}} />);

  await waitFor(() => {
    expect(statValue("Form")).toHaveTextContent("6.0");
  });
  expect(statValue("Form")).toHaveTextContent("3");
});

test("average and form recompute after a rating changes, with no page reload (AC RATE-03.5)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const game = await seedGameForTeam(player.teamId);
  const { unmount } = render(
    <PlayerCard player={player} onClose={() => {}} onUpdated={() => {}} />
  );
  await waitFor(() => expect(statValue("Average Rating")).toHaveTextContent("—"));
  unmount();

  await ratingService.setRating({
    playerId: player.id,
    eventType: "game",
    eventId: game.id,
    value: 7,
  });
  render(<PlayerCard player={player} onClose={() => {}} onUpdated={() => {}} />);

  await waitFor(() => {
    expect(statValue("Average Rating")).toHaveTextContent("7.0");
  });
});

test("deleting a player, once confirmed, awaits the service before calling onDeleted and onClose (AC PREF-01.1, PREF-02)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const { promise, resolve } = deferred();
  const deleteSpy = vi.spyOn(teamService, "deletePlayer").mockReturnValue(promise);
  const onClose = vi.fn();
  const onDeleted = vi.fn();
  const user = userEvent.setup();
  const { container } = render(
    <PlayerCard player={player} onClose={onClose} onUpdated={() => {}} onDeleted={onDeleted} />
  );

  await user.click(container.querySelector(".tabler-icon-trash"));
  await user.click(await screen.findByRole("button", { name: "Submit" }));

  expect(deleteSpy).toHaveBeenCalledWith(player);
  expect(onDeleted).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();

  resolve();
  await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("a rejected delete keeps the player and renders an inline error without closing (AC PREF-01.5)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  vi.spyOn(teamService, "deletePlayer").mockRejectedValue(new Error("boom"));
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const onClose = vi.fn();
  const onDeleted = vi.fn();
  const user = userEvent.setup();
  const { container } = render(
    <PlayerCard player={player} onClose={onClose} onUpdated={() => {}} onDeleted={onDeleted} />
  );

  await user.click(container.querySelector(".tabler-icon-trash"));
  await user.click(await screen.findByRole("button", { name: "Submit" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Failed to delete the player. Please try again."
  );
  expect(onClose).not.toHaveBeenCalled();
  expect(onDeleted).not.toHaveBeenCalled();
  expect(errorSpy).toHaveBeenCalledWith("Failed to delete player:", expect.any(Error));
  expect(screen.getByText(`${player.shirtNumber} ${player.name}`)).toBeInTheDocument();
});

test("deleting a player still cascades card and rating removal (regression guard on 08/09)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const cardSpy = vi.spyOn(cardService, "removeByPlayer");
  const ratingSpy = vi.spyOn(ratingService, "removeByPlayer");
  const user = userEvent.setup();
  const { container } = render(
    <PlayerCard player={player} onClose={() => {}} onUpdated={() => {}} onDeleted={() => {}} />
  );

  await user.click(container.querySelector(".tabler-icon-trash"));
  await user.click(await screen.findByRole("button", { name: "Submit" }));

  await waitFor(() => expect(cardSpy).toHaveBeenCalledWith(player.id));
  expect(ratingSpy).toHaveBeenCalledWith(player.id);
});

test("cancelling the delete confirmation leaves the player unchanged", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const deleteSpy = vi.spyOn(teamService, "deletePlayer");
  const user = userEvent.setup();
  const { container } = render(
    <PlayerCard player={player} onClose={() => {}} onUpdated={() => {}} onDeleted={() => {}} />
  );

  await user.click(container.querySelector(".tabler-icon-trash"));
  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(deleteSpy).not.toHaveBeenCalled();
  expect(screen.getByText(`${player.shirtNumber} ${player.name}`)).toBeInTheDocument();
});
