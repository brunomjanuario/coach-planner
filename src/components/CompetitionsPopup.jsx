import { useEffect, useId, useState } from "react";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { competitionService } from "../services/competitionService";
import { gameService } from "../services/gameService";
import ConfirmationPopup from "./ConfirmationPopup";
import PopupShell from "./PopupShell";

export default function CompetitionsPopup({ onClose }) {
  const nameInputId = useId();
  const [competitions, setCompetitions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteCount, setDeleteCount] = useState(0);

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

  const startEdit = (competition) => {
    setEditingId(competition.id);
    setEditName(competition.name);
    setEditError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditError("");
  };

  const handleEditSubmit = async (e, id) => {
    e.preventDefault();
    try {
      await competitionService.update({ id, name: editName });
      setEditingId(null);
      setEditName("");
      setEditError("");
      await load();
    } catch (err) {
      setEditError(
        err.message || "Failed to rename the competition. Please try again."
      );
    }
  };

  const requestDelete = async (competition) => {
    const games = await gameService.getAll();
    const normalized = competition.name.trim().toLowerCase();
    const count = games.filter(
      (game) =>
        typeof game.competition === "string" &&
        game.competition.trim().toLowerCase() === normalized
    ).length;
    setDeleteCount(count);
    setDeleteTarget(competition);
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
    setDeleteCount(0);
  };

  const confirmDelete = async () => {
    await competitionService.delete(deleteTarget.id);
    setDeleteTarget(null);
    setDeleteCount(0);
    await load();
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
          {competitions.map((competition) =>
            editingId === competition.id ? (
              <li key={competition.id} className="border rounded px-3 py-2">
                <form
                  onSubmit={(e) => handleEditSubmit(e, competition.id)}
                  className="flex gap-2"
                >
                  <label
                    htmlFor={`${nameInputId}-edit-${competition.id}`}
                    className="sr-only"
                  >
                    Rename {competition.name}
                  </label>
                  <input
                    id={`${nameInputId}-edit-${competition.id}`}
                    type="text"
                    value={editName}
                    onChange={(e) => {
                      if (editError) setEditError("");
                      setEditName(e.target.value);
                    }}
                    className="flex-1 border px-3 py-2 rounded"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-blue-600 text-white rounded"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 bg-gray-300 text-white rounded"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                </form>
                {editError && (
                  <p className="text-sm text-red-500 mt-1">{editError}</p>
                )}
              </li>
            ) : (
              <li
                key={competition.id}
                className="border rounded px-3 py-2 flex items-center justify-between gap-2"
              >
                <span className="break-words">{competition.name}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    aria-label={`Rename ${competition.name}`}
                    className="cursor-pointer rounded hover:bg-lightgrey p-1"
                    onClick={() => startEdit(competition)}
                  >
                    <IconEdit size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${competition.name}`}
                    className="cursor-pointer rounded hover:bg-lightgrey p-1"
                    onClick={() => requestDelete(competition)}
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}
      {deleteTarget && (
        <ConfirmationPopup
          message={`Delete "${deleteTarget.name}"? ${deleteCount} game${deleteCount === 1 ? "" : "s"} use this competition.`}
          onSubmit={confirmDelete}
          onClose={cancelDelete}
        />
      )}
    </PopupShell>
  );
}
