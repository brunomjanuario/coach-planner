import { describe, it, expect, afterEach, vi } from "vitest";
import { competitionService } from "../competitionService";
import { apiFetch } from "../../lib/apiClient";
import { gameService } from "../gameService";
import { ConflictError, NotFoundError, ValidationError } from "../../lib/errors";

vi.mock("../../lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("../gameService", () => ({
  gameService: { getAll: vi.fn(), update: vi.fn() },
}));

describe("competitionService", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("getAll() calls GET /competitions", async () => {
    apiFetch.mockResolvedValueOnce([{ id: "c1", name: "Cup" }]);

    const competitions = await competitionService.getAll();

    expect(apiFetch).toHaveBeenCalledWith("/competitions");
    expect(competitions).toEqual([{ id: "c1", name: "Cup" }]);
  });

  it("create(name) calls POST /competitions with {name} as the body (AC COMP-01.3)", async () => {
    apiFetch.mockResolvedValueOnce({ id: "c1", name: "Cup" });

    const created = await competitionService.create("Cup");

    expect(apiFetch).toHaveBeenCalledWith("/competitions", {
      method: "POST",
      body: { name: "Cup" },
    });
    expect(created).toEqual({ id: "c1", name: "Cup" });
  });

  it("create propagates a typed ConflictError for a duplicate name — no client-side assertNoDuplicate check (F8 AC2)", async () => {
    apiFetch.mockRejectedValueOnce(new ConflictError('A competition named "Cup" already exists.'));

    await expect(competitionService.create("Cup")).rejects.toBeInstanceOf(ConflictError);
  });

  it("create propagates a typed ValidationError for an empty name", async () => {
    apiFetch.mockRejectedValueOnce(new ValidationError("Competition name cannot be empty."));

    await expect(competitionService.create("")).rejects.toBeInstanceOf(ValidationError);
  });

  it("update({id, name}) issues exactly one PATCH /competitions/{id} call — no fetch-games-and-update-each cascade loop (F8 AC3)", async () => {
    apiFetch.mockResolvedValueOnce({ id: "c1", name: "Cup Renamed" });

    const updated = await competitionService.update({ id: "c1", name: "Cup Renamed" });

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith("/competitions/c1", {
      method: "PATCH",
      body: { name: "Cup Renamed" },
    });
    expect(updated.name).toBe("Cup Renamed");
    expect(gameService.getAll).not.toHaveBeenCalled();
    expect(gameService.update).not.toHaveBeenCalled();
  });

  it("update propagates a typed NotFoundError for a missing id", async () => {
    apiFetch.mockRejectedValueOnce(new NotFoundError("Competition not found"));

    await expect(
      competitionService.update({ id: "no-such-id", name: "Cup" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update propagates a typed ConflictError for a colliding rename", async () => {
    apiFetch.mockRejectedValueOnce(new ConflictError('A competition named "League" already exists.'));

    await expect(
      competitionService.update({ id: "c1", name: "League" })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("delete(id) calls DELETE /competitions/{id}", async () => {
    apiFetch.mockResolvedValueOnce(null);

    await competitionService.delete("c1");

    expect(apiFetch).toHaveBeenCalledWith("/competitions/c1", { method: "DELETE" });
  });
});
