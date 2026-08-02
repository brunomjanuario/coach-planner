import { useState, useEffect, useCallback } from "react";
import { IconTrash } from "@tabler/icons-react";
import { ratingService } from "../services/ratingService";
import { trainingService } from "../services/trainingService";
import { gameService } from "../services/gameService";
import ConfirmationPopup from "./ConfirmationPopup";

/**
 * Lists a player's individual ratings, most recent first, so the season
 * average is explainable (AC RATE-08.1). Resolves each rating's event date
 * by joining against `trainingService`/`gameService` since a rating alone
 * only carries `(eventType, eventId)`. Deleting an entry (behind
 * `ConfirmationPopup`, consistent with card/training/game deletes) calls
 * `onChange` so the parent (`PlayerCard`) recomputes the average and form
 * without a page reload (AC RATE-08.2). A rating of exactly `0` renders as
 * `0`, not blank — the null-vs-zero trap.
 */
export default function PlayerRatingHistory({ playerId, onChange }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(async () => {
    try {
      const [ratings, trainings, games] = await Promise.all([
        ratingService.getByPlayer(playerId),
        trainingService.getAll(),
        gameService.getAll(),
      ]);
      const trainingsById = new Map(trainings.map((training) => [training.id, training]));
      const gamesById = new Map(games.map((game) => [game.id, game]));

      const resolved = ratings.map((rating) => {
        const event =
          rating.eventType === "training"
            ? trainingsById.get(rating.eventId)
            : gamesById.get(rating.eventId);
        const date = event ? (rating.eventType === "training" ? event.day : event.date) : null;
        return { ...rating, date };
      });

      resolved.sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;

        const idA = String(a.eventId);
        const idB = String(b.eventId);
        return idA < idB ? -1 : idA > idB ? 1 : 0;
      });

      setEntries(resolved);
    } catch (err) {
      console.error("Failed to load rating history:", err);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!toDelete) return;
    await ratingService.remove(toDelete.id);
    setToDelete(null);
    await load();
    onChange?.();
  }

  if (loading) return null;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium mb-2">Rating History</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">No ratings recorded yet.</p>
      ) : (
        <ul className="space-y-2 max-h-40 overflow-y-auto">
          {entries.map((entry) => {
            const dateLabel = entry.date ? new Date(entry.date).toLocaleString() : "Unknown date";
            const typeLabel = entry.eventType === "training" ? "Training" : "Game";
            return (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-2 bg-gray-100 rounded px-2 py-1"
              >
                <span className="flex items-center gap-2 break-words">
                  <span
                    className={`px-1 rounded text-white text-xs ${
                      entry.eventType === "training" ? "bg-blue-600" : "bg-green-600"
                    }`}
                  >
                    {typeLabel}
                  </span>
                  <span>{dateLabel}</span>
                  <span className="font-semibold">{entry.value}</span>
                </span>
                <button
                  type="button"
                  aria-label={`Delete ${typeLabel.toLowerCase()} rating of ${entry.value} on ${dateLabel}`}
                  onClick={() => setToDelete(entry)}
                >
                  <IconTrash size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {toDelete && (
        <ConfirmationPopup
          message="Delete this rating?"
          onSubmit={confirmDelete}
          onClose={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
