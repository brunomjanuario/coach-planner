import { formatGameDate, homeAwayPrefix } from "../lib/gameSchedule";

/**
 * The prominent next-fixture card above the fixtures list — the page's
 * headline answer to "who do we play next?" (AC GLAY-04.1). Visually
 * distinct from GameRow (a plain hover-highlighted <li>) via its own
 * bordered, rounded surface, so it reads as a callout rather than a list
 * row.
 */
export default function NextGameCard({ game, teamName, onSelect }) {
  if (!game) {
    return (
      <div className="w-full border-2 rounded-2xl p-4 text-center text-sm text-gray-500">
        No upcoming games
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect && onSelect(game)}
      className="w-full text-left border-2 rounded-2xl p-4 hover:bg-gray-50 focus:outline-2 focus:outline-blue-500"
    >
      <div className="text-xs text-gray-500 uppercase tracking-wide">Next Game</div>
      <div className="text-lg font-semibold break-words">
        {homeAwayPrefix(game)} {game.opponent}
      </div>
      <div className="text-sm text-gray-500">{formatGameDate(game.date)}</div>
      {game.competition && (
        <div className="text-xs text-gray-400">{game.competition}</div>
      )}
      {teamName && <div className="text-xs text-gray-400">{teamName}</div>}
    </button>
  );
}
