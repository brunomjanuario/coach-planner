import { describe, it, expect, afterEach, vi } from "vitest";
import { cardService } from "../cardService";
import { gameService } from "../gameService";
import { teamService } from "../teamService";
import { ValidationError, NotFoundError } from "../../lib/errors";

describe("cardService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function seedTeamAndPlayer() {
    const teams = await teamService.getAll();
    const team = teams.find((t) => t.players.length > 1);
    // players[0] carries a seeded card (seed.js) — use players[1] so tests
    // start from a clean slate.
    return { team, player: team.players[1] };
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

  it("record persists a card with an id assigned via newId() (AC CARD-01.1, CARD-01.3)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const game = await seedGameForTeam(team.id);

    const card = await cardService.record({
      playerId: player.id,
      gameId: game.id,
      type: "yellow",
    });

    expect(typeof card.id).toBe("string");
    expect(card.id.length).toBeGreaterThan(0);
    expect(card).toMatchObject({
      playerId: player.id,
      gameId: game.id,
      type: "yellow",
    });
  });

  it("record accepts a red card type", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const game = await seedGameForTeam(team.id);

    const card = await cardService.record({
      playerId: player.id,
      gameId: game.id,
      type: "red",
    });

    expect(card.type).toBe("red");
  });

  it("record rejects a type other than yellow or red (AC CARD-01.1)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const game = await seedGameForTeam(team.id);

    await expect(
      cardService.record({ playerId: player.id, gameId: game.id, type: "blue" })
    ).rejects.toThrow(ValidationError);
    expect(await cardService.getByGame(game.id)).toHaveLength(0);
  });

  it("record throws NotFoundError for an unknown gameId", async () => {
    const { player } = await seedTeamAndPlayer();

    await expect(
      cardService.record({ playerId: player.id, gameId: "no-such-game", type: "yellow" })
    ).rejects.toThrow(NotFoundError);
  });

  it("record rejects a player not in the game's team (AC CARD-01.2)", async () => {
    const teams = await teamService.getAll();
    const [teamA, teamB] = teams.filter((t) => t.players.length > 0);
    const game = await seedGameForTeam(teamA.id);
    const outsidePlayer = teamB.players[0];

    await expect(
      cardService.record({ playerId: outsidePlayer.id, gameId: game.id, type: "yellow" })
    ).rejects.toThrow(ValidationError);
    expect(await cardService.getByGame(game.id)).toHaveLength(0);
  });

  it("remove deletes exactly one record, leaving the player's others intact (AC CARD-01.4)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const game = await seedGameForTeam(team.id);
    const first = await cardService.record({ playerId: player.id, gameId: game.id, type: "yellow" });
    const second = await cardService.record({ playerId: player.id, gameId: game.id, type: "yellow" });

    await cardService.remove(first.id);

    const remaining = await cardService.getByPlayer(player.id);
    expect(remaining.map((c) => c.id)).toEqual([second.id]);
  });

  it("getByGame returns copies, not live references (AD-004)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const game = await seedGameForTeam(team.id);
    await cardService.record({ playerId: player.id, gameId: game.id, type: "yellow" });

    const first = await cardService.getByGame(game.id);
    const second = await cardService.getByGame(game.id);

    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });

  it("getByPlayer returns copies, not live references (AD-004)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const game = await seedGameForTeam(team.id);
    await cardService.record({ playerId: player.id, gameId: game.id, type: "yellow" });

    const first = await cardService.getByPlayer(player.id);
    const second = await cardService.getByPlayer(player.id);

    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });

  it("deleting a game cascades to its cards (AC CARD-01.5)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const game = await seedGameForTeam(team.id);
    await cardService.record({ playerId: player.id, gameId: game.id, type: "yellow" });

    await gameService.delete(game.id);

    expect(await cardService.getByGame(game.id)).toHaveLength(0);
  });

  it("deleting a game does not remove another game's cards", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const gameToDelete = await seedGameForTeam(team.id);
    const gameToKeep = await seedGameForTeam(team.id);
    await cardService.record({ playerId: player.id, gameId: gameToDelete.id, type: "yellow" });
    const kept = await cardService.record({ playerId: player.id, gameId: gameToKeep.id, type: "red" });

    await gameService.delete(gameToDelete.id);

    expect(await cardService.getByGame(gameToKeep.id)).toEqual([kept]);
  });

  it("deleting a player cascades to their cards (edge case)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const game = await seedGameForTeam(team.id);
    await cardService.record({ playerId: player.id, gameId: game.id, type: "yellow" });

    await teamService.deletePlayer({ id: player.id, teamId: team.id });

    expect(await cardService.getByPlayer(player.id)).toHaveLength(0);
  });

  it("two cards for the same player in the same game are both retained (edge case)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const game = await seedGameForTeam(team.id);

    await cardService.record({ playerId: player.id, gameId: game.id, type: "yellow" });
    await cardService.record({ playerId: player.id, gameId: game.id, type: "yellow" });

    const cards = await cardService.getByPlayer(player.id);
    expect(cards.filter((c) => c.gameId === game.id)).toHaveLength(2);
  });

  it("a recorded card survives a subsequent read (AC CARD-01.6)", async () => {
    const { team, player } = await seedTeamAndPlayer();
    const game = await seedGameForTeam(team.id);
    const card = await cardService.record({ playerId: player.id, gameId: game.id, type: "red" });

    const reread = await cardService.getByPlayer(player.id);

    expect(reread.find((c) => c.id === card.id)).toEqual(card);
  });

  it("getByGame returns an empty array for a game with no cards", async () => {
    const { team } = await seedTeamAndPlayer();
    const game = await seedGameForTeam(team.id);

    expect(await cardService.getByGame(game.id)).toEqual([]);
  });

  it("getByPlayer returns an empty array for a player with no cards", async () => {
    const teams = await teamService.getAll();
    const untouchedPlayer = teams.flatMap((t) => t.players).at(-1);

    expect(await cardService.getByPlayer(untouchedPlayer.id)).toEqual([]);
  });
});
