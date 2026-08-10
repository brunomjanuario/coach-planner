import { useId, useState } from "react";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import Button from "./Button";
import ConfirmationPopup from "./ConfirmationPopup";

/**
 * The add/rename/delete-with-usage-count list body shared by every
 * reference list (opponents, competitions). The host owns data loading and
 * refetching; this component only renders from `items` and calls back.
 */
export default function ReferenceListManager({
  items,
  nouns,
  onCreate,
  onRename,
  onDelete,
  usageCount,
}) {
  const nameInputId = useId();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteCount, setDeleteCount] = useState(0);

  const handleChange = (e) => {
    if (error) setError("");
    setName(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onCreate(name);
      setName("");
      setError("");
    } catch (err) {
      setError(
        err.message || `Failed to create the ${nouns.singular}. Please try again.`
      );
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditName(item.name);
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
      await onRename({ id, name: editName });
      setEditingId(null);
      setEditName("");
      setEditError("");
    } catch (err) {
      setEditError(
        err.message || `Failed to rename the ${nouns.singular}. Please try again.`
      );
    }
  };

  const requestDelete = async (item) => {
    const count = await usageCount(item);
    setDeleteCount(count);
    setDeleteTarget(item);
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
    setDeleteCount(0);
  };

  const confirmDelete = async () => {
    await onDelete(deleteTarget.id);
    setDeleteTarget(null);
    setDeleteCount(0);
  };

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 ? (
        <p>No {nouns.plural} yet. Add your first one below.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) =>
            editingId === item.id ? (
              <li key={item.id} className="border rounded px-3 py-2">
                <form
                  onSubmit={(e) => handleEditSubmit(e, item.id)}
                  className="flex gap-2"
                >
                  <label
                    htmlFor={`${nameInputId}-edit-${item.id}`}
                    className="sr-only"
                  >
                    Rename {item.name}
                  </label>
                  <input
                    id={`${nameInputId}-edit-${item.id}`}
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
                key={item.id}
                className="border rounded px-3 py-2 flex items-center justify-between gap-2"
              >
                <span className="break-words">{item.name}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    aria-label={`Rename ${item.name}`}
                    className="cursor-pointer rounded hover:bg-lightgrey p-1"
                    onClick={() => startEdit(item)}
                  >
                    <IconEdit size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${item.name}`}
                    className="cursor-pointer rounded hover:bg-lightgrey p-1"
                    onClick={() => requestDelete(item)}
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1">
          <label htmlFor={nameInputId} className="sr-only">
            New {nouns.singular}
          </label>
          <input
            id={nameInputId}
            type="text"
            value={name}
            onChange={handleChange}
            placeholder={`New ${nouns.singular}`}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <Button type="submit" variant="primary">
          Add
        </Button>
      </form>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {deleteTarget && (
        <ConfirmationPopup
          message={`Delete "${deleteTarget.name}"? ${deleteCount} game${deleteCount === 1 ? "" : "s"} use this ${nouns.singular}.`}
          onSubmit={confirmDelete}
          onClose={cancelDelete}
        />
      )}
    </div>
  );
}
