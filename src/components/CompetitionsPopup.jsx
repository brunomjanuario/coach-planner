import { useEffect, useId, useState } from "react";
import { competitionService } from "../services/competitionService";
import PopupShell from "./PopupShell";

export default function CompetitionsPopup({ onClose }) {
  const nameInputId = useId();
  const [competitions, setCompetitions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const data = await competitionService.getAll();
    setCompetitions(data);
  };

  useEffect(() => {
    async function init() {
      try {
        await load();
      } finally {
        setLoaded(true);
      }
    }
    init();
  }, []);

  const handleChange = (e) => {
    if (error) setError("");
    setName(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await competitionService.create(name);
      setName("");
      setError("");
      await load();
    } catch (err) {
      setError(
        err.message || "Failed to create the competition. Please try again."
      );
    }
  };

  return (
    <PopupShell
      title="Competitions"
      footer={
        <div className="flex flex-col gap-2">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1">
              <label htmlFor={nameInputId} className="sr-only">
                New competition
              </label>
              <input
                id={nameInputId}
                type="text"
                value={name}
                onChange={handleChange}
                placeholder="New competition"
                className="w-full border px-3 py-2 rounded"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Add
            </button>
          </form>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end">
            <button
              type="button"
              className="px-4 py-2 bg-gray-300 text-white rounded"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      }
    >
      {!loaded ? null : competitions.length === 0 ? (
        <p>No competitions yet. Add your first one below.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {competitions.map((competition) => (
            <li
              key={competition.id}
              className="border rounded px-3 py-2 break-words"
            >
              {competition.name}
            </li>
          ))}
        </ul>
      )}
    </PopupShell>
  );
}
