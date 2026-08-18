import { describe, it, expect, vi, afterEach } from "vitest";
import { gameService } from "../gameService";
import { apiFetch } from "../../lib/apiClient";
import { cardService } from "../cardService";
import { ratingService } from "../ratingService";
import { NotFoundError } from "../../lib/errors";

vi.mock("../../lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("../cardService", () => ({
  cardService: { removeByGame: vi.fn(), removeByPlayer: vi.fn() },
}));

vi.mock("../ratingService", () => ({
  ratingService: { removeByEvent: vi.fn(), removeByPlayer: vi.fn() },
}));

const RAW_GAME = {
  id: "g1",
  teamId: "team-1",
  opponent: "Benfica",
  date: "2030-01-01T10:00:00.000Z",
  isHome: true,
  competition: "League",
  usScore: null,
  themScore: null,
};

describe("gameService", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("getAll() with no teamId calls GET /games and hydrates date", async () => {
    apiFetch.mockResolvedValueOnce([RAW_GAME]);

    const games = await gameService.getAll();

    expect(apiFetch).toHaveBeenCalledWith("/games");
    expect(games[0].date).toBeInstanceOf(Date);
  });

  it("getAll(teamId) calls GET /games?teamId=", async () => {
    apiFetch.mockResolvedValueOnce([RAW_GAME]);

    await gameService.getAll("team-1");

    expect(apiFetch).toHaveBeenCalledWith("/games?teamId=team-1");
  });

  it("getScheduled() calls GET /games?status=scheduled", async () => {
    apiFetch.mockResolvedValueOnce([RAW_GAME]);

    await gameService.getScheduled();

    expect(apiFetch).toHaveBeenCalledWith("/games?status=scheduled");
  });

  it("getScheduled(teamId) calls GET /games?status=scheduled&teamId=", async () => {
    apiFetch.mockResolvedValueOnce([RAW_GAME]);

    await gameService.getScheduled("team-1");

    expect(apiFetch).toHaveBeenCalledWith("/games?status=scheduled&teamId=team-1");
  });

  it("getPlayed() calls GET /games?status=played", async () => {
    apiFetch.mockResolvedValueOnce([{ ...RAW_GAME, usScore: 2, themScore: 1 }]);

    await gameService.getPlayed();

    expect(apiFetch).toHaveBeenCalledWith("/games?status=played");
  });

  it("getPlayed(teamId) calls GET /games?status=played&teamId=", async () => {
    apiFetch.mockResolvedValueOnce([RAW_GAME]);

    await gameService.getPlayed("team-1");

    expect(apiFetch).toHaveBeenCalledWith("/games?status=played&teamId=team-1");
  });

  it("getUnassigned() calls GET /games?assigned=false", async () => {
    apiFetch.mockResolvedValueOnce([{ ...RAW_GAME, teamId: null }]);

    await gameService.getUnassigned();

    expect(apiFetch).toHaveBeenCalledWith("/games?assigned=false");
  });

  it("create(gameData) calls POST /games with the game data as the body", async () => {
    const gameData = {
      teamId: "team-1",
      opponent: "Benfica",
      date: new Date("2030-01-01T10:00:00Z"),
      isHome: true,
      competition: "League",
    };
    apiFetch.mockResolvedValueOnce({ ...RAW_GAME, ...gameData, date: RAW_GAME.date });

    const created = await gameService.create(gameData);

    expect(apiFetch).toHaveBeenCalledWith("/games", { method: "POST", body: gameData });
    expect(created.date).toBeInstanceOf(Date);
  });

  it("update(gameData) calls PATCH /games/{id} with the game data as the body", async () => {
    const gameData = { id: "g1", opponent: "Porto" };
    apiFetch.mockResolvedValueOnce({ ...RAW_GAME, opponent: "Porto" });

    const updated = await gameService.update(gameData);

    expect(apiFetch).toHaveBeenCalledWith("/games/g1", { method: "PATCH", body: gameData });
    expect(updated.opponent).toBe("Porto");
  });

  it("update propagates a typed NotFoundError for an unknown id", async () => {
    apiFetch.mockRejectedValueOnce(new NotFoundError("Game not found"));

    await expect(
      gameService.update({ id: "no-such-game", opponent: "X" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("delete(id) calls DELETE /games/{id}", async () => {
    apiFetch.mockResolvedValueOnce(null);

    await gameService.delete("g1");

    expect(apiFetch).toHaveBeenCalledWith("/games/g1", { method: "DELETE" });
  });

  it("delete does not call cardService.removeByGame or ratingService.removeByEvent — the backend cascades (F6 AC6)", async () => {
    apiFetch.mockResolvedValueOnce(null);

    await gameService.delete("g1");

    expect(cardService.removeByGame).not.toHaveBeenCalled();
    expect(ratingService.removeByEvent).not.toHaveBeenCalled();
  });

  it("recordResult(id, {us, them}) calls PUT /games/{id}/result with {us, them} as the body", async () => {
    apiFetch.mockResolvedValueOnce({ ...RAW_GAME, usScore: 3, themScore: 1 });

    const recorded = await gameService.recordResult("g1", { us: 3, them: 1 });

    expect(apiFetch).toHaveBeenCalledWith("/games/g1/result", {
      method: "PUT",
      body: { us: 3, them: 1 },
    });
    expect(recorded.usScore).toBe(3);
    expect(recorded.themScore).toBe(1);
  });

  it("recordResult can persist a 0-0 scoreline (null-vs-zero trap)", async () => {
    apiFetch.mockResolvedValueOnce({ ...RAW_GAME, usScore: 0, themScore: 0 });

    const recorded = await gameService.recordResult("g1", { us: 0, them: 0 });

    expect(recorded.usScore).toBe(0);
    expect(recorded.themScore).toBe(0);
  });

  it("recordResult propagates a typed NotFoundError for an unknown id", async () => {
    apiFetch.mockRejectedValueOnce(new NotFoundError("Game not found"));

    await expect(
      gameService.recordResult("no-such-game", { us: 1, them: 0 })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("clearResult(id) calls DELETE /games/{id}/result", async () => {
    apiFetch.mockResolvedValueOnce({ ...RAW_GAME, usScore: null, themScore: null });

    const cleared = await gameService.clearResult("g1");

    expect(apiFetch).toHaveBeenCalledWith("/games/g1/result", { method: "DELETE" });
    expect(cleared.usScore).toBeNull();
    expect(cleared.themScore).toBeNull();
  });

  it("clearResult propagates a typed NotFoundError for an unknown id", async () => {
    apiFetch.mockRejectedValueOnce(new NotFoundError("Game not found"));

    await expect(gameService.clearResult("no-such-game")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});
