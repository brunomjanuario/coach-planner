import { hasResult, deriveOutcome } from "../lib/gameResult";
import { formatGameDate, homeAwayPrefix } from "../lib/gameSchedule";

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
          {homeAwayPrefix(game)} {game.opponent}
        </span>
        <span className="flex-shrink-0 text-sm text-gray-400">
          {formatGameDate(game.date)}
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
