import React, { useId, useState } from "react";
import { teamService } from "../services/teamService";
import PopupShell from "./PopupShell";

export default function TeamPopup({ team, onClose }) {
  const formId = useId();
  const [formData, setFormData] = useState({
    id: team != null ? team.id : undefined,
    name: team != null ? team.name : "",
    club: team != null ? team.club : "",
    season: team != null ? team.season : "",
    players: team != null ? team.players : [],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (team != null) {
      teamService.update(formData);
    } else {
      teamService.create(formData);
    }

    onClose();
  };

  return (
    <PopupShell
      title="Team Form"
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
            Submit
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Club</label>
          <input
            type="text"
            name="club"
            value={formData.club}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Season</label>
          <input
            type="text"
            name="season"
            value={formData.season}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>
      </form>
    </PopupShell>
  );
}
