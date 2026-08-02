import { describe, it, expect } from "vitest";
import { average, form, filterByType, rankSquad } from "../playerRatings";

function rating(playerId, eventType, eventId, value) {
  return { id: `${playerId}-${eventType}-${eventId}`, playerId, eventType, eventId, value };
}

function event(id, type, date) {
  return { id, type, date };
}

describe("average", () => {
  it("returns the mean to one decimal place (AC RATE-03.1)", () => {
    const ratings = [rating("p1", "training", "e1", 6), rating("p1", "training", "e2", 6), rating("p1", "game", "e3", 9), rating("p1", "game", "e4", 9)];

    expect(average(ratings)).toBe(7.5);
  });

  it("returns null, not 0, for an empty ratings list (AC RATE-03.2)", () => {
    expect(average([])).toBeNull();
  });

  it("includes a rating of exactly 0 in the mean (edge case: null-vs-zero)", () => {
    const ratings = [rating("p1", "training", "e1", 0), rating("p1", "training", "e2", 10)];

    expect(average(ratings)).toBe(5);
  });

  it("does not mutate the input array (AD-004)", () => {
    const ratings = [rating("p1", "training", "e1", 4)];
    const snapshot = [...ratings];

    average(ratings);

    expect(ratings).toEqual(snapshot);
  });
});

describe("form", () => {
  it("averages the last n rated events sorted by event date, most recent first (AC RATE-03.3)", () => {
    const events = [
      event("e1", "training", new Date("2025-01-01")),
      event("e2", "training", new Date("2025-01-02")),
      event("e3", "training", new Date("2025-01-03")),
      event("e4", "training", new Date("2025-01-04")),
      event("e5", "training", new Date("2025-01-05")),
      event("e6", "training", new Date("2025-01-06")),
    ];
    // Oldest (e1, value 0) should fall outside the last-5 window.
    const ratings = [
      rating("p1", "training", "e1", 0),
      rating("p1", "training", "e2", 10),
      rating("p1", "training", "e3", 10),
      rating("p1", "training", "e4", 10),
      rating("p1", "training", "e5", 10),
      rating("p1", "training", "e6", 10),
    ];

    const result = form(ratings, events, 5);

    expect(result).toEqual({ value: 10, count: 5 });
  });

  it("computes over fewer than n rated events and reports the count (AC RATE-03.4)", () => {
    const events = [event("e1", "training", new Date("2025-01-01")), event("e2", "training", new Date("2025-01-02"))];
    const ratings = [rating("p1", "training", "e1", 6), rating("p1", "training", "e2", 8)];

    const result = form(ratings, events, 5);

    expect(result).toEqual({ value: 7, count: 2 });
  });

  it("defaults n to 5 when not provided", () => {
    const events = Array.from({ length: 6 }, (_, i) =>
      event(`e${i}`, "training", new Date(2025, 0, i + 1))
    );
    const ratings = events.map((e, i) => rating("p1", "training", e.id, i === 0 ? 0 : 10));

    const result = form(ratings, events);

    expect(result.count).toBe(5);
  });

  it("returns null value and 0 count when there are no ratings", () => {
    expect(form([], [])).toEqual({ value: null, count: 0 });
  });

  it("orders events sharing the same date deterministically across repeated calls (edge case)", () => {
    const sameDate = new Date("2025-01-01");
    const events = [
      event("e1", "training", sameDate),
      event("e2", "training", sameDate),
    ];
    const ratings = [rating("p1", "training", "e1", 4), rating("p1", "training", "e2", 8)];

    const first = form(ratings, events, 5);
    const second = form(ratings, events, 5);

    expect(first).toEqual(second);
  });

  it("does not mutate the ratings or events arrays (AD-004)", () => {
    const events = [event("e1", "training", new Date("2025-01-01"))];
    const ratings = [rating("p1", "training", "e1", 5)];
    const ratingsSnapshot = [...ratings];
    const eventsSnapshot = [...events];

    form(ratings, events, 5);

    expect(ratings).toEqual(ratingsSnapshot);
    expect(events).toEqual(eventsSnapshot);
  });

  it("counts a rating of exactly 0 within the form window (edge case: null-vs-zero)", () => {
    const events = [event("e1", "training", new Date("2025-01-01")), event("e2", "training", new Date("2025-01-02"))];
    const ratings = [rating("p1", "training", "e1", 0), rating("p1", "training", "e2", 10)];

    expect(form(ratings, events, 5)).toEqual({ value: 5, count: 2 });
  });
});

describe("filterByType", () => {
  const ratings = [
    rating("p1", "training", "e1", 8),
    rating("p1", "game", "e2", 6),
  ];

  it("returns only training ratings when filtered to 'training' (AC RATE-02.4)", () => {
    expect(filterByType(ratings, "training")).toEqual([rating("p1", "training", "e1", 8)]);
  });

  it("returns only game ratings when filtered to 'game' (AC RATE-02.4)", () => {
    expect(filterByType(ratings, "game")).toEqual([rating("p1", "game", "e2", 6)]);
  });

  it("returns the combined list unchanged when no type is given (AC RATE-02.4)", () => {
    expect(filterByType(ratings, undefined)).toEqual(ratings);
  });
});

describe("rankSquad", () => {
  it("orders players by average descending, highest first (AC RATE-09.1)", () => {
    const players = [{ id: "p1" }, { id: "p2" }];
    const ratingsByPlayer = new Map([
      ["p1", [rating("p1", "training", "e1", 5)]],
      ["p2", [rating("p2", "training", "e2", 9)]],
    ]);

    const ranked = rankSquad(players, ratingsByPlayer);

    expect(ranked.map((r) => r.player.id)).toEqual(["p2", "p1"]);
    expect(ranked[0].average).toBe(9);
  });

  it("sorts unrated players last, never treating their average as 0 (AC RATE-09.3)", () => {
    const players = [{ id: "p1" }, { id: "p2" }, { id: "p3" }];
    const ratingsByPlayer = new Map([
      ["p1", []],
      ["p2", [rating("p2", "training", "e1", 3)]],
      ["p3", [rating("p3", "training", "e2", 7)]],
    ]);

    const ranked = rankSquad(players, ratingsByPlayer);

    expect(ranked.map((r) => r.player.id)).toEqual(["p3", "p2", "p1"]);
    expect(ranked.at(-1).average).toBeNull();
  });

  it("places a genuinely zero-average player above an unrated player, not tied with them (AC RATE-09.3)", () => {
    const players = [{ id: "p1" }, { id: "p2" }, { id: "p3" }];
    const ratingsByPlayer = new Map([
      ["p1", []],
      ["p2", [rating("p2", "training", "e1", 0), rating("p2", "training", "e2", 0)]],
      ["p3", [rating("p3", "training", "e3", 7)]],
    ]);

    const ranked = rankSquad(players, ratingsByPlayer);

    expect(ranked.map((r) => r.player.id)).toEqual(["p3", "p2", "p1"]);
    expect(ranked[1].average).toBe(0);
    expect(ranked.at(-1).average).toBeNull();
  });

  it("orders equal averages deterministically (AC RATE-09.2)", () => {
    const players = [{ id: "pB" }, { id: "pA" }];
    const ratingsByPlayer = new Map([
      ["pB", [rating("pB", "training", "e1", 6)]],
      ["pA", [rating("pA", "training", "e2", 6)]],
    ]);

    const first = rankSquad(players, ratingsByPlayer);
    const second = rankSquad([...players].reverse(), ratingsByPlayer);

    expect(first.map((r) => r.player.id)).toEqual(second.map((r) => r.player.id));
  });

  it("does not mutate the players array or the ratings map (AD-004)", () => {
    const players = [{ id: "p1" }, { id: "p2" }];
    const ratingsByPlayer = new Map([
      ["p1", [rating("p1", "training", "e1", 5)]],
      ["p2", [rating("p2", "training", "e2", 9)]],
    ]);
    const playersSnapshot = [...players];
    const mapSnapshot = new Map(ratingsByPlayer);

    rankSquad(players, ratingsByPlayer);

    expect(players).toEqual(playersSnapshot);
    expect(ratingsByPlayer).toEqual(mapSnapshot);
  });
});
