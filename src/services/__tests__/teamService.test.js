import { describe, it, expect, vi, afterEach } from "vitest";
import { teamService } from "../teamService";
import { NotFoundError } from "../../lib/errors";

describe("teamService — team methods", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getAll returns the persisted list of teams", async () => {
    const teams = await teamService.getAll();
    expect(Array.isArray(teams)).toBe(true);
    expect(teams.length).toBeGreaterThan(0);
  });

  it("getAll returns non-reference-identical arrays across two calls", async () => {
    const first = await teamService.getAll();
    const second = await teamService.getAll();
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });

  it("getById returns the matching team for a known id", async () => {
    const [seedTeam] = await teamService.getAll();
    const found = await teamService.getById(seedTeam.id);
    expect(found).toEqual(seedTeam);
  });

  it("getById returns null (not a throw) for an unknown id", async () => {
    const result = await teamService.getById("no-such-team");
    expect(result).toBeNull();
  });

  it("getById does not call the global fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("fetch should not be called");
    });

    await teamService.getById("any-id");

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("create assigns an id via newId(), overriding any id supplied by the caller", async () => {
    const created = await teamService.create({
      id: "caller-supplied-id",
      name: "New FC",
      club: "Club X",
      season: "24/25",
      players: [],
    });

    expect(created.id).not.toBe("caller-supplied-id");
    expect(typeof created.id).toBe("string");
    expect(created.id.length).toBeGreaterThan(0);
  });

  it("create persists the new team so a subsequent getAll includes it", async () => {
    const created = await teamService.create({
      name: "Persisted FC",
      club: "Club Y",
      season: "24/25",
      players: [],
    });

    const all = await teamService.getAll();
    expect(all.find((t) => t.id === created.id)).toEqual(created);
  });

  it("update persists and returns the updated team", async () => {
    const [seedTeam] = await teamService.getAll();

    const updated = await teamService.update({
      ...seedTeam,
      name: "Renamed FC",
    });

    expect(updated.name).toBe("Renamed FC");
    const reread = await teamService.getById(seedTeam.id);
    expect(reread.name).toBe("Renamed FC");
  });

  it("update throws a typed NotFoundError (not a bare TypeError) for an unknown id", async () => {
    await expect(
      teamService.update({ id: "no-such-team", name: "X" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update preserves the players field instead of dropping it", async () => {
    const [seedTeam] = await teamService.getAll();
    expect(seedTeam.players.length).toBeGreaterThan(0);

    const updated = await teamService.update({
      ...seedTeam,
      name: "Renamed Again FC",
    });

    expect(updated.players).toEqual(seedTeam.players);
  });

  it("delete persists the removal — a subsequent getAll no longer includes the team", async () => {
    const [seedTeam] = await teamService.getAll();

    await teamService.delete(seedTeam.id);

    const all = await teamService.getAll();
    expect(all.find((t) => t.id === seedTeam.id)).toBeUndefined();
  });
});
