import { describe, it, expect, afterEach, vi } from "vitest";
import { opponentService } from "../opponentService";
import { apiFetch } from "../../lib/apiClient";
import { gameService } from "../gameService";
import { ConflictError, NotFoundError, ValidationError } from "../../lib/errors";

vi.mock("../../lib/apiClient", () => ({
  apiFetch: vi.fn(),
  apiFetchBlob: vi.fn(),
}));

vi.mock("../gameService", () => ({
  gameService: { getAll: vi.fn(), update: vi.fn() },
}));

describe("opponentService", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("getAll() calls GET /opponents", async () => {
    apiFetch.mockResolvedValueOnce([{ id: "o1", name: "Porto" }]);

    const opponents = await opponentService.getAll();

    expect(apiFetch).toHaveBeenCalledWith("/opponents");
    expect(opponents).toEqual([{ id: "o1", name: "Porto" }]);
  });

  it("create(name) calls POST /opponents with {name} as the body (AC OPP-01.3)", async () => {
    apiFetch.mockResolvedValueOnce({ id: "o1", name: "Porto" });

    const created = await opponentService.create("Porto");

    expect(apiFetch).toHaveBeenCalledWith("/opponents", {
      method: "POST",
      body: { name: "Porto" },
    });
    expect(created).toEqual({ id: "o1", name: "Porto" });
  });

  it("create propagates a typed ConflictError for a duplicate name — no client-side assertNoDuplicate check (F8 AC2)", async () => {
    apiFetch.mockRejectedValueOnce(new ConflictError('An opponent named "Porto" already exists.'));

    await expect(opponentService.create("Porto")).rejects.toBeInstanceOf(ConflictError);
  });

  it("create propagates a typed ValidationError for an empty name", async () => {
    apiFetch.mockRejectedValueOnce(new ValidationError("Opponent name cannot be empty."));

    await expect(opponentService.create("")).rejects.toBeInstanceOf(ValidationError);
  });

  it("update({id, name}) issues exactly one PATCH /opponents/{id} call — no fetch-games-and-update-each cascade loop (F8 AC3)", async () => {
    apiFetch.mockResolvedValueOnce({ id: "o1", name: "FC Porto" });

    const updated = await opponentService.update({ id: "o1", name: "FC Porto" });

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith("/opponents/o1", {
      method: "PATCH",
      body: { name: "FC Porto" },
    });
    expect(updated.name).toBe("FC Porto");
    expect(gameService.getAll).not.toHaveBeenCalled();
    expect(gameService.update).not.toHaveBeenCalled();
  });

  it("update propagates a typed NotFoundError for a missing id", async () => {
    apiFetch.mockRejectedValueOnce(new NotFoundError("Opponent not found"));

    await expect(
      opponentService.update({ id: "no-such-id", name: "Porto" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update propagates a typed ConflictError for a colliding rename", async () => {
    apiFetch.mockRejectedValueOnce(new ConflictError('An opponent named "Braga" already exists.'));

    await expect(
      opponentService.update({ id: "o1", name: "Braga" })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("delete(id) calls DELETE /opponents/{id}", async () => {
    apiFetch.mockResolvedValueOnce(null);

    await opponentService.delete("o1");

    expect(apiFetch).toHaveBeenCalledWith("/opponents/o1", { method: "DELETE" });
  });
});
