import React, { useId, useState } from "react";
import { teamService } from "../services/teamService";
import PopupShell from "./PopupShell";

export default function PlayerPopup({ player, teamId, onClose }) {
  const formId = useId();
  const [formData, setFormData] = useState({
    id: player !== null ? player.id : undefined,
    teamId: player !== null ? player.teamId : teamId,
    name: player !== null ? player.name : "",
    age: player !== null ? player.age : "",
    shirtNumber: player !== null ? player.shirtNumber : "",
    goals: player !== null ? player.goals : 0,
    assists: player !== null ? player.assists : 0,
    concededGoals: player !== null ? player.concededGoals : 0,
    position: player !== null ? player.position : "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    const data =
      name === "age" || name === "shirtNumber" ? Number(value) : value;

    setFormData((prev) => ({ ...prev, [name]: data }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (player !== null) {
        await teamService.updatePlayer(formData);
      } else {
        await teamService.addPlayer(teamId, formData);
      }
      onClose();
    } catch (err) {
      console.error("Failed to save player:", err);
      setError("Failed to save the player. Please try again.");
    }
  };

  return (
    <PopupShell
      title="Player Form"
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
          <label className="block text-sm font-medium">Age</label>
          <input
            type="number"
            name="age"
            value={formData.age}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Shirt Number</label>
          <input
            type="number"
            name="shirtNumber"
            value={formData.shirtNumber}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Position</label>
          <input
            type="text"
            name="position"
            value={formData.position}
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
