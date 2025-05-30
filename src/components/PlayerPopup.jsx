import React, { useState } from "react";
import { teamService } from "../services/teamService";

export default function PlayerPopup({ player, teamId, onClose }) {
  const [formData, setFormData] = useState({
    id: player !== null ? player.id : Math.floor(Math.random() * 100),
    teamId: player !== null ? player.teamId : teamId,
    name: player !== null ? player.name : "",
    age: player !== null ? player.age : "",
    shirtNumber: player !== null ? player.shirtNumber : "",
    goals: player !== null ? player.goals : 0,
    assists: player !== null ? player.assists : 0,
    concededGoals: player !== null ? player.concededGoals : 0,
    position: player !== null ? player.position : "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const data =
      name === "age" || name === "shirtNumber" ? Number(value) : value;

    setFormData((prev) => ({ ...prev, [name]: data }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (player !== null) {
      teamService.updatePlayer(formData);
    } else {
      teamService.addPlayer(teamId, formData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/[var(--bg-opacity)] [--bg-opacity:50%] flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-md text-black">
        <h2 className="text-xl mb-4 font-bold">Player Form</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
