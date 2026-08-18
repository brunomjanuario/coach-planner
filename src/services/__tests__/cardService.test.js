import { describe, it, expect, afterEach, vi } from "vitest";
import { cardService } from "../cardService";
import { apiFetch } from "../../lib/apiClient";
import { ValidationError, NotFoundError } from "../../lib/errors";

vi.mock("../../lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

describe("cardService", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("getAll() calls GET /cards", async () => {
    apiFetch.mockResolvedValueOnce([{ id: "c1" }]);

    const cards = await cardService.getAll();

    expect(apiFetch).toHaveBeenCalledWith("/cards");
    expect(cards).toEqual([{ id: "c1" }]);
  });

  it("getByGame(gameId) calls GET /cards?gameId=", async () => {
    apiFetch.mockResolvedValueOnce([{ id: "c1", gameId: "g1" }]);

    await cardService.getByGame("g1");

    expect(apiFetch).toHaveBeenCalledWith("/cards?gameId=g1");
  });

  it("getByPlayer(playerId) calls GET /cards?playerId=", async () => {
    apiFetch.mockResolvedValueOnce([{ id: "c1", playerId: "p1" }]);

    await cardService.getByPlayer("p1");

    expect(apiFetch).toHaveBeenCalledWith("/cards?playerId=p1");
  });

  it("record({playerId, gameId, type}) calls POST /cards with that triple as the body (AC CARD-01.1)", async () => {
    apiFetch.mockResolvedValueOnce({ id: "c1", playerId: "p1", gameId: "g1", type: "yellow" });

    const card = await cardService.record({ playerId: "p1", gameId: "g1", type: "yellow" });

    expect(apiFetch).toHaveBeenCalledWith("/cards", {
      method: "POST",
      body: { playerId: "p1", gameId: "g1", type: "yellow" },
    });
    expect(card.type).toBe("yellow");
  });

  it("record propagates a typed ValidationError for an invalid type (AC CARD-01.1, F7 AC2)", async () => {
    apiFetch.mockRejectedValueOnce(new ValidationError("Invalid card type: blue"));

    await expect(
      cardService.record({ playerId: "p1", gameId: "g1", type: "blue" })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("record propagates a typed ValidationError for a player not on the game's team (AC CARD-01.2, F7 AC2)", async () => {
    apiFetch.mockRejectedValueOnce(new ValidationError("player-not-in-game-team"));

    await expect(
      cardService.record({ playerId: "outside-player", gameId: "g1", type: "yellow" })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("record propagates a typed NotFoundError for an unknown gameId", async () => {
    apiFetch.mockRejectedValueOnce(new NotFoundError("Game not found"));

    await expect(
      cardService.record({ playerId: "p1", gameId: "no-such-game", type: "yellow" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("remove(id) calls DELETE /cards/{id} (AC CARD-01.4)", async () => {
    apiFetch.mockResolvedValueOnce(null);

    await cardService.remove("c1");

    expect(apiFetch).toHaveBeenCalledWith("/cards/c1", { method: "DELETE" });
  });

  it("does not export removeByGame or removeByPlayer (F7 AC4)", () => {
    expect(cardService.removeByGame).toBeUndefined();
    expect(cardService.removeByPlayer).toBeUndefined();
  });
});
