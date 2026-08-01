import { describe, it, expect } from "vitest";
import { cardTotals, suspensionStatus, SUSPENSION_THRESHOLD } from "../playerCards";

function card(playerId, gameId, type) {
  return { id: `${playerId}-${gameId}-${type}-${Math.random()}`, playerId, gameId, type };
}

describe("cardTotals", () => {
  it("returns { yellow, red } counts for a player (AC CARD-04.1)", () => {
    const cards = [
      card("p1", "g1", "yellow"),
      card("p1", "g2", "yellow"),
      card("p1", "g3", "red"),
    ];

    expect(cardTotals(cards, "p1")).toEqual({ yellow: 2, red: 1 });
  });

  it("returns zeros, not undefined, for a player with no cards (AC CARD-04.2)", () => {
    expect(cardTotals([], "p1")).toEqual({ yellow: 0, red: 0 });
  });

  it("ignores cards belonging to other players", () => {
    const cards = [card("p1", "g1", "yellow"), card("p2", "g1", "red")];

    expect(cardTotals(cards, "p1")).toEqual({ yellow: 1, red: 0 });
  });

  it("counts only cards from games in teamGameIds when provided (AC CARD-04.4)", () => {
    const cards = [
      card("p1", "g1", "yellow"),
      card("p1", "g2", "yellow"),
      card("p1", "g3", "red"),
    ];
    const teamGameIds = new Set(["g1", "g2"]);

    expect(cardTotals(cards, "p1", teamGameIds)).toEqual({ yellow: 2, red: 0 });
  });

  it("counts every matching card when teamGameIds is omitted", () => {
    const cards = [card("p1", "g1", "yellow"), card("p1", "g2", "red")];

    expect(cardTotals(cards, "p1")).toEqual({ yellow: 1, red: 1 });
  });

  it("does not mutate the input array (AD-004)", () => {
    const cards = [card("p1", "g1", "yellow")];
    const snapshot = [...cards];

    cardTotals(cards, "p1");

    expect(cards).toEqual(snapshot);
  });

  it("handles a null cards list as empty", () => {
    expect(cardTotals(null, "p1")).toEqual({ yellow: 0, red: 0 });
  });
});

describe("suspensionStatus", () => {
  it("exports SUSPENSION_THRESHOLD as a single named constant (AC CARD-05.5)", () => {
    expect(typeof SUSPENSION_THRESHOLD).toBe("number");
  });

  it("returns 'none' below the warning band (AC CARD-05.4)", () => {
    expect(suspensionStatus({ yellow: SUSPENSION_THRESHOLD - 2, red: 0 })).toBe("none");
  });

  it("returns 'approaching' at one yellow below the threshold (AC CARD-05.1)", () => {
    expect(suspensionStatus({ yellow: SUSPENSION_THRESHOLD - 1, red: 0 })).toBe("approaching");
  });

  it("returns 'suspended' at exactly the threshold (AC CARD-05.2)", () => {
    expect(suspensionStatus({ yellow: SUSPENSION_THRESHOLD, red: 0 })).toBe("suspended");
  });

  it("returns 'suspended' above the threshold", () => {
    expect(suspensionStatus({ yellow: SUSPENSION_THRESHOLD + 3, red: 0 })).toBe("suspended");
  });

  it("returns 'suspended' for any red card regardless of yellow count (AC CARD-05.3)", () => {
    expect(suspensionStatus({ yellow: 0, red: 1 })).toBe("suspended");
    expect(suspensionStatus({ yellow: SUSPENSION_THRESHOLD - 2, red: 1 })).toBe("suspended");
  });

  it("derives every boundary from the constant, not a hard-coded 5", () => {
    expect(suspensionStatus({ yellow: SUSPENSION_THRESHOLD - 1, red: 0 })).toBe("approaching");
    expect(suspensionStatus({ yellow: SUSPENSION_THRESHOLD, red: 0 })).toBe("suspended");
  });

  it("returns a valid status when a player has more reds than games (edge case)", () => {
    expect(suspensionStatus({ yellow: 0, red: 4 })).toBe("suspended");
  });

  it("returns a valid status when a player has more yellows than the threshold in one game (edge case)", () => {
    expect(suspensionStatus({ yellow: SUSPENSION_THRESHOLD + 10, red: 0 })).toBe("suspended");
  });
});
