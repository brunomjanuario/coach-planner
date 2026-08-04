import { describe, it, expect } from "vitest";
import {
  counts,
  topScorers,
  topCarded,
  topTeamGames,
  topRated,
  nextEvent,
  MAX_LEADER_ENTRIES,
} from "../dashboardStats";

const teams = [
  { id: 1, club: "Amadora", name: "Sub-11" },
  { id: 2, club: "Areias", name: "Sub-19" },
];

describe("counts", () => {
  it("returns the number of teams (AC DASH-01.1)", () => {
    expect(counts({ teams, trainings: [], games: [] }).teams).toBe(2);
  });

  it("splits trainings into past and upcoming (AC DASH-01.2)", () => {
    const trainings = [
      { id: 1, teamId: 1, day: new Date(Date.now() - 86_400_000) },
      { id: 2, teamId: 1, day: new Date(Date.now() + 86_400_000) },
    ];

    expect(counts({ teams, trainings, games: [] }).trainings).toEqual({
      total: 2,
      past: 1,
      upcoming: 1,
    });
  });

  it("splits games into played and upcoming (AC DASH-01.3)", () => {
    const games = [
      { id: 1, teamId: 1, usScore: 2, themScore: 1 },
      { id: 2, teamId: 1, usScore: null, themScore: null },
    ];

    expect(counts({ teams, trainings: [], games }).games).toEqual({
      total: 2,
      played: 1,
      upcoming: 1,
    });
  });

  it("scopes every count to one team when teamId is given (AC DASH-08.1)", () => {
    const trainings = [
      { id: 1, teamId: 1, day: new Date() },
      { id: 2, teamId: 2, day: new Date() },
    ];
    const games = [
      { id: 1, teamId: 1, usScore: 1, themScore: 0 },
      { id: 2, teamId: 2, usScore: 1, themScore: 0 },
    ];

    const result = counts({ teams, trainings, games }, 1);

    expect(result.teams).toBe(1);
    expect(result.trainings.total).toBe(1);
    expect(result.games.total).toBe(1);
  });

  it("excludes an unassigned training/game when filtered, counts it when unfiltered (edge case)", () => {
    const trainings = [{ id: 1, teamId: null, day: new Date() }];
    const games = [{ id: 1, teamId: null, usScore: null, themScore: null }];

    expect(counts({ teams, trainings, games }, 1).trainings.total).toBe(0);
    expect(counts({ teams, trainings, games }, 1).games.total).toBe(0);
    expect(counts({ teams, trainings, games }).trainings.total).toBe(1);
    expect(counts({ teams, trainings, games }).games.total).toBe(1);
  });

  it("returns all zeros, never NaN or undefined, for empty input", () => {
    expect(counts({ teams: [], trainings: [], games: [] })).toEqual({
      teams: 0,
      trainings: { total: 0, past: 0, upcoming: 0 },
      games: { total: 0, played: 0, upcoming: 0 },
    });
  });

  it("does not mutate its input collections (AD-004)", () => {
    const trainings = [{ id: 1, teamId: 1, day: new Date() }];
    const games = [{ id: 1, teamId: 1, usScore: 1, themScore: 0 }];
    const before = JSON.parse(JSON.stringify({ teams, trainings, games }));

    counts({ teams, trainings, games }, 1);

    expect(JSON.parse(JSON.stringify({ teams, trainings, games }))).toEqual(before);
  });
});

describe("topScorers", () => {
  it("returns the top n players by goals (AC DASH-05.1)", () => {
    const players = [
      { id: 1, name: "Ana", goals: 10 },
      { id: 2, name: "Beatriz", goals: 5 },
      { id: 3, name: "Carla", goals: 1 },
    ];

    expect(topScorers(players, 2).entries).toEqual([
      { id: 1, name: "Ana", value: 10, rank: 1 },
      { id: 2, name: "Beatriz", value: 5, rank: 2 },
    ]);
  });

  it("excludes zero-goal players (AC DASH-05.6)", () => {
    const players = [
      { id: 1, name: "Ana", goals: 0 },
      { id: 2, name: "Beatriz", goals: 3 },
    ];

    expect(topScorers(players, 3).entries).toEqual([
      { id: 2, name: "Beatriz", value: 3, rank: 1 },
    ]);
  });

  it("shows every tied player, ordered deterministically by name (AC DASH-05.4)", () => {
    const players = [
      { id: 1, name: "Carla", goals: 5 },
      { id: 2, name: "Ana", goals: 5 },
      { id: 3, name: "Beatriz", goals: 2 },
    ];

    expect(topScorers(players, 1).entries).toEqual([
      { id: 2, name: "Ana", value: 5, rank: 1 },
      { id: 1, name: "Carla", value: 5, rank: 1 },
    ]);
  });

  it("returns only the non-zero players when fewer than n qualify, never padding (AC DASH-05.6)", () => {
    const players = [{ id: 1, name: "Ana", goals: 2 }];

    expect(topScorers(players, 3).entries).toHaveLength(1);
  });

  it("returns an empty entries array with zero overflow when every player is scoreless (edge case)", () => {
    const players = [{ id: 1, name: "Ana", goals: 0 }];

    expect(topScorers(players, 3)).toEqual({ entries: [], overflow: 0 });
  });

  it("does not mutate the players input (AD-004)", () => {
    const players = [{ id: 1, name: "Ana", goals: 5 }];
    const before = JSON.parse(JSON.stringify(players));

    topScorers(players, 3);

    expect(JSON.parse(JSON.stringify(players))).toEqual(before);
  });
});

describe("topCarded", () => {
  it("ranks players by total cards with yellows and reds kept separate (AC DASH-05.3)", () => {
    const players = [
      { id: 1, name: "Ana" },
      { id: 2, name: "Beatriz" },
    ];
    const cards = [
      { id: 1, playerId: 1, gameId: 1, type: "yellow" },
      { id: 2, playerId: 1, gameId: 1, type: "yellow" },
      { id: 3, playerId: 1, gameId: 2, type: "red" },
      { id: 4, playerId: 2, gameId: 1, type: "yellow" },
    ];

    expect(topCarded(players, cards, 2).entries).toEqual([
      { id: 1, name: "Ana", value: { yellow: 2, red: 1 }, rank: 1 },
      { id: 2, name: "Beatriz", value: { yellow: 1, red: 0 }, rank: 2 },
    ]);
  });

  it("excludes players with zero cards", () => {
    const players = [
      { id: 1, name: "Ana" },
      { id: 2, name: "Beatriz" },
    ];
    const cards = [{ id: 1, playerId: 1, gameId: 1, type: "yellow" }];

    expect(topCarded(players, cards, 3).entries).toEqual([
      { id: 1, name: "Ana", value: { yellow: 1, red: 0 }, rank: 1 },
    ]);
  });
});

describe("topTeamGames", () => {
  it("ranks teams by count of played games, labelled by team rather than player (AC DASH-05.2)", () => {
    const games = [
      { id: 1, teamId: 1, usScore: 1, themScore: 0 },
      { id: 2, teamId: 1, usScore: 0, themScore: 0 },
      { id: 3, teamId: 2, usScore: null, themScore: null },
    ];

    expect(topTeamGames(teams, games, 2).entries).toEqual([
      { id: 1, name: "Amadora Sub-11", value: 2, rank: 1 },
    ]);
  });

  it("excludes teams with zero played games (edge case)", () => {
    expect(topTeamGames(teams, [], 3)).toEqual({ entries: [], overflow: 0 });
  });
});

describe("topRated", () => {
  it("ranks players by average rating (AC DASH-07.1)", () => {
    const players = [
      { id: 1, name: "Ana" },
      { id: 2, name: "Beatriz" },
    ];
    const ratings = [
      { playerId: 1, value: 8 },
      { playerId: 1, value: 6 },
      { playerId: 2, value: 4 },
    ];

    expect(topRated(players, ratings, 2).entries).toEqual([
      { id: 1, name: "Ana", value: 7, rank: 1 },
      { id: 2, name: "Beatriz", value: 4, rank: 2 },
    ]);
  });

  it("excludes an unrated player rather than ranking them as 0 (AC DASH-07.2, null-vs-zero trap)", () => {
    const players = [
      { id: 1, name: "Ana" },
      { id: 2, name: "Beatriz" },
    ];
    const ratings = [{ playerId: 1, value: 5 }];

    expect(topRated(players, ratings, 3).entries).toEqual([
      { id: 1, name: "Ana", value: 5, rank: 1 },
    ]);
  });

  it("includes a player whose genuine average is exactly 0, unlike the other leader tiles (null-vs-zero trap)", () => {
    const players = [{ id: 1, name: "Ana" }];
    const ratings = [{ playerId: 1, value: 0 }];

    expect(topRated(players, ratings, 3).entries).toEqual([
      { id: 1, name: "Ana", value: 0, rank: 1 },
    ]);
  });

  it("returns an empty result when no ratings exist (AC DASH-07.3)", () => {
    const players = [{ id: 1, name: "Ana" }];

    expect(topRated(players, [], 3)).toEqual({ entries: [], overflow: 0 });
  });
});

describe("leader-tile tie cap", () => {
  it("caps a 20-way tie at MAX_LEADER_ENTRIES and reports the overflow (edge case)", () => {
    const players = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: `Player ${String(i + 1).padStart(2, "0")}`,
      goals: 3,
    }));

    const result = topScorers(players, 3);

    expect(result.entries).toHaveLength(MAX_LEADER_ENTRIES);
    expect(result.overflow).toBe(20 - MAX_LEADER_ENTRIES);
    expect(result.entries.every((e) => e.rank === 1)).toBe(true);
  });
});

describe("standard competition ranking", () => {
  it("gives a rank tier that skips ahead by the size of the preceding tie", () => {
    const players = [
      { id: 1, name: "Ana", goals: 5 },
      { id: 2, name: "Beatriz", goals: 5 },
      { id: 3, name: "Carla", goals: 2 },
    ];

    const result = topScorers(players, 3);

    expect(result.entries.map((e) => e.rank)).toEqual([1, 1, 3]);
  });
});

describe("nextEvent", () => {
  it("returns the soonest future event across trainings and games (AC DASH-06.1, DASH-06.2)", () => {
    const trainings = [
      { id: 1, teamId: 1, day: new Date(Date.now() + 7 * 86_400_000) },
    ];
    const games = [
      { id: 1, teamId: 1, opponent: "Benfica", date: new Date(Date.now() + 86_400_000) },
    ];

    const result = nextEvent(trainings, games, teams);

    expect(result.type).toBe("game");
    expect(result.sourceId).toBe(1);
    expect(result.teamName).toBe("Amadora Sub-11");
  });

  it("skips an invalid date and returns the following event (edge case)", () => {
    const trainings = [
      { id: 1, teamId: 1, day: "not-a-date" },
      { id: 2, teamId: 1, day: new Date(Date.now() + 86_400_000) },
    ];

    const result = nextEvent(trainings, [], teams);

    expect(result.sourceId).toBe(2);
  });

  it("resolves a tied timestamp deterministically (AC DASH-06.5)", () => {
    const sameTime = new Date(Date.now() + 86_400_000);
    const trainings = [{ id: 5, teamId: 1, day: sameTime }];
    const games = [{ id: 5, teamId: 1, opponent: "Benfica", date: sameTime }];

    expect(nextEvent(trainings, games, teams).type).toBe("game");
  });

  it("returns null when no future events exist (AC DASH-06.4)", () => {
    const trainings = [{ id: 1, teamId: 1, day: new Date(Date.now() - 86_400_000) }];

    expect(nextEvent(trainings, [], teams)).toBeNull();
  });

  it("does not mutate the trainings or games input (AD-004)", () => {
    const trainings = [{ id: 1, teamId: 1, day: new Date(Date.now() + 86_400_000) }];
    const games = [];
    const before = JSON.parse(JSON.stringify(trainings));

    nextEvent(trainings, games, teams);

    expect(JSON.parse(JSON.stringify(trainings))).toEqual(before);
  });
});
