import { describe, it, expect } from "vitest";
import { computeOurRow, toStandingsRow, sortStandings } from "../standings";

function playedGame(usScore, themScore, overrides = {}) {
  return {
    id: overrides.id ?? "g",
    teamId: "team-1",
    opponent: "Rival",
    date: new Date("2025-01-01"),
    isHome: true,
    competition: "League",
    usScore,
    themScore,
    ...overrides,
  };
}

function scheduledGame(overrides = {}) {
  return {
    id: "s",
    teamId: "team-1",
    opponent: "Rival",
    date: new Date("2025-01-01"),
    isHome: true,
    competition: "League",
    usScore: null,
    themScore: null,
    ...overrides,
  };
}

describe("computeOurRow", () => {
  it("returns played, won, drawn, lost, goalsFor, goalsAgainst, goalDifference and points (AC GAME-07.1)", () => {
    const games = [
      playedGame(2, 1, { id: "a" }),
      playedGame(1, 1, { id: "b" }),
      playedGame(0, 2, { id: "c" }),
    ];

    const row = computeOurRow(games, "Amadora Sub-11");

    expect(row).toMatchObject({
      name: "Amadora Sub-11",
      played: 3,
      won: 1,
      drawn: 1,
      lost: 1,
      goalsFor: 3,
      goalsAgainst: 4,
      goalDifference: -1,
    });
  });

  it("awards 3 points for a win, 1 for a draw, 0 for a loss (AC GAME-07.2)", () => {
    const games = [
      playedGame(2, 1, { id: "win" }),
      playedGame(1, 1, { id: "draw" }),
      playedGame(0, 2, { id: "loss" }),
    ];

    const row = computeOurRow(games, "Team");

    expect(row.points).toBe(3 + 1 + 0);
  });

  it("excludes scheduled games from every figure", () => {
    const games = [playedGame(2, 0, { id: "played" }), scheduledGame({ id: "future" })];

    const row = computeOurRow(games, "Team");

    expect(row.played).toBe(1);
    expect(row.goalsFor).toBe(2);
  });

  it("counts a 0-0 game as a played draw, not an absent result (null-vs-zero edge case)", () => {
    const games = [playedGame(0, 0)];

    const row = computeOurRow(games, "Team");

    expect(row.played).toBe(1);
    expect(row.drawn).toBe(1);
    expect(row.points).toBe(1);
  });

  it("returns a row of zeros, not null or NaN, when zero games are played (AC GAME-07.6)", () => {
    const row = computeOurRow([], "Team");

    expect(row).toEqual({
      name: "Team",
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      isOurs: true,
    });
  });

  it("returns a row of zeros when games is undefined", () => {
    const row = computeOurRow(undefined, "Team");

    expect(row.played).toBe(0);
    expect(Number.isNaN(row.points)).toBe(false);
  });

  it("marks the row as ours", () => {
    const row = computeOurRow([], "Team");

    expect(row.isOurs).toBe(true);
  });

  it("derives goalDifference from goalsFor/goalsAgainst rather than any input field", () => {
    const games = [playedGame(3, 1)];

    const row = computeOurRow(games, "Team");

    expect(row.goalDifference).toBe(row.goalsFor - row.goalsAgainst);
  });

  it("does not mutate the input games array or its elements (AD-004)", () => {
    const games = [playedGame(2, 1)];
    const snapshot = JSON.parse(JSON.stringify(games));

    computeOurRow(games, "Team");

    expect(JSON.parse(JSON.stringify(games))).toEqual(snapshot);
  });
});

describe("toStandingsRow", () => {
  it("normalizes a RivalRow to the StandingsRow shape with derived points and goalDifference (AC GAME-09.2)", () => {
    const rivalRow = {
      id: "r1",
      name: "Benfica B",
      played: 4,
      won: 3,
      drawn: 1,
      lost: 0,
      goalsFor: 10,
      goalsAgainst: 2,
    };

    const row = toStandingsRow(rivalRow);

    expect(row).toEqual({
      name: "Benfica B",
      played: 4,
      won: 3,
      drawn: 1,
      lost: 0,
      goalsFor: 10,
      goalsAgainst: 2,
      goalDifference: 8,
      points: 10,
      isOurs: false,
    });
  });

  it("ignores a stray goalDifference/points field on the input and recomputes both", () => {
    const rivalRow = {
      name: "Sneaky FC",
      played: 1,
      won: 1,
      drawn: 0,
      lost: 0,
      goalsFor: 1,
      goalsAgainst: 0,
      goalDifference: 999,
      points: 999,
    };

    const row = toStandingsRow(rivalRow);

    expect(row.goalDifference).toBe(1);
    expect(row.points).toBe(3);
  });

  it("marks the row as not ours", () => {
    const row = toStandingsRow({
      name: "X",
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    });

    expect(row.isOurs).toBe(false);
  });
});

describe("sortStandings", () => {
  it("orders rows by points descending (AC GAME-07.3)", () => {
    const rows = [
      { name: "A", points: 3, goalDifference: 0, goalsFor: 0 },
      { name: "B", points: 9, goalDifference: 0, goalsFor: 0 },
      { name: "C", points: 6, goalDifference: 0, goalsFor: 0 },
    ];

    const sorted = sortStandings(rows);

    expect(sorted.map((r) => r.name)).toEqual(["B", "C", "A"]);
  });

  it("prioritizes points over goal difference when the two signals conflict (AC GAME-07.3)", () => {
    const rows = [
      { name: "A", points: 4, goalDifference: 5, goalsFor: 0 },
      { name: "B", points: 5, goalDifference: -2, goalsFor: 0 },
    ];

    const sorted = sortStandings(rows);

    expect(sorted.map((r) => r.name)).toEqual(["B", "A"]);
  });

  it("breaks a points tie by goal difference descending (AC GAME-07.3)", () => {
    const rows = [
      { name: "A", points: 5, goalDifference: 1, goalsFor: 0 },
      { name: "B", points: 5, goalDifference: 4, goalsFor: 0 },
    ];

    const sorted = sortStandings(rows);

    expect(sorted.map((r) => r.name)).toEqual(["B", "A"]);
  });

  it("breaks a points and goal-difference tie by goals for descending (AC GAME-07.3)", () => {
    const rows = [
      { name: "A", points: 5, goalDifference: 2, goalsFor: 3 },
      { name: "B", points: 5, goalDifference: 2, goalsFor: 7 },
    ];

    const sorted = sortStandings(rows);

    expect(sorted.map((r) => r.name)).toEqual(["B", "A"]);
  });

  it("falls through to name ascending when points, goal difference and goals for all tie (edge case)", () => {
    const rows = [
      { name: "Zebra FC", points: 5, goalDifference: 2, goalsFor: 3 },
      { name: "Amadora", points: 5, goalDifference: 2, goalsFor: 3 },
    ];

    const sorted = sortStandings(rows);

    expect(sorted.map((r) => r.name)).toEqual(["Amadora", "Zebra FC"]);
  });

  it("produces a deterministic order across repeated calls on fully tied rows (edge case)", () => {
    const rows = [
      { name: "Zebra FC", points: 5, goalDifference: 2, goalsFor: 3 },
      { name: "Amadora", points: 5, goalDifference: 2, goalsFor: 3 },
    ];

    const first = sortStandings(rows);
    const second = sortStandings(rows);

    expect(first.map((r) => r.name)).toEqual(second.map((r) => r.name));
  });

  it("does not mutate the input array (AD-004)", () => {
    const rows = [
      { name: "B", points: 1, goalDifference: 0, goalsFor: 0 },
      { name: "A", points: 2, goalDifference: 0, goalsFor: 0 },
    ];
    const snapshot = [...rows];

    sortStandings(rows);

    expect(rows).toEqual(snapshot);
  });

  it("returns a new array instance, not the same reference", () => {
    const rows = [{ name: "A", points: 1, goalDifference: 0, goalsFor: 0 }];

    expect(sortStandings(rows)).not.toBe(rows);
  });
});
