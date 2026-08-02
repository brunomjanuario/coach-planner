import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GameResultPopup from "../GameResultPopup";
import { teamService } from "../../services/teamService";
import { cardService } from "../../services/cardService";
import { ratingService } from "../../services/ratingService";
import { gameService } from "../../services/gameService";

afterEach(() => {
  vi.restoreAllMocks();
});

function playerLabel(player) {
  return `#${player.shirtNumber} ${player.name}`;
}

// cardService.record validates the game against gameService's collection,
// so cards-related tests need a game actually persisted there (unlike the
// plain scheduledGame/playedGame fixtures used for pure rendering tests).
async function seedGame(teamId) {
  return gameService.create({
    teamId,
    opponent: "Benfica",
    date: new Date(2027, 5, 15, 14, 30),
    isHome: true,
    competition: "League",
  });
}

const scheduledGame = {
  id: "g1",
  teamId: 1,
  opponent: "Benfica",
  date: new Date(2027, 5, 15, 14, 30),
  isHome: true,
  competition: "League",
  usScore: null,
  themScore: null,
};

const playedGame = { ...scheduledGame, usScore: 2, themScore: 1 };

// GameCardsSection loads its squad asynchronously as soon as it mounts;
// awaiting it here keeps every test's state updates inside `act()`.
async function renderPopup(props = {}) {
  const result = render(<GameResultPopup onClose={() => {}} {...props} />);
  if (props.game) {
    await screen.findByText("Cards");
  }
  return result;
}

test("renders nothing when no game is passed", async () => {
  const { container } = await renderPopup({ game: null });

  expect(container).toBeEmptyDOMElement();
});

test("renders 'Record Result' heading for a scheduled game", async () => {
  await renderPopup({ game: scheduledGame });

  expect(
    screen.getByRole("heading", { name: "Record Result" })
  ).toBeInTheDocument();
});

test("renders 'Edit Result' heading and pre-fills the scores for an already-played game (AC GAME-06.4)", async () => {
  await renderPopup({ game: playedGame });

  expect(
    screen.getByRole("heading", { name: "Edit Result" })
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Us")).toHaveValue("2");
  expect(screen.getByLabelText("Benfica")).toHaveValue("1");
});

test("entering a valid result calls onSubmit with numeric scores and closes (AC GAME-06.1)", async () => {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  await renderPopup({ game: scheduledGame, onSubmit, onClose });

  await user.type(screen.getByLabelText("Us"), "3");
  await user.type(screen.getByLabelText("Benfica"), "1");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSubmit).toHaveBeenCalledWith({ us: 3, them: 1 });
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("recording a 0-0 result is accepted and submitted (null-vs-zero edge case)", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  await renderPopup({ game: scheduledGame, onSubmit });

  await user.type(screen.getByLabelText("Us"), "0");
  await user.type(screen.getByLabelText("Benfica"), "0");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSubmit).toHaveBeenCalledWith({ us: 0, them: 0 });
});

test("blocks submission with a message when a score is negative (AC GAME-06.2)", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  await renderPopup({ game: scheduledGame, onSubmit });

  await user.type(screen.getByLabelText("Us"), "-1");
  await user.type(screen.getByLabelText("Benfica"), "2");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByText(
      "Please enter a valid, non-negative score for both teams."
    )
  ).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("blocks submission with a message when a score is non-numeric (AC GAME-06.2)", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  await renderPopup({ game: scheduledGame, onSubmit });

  await user.type(screen.getByLabelText("Us"), "abc");
  await user.type(screen.getByLabelText("Benfica"), "1");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByText(
      "Please enter a valid, non-negative score for both teams."
    )
  ).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("blocks submission with a message when a score is left empty (AC GAME-06.2)", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  await renderPopup({ game: scheduledGame, onSubmit });

  await user.type(screen.getByLabelText("Us"), "2");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByText(
      "Please enter a valid, non-negative score for both teams."
    )
  ).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("does not render a 'Clear Result' button for a scheduled game with no result yet", async () => {
  await renderPopup({ game: scheduledGame });

  expect(
    screen.queryByRole("button", { name: "Clear Result" })
  ).not.toBeInTheDocument();
});

test("clearing a result calls onClear and closes the popup (AC GAME-06.5)", async () => {
  const onClear = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  await renderPopup({ game: playedGame, onClear, onClose });

  await user.click(screen.getByRole("button", { name: "Clear Result" }));

  expect(onClear).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("editing an existing result submits the new values in place (AC GAME-06.4)", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  await renderPopup({ game: playedGame, onSubmit });

  const usInput = screen.getByLabelText("Us");
  await user.clear(usInput);
  await user.type(usInput, "5");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSubmit).toHaveBeenCalledWith({ us: 5, them: 1 });
});

test("cancelling calls onClose without calling onSubmit or onClear", async () => {
  const onSubmit = vi.fn();
  const onClear = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  await renderPopup({ game: playedGame, onSubmit, onClear, onClose });

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSubmit).not.toHaveBeenCalled();
  expect(onClear).not.toHaveBeenCalled();
});

test("does not render a 'Delete Game' button when onDelete is not provided", async () => {
  await renderPopup({ game: playedGame });

  expect(
    screen.queryByRole("button", { name: "Delete Game" })
  ).not.toBeInTheDocument();
});

test("deleting a game asks for confirmation, then calls onDelete and closes (edge case: deleting a played game)", async () => {
  const onDelete = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  await renderPopup({ game: playedGame, onDelete, onClose });

  await user.click(screen.getByRole("button", { name: "Delete Game" }));
  expect(onDelete).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("cancelling the delete confirmation does not call onDelete", async () => {
  const onDelete = vi.fn();
  const user = userEvent.setup();
  await renderPopup({ game: playedGame, onDelete });

  await user.click(screen.getByRole("button", { name: "Delete Game" }));
  const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
  await user.click(cancelButtons[cancelButtons.length - 1]);

  expect(onDelete).not.toHaveBeenCalled();
  expect(
    screen.queryByText("Delete the game against Benfica?")
  ).not.toBeInTheDocument();
});

test("renders a 'Rate squad' action (AC RATE-02.2)", async () => {
  await renderPopup({ game: scheduledGame });

  expect(screen.getByRole("button", { name: "Rate squad" })).toBeInTheDocument();
});

test("clicking 'Rate squad' opens the squad rating view listing this game's team (AC RATE-02.2)", async () => {
  const [team] = await teamService.getAll();
  const user = userEvent.setup();
  await renderPopup({ game: { ...scheduledGame, teamId: team.id } });

  await user.click(screen.getByRole("button", { name: "Rate squad" }));

  for (const player of team.players) {
    expect(
      await screen.findByLabelText(`Rate ${playerLabel(player)}`)
    ).toBeInTheDocument();
  }
});

test("ratings entered from the game's squad rating view persist against that specific game with eventType 'game' (AC RATE-02.3)", async () => {
  const [team] = await teamService.getAll();
  const game = { ...scheduledGame, teamId: team.id };
  const user = userEvent.setup();
  await renderPopup({ game });
  await user.click(screen.getByRole("button", { name: "Rate squad" }));

  await user.type(
    await screen.findByLabelText(`Rate ${playerLabel(team.players[0])}`),
    "7"
  );
  const saveButtons = screen.getAllByRole("button", { name: "Save" });
  await user.click(saveButtons[saveButtons.length - 1]);

  await waitFor(async () => {
    const ratings = await ratingService.getByEvent("game", game.id);
    expect(ratings).toHaveLength(1);
  });
  const ratings = await ratingService.getByEvent("game", game.id);
  expect(ratings[0]).toMatchObject({
    playerId: team.players[0].id,
    eventType: "game",
    eventId: game.id,
    value: 7,
  });
});

test("reopening 'Rate squad' pre-fills previously entered ratings (AC RATE-02.5)", async () => {
  const [team] = await teamService.getAll();
  const game = { ...scheduledGame, teamId: team.id };
  await ratingService.setRating({
    playerId: team.players[0].id,
    eventType: "game",
    eventId: game.id,
    value: 9,
  });
  const user = userEvent.setup();
  await renderPopup({ game });

  await user.click(screen.getByRole("button", { name: "Rate squad" }));

  expect(
    await screen.findByLabelText(`Rate ${playerLabel(team.players[0])}`)
  ).toHaveValue(9);
});

test("cancelling the squad rating view persists no ratings against the game", async () => {
  const [team] = await teamService.getAll();
  const game = { ...scheduledGame, teamId: team.id };
  const user = userEvent.setup();
  await renderPopup({ game });
  await user.click(screen.getByRole("button", { name: "Rate squad" }));
  await user.type(
    await screen.findByLabelText(`Rate ${playerLabel(team.players[0])}`),
    "5"
  );

  const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
  await user.click(cancelButtons[cancelButtons.length - 1]);

  expect(await ratingService.getByEvent("game", game.id)).toHaveLength(0);
});

test("closing the squad rating view returns to the game result view", async () => {
  const [team] = await teamService.getAll();
  const game = { ...scheduledGame, teamId: team.id };
  const user = userEvent.setup();
  await renderPopup({ game });
  await user.click(screen.getByRole("button", { name: "Rate squad" }));
  await screen.findByLabelText(`Rate ${playerLabel(team.players[0])}`);

  const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
  await user.click(cancelButtons[cancelButtons.length - 1]);

  expect(
    screen.queryByLabelText(`Rate ${playerLabel(team.players[0])}`)
  ).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Record Result" })).toBeInTheDocument();
});

test("ratings persist independently of the scoreline — recording a result leaves ratings intact (edge case)", async () => {
  const [team] = await teamService.getAll();
  const game = { ...scheduledGame, teamId: team.id };
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  await renderPopup({ game, onSubmit });
  await user.click(screen.getByRole("button", { name: "Rate squad" }));
  await user.type(
    await screen.findByLabelText(`Rate ${playerLabel(team.players[0])}`),
    "6"
  );
  const saveButtons = screen.getAllByRole("button", { name: "Save" });
  await user.click(saveButtons[saveButtons.length - 1]);
  await waitFor(async () => {
    expect(await ratingService.getByEvent("game", game.id)).toHaveLength(1);
  });

  await user.type(screen.getByLabelText("Us"), "3");
  await user.type(screen.getByLabelText("Benfica"), "1");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSubmit).toHaveBeenCalledWith({ us: 3, them: 1 });
  const ratings = await ratingService.getByEvent("game", game.id);
  expect(ratings).toHaveLength(1);
  expect(ratings[0].value).toBe(6);
});

test("ratings persist independently of the scoreline — clearing a result leaves ratings intact (AC: edge case)", async () => {
  const [team] = await teamService.getAll();
  const game = { ...playedGame, teamId: team.id };
  const onClear = vi.fn();
  await ratingService.setRating({
    playerId: team.players[0].id,
    eventType: "game",
    eventId: game.id,
    value: 4,
  });
  const user = userEvent.setup();
  await renderPopup({ game, onClear });

  await user.click(screen.getByRole("button", { name: "Clear Result" }));

  expect(onClear).toHaveBeenCalledTimes(1);
  const ratings = await ratingService.getByEvent("game", game.id);
  expect(ratings).toHaveLength(1);
  expect(ratings[0].value).toBe(4);
});

test("ratings and cards coexist in the same flow without interfering — adding a card leaves existing ratings intact", async () => {
  const [team] = await teamService.getAll();
  const game = await seedGame(team.id);
  const player = team.players[1];
  await ratingService.setRating({
    playerId: player.id,
    eventType: "game",
    eventId: game.id,
    value: 7,
  });
  const user = userEvent.setup();
  await renderPopup({ game });

  await user.click(
    screen.getByRole("button", { name: `Add yellow card to ${playerLabel(player)}` })
  );

  await waitFor(async () => {
    expect(await cardService.getByGame(game.id)).toHaveLength(1);
  });
  const ratings = await ratingService.getByEvent("game", game.id);
  expect(ratings).toEqual([expect.objectContaining({ playerId: player.id, value: 7 })]);
});

test("ratings and cards coexist in the same flow without interfering — recording a rating leaves existing cards intact", async () => {
  const [team] = await teamService.getAll();
  const game = await seedGame(team.id);
  const player = team.players[1];
  await cardService.record({ playerId: player.id, gameId: game.id, type: "yellow" });
  const user = userEvent.setup();
  await renderPopup({ game });
  await user.click(screen.getByRole("button", { name: "Rate squad" }));

  await user.type(await screen.findByLabelText(`Rate ${playerLabel(player)}`), "8");
  const saveButtons = screen.getAllByRole("button", { name: "Save" });
  await user.click(saveButtons[saveButtons.length - 1]);

  await waitFor(async () => {
    expect(await ratingService.getByEvent("game", game.id)).toHaveLength(1);
  });
  const cards = await cardService.getByGame(game.id);
  expect(cards).toHaveLength(1);
});

test("a rating of exactly 0 is stored correctly within the game flow (edge case: null-vs-zero)", async () => {
  const [team] = await teamService.getAll();
  const game = { ...scheduledGame, teamId: team.id };
  const user = userEvent.setup();
  await renderPopup({ game });
  await user.click(screen.getByRole("button", { name: "Rate squad" }));

  await user.type(await screen.findByLabelText(`Rate ${playerLabel(team.players[0])}`), "0");
  const saveButtons = screen.getAllByRole("button", { name: "Save" });
  await user.click(saveButtons[saveButtons.length - 1]);

  await waitFor(async () => {
    const ratings = await ratingService.getByEvent("game", game.id);
    expect(ratings).toHaveLength(1);
  });
  const ratings = await ratingService.getByEvent("game", game.id);
  expect(ratings[0].value).toBe(0);
});

test("a training rating and a game rating for the same player are both retrievable and distinguishable (AC RATE-02.4)", async () => {
  const [team] = await teamService.getAll();
  const game = { ...scheduledGame, teamId: team.id };
  const player = team.players[0];
  await ratingService.setRating({
    playerId: player.id,
    eventType: "training",
    eventId: "t1",
    value: 8,
  });
  const user = userEvent.setup();
  await renderPopup({ game });
  await user.click(screen.getByRole("button", { name: "Rate squad" }));

  await user.type(await screen.findByLabelText(`Rate ${playerLabel(player)}`), "6");
  const saveButtons = screen.getAllByRole("button", { name: "Save" });
  await user.click(saveButtons[saveButtons.length - 1]);

  await waitFor(async () => {
    const all = await ratingService.getByPlayer(player.id);
    expect(all).toHaveLength(2);
  });
  const all = await ratingService.getByPlayer(player.id);
  expect(all.find((r) => r.eventType === "training").value).toBe(8);
  expect(all.find((r) => r.eventType === "game").value).toBe(6);
});

test("the existing Save action still submits the result alongside the new rating action (regression guard on 08)", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  await renderPopup({ game: scheduledGame, onSubmit });

  await user.type(screen.getByLabelText("Us"), "1");
  await user.type(screen.getByLabelText("Benfica"), "0");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSubmit).toHaveBeenCalledWith({ us: 1, them: 0 });
});

test("the existing Delete Game flow still works alongside the new rating action (regression guard on 08)", async () => {
  const onDelete = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  await renderPopup({ game: playedGame, onDelete, onClose });

  await user.click(screen.getByRole("button", { name: "Delete Game" }));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("renders 'Rate squad' for an already-played game as well (AC RATE-02.2 applies regardless of result state)", async () => {
  await renderPopup({ game: playedGame });

  expect(screen.getByRole("button", { name: "Rate squad" })).toBeInTheDocument();
});

test("the squad rating view for a game with no players renders an empty state", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue([
    { id: "empty-team", club: "Empty", name: "FC", season: "23/24", players: [] },
  ]);
  const user = userEvent.setup();
  await renderPopup({ game: { ...scheduledGame, teamId: "empty-team" } });

  await user.click(screen.getByRole("button", { name: "Rate squad" }));

  expect(await screen.findByText("No players to rate.")).toBeInTheDocument();
});

test("opening 'Rate squad' does not clear score values already entered in the result form", async () => {
  const user = userEvent.setup();
  await renderPopup({ game: scheduledGame });
  await user.type(screen.getByLabelText("Us"), "2");

  await user.click(screen.getByRole("button", { name: "Rate squad" }));

  expect(screen.getByLabelText("Us")).toHaveValue("2");
});

test("the squad rating view opened from a game scopes ratings to that game's team, not another team's players", async () => {
  const teams = await teamService.getAll();
  const [teamA, teamB] = teams.filter((t) => t.players.length > 0);
  const user = userEvent.setup();
  await renderPopup({ game: { ...scheduledGame, teamId: teamA.id } });

  await user.click(screen.getByRole("button", { name: "Rate squad" }));
  await screen.findByLabelText(`Rate ${playerLabel(teamA.players[0])}`);

  // Ratable inputs are number ("spinbutton") controls; the scoreline fields
  // are type="text", so this count is exactly the squad rating rows shown —
  // it must match teamA's own roster size, not include teamB's players.
  expect(screen.getAllByRole("spinbutton")).toHaveLength(teamA.players.length);
});
