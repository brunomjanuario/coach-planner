import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlayerRatingHistory from "../PlayerRatingHistory";
import { teamService } from "../../services/teamService";
import { trainingService } from "../../services/trainingService";
import { gameService } from "../../services/gameService";
import { ratingService } from "../../services/ratingService";

afterEach(() => {
  vi.restoreAllMocks();
});

async function seedGameAt(teamId, date) {
  return gameService.create({
    teamId,
    opponent: "Rivals FC",
    date,
    isHome: true,
    competition: "League",
  });
}

async function seedTrainingAt(teamId, day) {
  return trainingService.create({ teamId, day, duration: 60, exercises: [] });
}

function entryList() {
  return within(screen.getByRole("list")).getAllByRole("listitem");
}

test("lists each rated event with date, type and value, most recent first (AC RATE-08.1)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const training = await seedTrainingAt(player.teamId, new Date("2030-01-01T10:00:00Z"));
  const game = await seedGameAt(player.teamId, new Date("2030-02-01T10:00:00Z"));
  await ratingService.setRating({
    playerId: player.id,
    eventType: "training",
    eventId: training.id,
    value: 6,
  });
  await ratingService.setRating({
    playerId: player.id,
    eventType: "game",
    eventId: game.id,
    value: 8,
  });

  render(<PlayerRatingHistory playerId={player.id} onChange={() => {}} />);

  const items = await waitFor(() => {
    const found = entryList();
    expect(found).toHaveLength(2);
    return found;
  });
  // Game (Feb) is more recent than training (Jan), so it must come first.
  expect(items[0]).toHaveTextContent("Game");
  expect(items[0]).toHaveTextContent("8");
  expect(items[1]).toHaveTextContent("Training");
  expect(items[1]).toHaveTextContent("6");
});

test("a rating of 0 renders as 0, not blank (edge case)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const game = await seedGameAt(player.teamId, new Date("2030-01-01T10:00:00Z"));
  await ratingService.setRating({
    playerId: player.id,
    eventType: "game",
    eventId: game.id,
    value: 0,
  });

  render(<PlayerRatingHistory playerId={player.id} onChange={() => {}} />);

  const items = await waitFor(() => {
    const found = entryList();
    expect(found).toHaveLength(1);
    return found;
  });
  expect(items[0]).toHaveTextContent("0");
});

test("a player with no ratings shows an empty-state message (AC RATE-08.3)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];

  render(<PlayerRatingHistory playerId={player.id} onChange={() => {}} />);

  expect(await screen.findByText("No ratings recorded yet.")).toBeInTheDocument();
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
});

test("training and game entries are visually distinguishable", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const training = await seedTrainingAt(player.teamId, new Date("2030-01-01T10:00:00Z"));
  const game = await seedGameAt(player.teamId, new Date("2030-02-01T10:00:00Z"));
  await ratingService.setRating({
    playerId: player.id,
    eventType: "training",
    eventId: training.id,
    value: 5,
  });
  await ratingService.setRating({
    playerId: player.id,
    eventType: "game",
    eventId: game.id,
    value: 7,
  });

  render(<PlayerRatingHistory playerId={player.id} onChange={() => {}} />);

  const items = await waitFor(() => {
    const found = entryList();
    expect(found).toHaveLength(2);
    return found;
  });
  const trainingBadge = within(items[1]).getByText("Training");
  const gameBadge = within(items[0]).getByText("Game");
  expect(trainingBadge.className).not.toBe(gameBadge.className);
});

test("events sharing a date order deterministically (edge case)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const sameDate = new Date("2030-01-01T10:00:00Z");
  const gameA = await seedGameAt(player.teamId, sameDate);
  const gameB = await seedGameAt(player.teamId, sameDate);
  await ratingService.setRating({
    playerId: player.id,
    eventType: "game",
    eventId: gameA.id,
    value: 3,
  });
  await ratingService.setRating({
    playerId: player.id,
    eventType: "game",
    eventId: gameB.id,
    value: 9,
  });

  const { unmount } = render(<PlayerRatingHistory playerId={player.id} onChange={() => {}} />);
  const firstRenderOrder = await waitFor(() => {
    const found = entryList().map((item) => item.textContent);
    expect(found).toHaveLength(2);
    return found;
  });
  unmount();

  render(<PlayerRatingHistory playerId={player.id} onChange={() => {}} />);
  const secondRenderOrder = await waitFor(() => {
    const found = entryList().map((item) => item.textContent);
    expect(found).toHaveLength(2);
    return found;
  });

  expect(secondRenderOrder).toEqual(firstRenderOrder);
});

test("deleting an entry recomputes by calling onChange (AC RATE-08.2)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const game = await seedGameAt(player.teamId, new Date("2030-01-01T10:00:00Z"));
  await ratingService.setRating({
    playerId: player.id,
    eventType: "game",
    eventId: game.id,
    value: 6,
  });
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<PlayerRatingHistory playerId={player.id} onChange={onChange} />);
  const deleteButton = await screen.findByRole("button", { name: /Delete game rating of 6/ });

  await user.click(deleteButton);
  await user.click(screen.getByRole("button", { name: "Submit" }));

  await waitFor(() => {
    expect(onChange).toHaveBeenCalledTimes(1);
  });
  expect(screen.getByText("No ratings recorded yet.")).toBeInTheDocument();
  const remaining = await ratingService.getByPlayer(player.id);
  expect(remaining).toHaveLength(0);
});

test("cancelling the delete confirmation keeps the rating and does not call onChange", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const game = await seedGameAt(player.teamId, new Date("2030-01-01T10:00:00Z"));
  await ratingService.setRating({
    playerId: player.id,
    eventType: "game",
    eventId: game.id,
    value: 6,
  });
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<PlayerRatingHistory playerId={player.id} onChange={onChange} />);
  const deleteButton = await screen.findByRole("button", { name: /Delete game rating of 6/ });

  await user.click(deleteButton);
  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onChange).not.toHaveBeenCalled();
  expect(entryList()).toHaveLength(1);
  const remaining = await ratingService.getByPlayer(player.id);
  expect(remaining).toHaveLength(1);
});

test("deleting one entry removes only that record, leaving the other intact", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const gameA = await seedGameAt(player.teamId, new Date("2030-01-01T10:00:00Z"));
  const gameB = await seedGameAt(player.teamId, new Date("2030-02-01T10:00:00Z"));
  await ratingService.setRating({
    playerId: player.id,
    eventType: "game",
    eventId: gameA.id,
    value: 4,
  });
  await ratingService.setRating({
    playerId: player.id,
    eventType: "game",
    eventId: gameB.id,
    value: 9,
  });
  const user = userEvent.setup();
  render(<PlayerRatingHistory playerId={player.id} onChange={() => {}} />);
  const deleteButton = await screen.findByRole("button", { name: /Delete game rating of 4/ });

  await user.click(deleteButton);
  await user.click(screen.getByRole("button", { name: "Submit" }));

  await waitFor(() => {
    expect(entryList()).toHaveLength(1);
  });
  expect(entryList()[0]).toHaveTextContent("9");
});

test("a rating whose event no longer exists still renders instead of crashing (edge case)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const game = await seedGameAt(player.teamId, new Date("2030-01-01T10:00:00Z"));
  await ratingService.setRating({
    playerId: player.id,
    eventType: "game",
    eventId: game.id,
    value: 5,
  });
  await gameService.delete(game.id);

  render(<PlayerRatingHistory playerId={player.id} onChange={() => {}} />);

  // The rating cascades away with the game (per the `08` rule), so the
  // history is empty rather than orphaned.
  expect(await screen.findByText("No ratings recorded yet.")).toBeInTheDocument();
});

test("a history row carries a dark text colour on the light row background (AC CONTR-03.1)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const game = await seedGameAt(player.teamId, new Date("2030-01-01T10:00:00Z"));
  await ratingService.setRating({ playerId: player.id, eventType: "game", eventId: game.id, value: 6 });

  render(<PlayerRatingHistory playerId={player.id} onChange={() => {}} />);

  const items = await waitFor(() => {
    const found = entryList();
    expect(found).toHaveLength(1);
    return found;
  });
  expect(items[0].className).toContain("bg-gray-100");
  expect(items[0].className).toContain("text-gray-900");
});

test("the delete control is styled distinguishably from the row text (AC CONTR-03.2)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const game = await seedGameAt(player.teamId, new Date("2030-01-01T10:00:00Z"));
  await ratingService.setRating({ playerId: player.id, eventType: "game", eventId: game.id, value: 6 });

  render(<PlayerRatingHistory playerId={player.id} onChange={() => {}} />);
  const deleteButton = await screen.findByRole("button", { name: /Delete game rating of 6/ });
  const row = deleteButton.closest("li");

  expect(deleteButton.className).not.toContain("text-gray-900");
  expect(deleteButton.className).not.toBe(row.className);
});

test("the empty-history message stays on the dark surface without being darkened (AC CONTR-03.3)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];

  render(<PlayerRatingHistory playerId={player.id} onChange={() => {}} />);

  const message = await screen.findByText("No ratings recorded yet.");
  expect(message.className).not.toContain("text-gray-900");
  expect(message.className).toContain("text-gray-500");
});

test("the delete control keeps a readable colour on hover and focus (edge case)", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const game = await seedGameAt(player.teamId, new Date("2030-01-01T10:00:00Z"));
  await ratingService.setRating({ playerId: player.id, eventType: "game", eventId: game.id, value: 6 });

  render(<PlayerRatingHistory playerId={player.id} onChange={() => {}} />);
  const deleteButton = await screen.findByRole("button", { name: /Delete game rating of 6/ });

  expect(deleteButton.className).toContain("hover:text-red-600");
  expect(deleteButton.className).toContain("focus:text-red-600");
});

test("logs an error and still renders when loading history fails", async () => {
  const teams = await teamService.getAll();
  const player = teams[0].players[1];
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(ratingService, "getByPlayer").mockRejectedValueOnce(new Error("boom"));

  render(<PlayerRatingHistory playerId={player.id} onChange={() => {}} />);

  await waitFor(() => {
    expect(errorSpy).toHaveBeenCalledWith("Failed to load rating history:", expect.any(Error));
  });
  expect(screen.getByText("No ratings recorded yet.")).toBeInTheDocument();
});
