/**
 * The null-vs-zero guard (design.md). `usScore`/`themScore` are flat
 * nullable fields on Game, so "has a result" and "what's the outcome" must
 * never be checked with an inline `!= null` or truthiness comparison — a
 * recorded 0-0 draw would be misclassified as an absent result. Every place
 * in this feature that needs either answer goes through these two
 * functions.
 */

/**
 * True iff both usScore and themScore are recorded (not null/undefined).
 * A 0-0 scoreline counts as a result (AC edge case: the null-vs-zero trap).
 */
export function hasResult(game) {
  return game?.usScore != null && game?.themScore != null;
}

/**
 * Derives the outcome from the scores. Returns null when no result is
 * recorded yet. Never persisted — always computed on read (AC GAME-06.3).
 */
export function deriveOutcome(game) {
  if (!hasResult(game)) return null;
  if (game.usScore > game.themScore) return "win";
  if (game.usScore < game.themScore) return "loss";
  return "draw";
}
