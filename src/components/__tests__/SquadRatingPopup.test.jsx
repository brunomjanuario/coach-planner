import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SquadRatingPopup from "../SquadRatingPopup";
import { teamService } from "../../services/teamService";
import { trainingService } from "../../services/trainingService";
import { gameService } from "../../services/gameService";
import { ratingService } from "../../services/ratingService";

afterEach(() => {
  vi.restoreAllMocks();
});

function label(player) {
  return `#${player.shirtNumber} ${player.name}`;
}

async function seedTraining(teamId) {
  return trainingService.create({
    teamId,
    day: new Date("2030-01-01T10:00:00Z"),
    duration: 60,
    exercises: [],
  });
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

test("lists every player in the event's team with a rating input (AC RATE-01.1)", async () => {
  const [team] = await teamService.getAll();
  const training = await seedTraining(team.id);

  render(
    <SquadRatingPopup
      eventType="training"
      eventId={training.id}
      teamId={team.id}
      onClose={() => {}}
    />
  );

  for (const player of team.players) {
    expect(
      await screen.findByLabelText(`Rate ${label(player)}`)
    ).toBeInTheDocument();
  }
});

test("submitting persists one record per rated player (AC RATE-01.2)", async () => {
  const [team] = await teamService.getAll();
  const training = await seedTraining(team.id);
  const user = userEvent.setup();
  render(
    <SquadRatingPopup
      eventType="training"
      eventId={training.id}
      teamId={team.id}
      onClose={() => {}}
    />
  );
  await screen.findByLabelText(`Rate ${label(team.players[0])}`);

  await user.type(screen.getByLabelText(`Rate ${label(team.players[0])}`), "7");
  await user.type(screen.getByLabelText(`Rate ${label(team.players[1])}`), "9");
  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(async () => {
    const ratings = await ratingService.getByEvent("training", training.id);
    expect(ratings).toHaveLength(2);
  });
});

test("players left blank produce no record — asserts the record count (AC RATE-01.3)", async () => {
  const [team] = await teamService.getAll();
  const training = await seedTraining(team.id);
  const user = userEvent.setup();
  render(
    <SquadRatingPopup
      eventType="training"
      eventId={training.id}
      teamId={team.id}
      onClose={() => {}}
    />
  );
  await screen.findByLabelText(`Rate ${label(team.players[0])}`);

  await user.type(screen.getByLabelText(`Rate ${label(team.players[0])}`), "5");
  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(async () => {
    const ratings = await ratingService.getByEvent("training", training.id);
    expect(ratings).toHaveLength(1);
  });
  const ratings = await ratingService.getByEvent("training", training.id);
  expect(ratings[0].playerId).toBe(team.players[0].id);
});

test("existing ratings for the event pre-fill the inputs when reopened (AC RATE-02.5)", async () => {
  const [team] = await teamService.getAll();
  const training = await seedTraining(team.id);
  await ratingService.setRating({
    playerId: team.players[0].id,
    eventType: "training",
    eventId: training.id,
    value: 8,
  });

  render(
    <SquadRatingPopup
      eventType="training"
      eventId={training.id}
      teamId={team.id}
      onClose={() => {}}
    />
  );

  expect(
    await screen.findByLabelText(`Rate ${label(team.players[0])}`)
  ).toHaveValue(8);
});

test("re-submitting overwrites rather than duplicating (AC RATE-01.4)", async () => {
  const [team] = await teamService.getAll();
  const training = await seedTraining(team.id);
  await ratingService.setRating({
    playerId: team.players[0].id,
    eventType: "training",
    eventId: training.id,
    value: 4,
  });
  const user = userEvent.setup();
  render(
    <SquadRatingPopup
      eventType="training"
      eventId={training.id}
      teamId={team.id}
      onClose={() => {}}
    />
  );
  const input = await screen.findByLabelText(`Rate ${label(team.players[0])}`);
  await user.clear(input);
  await user.type(input, "9");

  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(async () => {
    const ratings = await ratingService.getByEvent("training", training.id);
    expect(ratings).toHaveLength(1);
  });
  const ratings = await ratingService.getByEvent("training", training.id);
  expect(ratings[0].value).toBe(9);
});

test("clearing a previously-set rating and submitting removes the existing record", async () => {
  const [team] = await teamService.getAll();
  const training = await seedTraining(team.id);
  await ratingService.setRating({
    playerId: team.players[0].id,
    eventType: "training",
    eventId: training.id,
    value: 6,
  });
  const user = userEvent.setup();
  render(
    <SquadRatingPopup
      eventType="training"
      eventId={training.id}
      teamId={team.id}
      onClose={() => {}}
    />
  );
  const input = await screen.findByLabelText(`Rate ${label(team.players[0])}`);
  await user.clear(input);

  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(async () => {
    const ratings = await ratingService.getByEvent("training", training.id);
    expect(ratings).toHaveLength(0);
  });
});

test("a rating of exactly 0 is submitted and persisted as a real value (edge case: null-vs-zero)", async () => {
  const [team] = await teamService.getAll();
  const training = await seedTraining(team.id);
  const user = userEvent.setup();
  render(
    <SquadRatingPopup
      eventType="training"
      eventId={training.id}
      teamId={team.id}
      onClose={() => {}}
    />
  );
  await user.type(await screen.findByLabelText(`Rate ${label(team.players[0])}`), "0");

  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(async () => {
    const ratings = await ratingService.getByEvent("training", training.id);
    expect(ratings).toHaveLength(1);
  });
  const ratings = await ratingService.getByEvent("training", training.id);
  expect(ratings[0].value).toBe(0);
});

test("a 30-player squad scrolls within the popup without pushing the action buttons off-screen (edge case)", async () => {
  const bigTeam = {
    id: "big-team",
    name: "Big Squad",
    club: "Amadora",
    season: "23/24",
    players: Array.from({ length: 30 }, (_, i) => ({
      id: `p${i}`,
      teamId: "big-team",
      name: `Player ${i}`,
      shirtNumber: i + 1,
    })),
  };
  vi.spyOn(teamService, "getAll").mockResolvedValue([bigTeam]);
  const game = await seedGame("big-team");

  const { container } = render(
    <SquadRatingPopup
      eventType="game"
      eventId={game.id}
      teamId="big-team"
      onClose={() => {}}
    />
  );

  await screen.findByLabelText(`Rate ${label(bigTeam.players[0])}`);
  const list = container.querySelector("ul.overflow-y-auto");
  expect(list).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
});

test("cancelling calls onClose without persisting any ratings", async () => {
  const [team] = await teamService.getAll();
  const training = await seedTraining(team.id);
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(
    <SquadRatingPopup
      eventType="training"
      eventId={training.id}
      teamId={team.id}
      onClose={onClose}
    />
  );
  await user.type(await screen.findByLabelText(`Rate ${label(team.players[0])}`), "6");

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onClose).toHaveBeenCalledTimes(1);
  expect(await ratingService.getByEvent("training", training.id)).toHaveLength(0);
});

test("a team with no players renders an empty state", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue([
    { id: "empty-team", club: "Empty", name: "FC", season: "23/24", players: [] },
  ]);
  const training = await seedTraining("empty-team");

  render(
    <SquadRatingPopup
      eventType="training"
      eventId={training.id}
      teamId="empty-team"
      onClose={() => {}}
    />
  );

  expect(await screen.findByText("No players to rate.")).toBeInTheDocument();
});

test("submitting closes the popup via onClose", async () => {
  const [team] = await teamService.getAll();
  const training = await seedTraining(team.id);
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(
    <SquadRatingPopup
      eventType="training"
      eventId={training.id}
      teamId={team.id}
      onClose={onClose}
    />
  );
  await user.type(await screen.findByLabelText(`Rate ${label(team.players[0])}`), "5");

  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});

test("shows an inline error and does not close when saving fails", async () => {
  const [team] = await teamService.getAll();
  const training = await seedTraining(team.id);
  const onClose = vi.fn();
  vi.spyOn(ratingService, "setRating").mockRejectedValueOnce(new Error("boom"));
  const user = userEvent.setup();
  render(
    <SquadRatingPopup
      eventType="training"
      eventId={training.id}
      teamId={team.id}
      onClose={onClose}
    />
  );
  await user.type(await screen.findByLabelText(`Rate ${label(team.players[0])}`), "5");

  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByText("Failed to save ratings. Please try again.")
  ).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});

test("ratings are stored with the eventType passed in, keeping training and game ratings distinguishable (AC RATE-02.3/02.4)", async () => {
  const [team] = await teamService.getAll();
  const game = await seedGame(team.id);
  const user = userEvent.setup();
  render(
    <SquadRatingPopup
      eventType="game"
      eventId={game.id}
      teamId={team.id}
      onClose={() => {}}
    />
  );
  await user.type(await screen.findByLabelText(`Rate ${label(team.players[0])}`), "6");

  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(async () => {
    const ratings = await ratingService.getByPlayer(team.players[0].id);
    expect(ratings).toHaveLength(1);
  });
  const ratings = await ratingService.getByPlayer(team.players[0].id);
  expect(ratings[0]).toMatchObject({ eventType: "game", eventId: game.id, value: 6 });
});
