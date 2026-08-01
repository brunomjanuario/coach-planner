import { hasResult, deriveOutcome } from "../lib/gameResult";

/** Locale-formats a game's date, falling back to "Invalid date" (matches pages/Trainings.jsx's formatDay). */
function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return isNaN(d.getTime()) ? "Invalid date" : d.toLocaleString();
}

export default function GameRow({ game, onSelect }) {
  const played = hasResult(game);
  const outcome = deriveOutcome(game);

  return (
    <li
      className="p-3 rounded cursor-pointer hover:bg-lightblack"
      onClick={() => onSelect && onSelect(game)}
    >
      <div className="flex justify-between items-center gap-2">
        <span className="break-words">
          {game.isHome ? "vs" : "@"} {game.opponent}
        </span>
        <span className="flex-shrink-0 text-sm text-gray-400">
          {formatDate(game.date)}
        </span>
      </div>
      {played && (
        <div className="flex items-center gap-2 text-sm mt-1">
          <span>
            {game.usScore}–{game.themScore}
          </span>
          <span className="capitalize">{outcome}</span>
        </div>
      )}
    </li>
  );
}
