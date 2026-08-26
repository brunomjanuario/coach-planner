import { describe, it, expect, vi, afterEach } from "vitest";
import { teamService } from "../teamService";
import { apiFetch } from "../../lib/apiClient";
import { cardService } from "../cardService";
import { ratingService } from "../ratingService";
import { NotFoundError } from "../../lib/errors";

vi.mock("../../lib/apiClient", () => ({
  apiFetch: vi.fn(),
  apiFetchBlob: vi.fn(),
}));

vi.mock("../cardService", () => ({
  cardService: { removeByPlayer: vi.fn(), removeByGame: vi.fn() },
}));

vi.mock("../ratingService", () => ({
  ratingService: { removeByPlayer: vi.fn(), removeByEvent: vi.fn() },
}));

describe("teamService — team methods", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("getAll() calls GET /teams", async () => {
    apiFetch.mockResolvedValueOnce([{ id: "t1" }]);

    const teams = await teamService.getAll();

    expect(apiFetch).toHaveBeenCalledWith("/teams");
    expect(teams).toEqual([{ id: "t1" }]);
  });

  it("getById(id) calls GET /teams/{id}", async () => {
    apiFetch.mockResolvedValueOnce({ id: "t1", name: "Sub-11" });

    const team = await teamService.getById("t1");

    expect(apiFetch).toHaveBeenCalledWith("/teams/t1");
    expect(team).toEqual({ id: "t1", name: "Sub-11" });
  });

  it("getById propagates a typed NotFoundError for an unknown id", async () => {
    apiFetch.mockRejectedValueOnce(new NotFoundError("Team not found: no-such-team"));

    await expect(teamService.getById("no-such-team")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("create(teamData) calls POST /teams with the team data as the body", async () => {
    const teamData = { name: "New FC", club: "Club X", season: "24/25", players: [] };
    apiFetch.mockResolvedValueOnce({ id: "t2", ...teamData });

    const created = await teamService.create(teamData);

    expect(apiFetch).toHaveBeenCalledWith("/teams", {
      method: "POST",
      body: teamData,
    });
    expect(created).toEqual({ id: "t2", ...teamData });
  });

  it("update(teamData) calls PATCH /teams/{id} with the team data as the body", async () => {
    const teamData = { id: "t1", name: "Renamed FC" };
    apiFetch.mockResolvedValueOnce(teamData);

    const updated = await teamService.update(teamData);

    expect(apiFetch).toHaveBeenCalledWith("/teams/t1", {
      method: "PATCH",
      body: teamData,
    });
    expect(updated).toEqual(teamData);
  });

  it("update propagates a typed NotFoundError for an unknown id", async () => {
    apiFetch.mockRejectedValueOnce(new NotFoundError("Team not found: no-such-team"));

    await expect(
      teamService.update({ id: "no-such-team", name: "X" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("delete(id) calls DELETE /teams/{id}", async () => {
    apiFetch.mockResolvedValueOnce(null);

    await teamService.delete("t1");

    expect(apiFetch).toHaveBeenCalledWith("/teams/t1", { method: "DELETE" });
  });

  it("delete does not call cardService.removeByPlayer or ratingService.removeByPlayer — the backend cascades (F4 AC4)", async () => {
    apiFetch.mockResolvedValueOnce(null);

    await teamService.delete("t1");

    expect(cardService.removeByPlayer).not.toHaveBeenCalled();
    expect(ratingService.removeByPlayer).not.toHaveBeenCalled();
  });
});

describe("teamService — player methods", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("addPlayer(teamId, playerData) calls POST /teams/{teamId}/players", async () => {
    const playerData = { name: "New Player", age: 16, shirtNumber: 99, position: "GK" };
    apiFetch.mockResolvedValueOnce({ id: "p1", teamId: "t1", ...playerData });

    const added = await teamService.addPlayer("t1", playerData);

    expect(apiFetch).toHaveBeenCalledWith("/teams/t1/players", {
      method: "POST",
      body: playerData,
    });
    expect(added).toEqual({ id: "p1", teamId: "t1", ...playerData });
  });

  it("addPlayer propagates a typed NotFoundError for an unknown teamId", async () => {
    apiFetch.mockRejectedValueOnce(new NotFoundError("Team not found: no-such-team"));

    await expect(
      teamService.addPlayer("no-such-team", { name: "X" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("updatePlayer(playerData) calls PATCH /teams/{teamId}/players/{id}", async () => {
    const playerData = { id: "p1", teamId: "t1", name: "Renamed Player" };
    apiFetch.mockResolvedValueOnce(playerData);

    const updated = await teamService.updatePlayer(playerData);

    expect(apiFetch).toHaveBeenCalledWith("/teams/t1/players/p1", {
      method: "PATCH",
      body: playerData,
    });
    expect(updated).toEqual(playerData);
  });

  it("updatePlayer propagates a typed NotFoundError for an unknown teamId", async () => {
    apiFetch.mockRejectedValueOnce(new NotFoundError("Team not found: no-such-team"));

    await expect(
      teamService.updatePlayer({ id: "p1", teamId: "no-such-team", name: "X" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("deletePlayer(playerData) calls DELETE /teams/{teamId}/players/{id}", async () => {
    apiFetch.mockResolvedValueOnce(null);

    await teamService.deletePlayer({ id: "p1", teamId: "t1" });

    expect(apiFetch).toHaveBeenCalledWith("/teams/t1/players/p1", {
      method: "DELETE",
    });
  });

  it("deletePlayer does not call cardService.removeByPlayer or ratingService.removeByPlayer — the backend cascades (F4 AC7)", async () => {
    apiFetch.mockResolvedValueOnce(null);

    await teamService.deletePlayer({ id: "p1", teamId: "t1" });

    expect(cardService.removeByPlayer).not.toHaveBeenCalled();
    expect(ratingService.removeByPlayer).not.toHaveBeenCalled();
  });

  it("deletePlayer propagates a typed NotFoundError for an unknown teamId", async () => {
    apiFetch.mockRejectedValueOnce(new NotFoundError("Team not found: no-such-team"));

    await expect(
      teamService.deletePlayer({ id: "p1", teamId: "no-such-team" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
