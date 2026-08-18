import { describe, it, expect, beforeEach } from "vitest";
import { createFakeApi } from "../fakeApi";
import { NotFoundError, ValidationError, ConflictError, NetworkError } from "../../lib/errors";

let fake;

beforeEach(() => {
  fake = createFakeApi();
});

describe("fakeApi — round trips", () => {
  it("a POST is readable by a later GET", async () => {
    const created = await fake.apiFetch("/teams", {
      method: "POST",
      body: { name: "Sub-15", club: "Benfica", season: "25/26" },
    });
    expect(created.id).toBeTruthy();

    const all = await fake.apiFetch("/teams");
    expect(all.map((t) => t.id)).toContain(created.id);
    expect(all.find((t) => t.id === created.id)).toMatchObject({
      name: "Sub-15",
      club: "Benfica",
    });
  });

  it("a nested player POST is readable via the parent team GET", async () => {
    const team = await fake.apiFetch("/teams", {
      method: "POST",
      body: { name: "Sub-15", club: "Benfica", season: "25/26" },
    });

    const player = await fake.apiFetch(`/teams/${team.id}/players`, {
      method: "POST",
      body: { name: "Ana", shirtNumber: 7 },
    });

    const reread = await fake.apiFetch(`/teams/${team.id}`);
    expect(reread.players.map((p) => p.id)).toEqual([player.id]);
    expect(reread.players[0]).toMatchObject({ name: "Ana", shirtNumber: 7, teamId: team.id });
  });

  it("PATCH is readable by a later GET, and does not reset unrelated fields", async () => {
    await fake.apiFetch("/competitions/competition-1", {
      method: "PATCH",
      body: { name: "Renamed League" },
    });

    const all = await fake.apiFetch("/competitions");
    expect(all.find((c) => c.id === "competition-1").name).toBe("Renamed League");
  });

  it("returns copies, not live references — mutating a returned object does not affect stored state", async () => {
    const teams = await fake.apiFetch("/teams");
    teams[0].name = "Mutated";

    const reread = await fake.apiFetch("/teams");
    expect(reread[0].name).not.toBe("Mutated");
  });
});

describe("fakeApi — query filtering", () => {
  it("GET /trainings?teamId= filters by team", async () => {
    const trainings = await fake.apiFetch("/trainings?teamId=team-1");
    expect(trainings.every((t) => t.teamId === "team-1")).toBe(true);
    expect(trainings.length).toBeGreaterThan(0);
  });

  it("GET /trainings?assigned=false returns only unassigned trainings", async () => {
    await fake.apiFetch("/trainings", {
      method: "POST",
      body: { teamId: null, day: new Date("2025-01-01T10:00:00Z"), duration: 60, exercises: [] },
    });

    const unassigned = await fake.apiFetch("/trainings?assigned=false");
    expect(unassigned.every((t) => t.teamId == null)).toBe(true);
    expect(unassigned.length).toBe(1);
  });

  it("GET /games?status=scheduled and ?status=played partition by result presence", async () => {
    const scheduled = await fake.apiFetch("/games?status=scheduled");
    const played = await fake.apiFetch("/games?status=played");

    expect(scheduled.every((g) => g.usScore == null)).toBe(true);
    expect(played.every((g) => g.usScore != null)).toBe(true);
    expect(scheduled.length + played.length).toBe(
      (await fake.apiFetch("/games")).length
    );
  });

  it("GET /games?assigned=false returns only games with no team", async () => {
    await fake.apiFetch("/games", {
      method: "POST",
      body: { teamId: null, opponent: "Free agent FC", date: new Date(), isHome: true },
    });

    const unassigned = await fake.apiFetch("/games?assigned=false");
    expect(unassigned.every((g) => g.teamId == null)).toBe(true);
    expect(unassigned.length).toBe(1);
  });

  it("GET /cards?gameId= and ?playerId= filter independently", async () => {
    const byGame = await fake.apiFetch("/cards?gameId=game-2");
    expect(byGame.every((c) => c.gameId === "game-2")).toBe(true);
    expect(byGame.length).toBe(1);

    const byPlayer = await fake.apiFetch("/cards?playerId=player-1");
    expect(byPlayer.every((c) => c.playerId === "player-1")).toBe(true);
    expect(byPlayer.length).toBe(1);

    const byOtherPlayer = await fake.apiFetch("/cards?playerId=player-2");
    expect(byOtherPlayer).toHaveLength(0);
  });

  it("GET /ratings?eventType=&eventId= and ?playerId=[&eventType=] filter correctly", async () => {
    await fake.apiFetch("/ratings/training/training-1/players/player-1", {
      method: "PUT",
      body: { value: 8 },
    });
    await fake.apiFetch("/ratings/game/game-2/players/player-1", {
      method: "PUT",
      body: { value: 6 },
    });
    await fake.apiFetch("/ratings/training/training-1/players/player-2", {
      method: "PUT",
      body: { value: 5 },
    });

    const byEvent = await fake.apiFetch("/ratings?eventType=training&eventId=training-1");
    expect(byEvent).toHaveLength(2);
    expect(byEvent.every((r) => r.eventType === "training" && r.eventId === "training-1")).toBe(
      true
    );

    const byPlayer = await fake.apiFetch("/ratings?playerId=player-1");
    expect(byPlayer).toHaveLength(2);

    const byPlayerAndEvent = await fake.apiFetch(
      "/ratings?playerId=player-1&eventType=game"
    );
    expect(byPlayerAndEvent).toHaveLength(1);
    expect(byPlayerAndEvent[0]).toMatchObject({ eventType: "game", value: 6 });
  });
});

describe("fakeApi — date fields", () => {
  it("a Date passed as training.day is stored and returned as an ISO string", async () => {
    const created = await fake.apiFetch("/trainings", {
      method: "POST",
      body: {
        teamId: "team-1",
        day: new Date("2025-03-01T10:00:00Z"),
        duration: 60,
        exercises: [],
      },
    });

    expect(created.day).toBe("2025-03-01T10:00:00.000Z");
    expect(typeof created.day).toBe("string");

    const reread = (await fake.apiFetch("/trainings")).find((t) => t.id === created.id);
    expect(reread.day).toBe("2025-03-01T10:00:00.000Z");
  });

  it("a Date passed as game.date is stored and returned as an ISO string", async () => {
    const created = await fake.apiFetch("/games", {
      method: "POST",
      body: { teamId: "team-1", opponent: "Rivals FC", date: new Date("2026-06-01T18:00:00Z") },
    });

    expect(created.date).toBe("2026-06-01T18:00:00.000Z");
  });
});

describe("fakeApi — training numbering", () => {
  it("assigns a 1-based number per team, computed across the whole team history", async () => {
    const trainings = await fake.apiFetch("/trainings?teamId=team-1");
    expect(trainings).toHaveLength(1);
    expect(trainings[0].number).toBe(1);

    await fake.apiFetch("/trainings", {
      method: "POST",
      body: {
        teamId: "team-1",
        day: new Date("2024-01-01T10:00:00Z"), // earlier than the seeded training
        duration: 45,
        exercises: [],
      },
    });

    const reordered = await fake.apiFetch("/trainings?teamId=team-1");
    const earlier = reordered.find((t) => t.day === "2024-01-01T10:00:00.000Z");
    const later = reordered.find((t) => t.id === "training-1");
    expect(earlier.number).toBe(1);
    expect(later.number).toBe(2);
  });

  it("an unassigned training (no teamId) gets number: null", async () => {
    const created = await fake.apiFetch("/trainings", {
      method: "POST",
      body: { teamId: null, day: new Date(), duration: 30, exercises: [] },
    });

    const reread = (await fake.apiFetch("/trainings")).find((t) => t.id === created.id);
    expect(reread.number).toBeNull();
  });
});

describe("fakeApi — cascades", () => {
  it("deleting a team removes exactly its players' cards and ratings, and nothing else's", async () => {
    // seed has card-1 (player-1, from team-1) and no ratings yet — add one
    // for a player-3 (team-2) so we can prove it survives.
    await fake.apiFetch("/ratings/training/training-1/players/player-1", {
      method: "PUT",
      body: { value: 7 },
    });
    await fake.apiFetch("/ratings/game/game-1/players/player-3", {
      method: "PUT",
      body: { value: 9 },
    });

    await fake.apiFetch("/teams/team-1", { method: "DELETE" });

    const remainingCards = await fake.apiFetch("/cards");
    expect(remainingCards).toHaveLength(0); // card-1 belonged to player-1 on team-1

    const remainingRatings = await fake.apiFetch("/ratings");
    expect(remainingRatings).toHaveLength(1);
    expect(remainingRatings[0].playerId).toBe("player-3");

    await expect(fake.apiFetch("/teams/team-1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("deleting a game removes exactly its own cards and ratings", async () => {
    await fake.apiFetch("/cards", {
      method: "POST",
      body: { playerId: "player-1", gameId: "game-1", type: "yellow" },
    });
    await fake.apiFetch("/ratings/game/game-2/players/player-1", {
      method: "PUT",
      body: { value: 6 },
    });
    await fake.apiFetch("/ratings/game/game-1/players/player-2", {
      method: "PUT",
      body: { value: 4 },
    });

    await fake.apiFetch("/games/game-1", { method: "DELETE" });

    const cards = await fake.apiFetch("/cards");
    expect(cards.every((c) => c.gameId !== "game-1")).toBe(true);
    expect(cards).toHaveLength(1); // card-1 (game-2) survives

    const ratings = await fake.apiFetch("/ratings");
    expect(ratings).toHaveLength(1);
    expect(ratings[0]).toMatchObject({ eventType: "game", eventId: "game-2" });
  });

  it("deleting a training removes exactly its own ratings, leaving game ratings untouched", async () => {
    await fake.apiFetch("/ratings/training/training-1/players/player-1", {
      method: "PUT",
      body: { value: 8 },
    });
    await fake.apiFetch("/ratings/game/game-2/players/player-1", {
      method: "PUT",
      body: { value: 5 },
    });

    await fake.apiFetch("/trainings/training-1", { method: "DELETE" });

    const ratings = await fake.apiFetch("/ratings");
    expect(ratings).toHaveLength(1);
    expect(ratings[0]).toMatchObject({ eventType: "game", eventId: "game-2" });
  });
});

describe("fakeApi — forced failures", () => {
  it("rejects with the given error type for the configured number of calls, then routes normally again", async () => {
    fake.forceFailure("GET", "/teams", new NetworkError("offline"));

    await expect(fake.apiFetch("/teams")).rejects.toBeInstanceOf(NetworkError);
    await expect(fake.apiFetch("/teams")).resolves.toBeInstanceOf(Array);
  });

  it("matches by RegExp against the full path including querystring", async () => {
    fake.forceFailure("GET", /^\/trainings\?teamId=team-1$/, new ValidationError("bad"));

    await expect(fake.apiFetch("/trainings?teamId=team-1")).rejects.toBeInstanceOf(
      ValidationError
    );
    // A different query string on the same route is unaffected.
    await expect(fake.apiFetch("/trainings?teamId=team-2")).resolves.toEqual([]);
  });

  it("supports forcing N consecutive failures via { times }", async () => {
    fake.forceFailure("DELETE", "/cards/card-1", new NotFoundError("gone"), { times: 2 });

    await expect(fake.apiFetch("/cards/card-1", { method: "DELETE" })).rejects.toBeInstanceOf(
      NotFoundError
    );
    await expect(fake.apiFetch("/cards/card-1", { method: "DELETE" })).rejects.toBeInstanceOf(
      NotFoundError
    );
    // Third call routes normally.
    await expect(
      fake.apiFetch("/cards/card-1", { method: "DELETE" })
    ).resolves.toBeNull();
  });
});

describe("fakeApi — standings, ratings null-clear, and reference-list rename cascade", () => {
  it("GET /standings?teamId= returns our row plus rival rows, sorted, and 400s without a teamId", async () => {
    await fake.apiFetch("/standings/rivals", {
      method: "POST",
      body: { name: "Rivals FC", played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 0, goalsAgainst: 3 },
    });

    const table = await fake.apiFetch("/standings?teamId=team-1");
    expect(table.find((r) => r.isOurs)).toMatchObject({ name: "Sub-11", played: 1, points: 3 });
    expect(table.find((r) => r.name === "Rivals FC")).toMatchObject({ points: 0 });

    await expect(fake.apiFetch("/standings")).rejects.toBeInstanceOf(ValidationError);
    await expect(fake.apiFetch("/standings?teamId=no-such-team")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("setRating value: null clears the rating; a real value round-trips as a record with value: 0 too", async () => {
    await fake.apiFetch("/ratings/game/game-2/players/player-1", {
      method: "PUT",
      body: { value: 0 },
    });
    let byPlayer = await fake.apiFetch("/ratings?playerId=player-1&eventType=game");
    expect(byPlayer).toHaveLength(1);
    expect(byPlayer[0].value).toBe(0);

    await fake.apiFetch("/ratings/game/game-2/players/player-1", {
      method: "PUT",
      body: { value: null },
    });
    byPlayer = await fake.apiFetch("/ratings?playerId=player-1&eventType=game");
    expect(byPlayer).toHaveLength(0);
  });

  it("renaming a competition cascades to every game referencing it, in one call", async () => {
    await fake.apiFetch("/competitions/competition-1", {
      method: "PATCH",
      body: { name: "New League Name" },
    });

    const games = await fake.apiFetch("/games");
    expect(games.filter((g) => g.competition === "New League Name").length).toBeGreaterThan(0);
    expect(games.some((g) => g.competition === "District League")).toBe(false);
  });

  it("creating a competition with a duplicate name (case-insensitive) rejects with ConflictError", async () => {
    await expect(
      fake.apiFetch("/competitions", { method: "POST", body: { name: "district league" } })
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("fakeApi — reset", () => {
  it("restores the default seed", async () => {
    await fake.apiFetch("/teams", { method: "POST", body: { name: "Temp", club: "X", season: "1" } });
    expect(await fake.apiFetch("/teams")).toHaveLength(3);

    fake.reset();

    expect(await fake.apiFetch("/teams")).toHaveLength(2);
  });
});
