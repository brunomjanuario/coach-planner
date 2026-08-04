/* global process */
import { formatTrainingDate, exerciseSummary } from "../trainingDisplay";

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
