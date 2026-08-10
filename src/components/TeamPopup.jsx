import React, { useId, useState } from "react";
import { teamService } from "../services/teamService";
import Button from "./Button";
import PopupActions from "./PopupActions";
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
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (team != null) {
        await teamService.update(formData);
      } else {
        await teamService.create(formData);
      }
      onClose();
    } catch (err) {
      console.error("Failed to save team:", err);
      setError("Failed to save the team. Please try again.");
    }
  };

  return (
    <PopupShell
      title="Team Form"
      footer={
        <PopupActions>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary">
            Submit
          </Button>
        </PopupActions>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="team-name" className="block text-sm font-medium">
            Name
          </label>
          <input
            id="team-name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div>
          <label htmlFor="team-club" className="block text-sm font-medium">
            Club
          </label>
          <input
            id="team-club"
            type="text"
            name="club"
            value={formData.club}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div>
          <label htmlFor="team-season" className="block text-sm font-medium">
            Season
          </label>
          <input
            id="team-season"
            type="text"
            name="season"
            value={formData.season}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </PopupShell>
  );
}
