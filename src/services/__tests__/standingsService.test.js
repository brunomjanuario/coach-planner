import { describe, it, expect, afterEach, vi } from "vitest";
import { standingsService } from "../standingsService";
import { apiFetch } from "../../lib/apiClient";
import { NotFoundError, ValidationError } from "../../lib/errors";

vi.mock("../../lib/apiClient", () => ({
  apiFetch: vi.fn(),
  apiFetchBlob: vi.fn(),
}));

function validRow(overrides = {}) {
  return {
    name: "Benfica B",
    played: 4,
    won: 3,
    drawn: 1,
    lost: 0,
    goalsFor: 10,
    goalsAgainst: 2,
    ...overrides,
  };
}

describe("standingsService", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("getAll() calls GET /standings/rivals", async () => {
    apiFetch.mockResolvedValueOnce([{ id: "r1", ...validRow() }]);

    const rows = await standingsService.getAll();

    expect(apiFetch).toHaveBeenCalledWith("/standings/rivals");
    expect(rows).toEqual([{ id: "r1", ...validRow() }]);
  });

  it("getTable(teamId) calls GET /standings?teamId= and returns the server's rows unmodified (T17)", async () => {
    const serverRows = [
      {
        name: "U19",
        played: 4,
        won: 3,
        drawn: 1,
        lost: 0,
        goalsFor: 10,
        goalsAgainst: 2,
        goalDifference: 8,
        points: 10,
        isOurs: true,
      },
      {
        name: "Benfica B",
        played: 4,
        won: 2,
        drawn: 0,
        lost: 2,
        goalsFor: 6,
        goalsAgainst: 6,
        goalDifference: 0,
        points: 6,
        isOurs: false,
      },
    ];
    apiFetch.mockResolvedValueOnce(serverRows);

    const rows = await standingsService.getTable("team-1");

    expect(apiFetch).toHaveBeenCalledWith("/standings?teamId=team-1");
    expect(rows).toBe(serverRows);
  });

  it("create(rowData) calls POST /standings/rivals with the row as the body (AC GAME-09.1)", async () => {
    apiFetch.mockResolvedValueOnce({ id: "r1", ...validRow() });

    const created = await standingsService.create(validRow());

    expect(apiFetch).toHaveBeenCalledWith("/standings/rivals", {
      method: "POST",
      body: validRow(),
    });
    expect(created).toEqual({ id: "r1", ...validRow() });
  });

  it("create throws ValidationError locally (no apiFetch call) when won + drawn + lost does not sum to played (AC GAME-09.3)", async () => {
    await expect(
      standingsService.create(validRow({ played: 5, won: 3, drawn: 1, lost: 0 }))
    ).rejects.toBeInstanceOf(ValidationError);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("create's ValidationError message names the discrepancy (AC GAME-09.3)", async () => {
    await expect(
      standingsService.create(validRow({ played: 5, won: 3, drawn: 1, lost: 0 }))
    ).rejects.toThrow(/4.*5|5.*4/);
  });

  it("create rejects a negative figure locally (no apiFetch call)", async () => {
    await expect(
      standingsService.create(validRow({ goalsFor: -1 }))
    ).rejects.toBeInstanceOf(ValidationError);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("create rejects a negative played/won/drawn/lost/goalsAgainst figure too", async () => {
    await expect(
      standingsService.create(validRow({ lost: -1, played: 3 }))
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("create propagates the server's own ValidationError (400) when the client-side check passes but the server disagrees", async () => {
    apiFetch.mockRejectedValueOnce(new ValidationError("Server-side mismatch."));

    await expect(standingsService.create(validRow())).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  it("update(rowData) calls PATCH /standings/rivals/{id} with the row as the body (AC GAME-09.4)", async () => {
    const rowData = { id: "r1", ...validRow(), goalsFor: 20 };
    apiFetch.mockResolvedValueOnce(rowData);

    const updated = await standingsService.update(rowData);

    expect(apiFetch).toHaveBeenCalledWith("/standings/rivals/r1", {
      method: "PATCH",
      body: rowData,
    });
    expect(updated.goalsFor).toBe(20);
  });

  it("update propagates a typed NotFoundError for an unknown id", async () => {
    apiFetch.mockRejectedValueOnce(new NotFoundError("Rival row not found"));

    await expect(
      standingsService.update(validRow({ id: "no-such-row" }))
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update throws ValidationError locally before ever calling apiFetch when the sum is wrong", async () => {
    await expect(
      standingsService.update(
        validRow({ id: "no-such-row", played: 5, won: 3, drawn: 1, lost: 0 })
      )
    ).rejects.toBeInstanceOf(ValidationError);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("delete(id) calls DELETE /standings/rivals/{id}", async () => {
    apiFetch.mockResolvedValueOnce(null);

    await standingsService.delete("r1");

    expect(apiFetch).toHaveBeenCalledWith("/standings/rivals/r1", {
      method: "DELETE",
    });
  });
});
