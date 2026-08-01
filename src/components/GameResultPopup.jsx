import { useState } from "react";
import { hasResult } from "../lib/gameResult";

function isValidScore(value) {
  if (value.trim() === "") return false;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0;
}

export default function GameResultPopup({ game, onClose, onSubmit, onClear }) {
  const [usScore, setUsScore] = useState(
    game?.usScore != null ? String(game.usScore) : ""
  );
  const [themScore, setThemScore] = useState(
    game?.themScore != null ? String(game.themScore) : ""
  );
  const [error, setError] = useState("");

  if (!game) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValidScore(usScore) || !isValidScore(themScore)) {
      setError("Please enter a valid, non-negative score for both teams.");
      return;
    }

    setError("");
    try {
      if (onSubmit) {
        await onSubmit({ us: Number(usScore), them: Number(themScore) });
      }
      onClose();
    } catch (err) {
      console.error("Failed to save the result:", err);
      setError("Failed to save the result. Please try again.");
    }
  };

  const handleClear = async () => {
    setError("");
    try {
      if (onClear) await onClear();
      onClose();
    } catch (err) {
      console.error("Failed to clear the result:", err);
      setError("Failed to clear the result. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/[var(--bg-opacity)] [--bg-opacity:50%] flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-md text-black">
        <h2 className="text-xl mb-4 font-bold">
          {hasResult(game) ? "Edit Result" : "Record Result"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label htmlFor="usScore" className="block text-sm font-medium">
                Us
              </label>
              <input
                id="usScore"
                type="text"
                inputMode="numeric"
                name="usScore"
                value={usScore}
                onChange={(e) => {
                  if (error) setError("");
                  setUsScore(e.target.value);
                }}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="themScore" className="block text-sm font-medium">
                {game.opponent}
              </label>
              <input
                id="themScore"
                type="text"
                inputMode="numeric"
                name="themScore"
                value={themScore}
                onChange={(e) => {
                  if (error) setError("");
                  setThemScore(e.target.value);
                }}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end space-x-2">
            {hasResult(game) && (
              <button
                type="button"
                className="px-4 py-2 bg-red-600 text-white rounded mr-auto"
                onClick={handleClear}
              >
                Clear Result
              </button>
            )}
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
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
