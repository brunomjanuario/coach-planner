import { totalPlannedMinutes, plannedShare } from "../trainingDuration";

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

test("returns a whole-number percent of the training's total planned time (AC EXDET-04.1)", () => {
  const target = { id: 1, duration: 10, repetitions: null };
  const exercises = [target, { id: 2, duration: 35, repetitions: null }];

  // 10 of 45 total = 22.22...% — asserted at a non-whole value so a dropped
  // Math.round would fail this test.
  expect(plannedShare(target, exercises)).toBe(22);
});

test("weighs the exercise's own repetitions into its share, not just its raw duration", () => {
  const target = { id: 1, duration: 10, repetitions: 2 };
  const exercises = [target, { id: 2, duration: 10, repetitions: 1 }];

  // target contributes 20 of a 30 total = 66.67% → 67
  expect(plannedShare(target, exercises)).toBe(67);
});

test("returns null when the training's total planned time is 0, not NaN or Infinity (AC EXDET-04.2)", () => {
  const target = { id: 1, duration: 0, repetitions: null };

  expect(plannedShare(target, [target])).toBeNull();
});

test("returns null when the exercise's own duration is null (edge case)", () => {
  const target = { id: 1, duration: null, repetitions: null };
  const exercises = [target, { id: 2, duration: 20, repetitions: null }];

  expect(plannedShare(target, exercises)).toBeNull();
});

test("returns 100 for the only exercise in a training", () => {
  const target = { id: 1, duration: 15, repetitions: null };

  expect(plannedShare(target, [target])).toBe(100);
});
