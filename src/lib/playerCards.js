/**
 * Amateur/youth threshold for a yellow-card suspension. A single named
 * constant so changing the rule is a one-line edit (AC CARD-05.5).
 */
export const SUSPENSION_THRESHOLD = 5;

/**
 * Counts a player's yellow and red cards. When `teamGameIds` is provided,
 * only cards whose `gameId` is in that set count — the games belonging to
 * the player's team (AC CARD-04.4). Without it, every card matching
 * `playerId` counts. Never mutates `cards` (AD-004).
 */
export function cardTotals(cards, playerId, teamGameIds) {
  const relevant = (cards ?? []).filter((card) => {
    if (card.playerId !== playerId) return false;
    if (teamGameIds != null && !teamGameIds.has(card.gameId)) return false;
    return true;
  });

  return {
    yellow: relevant.filter((card) => card.type === "yellow").length,
    red: relevant.filter((card) => card.type === "red").length,
  };
}

/**
 * Derives a suspension warning level from a player's card totals.
 * A red card always means "suspended" regardless of yellow count
 * (AC CARD-05.3) — real ban lengths vary by offence and aren't modeled.
 * Otherwise: "suspended" at or above SUSPENSION_THRESHOLD yellows,
 * "approaching" at exactly one below it, "none" otherwise.
 */
export function suspensionStatus({ yellow, red }) {
  if (red > 0) return "suspended";
  if (yellow >= SUSPENSION_THRESHOLD) return "suspended";
  if (yellow === SUSPENSION_THRESHOLD - 1) return "approaching";
  return "none";
}
