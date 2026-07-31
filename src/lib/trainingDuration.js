/** Sums duration × repetitions across exercises, treating a null repetition count as 1. */
export function totalPlannedMinutes(exercises) {
  if (!exercises || exercises.length === 0) return 0;

  return exercises.reduce(
    (total, ex) => total + ex.duration * (ex.repetitions ?? 1),
    0
  );
}
