import { useEffect, useId, useState } from "react";
import { opponentService } from "../services/opponentService";
import PopupShell from "./PopupShell";

export default function OpponentsPopup({ onClose }) {
  const nameInputId = useId();
  const [opponents, setOpponents] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const data = await opponentService.getAll();
    setOpponents(data);
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
      await opponentService.create(name);
      setName("");
      setError("");
      await load();
    } catch (err) {
      setError(err.message || "Failed to create the opponent. Please try again.");
    }
  };

  return (
    <PopupShell
      title="Opponents"
      footer={
        <div className="flex flex-col gap-2">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1">
              <label htmlFor={nameInputId} className="sr-only">
                New opponent
              </label>
              <input
                id={nameInputId}
                type="text"
                value={name}
                onChange={handleChange}
                placeholder="New opponent"
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
      {!loaded ? null : opponents.length === 0 ? (
        <p>No opponents yet. Add your first one below.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {opponents.map((opponent) => (
            <li
              key={opponent.id}
              className="border rounded px-3 py-2 break-words"
            >
              {opponent.name}
            </li>
          ))}
        </ul>
      )}
    </PopupShell>
  );
}
