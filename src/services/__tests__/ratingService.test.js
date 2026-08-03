import { describe, it, expect, afterEach, vi } from "vitest";
import { ratingService } from "../ratingService";
import { trainingService } from "../trainingService";
import { gameService } from "../gameService";
import { teamService } from "../teamService";
import { ValidationError } from "../../lib/errors";

describe("ratingService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function seedTeamAndPlayer() {
    const teams = await teamService.getAll();
    const team = teams.find((t) => t.players.length > 1);
    return { team, player: team.players[1] };
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

  it("getAll returns every persisted rating across players and events", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const training = await seedTraining(team.id);
    await ratingService.setRating({
      playerId: player.id,
      eventType: "training",
      eventId: training.id,
      value: 7,
    });

    const all = await ratingService.getAll();

    expect(
      all.some(
        (rating) =>
          rating.playerId === player.id &&
          rating.eventType === "training" &&
          rating.eventId === training.id &&
          rating.value === 7
      )
    ).toBe(true);
  });

  it("getAll returns non-reference-identical arrays across two calls (AD-004)", async () => {
    const first = await ratingService.getAll();
    const second = await ratingService.getAll();
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });

  it("setRating persists a rating with an id assigned via newId() (AC RATE-01.2)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const training = await seedTraining(team.id);

    const rating = await ratingService.setRating({
      playerId: player.id,
      eventType: "training",
      eventId: training.id,
      value: 7,
    });

    expect(typeof rating.id).toBe("string");
    expect(rating.id.length).toBeGreaterThan(0);
    expect(rating).toMatchObject({
      playerId: player.id,
      eventType: "training",
      eventId: training.id,
      value: 7,
    });
  });

  it("setRating stores a value of exactly 0 as a real rating, not absent (edge case: null-vs-zero)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const training = await seedTraining(team.id);

    await ratingService.setRating({
      playerId: player.id,
      eventType: "training",
      eventId: training.id,
      value: 0,
    });

    const ratings = await ratingService.getByPlayer(player.id);
    expect(ratings).toHaveLength(1);
    expect(ratings[0].value).toBe(0);
  });

  it("setRating rejects a value above 10 (AC RATE-01.5)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const training = await seedTraining(team.id);

    await expect(
      ratingService.setRating({
        playerId: player.id,
        eventType: "training",
        eventId: training.id,
        value: 11,
      })
    ).rejects.toThrow(ValidationError);
    expect(await ratingService.getByPlayer(player.id)).toHaveLength(0);
  });

  it("setRating rejects a value below 0 (AC RATE-01.5)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const training = await seedTraining(team.id);

    await expect(
      ratingService.setRating({
        playerId: player.id,
        eventType: "training",
        eventId: training.id,
        value: -1,
      })
    ).rejects.toThrow(ValidationError);
  });

  it("setRating rejects a non-integer value (AC RATE-01.5)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const training = await seedTraining(team.id);

    await expect(
      ratingService.setRating({
        playerId: player.id,
        eventType: "training",
        eventId: training.id,
        value: 7.5,
      })
    ).rejects.toThrow(ValidationError);
  });

  it("re-rating the same (playerId, eventType, eventId) overwrites rather than adding a second record (AC RATE-01.4)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const training = await seedTraining(team.id);

    const first = await ratingService.setRating({
      playerId: player.id,
      eventType: "training",
      eventId: training.id,
      value: 5,
    });
    const second = await ratingService.setRating({
      playerId: player.id,
      eventType: "training",
      eventId: training.id,
      value: 8,
    });

    const ratings = await ratingService.getByPlayer(player.id);
    expect(ratings).toHaveLength(1);
    expect(ratings[0].id).toBe(first.id);
    expect(second.id).toBe(first.id);
    expect(ratings[0].value).toBe(8);
  });

  it("setRating with value null clears an existing record rather than storing null", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const training = await seedTraining(team.id);
    await ratingService.setRating({
      playerId: player.id,
      eventType: "training",
      eventId: training.id,
      value: 6,
    });

    await ratingService.setRating({
      playerId: player.id,
      eventType: "training",
      eventId: training.id,
      value: null,
    });

    expect(await ratingService.getByPlayer(player.id)).toHaveLength(0);
  });

  it("setRating records eventType so training and game ratings are distinguishable (AC RATE-02.3)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const training = await seedTraining(team.id);
    const game = await seedGame(team.id);

    await ratingService.setRating({
      playerId: player.id,
      eventType: "training",
      eventId: training.id,
      value: 8,
    });
    await ratingService.setRating({
      playerId: player.id,
      eventType: "game",
      eventId: game.id,
      value: 6,
    });

    const ratings = await ratingService.getByPlayer(player.id);
    expect(ratings.find((r) => r.eventType === "training").value).toBe(8);
    expect(ratings.find((r) => r.eventType === "game").value).toBe(6);
  });

  it("getByEvent returns only that event's ratings, not another event's (AC RATE-01.1)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const trainingA = await seedTraining(team.id);
    const trainingB = await seedTraining(team.id);
    await ratingService.setRating({
      playerId: player.id,
      eventType: "training",
      eventId: trainingA.id,
      value: 5,
    });
    await ratingService.setRating({
      playerId: player.id,
      eventType: "training",
      eventId: trainingB.id,
      value: 9,
    });

    const ratingsA = await ratingService.getByEvent("training", trainingA.id);

    expect(ratingsA).toHaveLength(1);
    expect(ratingsA[0].value).toBe(5);
  });

  it("getByPlayer returns every rating across event types, and filters to one type when given (AC RATE-02.4)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const training = await seedTraining(team.id);
    const game = await seedGame(team.id);
    await ratingService.setRating({
      playerId: player.id,
      eventType: "training",
      eventId: training.id,
      value: 8,
    });
    await ratingService.setRating({
      playerId: player.id,
      eventType: "game",
      eventId: game.id,
      value: 6,
    });

    const combined = await ratingService.getByPlayer(player.id);
    const trainingOnly = await ratingService.getByPlayer(player.id, "training");
    const gameOnly = await ratingService.getByPlayer(player.id, "game");

    expect(combined).toHaveLength(2);
    expect(trainingOnly).toEqual([expect.objectContaining({ value: 8 })]);
    expect(gameOnly).toEqual([expect.objectContaining({ value: 6 })]);
  });

  it("getByEvent and getByPlayer both return copies, not live references (AD-004)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const training = await seedTraining(team.id);
    await ratingService.setRating({
      playerId: player.id,
      eventType: "training",
      eventId: training.id,
      value: 7,
    });

    const eventFirst = await ratingService.getByEvent("training", training.id);
    const eventSecond = await ratingService.getByEvent("training", training.id);
    const playerFirst = await ratingService.getByPlayer(player.id);
    const playerSecond = await ratingService.getByPlayer(player.id);

    expect(eventFirst).not.toBe(eventSecond);
    expect(eventFirst).toEqual(eventSecond);
    expect(playerFirst).not.toBe(playerSecond);
    expect(playerFirst).toEqual(playerSecond);
  });

  it("remove deletes exactly one record, leaving the player's others intact", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const trainingA = await seedTraining(team.id);
    const trainingB = await seedTraining(team.id);
    const first = await ratingService.setRating({
      playerId: player.id,
      eventType: "training",
      eventId: trainingA.id,
      value: 4,
    });
    const second = await ratingService.setRating({
      playerId: player.id,
      eventType: "training",
      eventId: trainingB.id,
      value: 9,
    });

    await ratingService.remove(first.id);

    const remaining = await ratingService.getByPlayer(player.id);
    expect(remaining.map((r) => r.id)).toEqual([second.id]);
  });

  it("deleting a training cascades to its ratings, leaving another training's ratings intact (edge case)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const trainingToDelete = await seedTraining(team.id);
    const trainingToKeep = await seedTraining(team.id);
    await ratingService.setRating({
      playerId: player.id,
      eventType: "training",
      eventId: trainingToDelete.id,
      value: 5,
    });
    await ratingService.setRating({
      playerId: player.id,
      eventType: "training",
      eventId: trainingToKeep.id,
      value: 9,
    });

    await trainingService.delete(trainingToDelete.id);

    expect(await ratingService.getByEvent("training", trainingToDelete.id)).toHaveLength(0);
    expect(await ratingService.getByEvent("training", trainingToKeep.id)).toHaveLength(1);
  });

  it("deleting a game cascades to its ratings (edge case)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const game = await seedGame(team.id);
    await ratingService.setRating({
      playerId: player.id,
      eventType: "game",
      eventId: game.id,
      value: 7,
    });

    await gameService.delete(game.id);

    expect(await ratingService.getByEvent("game", game.id)).toHaveLength(0);
  });

  it("deleting a player cascades to their ratings (edge case)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const training = await seedTraining(team.id);
    await ratingService.setRating({
      playerId: player.id,
      eventType: "training",
      eventId: training.id,
      value: 6,
    });

    await teamService.deletePlayer({ id: player.id, teamId: team.id });

    expect(await ratingService.getByPlayer(player.id)).toHaveLength(0);
  });

  it("remove is a no-op for a non-existent id, leaving other ratings untouched", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const training = await seedTraining(team.id);
    const kept = await ratingService.setRating({
      playerId: player.id,
      eventType: "training",
      eventId: training.id,
      value: 3,
    });

    await ratingService.remove("no-such-id");

    expect(await ratingService.getByPlayer(player.id)).toEqual([kept]);
  });

  it("a recorded rating survives a subsequent read (AC RATE-01.6)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const training = await seedTraining(team.id);
    const rating = await ratingService.setRating({
      playerId: player.id,
      eventType: "training",
      eventId: training.id,
      value: 9,
    });

    const reread = await ratingService.getByPlayer(player.id);

    expect(reread.find((r) => r.id === rating.id)).toEqual(rating);
  });
});
