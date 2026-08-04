import { useId, useState, useEffect } from "react";
import { teamService } from "../services/teamService";
import { ratingService } from "../services/ratingService";
import RatingInput from "./RatingInput";
import PopupShell from "./PopupShell";

/**
 * Rates every player on an event's team in a single pass (AC RATE-01.1,
 * RATE-04). `eventType`/`eventId` identify the training or game the
 * ratings are recorded against (AC RATE-02.3). Existing ratings for the
 * event pre-fill each player's input (AC RATE-02.5). Submitting calls
 * `ratingService.setRating` for every player — a blank input passes
 * `value: null`, which never creates a record and clears one if it existed
 * (AC RATE-01.3); a previously-rated player re-submitted overwrites rather
 * than duplicating (AC RATE-01.4).
 */
export default function SquadRatingPopup({ eventType, eventId, teamId, onClose }) {
  const formId = useId();
  const [players, setPlayers] = useState([]);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const teams = await teamService.getAll();
        const team = teams.find((t) => t.id === teamId);
        const teamPlayers = team?.players ?? [];
        setPlayers(teamPlayers);

        const existing = await ratingService.getByEvent(eventType, eventId);
        const initial = {};
        for (const player of teamPlayers) {
          const found = existing.find((rating) => rating.playerId === player.id);
          initial[player.id] = found ? found.value : null;
        }
        setRatings(initial);
      } catch (err) {
        console.error("Failed to load squad for rating:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [teamId, eventType, eventId]);

  function handleChange(playerId, value) {
    setRatings((prev) => ({ ...prev, [playerId]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      for (const player of players) {
        await ratingService.setRating({
          playerId: player.id,
          eventType,
          eventId,
          value: ratings[player.id] ?? null,
        });
      }
      onClose();
    } catch (err) {
      console.error("Failed to save ratings:", err);
      setError("Failed to save ratings. Please try again.");
    }
  }

  if (loading) return null;

  if (players.length === 0) {
    return (
      <PopupShell
        title="Rate Squad"
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              className="px-4 py-2 bg-gray-300 text-white rounded"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        }
      >
        <p className="text-sm text-gray-500">No players to rate.</p>
      </PopupShell>
    );
  }

  return (
    <PopupShell
      title="Rate Squad"
      footer={
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            className="px-4 py-2 bg-gray-300 text-white rounded"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Save
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <ul className="space-y-2 max-h-80 overflow-y-auto">
          {players.map((player) => {
            const playerLabel = `#${player.shirtNumber} ${player.name}`;
            return (
              <li
                key={player.id}
                className="flex items-center justify-between gap-2 bg-gray-100 rounded px-2 py-1"
              >
                <span className="break-words">{playerLabel}</span>
                <RatingInput
                  value={ratings[player.id] ?? null}
                  onChange={(value) => handleChange(player.id, value)}
                  label={`Rate ${playerLabel}`}
                />
              </li>
            );
          })}
        </ul>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </PopupShell>
  );
}
