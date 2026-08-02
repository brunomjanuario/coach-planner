/**
 * Pure aggregation over recorded ratings — season average, recent form and
 * squad ranking (AD-007). Never mutates its inputs (AD-004); callers own
 * fetching ratings and events from the services.
 */

/**
 * Mean of `ratings[].value`, rounded to one decimal place. Returns `null`
 * for an empty list rather than `0` — an unrated player has no average, not
 * a zero one (AC RATE-03.2). A rating of exactly `0` is a real value and
 * counts toward the mean (null-vs-zero trap).
 */
export function average(ratings) {
  const list = ratings ?? [];
  if (list.length === 0) return null;

  const sum = list.reduce((total, rating) => total + rating.value, 0);
  return Math.round((sum / list.length) * 10) / 10;
}

function eventKey(eventType, eventId) {
  return `${eventType}:${eventId}`;
}

/**
 * Mean of the last `n` rated events, most recent first by event date
 * (AC RATE-03.3). `events` supplies the dates ratings alone don't carry —
 * an array of `{ id, type, date }` joined against each rating's
 * `(eventType, eventId)`. Events sharing a date are ordered deterministically
 * by event id (edge case). Fewer than `n` rated events are averaged over
 * what exists, with `count` reporting how many contributed (AC RATE-03.4).
 */
export function form(ratings, events, n = 5) {
  const list = ratings ?? [];
  if (list.length === 0) return { value: null, count: 0 };

  const eventsByKey = new Map(
    (events ?? []).map((event) => [eventKey(event.type, event.id), event])
  );

  const sorted = [...list].sort((a, b) => {
    const eventA = eventsByKey.get(eventKey(a.eventType, a.eventId));
    const eventB = eventsByKey.get(eventKey(b.eventType, b.eventId));
    const dateA = eventA ? new Date(eventA.date).getTime() : 0;
    const dateB = eventB ? new Date(eventB.date).getTime() : 0;

    if (dateB !== dateA) return dateB - dateA;

    const idA = String(a.eventId);
    const idB = String(b.eventId);
    return idA < idB ? -1 : idA > idB ? 1 : 0;
  });

  const recent = sorted.slice(0, n);
  return { value: average(recent), count: recent.length };
}

/**
 * Filters ratings to one event type, supporting training-only / game-only /
 * combined figures (AC RATE-02.4). Passing `undefined` returns the ratings
 * unchanged (the combined figure).
 */
export function filterByType(ratings, eventType) {
  const list = ratings ?? [];
  if (eventType === undefined) return list;
  return list.filter((rating) => rating.eventType === eventType);
}

/**
 * Ranks a squad by average rating, highest first (AC RATE-09.1). `ratingsByPlayer`
 * is a `Map<playerId, Rating[]>` pre-grouped by the caller so this stays a pure
 * function over already-fetched data. Players with no ratings sort last —
 * their average is `null`, never treated as `0` (AC RATE-09.3). Equal averages,
 * and the all-unrated case, are ordered deterministically by player id
 * (AC RATE-09.2).
 */
export function rankSquad(players, ratingsByPlayer) {
  return (players ?? [])
    .map((player) => ({
      player,
      average: average(ratingsByPlayer?.get(player.id) ?? []),
    }))
    .sort((a, b) => {
      if (a.average === null && b.average === null) {
        return String(a.player.id) < String(b.player.id) ? -1 : 1;
      }
      if (a.average === null) return 1;
      if (b.average === null) return -1;
      if (b.average !== a.average) return b.average - a.average;
      return String(a.player.id) < String(b.player.id) ? -1 : 1;
    });
}
