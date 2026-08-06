import { useEffect, useId, useState } from "react";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { opponentService } from "../services/opponentService";
import { gameService } from "../services/gameService";
import Button from "./Button";
import ConfirmationPopup from "./ConfirmationPopup";
import PopupActions from "./PopupActions";
import PopupShell from "./PopupShell";

export default function OpponentsPopup({ onClose }) {
  const nameInputId = useId();
  const [opponents, setOpponents] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteCount, setDeleteCount] = useState(0);

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

  const startEdit = (opponent) => {
    setEditingId(opponent.id);
    setEditName(opponent.name);
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
      await opponentService.update({ id, name: editName });
      setEditingId(null);
      setEditName("");
      setEditError("");
      await load();
    } catch (err) {
      setEditError(
        err.message || "Failed to rename the opponent. Please try again."
      );
    }
  };

  const requestDelete = async (opponent) => {
    const games = await gameService.getAll();
    const normalized = opponent.name.trim().toLowerCase();
    const count = games.filter(
      (game) =>
        typeof game.opponent === "string" &&
        game.opponent.trim().toLowerCase() === normalized
    ).length;
    setDeleteCount(count);
    setDeleteTarget(opponent);
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
    setDeleteCount(0);
  };

  const confirmDelete = async () => {
    await opponentService.delete(deleteTarget.id);
    setDeleteTarget(null);
    setDeleteCount(0);
    await load();
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
            <Button type="submit" variant="primary">
              Add
            </Button>
          </form>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <PopupActions>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </PopupActions>
        </div>
      }
    >
      {!loaded ? null : opponents.length === 0 ? (
        <p>No opponents yet. Add your first one below.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {opponents.map((opponent) =>
            editingId === opponent.id ? (
              <li key={opponent.id} className="border rounded px-3 py-2">
                <form
                  onSubmit={(e) => handleEditSubmit(e, opponent.id)}
                  className="flex gap-2"
                >
                  <label
                    htmlFor={`${nameInputId}-edit-${opponent.id}`}
                    className="sr-only"
                  >
                    Rename {opponent.name}
                  </label>
                  <input
                    id={`${nameInputId}-edit-${opponent.id}`}
                    type="text"
                    value={editName}
                    onChange={(e) => {
                      if (editError) setEditError("");
                      setEditName(e.target.value);
                    }}
                    className="flex-1 border px-3 py-2 rounded"
                  />
                  <Button type="submit" variant="primary">
                    Save
                  </Button>
                  <Button variant="secondary" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </form>
                {editError && (
                  <p className="text-sm text-red-500 mt-1">{editError}</p>
                )}
              </li>
            ) : (
              <li
                key={opponent.id}
                className="border rounded px-3 py-2 flex items-center justify-between gap-2"
              >
                <span className="break-words">{opponent.name}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    aria-label={`Rename ${opponent.name}`}
                    className="cursor-pointer rounded hover:bg-lightgrey p-1"
                    onClick={() => startEdit(opponent)}
                  >
                    <IconEdit size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${opponent.name}`}
                    className="cursor-pointer rounded hover:bg-lightgrey p-1"
                    onClick={() => requestDelete(opponent)}
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
          message={`Delete "${deleteTarget.name}"? ${deleteCount} game${deleteCount === 1 ? "" : "s"} use this opponent.`}
          onSubmit={confirmDelete}
          onClose={cancelDelete}
        />
      )}
    </PopupShell>
  );
}
