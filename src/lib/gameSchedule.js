import { hasResult } from "./gameResult";

function isValidDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return !isNaN(date.getTime());
}

function toTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  return date.getTime();
}

/**
 * Picks the soonest unplayed game dated at or after `now`, or null when
 * there is none (AC GLAY-04.1, GLAY-04.3). `now` is a parameter, not read
 * internally, so the boundary is testable without faking timers. A tie on
 * timestamp resolves deterministically by id (string compare) — the same
 * tie-break rule `compareEvents` in calendarEvents.js uses for events sharing
 * a moment. A game with an invalid date is never selected.
 */
export function nextGame(games, now) {
  const candidates = (games ?? []).filter(
    (game) => !hasResult(game) && isValidDate(game.date) && toTime(game.date) >= now.getTime()
  );
  if (candidates.length === 0) return null;

  return [...candidates].sort((a, b) => {
    const diff = toTime(a.date) - toTime(b.date);
    if (diff !== 0) return diff;
    return String(a.id).localeCompare(String(b.id));
  })[0];
}

function pastSortKey(value) {
  return isValidDate(value) ? toTime(value) : -Infinity;
}

/**
 * Orders played games most-recent-first (AC GLAY-05.4). An invalid date
 * always sorts last, without disturbing the ordering of the valid ones.
 * Does not mutate `games`.
 */
export function sortPlayed(games) {
  return [...(games ?? [])].sort((a, b) => pastSortKey(b.date) - pastSortKey(a.date));
}
