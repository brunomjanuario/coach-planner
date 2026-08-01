import { useState, useEffect } from "react";
import { teamService } from "../services/teamService";
import { toInputValue, fromInputValue } from "../lib/datetime";

export default function GameSavePopup({ game, teamId, onClose, onSubmit }) {
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(() => ({
    id: game?.id,
    teamId: game?.teamId ?? null,
    opponent: game?.opponent ?? "",
    date: game
      ? toInputValue(game.date instanceof Date ? game.date : new Date(game.date))
      : "",
    isHome: game?.isHome ?? true,
    competition: game?.competition ?? "",
  }));

  useEffect(() => {
    async function loadTeams() {
      try {
        const data = await teamService.getAll();
        setTeams(data);
        if (
          game == null &&
          teamId != null &&
          data.some((team) => team.id === teamId)
        ) {
          setFormData((prev) => ({ ...prev, teamId }));
        }
      } catch (err) {
        console.error("Failed to load teams:", err);
      } finally {
        setLoadingTeams(false);
      }
    }

    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "teamId") {
      if (error) setError("");
      const matched = teams.find((team) => String(team.id) === value);
      setFormData((prev) => ({ ...prev, teamId: matched ? matched.id : null }));
      return;
    }

    if (name === "opponent" && error) setError("");

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.teamId) {
      setError("Please select a team.");
      return;
    }

    if (!formData.opponent.trim()) {
      setError("Please enter the opponent.");
      return;
    }

    const date = fromInputValue(formData.date);
    if (!date || isNaN(date.getTime())) {
      setError("Please enter a valid date and time.");
      return;
    }

    setError("");
    try {
      if (onSubmit) {
        await onSubmit({
          id: formData.id,
          teamId: formData.teamId,
          opponent: formData.opponent.trim(),
          date,
          isHome: Boolean(formData.isHome),
          competition: formData.competition,
        });
      }
      onClose();
    } catch (err) {
      console.error("Failed to save game:", err);
      setError("Failed to save the game. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/[var(--bg-opacity)] [--bg-opacity:50%] flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-md text-black">
        <h2 className="text-xl mb-4 font-bold">
          {game ? "Edit Game" : "Create Game"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Team</label>
            <select
              name="teamId"
              value={formData.teamId ?? ""}
              onChange={handleChange}
              disabled={loadingTeams || teams.length === 0}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="">Select a team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.club} {team.name}
                </option>
              ))}
            </select>
            {!loadingTeams && teams.length === 0 && (
              <p className="text-sm text-red-500">
                No teams yet. Add one on the Teams page first.
              </p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <div>
            <label htmlFor="opponent" className="block text-sm font-medium">
              Opponent
            </label>
            <input
              id="opponent"
              type="text"
              name="opponent"
              value={formData.opponent}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Date & Time</label>
            <input
              type="datetime-local"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="isHome"
              type="checkbox"
              name="isHome"
              checked={Boolean(formData.isHome)}
              onChange={handleChange}
            />
            <label htmlFor="isHome" className="text-sm font-medium">
              Home game
            </label>
          </div>
          <div>
            <label htmlFor="competition" className="block text-sm font-medium">
              Competition
            </label>
            <input
              id="competition"
              type="text"
              name="competition"
              value={formData.competition}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
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
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              {game ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
