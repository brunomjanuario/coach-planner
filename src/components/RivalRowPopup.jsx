import { useId, useState } from "react";
import PopupShell from "./PopupShell";

const NUMBER_FIELDS = [
  { name: "played", label: "Played" },
  { name: "won", label: "Won" },
  { name: "drawn", label: "Drawn" },
  { name: "lost", label: "Lost" },
  { name: "goalsFor", label: "Goals For" },
  { name: "goalsAgainst", label: "Goals Against" },
];

function isValidFigure(value) {
  if (String(value).trim() === "") return false;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0;
}

/**
 * Create/edit popup for a manually-entered rival standings row. Validates
 * client-side (mirrors standingsService's own validation, kept in sync
 * deliberately) so a bad submission never reaches onSubmit — same "block
 * submission" contract as GameSavePopup/GameResultPopup.
 */
export default function RivalRowPopup({ row, ourTeamName, onClose, onSubmit }) {
  const formId = useId();
  const [formData, setFormData] = useState(() => ({
    id: row?.id,
    name: row?.name ?? "",
    played: row?.played != null ? String(row.played) : "",
    won: row?.won != null ? String(row.won) : "",
    drawn: row?.drawn != null ? String(row.drawn) : "",
    lost: row?.lost != null ? String(row.lost) : "",
    goalsFor: row?.goalsFor != null ? String(row.goalsFor) : "",
    goalsAgainst: row?.goalsAgainst != null ? String(row.goalsAgainst) : "",
  }));
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (error) setError("");
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const duplicatesOurTeam =
    ourTeamName != null &&
    formData.name.trim() !== "" &&
    formData.name.trim().toLowerCase() === ourTeamName.trim().toLowerCase();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Please enter the team's name.");
      return;
    }

    if (!NUMBER_FIELDS.every((field) => isValidFigure(formData[field.name]))) {
      setError("Please enter a valid, non-negative number for every figure.");
      return;
    }

    const played = Number(formData.played);
    const won = Number(formData.won);
    const drawn = Number(formData.drawn);
    const lost = Number(formData.lost);

    if (won + drawn + lost !== played) {
      setError(
        `Won, drawn and lost (${won + drawn + lost}) must add up to played (${played}).`
      );
      return;
    }

    setError("");
    try {
      if (onSubmit) {
        await onSubmit({
          id: formData.id,
          name: formData.name.trim(),
          played,
          won,
          drawn,
          lost,
          goalsFor: Number(formData.goalsFor),
          goalsAgainst: Number(formData.goalsAgainst),
        });
      }
      onClose();
    } catch (err) {
      console.error("Failed to save the rival row:", err);
      setError(err.message || "Failed to save the rival row. Please try again.");
    }
  };

  return (
    <PopupShell
      title={row ? "Edit Rival Row" : "Add Rival Row"}
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
            {row ? "Save" : "Add"}
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Team Name
          </label>
          <input
            id="name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
          {duplicatesOurTeam && (
            <p className="text-sm text-yellow-600">
              This matches your own team's name — you'll have two rows for
              the same club.
            </p>
          )}
        </div>
        {NUMBER_FIELDS.map((field) => (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium">
              {field.label}
            </label>
            <input
              id={field.name}
              type="text"
              inputMode="numeric"
              name={field.name}
              value={formData[field.name]}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
        ))}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </PopupShell>
  );
}
