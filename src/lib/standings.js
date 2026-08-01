import { hasResult, deriveOutcome } from "./gameResult";

/**
 * Turns a list of games (already scoped to one team) into that team's
 * standings row. Only played games (per hasResult()) count toward every
 * figure — a scheduled fixture contributes nothing (AC GAME-07.1).
 * goalDifference and points are always derived, never read from input.
 * Returns a row of zeros — never null/NaN — when there are no played games
 * (AC GAME-07.6). Does not mutate `games` (AD-004).
 */
export function computeOurRow(games, teamName) {
  const played = (games ?? []).filter(hasResult);

  let won = 0;
  let drawn = 0;
  let lost = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  for (const game of played) {
    goalsFor += game.usScore;
    goalsAgainst += game.themScore;

    const outcome = deriveOutcome(game);
    if (outcome === "win") won += 1;
    else if (outcome === "draw") drawn += 1;
    else if (outcome === "loss") lost += 1;
  }

  return {
    name: teamName,
    played: played.length,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    points: won * 3 + drawn,
    isOurs: true,
  };
}

/**
 * Normalizes a stored RivalRow to the same StandingsRow shape computeOurRow
 * produces, so sortStandings never has to special-case which rows are ours.
 * points and goalDifference are derived here too — a RivalRow never stores
 * them (design.md Data Models).
 */
export function toStandingsRow(rivalRow) {
  const played = rivalRow.played ?? 0;
  const won = rivalRow.won ?? 0;
  const drawn = rivalRow.drawn ?? 0;
  const lost = rivalRow.lost ?? 0;
  const goalsFor = rivalRow.goalsFor ?? 0;
  const goalsAgainst = rivalRow.goalsAgainst ?? 0;

  return {
    name: rivalRow.name,
    played,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    points: won * 3 + drawn,
    isOurs: false,
  };
}

/**
 * Orders standings rows by points, then goal difference, then goals for,
 * then name — a deterministic tiebreak chain (AC GAME-07.3). Returns a new
 * array; never mutates `rows` (AD-004).
 */
export function sortStandings(rows) {
  return [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) {
      return b.goalDifference - a.goalDifference;
    }
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.name.localeCompare(b.name);
  });
}
