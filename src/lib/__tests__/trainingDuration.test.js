import { totalPlannedMinutes } from "../trainingDuration";

test("sums duration times repetitions across all exercises (AC TFORM-06.1)", () => {
  const exercises = [
    { duration: 10, repetitions: 1 },
    { duration: 20, repetitions: 2 },
    { duration: 10, repetitions: 3 },
  ];

  expect(totalPlannedMinutes(exercises)).toBe(10 * 1 + 20 * 2 + 10 * 3);
});

test("treats a null repetition count as 1 (AC TFORM-06.1)", () => {
  const exercises = [{ duration: 15, repetitions: null }];

  expect(totalPlannedMinutes(exercises)).toBe(15);
});

test("returns 0 for an empty list rather than NaN", () => {
  expect(totalPlannedMinutes([])).toBe(0);
});

test("sums a single exercise with repetitions", () => {
  expect(totalPlannedMinutes([{ duration: 25, repetitions: 4 }])).toBe(100);
});

test("sums multiple exercises with mixed null and set repetitions", () => {
  const exercises = [
    { duration: 10, repetitions: null },
    { duration: 5, repetitions: 2 },
  ];

  expect(totalPlannedMinutes(exercises)).toBe(10 + 10);
});

test("handles a single exercise with null repetitions as duration alone", () => {
  expect(totalPlannedMinutes([{ duration: 30, repetitions: null }])).toBe(30);
});

test("handles undefined exercises list defensively by treating as empty", () => {
  expect(totalPlannedMinutes(undefined)).toBe(0);
});

test("sums exercises with repetitions of 1 as their plain duration", () => {
  const exercises = [
    { duration: 5, repetitions: 1 },
    { duration: 7, repetitions: 1 },
  ];

  expect(totalPlannedMinutes(exercises)).toBe(12);
});
