/** Sums duration × repetitions across exercises, treating a null repetition count as 1. */
export function totalPlannedMinutes(exercises) {
  if (!exercises || exercises.length === 0) return 0;

  return exercises.reduce(
    (total, ex) => total + ex.duration * (ex.repetitions ?? 1),
    0
  );
}

/**
 * One exercise's share of its training's total planned time, as a rounded
 * whole percent — its own duration × repetitions over `totalPlannedMinutes`,
 * so shares sum to (about) 100% across a training's exercises. Returns
 * `null` when the total is 0 or the exercise's own duration is missing, so
 * the caller renders nothing rather than `NaN%`/`Infinity%` (feature 28).
 */
export function plannedShare(exercise, exercises) {
  if (exercise.duration == null) return null;

  const total = totalPlannedMinutes(exercises);
  if (total === 0) return null;

  const contribution = exercise.duration * (exercise.repetitions ?? 1);
  return Math.round((contribution / total) * 100);
}
