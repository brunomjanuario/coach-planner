import { describe, it, expect } from "vitest";
import { numberTrainings } from "../trainingNumber";

describe("numberTrainings", () => {
  it("numbers a team's trainings from 1 in ascending day order (AC TNUM-01.1)", () => {
    const trainings = [
      { id: "b", teamId: "team-1", day: new Date("2027-02-01") },
      { id: "a", teamId: "team-1", day: new Date("2027-01-01") },
      { id: "c", teamId: "team-1", day: new Date("2027-03-01") },
    ];

    const result = numberTrainings(trainings);

    expect(result.find((t) => t.id === "a").number).toBe(1);
    expect(result.find((t) => t.id === "b").number).toBe(2);
    expect(result.find((t) => t.id === "c").number).toBe(3);
  });

  it("numbers each team independently, starting at 1 per team", () => {
    const trainings = [
      { id: "a", teamId: "team-1", day: new Date("2027-01-01") },
      { id: "b", teamId: "team-2", day: new Date("2027-01-01") },
      { id: "c", teamId: "team-1", day: new Date("2027-02-01") },
    ];

    const result = numberTrainings(trainings);

    expect(result.find((t) => t.id === "a").number).toBe(1);
    expect(result.find((t) => t.id === "b").number).toBe(1);
    expect(result.find((t) => t.id === "c").number).toBe(2);
  });

  it("breaks ties on the same day deterministically by id (AC TNUM-01.2)", () => {
    const trainings = [
      { id: "z", teamId: "team-1", day: new Date("2027-01-01") },
      { id: "a", teamId: "team-1", day: new Date("2027-01-01") },
    ];

    const result = numberTrainings(trainings);

    expect(result.find((t) => t.id === "a").number).toBe(1);
    expect(result.find((t) => t.id === "z").number).toBe(2);
  });

  it("produces identical numbering across two runs on the same input (AC TNUM-01.2)", () => {
    const trainings = [
      { id: "z", teamId: "team-1", day: new Date("2027-01-01") },
      { id: "a", teamId: "team-1", day: new Date("2027-01-01") },
    ];

    const first = numberTrainings(trainings);
    const second = numberTrainings(trainings);

    expect(first.map((t) => t.number)).toEqual(second.map((t) => t.number));
  });

  it("shifts later numbers up when an earlier training is inserted (AC TNUM-01.3)", () => {
    const existing = [
      { id: "a", teamId: "team-1", day: new Date("2027-02-01") },
      { id: "b", teamId: "team-1", day: new Date("2027-03-01") },
      { id: "c", teamId: "team-1", day: new Date("2027-04-01") },
    ];
    const before = numberTrainings(existing);
    expect(before.map((t) => t.number)).toEqual([1, 2, 3]);

    const withInsert = [
      ...existing,
      { id: "new", teamId: "team-1", day: new Date("2027-01-01") },
    ];
    const after = numberTrainings(withInsert);

    expect(after.find((t) => t.id === "new").number).toBe(1);
    expect(after.find((t) => t.id === "a").number).toBe(2);
    expect(after.find((t) => t.id === "b").number).toBe(3);
    expect(after.find((t) => t.id === "c").number).toBe(4);
  });

  it("closes the gap when a training is deleted (AC TNUM-01.4)", () => {
    const trainings = [
      { id: "a", teamId: "team-1", day: new Date("2027-01-01") },
      { id: "b", teamId: "team-1", day: new Date("2027-02-01") },
      { id: "c", teamId: "team-1", day: new Date("2027-03-01") },
    ];

    const afterDelete = numberTrainings(trainings.filter((t) => t.id !== "b"));

    expect(afterDelete.find((t) => t.id === "a").number).toBe(1);
    expect(afterDelete.find((t) => t.id === "c").number).toBe(2);
  });

  it("assigns number: null to a training with a null teamId (AC TNUM-01.5)", () => {
    const trainings = [
      { id: "a", teamId: null, day: new Date("2027-01-01") },
    ];

    const result = numberTrainings(trainings);

    expect(result[0].number).toBeNull();
  });

  it("assigns number: null to a training with an undefined teamId (AC TNUM-01.5)", () => {
    const trainings = [{ id: "a", day: new Date("2027-01-01") }];

    const result = numberTrainings(trainings);

    expect(result[0].number).toBeNull();
  });

  it("returns an empty array, not undefined, for empty input (AC TNUM-01.6)", () => {
    const result = numberTrainings([]);

    expect(result).toEqual([]);
  });

  it("sorts a training with an invalid day last instead of throwing or producing NaN", () => {
    const trainings = [
      { id: "a", teamId: "team-1", day: new Date("2027-01-01") },
      { id: "b", teamId: "team-1", day: new Date("not-a-date") },
      { id: "c", teamId: "team-1", day: new Date("2027-02-01") },
    ];

    const result = numberTrainings(trainings);

    expect(result.find((t) => t.id === "a").number).toBe(1);
    expect(result.find((t) => t.id === "c").number).toBe(2);
    expect(result.find((t) => t.id === "b").number).toBe(3);
  });

  it("does not mutate the input array or its training objects (AD-004)", () => {
    const trainings = [{ id: "a", teamId: "team-1", day: new Date("2027-01-01") }];
    const snapshot = JSON.parse(JSON.stringify(trainings));

    numberTrainings(trainings);

    expect(JSON.parse(JSON.stringify(trainings))).toEqual(snapshot);
    expect(trainings[0].number).toBeUndefined();
  });

  it("numbers 100+ trainings across 3 teams correctly in a single pass", () => {
    const trainings = [];
    const teamIds = ["team-1", "team-2", "team-3"];
    for (let i = 0; i < 120; i++) {
      teamIds.forEach((teamId, teamIndex) => {
        trainings.push({
          id: `${teamId}-${i}`,
          teamId,
          day: new Date(2020, 0, i + 1, teamIndex),
        });
      });
    }

    const result = numberTrainings(trainings);

    for (const teamId of teamIds) {
      const teamResults = result
        .filter((t) => t.teamId === teamId)
        .sort((a, b) => a.day - b.day);
      expect(teamResults.map((t) => t.number)).toEqual(
        Array.from({ length: 120 }, (_, i) => i + 1)
      );
    }
  });
});
