import { describe, it, expect } from "vitest";
import { toEvents, eventsForMonth } from "../calendarEvents";

const teams = [{ id: 1, club: "Amadora", name: "Sub-11" }];

describe("toEvents", () => {
  it("returns a uniform event for a training with { id, type, date, title, teamName, sourceId }", () => {
    const training = { id: 10, teamId: 1, day: new Date("2026-03-14T09:00:00") };
    const [event] = toEvents([training], [], teams);

    expect(event).toEqual({
      id: "training-10",
      type: "training",
      date: training.day,
      title: "Training",
      teamName: "Amadora Sub-11",
      sourceId: 10,
    });
  });

  it("returns a uniform event for a game with { id, type, date, title, teamName, sourceId }", () => {
    const game = { id: 20, teamId: 1, opponent: "Benfica", date: new Date("2026-03-18T15:00:00") };
    const [event] = toEvents([], [game], teams);

    expect(event).toEqual({
      id: "game-20",
      type: "game",
      date: game.date,
      title: "vs Benfica",
      teamName: "Amadora Sub-11",
      sourceId: 20,
    });
  });

  it("tags trainings with type 'training' and games with type 'game' (AC CAL-01.3)", () => {
    const training = { id: 1, teamId: 1, day: new Date("2026-03-01") };
    const game = { id: 2, teamId: 1, opponent: "Sporting", date: new Date("2026-03-02") };
    const events = toEvents([training], [game], teams);

    expect(events.map((e) => e.type).sort()).toEqual(["game", "training"]);
  });

  it("gives a training with no team teamName 'Unassigned', never undefined (edge case)", () => {
    const training = { id: 1, teamId: null, day: new Date("2026-03-01") };
    const [event] = toEvents([training], [], teams);

    expect(event.teamName).toBe("Unassigned");
  });

  it("omits a training with an invalid date rather than throwing (edge case)", () => {
    const training = { id: 1, teamId: 1, day: "not-a-date" };

    expect(() => toEvents([training], [], teams)).not.toThrow();
    expect(toEvents([training], [], teams)).toEqual([]);
  });

  it("omits a game with an invalid date rather than throwing (edge case)", () => {
    const game = { id: 1, teamId: 1, opponent: "Benfica", date: "not-a-date" };

    expect(() => toEvents([], [game], teams)).not.toThrow();
    expect(toEvents([], [game], teams)).toEqual([]);
  });

  it("does not mutate the trainings, games or teams inputs (AD-004)", () => {
    const training = { id: 1, teamId: 1, day: new Date("2026-03-01") };
    const game = { id: 2, teamId: 1, opponent: "Sporting", date: new Date("2026-03-02") };
    const trainingsCopy = JSON.parse(JSON.stringify([training]));
    const gamesCopy = JSON.parse(JSON.stringify([game]));
    const teamsCopy = JSON.parse(JSON.stringify(teams));

    toEvents([training], [game], teams);

    expect(JSON.parse(JSON.stringify([training]))).toEqual(trainingsCopy);
    expect(JSON.parse(JSON.stringify([game]))).toEqual(gamesCopy);
    expect(JSON.parse(JSON.stringify(teams))).toEqual(teamsCopy);
  });
});

describe("eventsForMonth", () => {
  it("returns only events falling within the given month (AC CAL-01.1)", () => {
    const events = toEvents(
      [
        { id: 1, teamId: 1, day: new Date("2026-03-14") },
        { id: 2, teamId: 1, day: new Date("2026-04-01") },
      ],
      [],
      teams
    );

    const march = eventsForMonth(events, 2026, 2);

    expect(march.map((e) => e.sourceId)).toEqual([1]);
  });

  it("does not leak events into an adjacent month's cells at a month boundary (edge case)", () => {
    const events = toEvents(
      [
        { id: 1, teamId: 1, day: new Date("2026-02-28T23:59:00") },
        { id: 2, teamId: 1, day: new Date("2026-03-01T00:00:00") },
      ],
      [],
      teams
    );

    expect(eventsForMonth(events, 2026, 1).map((e) => e.sourceId)).toEqual([1]);
    expect(eventsForMonth(events, 2026, 2).map((e) => e.sourceId)).toEqual([2]);
  });

  it("returns an empty array, not undefined, for a month with no events (edge case)", () => {
    const result = eventsForMonth([], 2026, 2);

    expect(result).toEqual([]);
    expect(result).not.toBeUndefined();
  });

  it("orders same-day events by time ascending", () => {
    const events = toEvents(
      [{ id: 1, teamId: 1, day: new Date("2026-03-14T18:00:00") }],
      [{ id: 2, teamId: 1, opponent: "Benfica", date: new Date("2026-03-14T09:00:00") }],
      teams
    );

    const ordered = eventsForMonth(events, 2026, 2);

    expect(ordered.map((e) => e.sourceId)).toEqual([2, 1]);
  });

  it("breaks ties on identical timestamps deterministically by type then sourceId", () => {
    const sameTime = new Date("2026-03-14T09:00:00");
    const events = toEvents(
      [{ id: 5, teamId: 1, day: sameTime }],
      [{ id: 5, teamId: 1, opponent: "Benfica", date: sameTime }],
      teams
    );

    const ordered = eventsForMonth(events, 2026, 2);

    expect(ordered.map((e) => e.id)).toEqual(["game-5", "training-5"]);
  });

  it("does not mutate the events input array", () => {
    const events = toEvents(
      [{ id: 1, teamId: 1, day: new Date("2026-03-14T18:00:00") }],
      [{ id: 2, teamId: 1, opponent: "Benfica", date: new Date("2026-03-14T09:00:00") }],
      teams
    );
    const before = [...events];

    eventsForMonth(events, 2026, 2);

    expect(events).toEqual(before);
  });
});
