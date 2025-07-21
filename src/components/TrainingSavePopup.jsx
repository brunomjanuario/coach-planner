import React, { useState } from "react";
import { trainingService } from "../services/trainingService";

export default function TrainingSavePopup({ teamId, onClose }) {
  const [formData, setFormData] = useState({
    id: Math.floor(Math.random() * 10000),
    teamId: teamId || null,
    day: "",
    duration: 90,
    exercises: [],
    exerciseInput: "",
  });

  function onSubmit(training) {
    trainingService.create(training);
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddExercise = () => {
    if (formData.exerciseInput.trim() !== "") {
      setFormData((prev) => ({
        ...prev,
        exercises: [
          ...prev.exercises,
          { description: prev.exerciseInput, id: Date.now() },
        ],
        exerciseInput: "",
      }));
    }
  };

  const handleRemoveExercise = (id) => {
    setFormData((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((ex) => ex.id !== id),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit)
      onSubmit({
        id: formData.id,
        teamId: formData.teamId,
        day: new Date(formData.day),
        duration: Number(formData.duration),
        exercises: formData.exercises,
      });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/[var(--bg-opacity)] [--bg-opacity:50%] flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-md text-black">
        <h2 className="text-xl mb-4 font-bold">Create Training</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Date & Time</label>
            <input
              type="datetime-local"
              name="day"
              value={formData.day}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Duration (minutes)
            </label>
            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Exercises</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                name="exerciseInput"
                value={formData.exerciseInput}
                onChange={handleChange}
                className="flex-1 border px-3 py-2 rounded"
                placeholder="Exercise description"
              />
              <button
                type="button"
                onClick={handleAddExercise}
                className="px-3 py-2 bg-blue-500 text-white rounded"
              >
                Add
              </button>
            </div>
            <ul>
              {formData.exercises.map((ex) => (
                <li
                  key={ex.id}
                  className="flex justify-between items-center bg-gray-100 rounded px-2 py-1 mb-1"
                >
                  <span>{ex.description}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(ex.id)}
                    className="text-red-500 ml-2"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
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
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
