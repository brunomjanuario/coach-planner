function toDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function teamNameFor(teamId, teams) {
  const team = teams.find((t) => t.id === teamId);
  return team ? `${team.club} ${team.name}` : "Unassigned";
}

/**
 * Merges trainings and games into a uniform calendar event list. Skips any
 * record whose date fails to parse rather than throwing (AC edge case).
 */
export function toEvents(trainings, games, teams) {
  const trainingEvents = trainings
    .map((training) => {
      const date = toDate(training.day);
      if (!date) return null;
      return {
        id: `training-${training.id}`,
        type: "training",
        date,
        title: "Training",
        teamName: teamNameFor(training.teamId, teams),
        sourceId: training.id,
      };
    })
    .filter(Boolean);

  const gameEvents = games
    .map((game) => {
      const date = toDate(game.date);
      if (!date) return null;
      return {
        id: `game-${game.id}`,
        type: "game",
        date,
        title: `vs ${game.opponent}`,
        teamName: teamNameFor(game.teamId, teams),
        sourceId: game.id,
      };
    })
    .filter(Boolean);

  return [...trainingEvents, ...gameEvents];
}

/**
 * Deterministic event ordering shared by every consumer of `toEvents`: by
 * time ascending, ties broken by type then sourceId so rendering order never
 * depends on input order (reused by `dashboardStats.nextEvent`).
 */
export function compareEvents(a, b) {
  const diff = a.date.getTime() - b.date.getTime();
  if (diff !== 0) return diff;
  if (a.type !== b.type) return a.type.localeCompare(b.type);
  return String(a.sourceId).localeCompare(String(b.sourceId));
}

/**
 * Filters events down to a single calendar month (0-indexed), ordered by
 * time (see `compareEvents`).
 */
export function eventsForMonth(events, year, month) {
  return events
    .filter(
      (event) =>
        event.date.getFullYear() === year && event.date.getMonth() === month
    )
    .sort(compareEvents);
}
