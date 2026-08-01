import { describe, it, expect, vi, afterEach } from "vitest";
import { gameService } from "../gameService";
import { teamService } from "../teamService";
import { NotFoundError } from "../../lib/errors";

describe("gameService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getAll returns the persisted list of games", async () => {
    const games = await gameService.getAll();
    expect(Array.isArray(games)).toBe(true);
    expect(games.length).toBeGreaterThan(0);
  });

  it("getAll returns non-reference-identical arrays across two calls (AD-004)", async () => {
    const first = await gameService.getAll();
    const second = await gameService.getAll();
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });

  it("getAll(teamId) filters to only that team's games", async () => {
    const [seedTeam] = await teamService.getAll();
    const created = await gameService.create({
      teamId: "some-other-team",
      opponent: "Rivals FC",
      date: new Date("2030-01-01T10:00:00Z"),
      isHome: true,
      competition: "Cup",
    });

    const filtered = await gameService.getAll(seedTeam.id);

    expect(filtered.every((game) => game.teamId === seedTeam.id)).toBe(true);
    expect(filtered.find((game) => game.id === created.id)).toBeUndefined();
  });

  it("create assigns an id via newId() and persists (AC GAME-01.4)", async () => {
    const created = await gameService.create({
      teamId: "team-1",
      opponent: "Benfica",
      date: new Date("2030-01-01T10:00:00Z"),
      isHome: true,
      competition: "League",
    });

    expect(typeof created.id).toBe("string");
    expect(created.id.length).toBeGreaterThan(0);
    const all = await gameService.getAll();
    expect(all.find((g) => g.id === created.id)).toEqual(created);
  });

  it("create forces usScore and themScore to null even if provided (AC GAME-01.5)", async () => {
    const created = await gameService.create({
      teamId: "team-1",
      opponent: "Benfica",
      date: new Date("2030-01-01T10:00:00Z"),
      isHome: true,
      competition: "League",
      usScore: 5,
      themScore: 3,
    });

    expect(created.usScore).toBeNull();
    expect(created.themScore).toBeNull();
  });

  it("update takes a whole game object, persists and returns it", async () => {
    const [seedGame] = await gameService.getAll();

    const updated = await gameService.update({
      ...seedGame,
      opponent: "Porto",
    });

    expect(updated.opponent).toBe("Porto");
    const all = await gameService.getAll();
    expect(all.find((g) => g.id === seedGame.id).opponent).toBe("Porto");
  });

  it("update throws a typed NotFoundError for an unknown id", async () => {
    await expect(
      gameService.update({ id: "no-such-game", opponent: "X" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("delete persists the removal — a subsequent getAll no longer includes the game", async () => {
    const [seedGame] = await gameService.getAll();

    await gameService.delete(seedGame.id);

    const all = await gameService.getAll();
    expect(all.find((g) => g.id === seedGame.id)).toBeUndefined();
  });

  it("recordResult persists both scores", async () => {
    const created = await gameService.create({
      teamId: "team-1",
      opponent: "Benfica",
      date: new Date("2030-01-01T10:00:00Z"),
      isHome: true,
      competition: "League",
    });

    const recorded = await gameService.recordResult(created.id, { us: 3, them: 1 });

    expect(recorded.usScore).toBe(3);
    expect(recorded.themScore).toBe(1);
    const all = await gameService.getAll();
    const persisted = all.find((g) => g.id === created.id);
    expect(persisted.usScore).toBe(3);
    expect(persisted.themScore).toBe(1);
  });

  it("recordResult can persist a 0-0 scoreline (null-vs-zero trap)", async () => {
    const created = await gameService.create({
      teamId: "team-1",
      opponent: "Benfica",
      date: new Date("2030-01-01T10:00:00Z"),
      isHome: true,
      competition: "League",
    });

    const recorded = await gameService.recordResult(created.id, { us: 0, them: 0 });

    expect(recorded.usScore).toBe(0);
    expect(recorded.themScore).toBe(0);
  });

  it("recordResult throws NotFoundError for an unknown id", async () => {
    await expect(
      gameService.recordResult("no-such-game", { us: 1, them: 0 })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("clearResult sets usScore and themScore back to null (AC GAME-06.5)", async () => {
    const created = await gameService.create({
      teamId: "team-1",
      opponent: "Benfica",
      date: new Date("2030-01-01T10:00:00Z"),
      isHome: true,
      competition: "League",
    });
    await gameService.recordResult(created.id, { us: 2, them: 2 });

    const cleared = await gameService.clearResult(created.id);

    expect(cleared.usScore).toBeNull();
    expect(cleared.themScore).toBeNull();
  });

  it("clearResult throws NotFoundError for an unknown id", async () => {
    await expect(gameService.clearResult("no-such-game")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("getScheduled returns only games with no result (AC GAME-04.1)", async () => {
    const scheduled = await gameService.getScheduled();
    const all = await gameService.getAll();
    const expectedIds = all
      .filter((g) => g.usScore == null || g.themScore == null)
      .map((g) => g.id);

    expect(scheduled.map((g) => g.id).sort()).toEqual(expectedIds.sort());
  });

  it("getPlayed returns only games with both scores recorded (AC GAME-04.1)", async () => {
    const played = await gameService.getPlayed();

    expect(played.every((g) => g.usScore != null && g.themScore != null)).toBe(
      true
    );
    expect(played.length).toBeGreaterThan(0);
  });

  it("getPlayed treats a 0-0 game as played, not scheduled (null-vs-zero trap)", async () => {
    const created = await gameService.create({
      teamId: "team-1",
      opponent: "Benfica",
      date: new Date("2030-01-01T10:00:00Z"),
      isHome: true,
      competition: "League",
    });
    await gameService.recordResult(created.id, { us: 0, them: 0 });

    const played = await gameService.getPlayed();
    const scheduled = await gameService.getScheduled();

    expect(played.find((g) => g.id === created.id)).toBeTruthy();
    expect(scheduled.find((g) => g.id === created.id)).toBeUndefined();
  });

  it("a postponed fixture (past date, no result) still counts as scheduled, not played (AC: played vs scheduled derived from result, not date)", async () => {
    const created = await gameService.create({
      teamId: "team-1",
      opponent: "Benfica",
      date: new Date("2020-01-01T10:00:00Z"),
      isHome: true,
      competition: "League",
    });

    const scheduled = await gameService.getScheduled();
    const played = await gameService.getPlayed();

    expect(scheduled.find((g) => g.id === created.id)).toBeTruthy();
    expect(played.find((g) => g.id === created.id)).toBeUndefined();
  });

  it("getUnassigned returns games with a null teamId", async () => {
    const created = await gameService.create({
      teamId: null,
      opponent: "Benfica",
      date: new Date("2030-01-01T10:00:00Z"),
      isHome: true,
      competition: "League",
    });

    const unassigned = await gameService.getUnassigned();

    expect(unassigned.find((g) => g.id === created.id)).toBeTruthy();
  });

  it("getUnassigned returns games whose teamId matches no existing team (dangling-reference edge case)", async () => {
    const created = await gameService.create({
      teamId: "no-such-team",
      opponent: "Benfica",
      date: new Date("2030-01-01T10:00:00Z"),
      isHome: true,
      competition: "League",
    });

    const unassigned = await gameService.getUnassigned();

    expect(unassigned.find((g) => g.id === created.id)).toBeTruthy();
  });

  it("getUnassigned does not return a game whose teamId matches an existing team", async () => {
    const [existingTeam] = await teamService.getAll();
    const created = await gameService.create({
      teamId: existingTeam.id,
      opponent: "Benfica",
      date: new Date("2030-01-01T10:00:00Z"),
      isHome: true,
      competition: "League",
    });

    const unassigned = await gameService.getUnassigned();

    expect(unassigned.find((g) => g.id === created.id)).toBeUndefined();
  });

  it("orders games with the same date deterministically across repeated calls (edge case)", async () => {
    const sameDate = new Date("2030-06-01T10:00:00Z");
    await gameService.create({
      teamId: "team-1",
      opponent: "Team A",
      date: sameDate,
      isHome: true,
      competition: "League",
    });
    await gameService.create({
      teamId: "team-1",
      opponent: "Team B",
      date: sameDate,
      isHome: true,
      competition: "League",
    });

    const first = await gameService.getAll();
    const second = await gameService.getAll();

    expect(first.map((g) => g.id)).toEqual(second.map((g) => g.id));
  });
});
