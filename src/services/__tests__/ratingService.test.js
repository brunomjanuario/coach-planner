import { describe, it, expect, afterEach, vi } from "vitest";
import { ratingService } from "../ratingService";
import { apiFetch } from "../../lib/apiClient";
import { ValidationError } from "../../lib/errors";

vi.mock("../../lib/apiClient", () => ({
  apiFetch: vi.fn(),
  apiFetchBlob: vi.fn(),
}));

describe("ratingService", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("getAll() calls GET /ratings", async () => {
    apiFetch.mockResolvedValueOnce([{ id: "r1" }]);

    const ratings = await ratingService.getAll();

    expect(apiFetch).toHaveBeenCalledWith("/ratings");
    expect(ratings).toEqual([{ id: "r1" }]);
  });

  it("getByEvent(eventType, eventId) calls GET /ratings?eventType=&eventId=", async () => {
    apiFetch.mockResolvedValueOnce([{ id: "r1" }]);

    await ratingService.getByEvent("training", "tr1");

    expect(apiFetch).toHaveBeenCalledWith("/ratings?eventType=training&eventId=tr1");
  });

  it("getByPlayer(playerId) with no eventType calls GET /ratings?playerId=", async () => {
    apiFetch.mockResolvedValueOnce([{ id: "r1" }]);

    await ratingService.getByPlayer("p1");

    expect(apiFetch).toHaveBeenCalledWith("/ratings?playerId=p1");
  });

  it("getByPlayer(playerId, eventType) calls GET /ratings?playerId=&eventType=", async () => {
    apiFetch.mockResolvedValueOnce([{ id: "r1" }]);

    await ratingService.getByPlayer("p1", "game");

    expect(apiFetch).toHaveBeenCalledWith("/ratings?playerId=p1&eventType=game");
  });

  it("setRating({playerId, eventType, eventId, value}) calls PUT /ratings/{eventType}/{eventId}/players/{playerId} with {value} as the body (AC RATE-01.2/RATE-02.3)", async () => {
    apiFetch.mockResolvedValueOnce({
      id: "r1",
      playerId: "p1",
      eventType: "training",
      eventId: "tr1",
      value: 7,
    });

    const rating = await ratingService.setRating({
      playerId: "p1",
      eventType: "training",
      eventId: "tr1",
      value: 7,
    });

    expect(apiFetch).toHaveBeenCalledWith("/ratings/training/tr1/players/p1", {
      method: "PUT",
      body: { value: 7 },
    });
    expect(rating.value).toBe(7);
  });

  it("setRating with value 0 round-trips as a real record, not absent (null-vs-zero trap, F7 independent test)", async () => {
    apiFetch.mockResolvedValueOnce({
      id: "r1",
      playerId: "p1",
      eventType: "training",
      eventId: "tr1",
      value: 0,
    });

    const rating = await ratingService.setRating({
      playerId: "p1",
      eventType: "training",
      eventId: "tr1",
      value: 0,
    });

    expect(apiFetch).toHaveBeenCalledWith("/ratings/training/tr1/players/p1", {
      method: "PUT",
      body: { value: 0 },
    });
    expect(rating.value).toBe(0);
  });

  it("setRating with value null PUTs {value: null} and clears (verified against the live API: 204, no fallback GET+DELETE)", async () => {
    apiFetch.mockResolvedValueOnce(null);

    const result = await ratingService.setRating({
      playerId: "p1",
      eventType: "training",
      eventId: "tr1",
      value: null,
    });

    expect(apiFetch).toHaveBeenCalledWith("/ratings/training/tr1/players/p1", {
      method: "PUT",
      body: { value: null },
    });
    expect(result).toBeNull();
  });

  it("setRating propagates a typed ValidationError for a value outside 0-10 (AC RATE-01.5)", async () => {
    apiFetch.mockRejectedValueOnce(new ValidationError("Invalid rating value: 11"));

    await expect(
      ratingService.setRating({
        playerId: "p1",
        eventType: "training",
        eventId: "tr1",
        value: 11,
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("remove(id) calls DELETE /ratings/{id}", async () => {
    apiFetch.mockResolvedValueOnce(null);

    await ratingService.remove("r1");

    expect(apiFetch).toHaveBeenCalledWith("/ratings/r1", { method: "DELETE" });
  });

  it("does not export removeByEvent or removeByPlayer (F7 AC8)", () => {
    expect(ratingService.removeByEvent).toBeUndefined();
    expect(ratingService.removeByPlayer).toBeUndefined();
  });
});
