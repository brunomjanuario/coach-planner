import { cardTotals } from "./playerCards";
import { average } from "./playerRatings";
import { hasResult } from "./gameResult";
import { toEvents, compareEvents } from "./calendarEvents";

/** Hard cap on a leader tile's rendered list, even when a tie would otherwise show more (edge case: 20+ tied). */
export const MAX_LEADER_ENTRIES = 10;

function isValidDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return !isNaN(date.getTime());
}

/** Mirrors Trainings.jsx's isFuture: an invalid day falls to "past" so it is still counted somewhere. */
function isUpcomingTraining(training) {
  return isValidDate(training.day) && new Date(training.day) >= new Date();
}

/**
 * Team/training/game counts, optionally scoped to one team. A training or
 * game with no matching team is excluded when `teamId` is given, counted
 * when it isn't (edge case). Never mutates its inputs (AD-004).
 */
export function counts({ teams = [], trainings = [], games = [] }, teamId) {
  const scopedTeams = teamId != null ? teams.filter((t) => t.id === teamId) : teams;
  const scopedTrainings =
    teamId != null ? trainings.filter((t) => t.teamId === teamId) : trainings;
  const scopedGames = teamId != null ? games.filter((g) => g.teamId === teamId) : games;

  const upcomingTrainings = scopedTrainings.filter(isUpcomingTraining).length;
  const playedGames = scopedGames.filter(hasResult).length;

  return {
    teams: scopedTeams.length,
    trainings: {
      total: scopedTrainings.length,
      past: scopedTrainings.length - upcomingTrainings,
      upcoming: upcomingTrainings,
    },
    games: {
      total: scopedGames.length,
      played: playedGames,
      upcoming: scopedGames.length - playedGames,
    },
  };
}

/**
 * Ranks pre-scored entries `{ id, name, value, rank }` highest-`rank` first,
 * ties broken by name for determinism (AC DASH-05.4). Whole rank-tiers are
 * accumulated until the count reaches `n` (a tie can push the list past `n`),
 * then the rendered list is hard-capped at MAX_LEADER_ENTRIES with the
 * remainder reported as `overflow` (edge case: 20+ tied). By default entries
 * with a non-positive `rank` are excluded — the "never show a zero-value
 * leader" rule — but `excludeNonPositive: false` opts out for metrics where 0
 * is a real value (ratings' null-vs-zero trap).
 */
function rankEntries(entries, n, { excludeNonPositive = true } = {}) {
  const filtered = excludeNonPositive ? entries.filter((e) => e.rank > 0) : entries;

  const sorted = [...filtered].sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank;
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });

  const tiers = [];
  for (const entry of sorted) {
    const lastTier = tiers[tiers.length - 1];
    if (lastTier && lastTier[0].rank === entry.rank) {
      lastTier.push(entry);
    } else {
      tiers.push([entry]);
    }
  }

  const picked = [];
  for (const tier of tiers) {
    if (picked.length >= n) break;
    picked.push(...tier);
  }

  const overflow = Math.max(0, picked.length - MAX_LEADER_ENTRIES);
  const capped = picked.slice(0, MAX_LEADER_ENTRIES);

  return {
    entries: capped.map(({ id, name, value }) => ({ id, name, value })),
    overflow,
  };
}

/** Top `n` players by goals, zero-goal players excluded (AC DASH-05.1, DASH-05.6). */
export function topScorers(players = [], n) {
  const entries = players.map((p) => ({
    id: p.id,
    name: p.name,
    value: p.goals ?? 0,
    rank: p.goals ?? 0,
  }));
  return rankEntries(entries, n);
}

/** Top `n` players by total cards, yellows and reds kept separate for display (AC DASH-05.3). */
export function topCarded(players = [], cards = [], n) {
  const entries = players.map((p) => {
    const totals = cardTotals(cards, p.id);
    return { id: p.id, name: p.name, value: totals, rank: totals.yellow + totals.red };
  });
  return rankEntries(entries, n);
}

/**
 * Top `n` teams by count of played games (AC DASH-05.2). "Played" matches
 * `gameService.getPlayed`'s definition — a game with a recorded result
 * (`hasResult`). Not part of tasks.md T1's literal function list; added per
 * design.md to close the gap T5's Most Games tile otherwise has no data for.
 */
export function topTeamGames(teams = [], games = [], n) {
  const entries = teams.map((t) => {
    const played = games.filter((g) => g.teamId === t.id && hasResult(g)).length;
    return { id: t.id, name: `${t.club} ${t.name}`, value: played, rank: played };
  });
  return rankEntries(entries, n);
}

/** Top `n` players by average rating; unrated (`null` average) players excluded, never ranked as 0 (AC DASH-07.2). */
export function topRated(players = [], ratings = [], n) {
  const entries = players
    .map((p) => {
      const avg = average(ratings.filter((r) => r.playerId === p.id));
      return avg == null ? null : { id: p.id, name: p.name, value: avg, rank: avg };
    })
    .filter(Boolean);
  return rankEntries(entries, n, { excludeNonPositive: false });
}

/**
 * The soonest future training or game across both types, or `null`
 * (AC DASH-06.1, DASH-06.2). Reuses `calendarEvents.toEvents` so an invalid
 * date is skipped exactly as it is on the calendar (edge case), and
 * `compareEvents` so the tie-break (AC DASH-06.5) matches the calendar's.
 */
export function nextEvent(trainings = [], games = [], teams = []) {
  const now = new Date();
  const future = toEvents(trainings, games, teams).filter((e) => e.date >= now);
  if (future.length === 0) return null;

  return [...future].sort(compareEvents)[0];
}
