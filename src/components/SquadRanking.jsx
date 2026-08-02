import { useState, useEffect, useCallback } from "react";
import { ratingService } from "../services/ratingService";
import { rankSquad } from "../lib/playerRatings";

/**
 * Ranks the selected team by average rating, highest first (AC RATE-09.1).
 * A training/game/combined toggle recomputes the order from that subset by
 * re-fetching each player's ratings with `ratingService.getByPlayer`'s own
 * `eventType` filter (AC RATE-09.4) — cheap at this app's scale (`08`'s
 * risk note already flags per-player round trips as acceptable here).
 * Unrated players sort last with a "—" average, never `0` (AC RATE-09.3);
 * `rankSquad` breaks ties (equal averages, and the all-unrated case)
 * deterministically by player id (AC RATE-09.2).
 */
export default function SquadRanking({ team }) {
  const [filter, setFilter] = useState(undefined);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const players = team?.players ?? [];
      const ratingsByPlayer = new Map();
      await Promise.all(
        players.map(async (player) => {
          const ratings = await ratingService.getByPlayer(player.id, filter);
          ratingsByPlayer.set(player.id, ratings);
        })
      );
      setRanking(rankSquad(players, ratingsByPlayer));
    } catch (err) {
      console.error("Failed to load squad ranking:", err);
    } finally {
      setLoading(false);
    }
  }, [team, filter]);

  useEffect(() => {
    load();
  }, [load]);

  if (!team) return null;

  const hasAnyRating = ranking.some((entry) => entry.average !== null);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2 gap-2">
        <h3 className="text-sm font-medium">Squad Ranking</h3>
        <div className="flex gap-1" role="group" aria-label="Filter squad ranking">
          <button
            type="button"
            aria-pressed={filter === undefined}
            className={`px-2 py-1 text-xs rounded ${
              filter === undefined ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => setFilter(undefined)}
          >
            Combined
          </button>
          <button
            type="button"
            aria-pressed={filter === "training"}
            className={`px-2 py-1 text-xs rounded ${
              filter === "training" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => setFilter("training")}
          >
            Training
          </button>
          <button
            type="button"
            aria-pressed={filter === "game"}
            className={`px-2 py-1 text-xs rounded ${
              filter === "game" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => setFilter("game")}
          >
            Game
          </button>
        </div>
      </div>
      {loading ? null : ranking.length === 0 || !hasAnyRating ? (
        <p className="text-sm text-gray-500">No rated players yet.</p>
      ) : (
        <ol className="space-y-1">
          {ranking.map((entry, index) => (
            <li
              key={entry.player.id}
              className="flex items-center justify-between gap-2 bg-gray-100 rounded px-2 py-1"
            >
              <span className="break-words">
                {index + 1}. #{entry.player.shirtNumber} {entry.player.name}
              </span>
              <span className="font-semibold">
                {entry.average != null ? entry.average.toFixed(1) : "—"}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
