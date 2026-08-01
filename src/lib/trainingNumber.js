function dayTime(training) {
  const day = training.day instanceof Date ? training.day : new Date(training.day);
  return isNaN(day.getTime()) ? Infinity : day.getTime();
}

/**
 * Assigns each training a 1-based `number` within its team, ordered by `day`
 * ascending with ties broken by `id` for deterministic re-runs (AC TNUM-01.2).
 * Trainings with a null/undefined `teamId` get `number: null` (AC TNUM-01.5).
 * Returns a new array; never mutates `trainings` (AD-004).
 */
export function numberTrainings(trainings) {
  if (!trainings || trainings.length === 0) return [];

  const groups = new Map();
  for (const training of trainings) {
    if (training.teamId == null) continue;
    if (!groups.has(training.teamId)) groups.set(training.teamId, []);
    groups.get(training.teamId).push(training);
  }

  const numberById = new Map();
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => {
      const diff = dayTime(a) - dayTime(b);
      if (diff !== 0) return diff;
      return String(a.id).localeCompare(String(b.id));
    });
    sorted.forEach((training, index) => {
      numberById.set(training.id, index + 1);
    });
  }

  return trainings.map((training) => ({
    ...training,
    number: numberById.get(training.id) ?? null,
  }));
}
