/* global process */
import { formatTrainingDate, exerciseSummary, splitTrainings } from "../trainingDisplay";

const originalTZ = process.env.TZ;

beforeAll(() => {
  process.env.TZ = "Pacific/Auckland";
});

afterAll(() => {
  process.env.TZ = originalTZ;
});

describe("formatTrainingDate", () => {
  test("returns weekday, day, short month and zero-padded HH:mm, no seconds (AC TCARD-01.1)", () => {
    const date = new Date(2027, 0, 5, 16, 0); // Tuesday 5 January 2027

    expect(formatTrainingDate(date)).toBe("Tue 5 Jan, 16:00");
  });

  test("zero-pads a single-digit hour and minute", () => {
    const date = new Date(2027, 0, 5, 9, 5); // Tuesday 5 January 2027

    expect(formatTrainingDate(date)).toBe("Tue 5 Jan, 09:05");
  });

  test("does not include seconds even when the Date carries them", () => {
    const date = new Date(2027, 0, 5, 16, 0, 45);

    expect(formatTrainingDate(date)).not.toMatch(/:45/);
  });

  test("accepts a non-Date value and parses it the same way", () => {
    expect(formatTrainingDate("2027-01-05T16:00:00")).toBe("Tue 5 Jan, 16:00");
  });

  test("returns 'Invalid date' for an unparsable date (AC TCARD-01.5)", () => {
    expect(formatTrainingDate(new Date("not-a-date"))).toBe("Invalid date");
  });

  test("returns 'Invalid date' for an unparsable string, matching pages/Trainings.jsx's fallback (regression guard on 05 TNUM-04.3)", () => {
    expect(formatTrainingDate("not-a-date")).toBe("Invalid date");
  });

  test("returns 'Invalid date' for a missing day", () => {
    expect(formatTrainingDate(undefined)).toBe("Invalid date");
  });

  test("is verified under a non-UTC timezone offset, as 06 T1 did for datetime.js", () => {
    expect(process.env.TZ).toBe("Pacific/Auckland");
    const date = new Date(2027, 2, 10, 6, 0); // Wednesday 10 March 2027

    expect(formatTrainingDate(date)).toBe("Wed 10 Mar, 06:00");
  });
});

describe("exerciseSummary", () => {
  test("reports the empty case distinctly as 'No exercises' (AC TCARD-01.3)", () => {
    expect(exerciseSummary([])).toEqual({
      count: 0,
      plannedMinutes: 0,
      text: "No exercises",
    });
  });

  test("treats a missing exercises list the same as an empty one", () => {
    expect(exerciseSummary(undefined)).toEqual({
      count: 0,
      plannedMinutes: 0,
      text: "No exercises",
    });
  });

  test("uses the singular 'exercise' label at exactly 1 exercise", () => {
    const result = exerciseSummary([{ duration: 20, repetitions: null }]);

    expect(result).toEqual({
      count: 1,
      plannedMinutes: 20,
      text: "1 exercise · 20 min planned",
    });
  });

  test("uses the plural 'exercises' label and sums planned minutes for several exercises", () => {
    const result = exerciseSummary([
      { duration: 10, repetitions: null },
      { duration: 20, repetitions: null },
      { duration: 10, repetitions: null },
    ]);

    expect(result).toEqual({
      count: 3,
      plannedMinutes: 40,
      text: "3 exercises · 40 min planned",
    });
  });

  test("a null exercise duration contributes 0 to the planned total, never NaN (edge case)", () => {
    const result = exerciseSummary([{ duration: null, repetitions: null }]);

    expect(result.plannedMinutes).toBe(0);
    expect(result.plannedMinutes).not.toBeNaN();
  });

  test("a zero-minute planned total is reported distinctly from the empty case (AC TCARD-01.3)", () => {
    const result = exerciseSummary([{ duration: 0, repetitions: 1 }]);

    expect(result).toEqual({
      count: 1,
      plannedMinutes: 0,
      text: "1 exercise · 0 min planned",
    });
    expect(result.text).not.toBe("No exercises");
  });
});

describe("splitTrainings", () => {
  // A function, not a shared const: constructed inside each test body (after
  // beforeAll sets TZ), never at describe-collection time (before it).
  function fixedNow() {
    return new Date(2027, 0, 15, 12, 0);
  }

  test("orders upcoming trainings soonest first (AC TLAY-05.2)", () => {
    const soon = { id: "soon", day: new Date(2027, 0, 16) };
    const later = { id: "later", day: new Date(2027, 0, 20) };
    const latest = { id: "latest", day: new Date(2027, 1, 1) };

    const { upcoming } = splitTrainings([latest, soon, later], fixedNow());

    expect(upcoming.map((t) => t.id)).toEqual(["soon", "later", "latest"]);
  });

  test("orders past trainings most recent first (AC TLAY-05.1)", () => {
    const jan = { id: "jan", day: new Date(2027, 0, 1) };
    const feb = { id: "feb", day: new Date(2027, 0, 10) };
    const mar = { id: "mar", day: new Date(2027, 0, 14) };

    const { past } = splitTrainings([jan, mar, feb], fixedNow());

    expect(past.map((t) => t.id)).toEqual(["mar", "feb", "jan"]);
  });

  test("a training dated exactly now lands in upcoming", () => {
    const now = fixedNow();
    const training = { id: "now", day: new Date(now) };

    const { upcoming, past } = splitTrainings([training], now);

    expect(upcoming.map((t) => t.id)).toEqual(["now"]);
    expect(past).toEqual([]);
  });

  test("a training dated 1ms before now lands in past", () => {
    const now = fixedNow();
    const training = { id: "just-past", day: new Date(now.getTime() - 1) };

    const { upcoming, past } = splitTrainings([training], now);

    expect(upcoming).toEqual([]);
    expect(past.map((t) => t.id)).toEqual(["just-past"]);
  });

  test("an invalid day lands in past without disturbing the ordering of the valid ones (AC TLAY-05.3)", () => {
    const jan = { id: "jan", day: new Date(2027, 0, 1) };
    const feb = { id: "feb", day: new Date(2027, 0, 10) };
    const invalid = { id: "invalid", day: new Date("not-a-date") };

    const { past } = splitTrainings([feb, invalid, jan], fixedNow());

    expect(past.map((t) => t.id)).toEqual(["feb", "jan", "invalid"]);
  });

  test("multiple invalid days all land at the end of past, valid ones stay correctly ordered", () => {
    const jan = { id: "jan", day: new Date(2027, 0, 1) };
    const feb = { id: "feb", day: new Date(2027, 0, 10) };
    const invalidA = { id: "invalid-a", day: new Date("not-a-date") };
    const invalidB = { id: "invalid-b", day: undefined };

    const { past } = splitTrainings([invalidA, feb, invalidB, jan], fixedNow());

    expect(past.slice(0, 2).map((t) => t.id)).toEqual(["feb", "jan"]);
    expect(past.slice(2).map((t) => t.id).sort()).toEqual(["invalid-a", "invalid-b"]);
  });

  test("`now` is injected rather than read internally — the same input splits differently for different `now` values", () => {
    const training = { id: "t1", day: new Date(2027, 0, 15) };

    const before = splitTrainings([training], new Date(2027, 0, 10));
    const after = splitTrainings([training], new Date(2027, 0, 20));

    expect(before.upcoming.map((t) => t.id)).toEqual(["t1"]);
    expect(before.past).toEqual([]);
    expect(after.upcoming).toEqual([]);
    expect(after.past.map((t) => t.id)).toEqual(["t1"]);
  });

  test("returns empty upcoming and past arrays for an empty input", () => {
    expect(splitTrainings([], fixedNow())).toEqual({ upcoming: [], past: [] });
  });

  test("does not mutate the input array", () => {
    const jan = { id: "jan", day: new Date(2027, 0, 1) };
    const feb = { id: "feb", day: new Date(2027, 0, 10) };
    const input = [feb, jan];
    const before = [...input];

    splitTrainings(input, fixedNow());

    expect(input).toEqual(before);
  });

  test("accepts a non-Date day value and classifies it the same way", () => {
    const training = { id: "string-day", day: "2027-01-16T00:00:00" };

    const { upcoming } = splitTrainings([training], fixedNow());

    expect(upcoming.map((t) => t.id)).toEqual(["string-day"]);
  });

  test("every loaded training appears in exactly one of the two sections (AC TLAY-01.1 precondition)", () => {
    const trainings = [
      { id: "a", day: new Date(2027, 0, 1) },
      { id: "b", day: new Date(2027, 1, 1) },
      { id: "c", day: new Date("not-a-date") },
    ];

    const { upcoming, past } = splitTrainings(trainings, fixedNow());

    expect(upcoming.length + past.length).toBe(trainings.length);
  });
});
