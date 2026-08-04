import { nextGame, sortPlayed } from "../gameSchedule";

describe("nextGame", () => {
  test("returns the soonest unplayed game dated at or after now (AC GLAY-04.1)", () => {
    const now = new Date(2027, 0, 15);
    const soon = { id: "soon", date: new Date(2027, 0, 16) };
    const later = { id: "later", date: new Date(2027, 0, 20) };

    expect(nextGame([later, soon], now).id).toBe("soon");
  });

  test("returns null when there is no upcoming game (AC GLAY-04.3)", () => {
    const now = new Date(2027, 0, 15);
    const past = { id: "past", date: new Date(2027, 0, 1) };

    expect(nextGame([past], now)).toBeNull();
  });

  test("returns null for an empty input", () => {
    expect(nextGame([], new Date(2027, 0, 15))).toBeNull();
  });

  test("returns null for an undefined input, defensively", () => {
    expect(nextGame(undefined, new Date(2027, 0, 15))).toBeNull();
  });

  test("a game dated exactly now is selected", () => {
    const now = new Date(2027, 0, 15, 12, 0);
    const game = { id: "now", date: new Date(now) };

    expect(nextGame([game], now).id).toBe("now");
  });

  test("now is a parameter, not read internally — the same input selects differently for different now values", () => {
    const game = { id: "g1", date: new Date(2027, 0, 15) };

    expect(nextGame([game], new Date(2027, 0, 10)).id).toBe("g1");
    expect(nextGame([game], new Date(2027, 0, 20))).toBeNull();
  });

  test("a tie on timestamp resolves deterministically by id, input order A (edge case)", () => {
    const now = new Date(2027, 0, 1);
    const same = new Date(2027, 0, 15);
    const a = { id: "a-game", date: new Date(same) };
    const b = { id: "b-game", date: new Date(same) };

    expect(nextGame([a, b], now).id).toBe("a-game");
  });

  test("a tie on timestamp resolves deterministically by id, input order B (edge case)", () => {
    const now = new Date(2027, 0, 1);
    const same = new Date(2027, 0, 15);
    const a = { id: "a-game", date: new Date(same) };
    const b = { id: "b-game", date: new Date(same) };

    expect(nextGame([b, a], now).id).toBe("a-game");
  });

  test("a game with an invalid date is never selected (edge case)", () => {
    const now = new Date(2027, 0, 15);
    const invalid = { id: "invalid", date: new Date("not-a-date") };
    const valid = { id: "valid", date: new Date(2027, 0, 20) };

    expect(nextGame([invalid, valid], now).id).toBe("valid");
    expect(nextGame([invalid], now)).toBeNull();
  });

  test("a game that already has a result is never selected, even if dated in the future", () => {
    const now = new Date(2027, 0, 15);
    const played = { id: "played", date: new Date(2027, 0, 20), usScore: 2, themScore: 1 };

    expect(nextGame([played], now)).toBeNull();
  });

  test("a 0-0 result still excludes the game from selection (null-vs-zero edge case)", () => {
    const now = new Date(2027, 0, 15);
    const drawn = { id: "drawn", date: new Date(2027, 0, 20), usScore: 0, themScore: 0 };

    expect(nextGame([drawn], now)).toBeNull();
  });
});

describe("sortPlayed", () => {
  test("orders played games most-recent-first (AC GLAY-05.4)", () => {
    const jan = { id: "jan", date: new Date(2027, 0, 1) };
    const feb = { id: "feb", date: new Date(2027, 0, 10) };
    const mar = { id: "mar", date: new Date(2027, 0, 14) };

    expect(sortPlayed([jan, mar, feb]).map((g) => g.id)).toEqual(["mar", "feb", "jan"]);
  });

  test("an invalid date sorts last without disturbing the valid ordering", () => {
    const jan = { id: "jan", date: new Date(2027, 0, 1) };
    const feb = { id: "feb", date: new Date(2027, 0, 10) };
    const invalid = { id: "invalid", date: new Date("not-a-date") };

    expect(sortPlayed([invalid, feb, jan]).map((g) => g.id)).toEqual(["feb", "jan", "invalid"]);
  });

  test("does not mutate the input array", () => {
    const jan = { id: "jan", date: new Date(2027, 0, 1) };
    const feb = { id: "feb", date: new Date(2027, 0, 10) };
    const input = [jan, feb];
    const before = [...input];

    sortPlayed(input);

    expect(input).toEqual(before);
  });

  test("returns an empty array for an empty input, not undefined", () => {
    expect(sortPlayed([])).toEqual([]);
  });

  test("returns an empty array for an undefined input, defensively", () => {
    expect(sortPlayed(undefined)).toEqual([]);
  });
});
