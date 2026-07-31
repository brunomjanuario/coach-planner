import React, { useState } from "react";
import { newId } from "../lib/id";

const EMPTY_FORM = {
  description: "",
  duration: "",
  numberOfPlayers: "",
  repetitions: "",
};

function validate(form) {
  const errors = {};

  if (form.description.trim() === "") {
    errors.description = "Description is required.";
  }

  const duration = Number(form.duration);
  if (form.duration.trim() === "" || Number.isNaN(duration) || duration <= 0) {
    errors.duration = "Duration must be a positive number.";
  }

  if (form.numberOfPlayers.trim() !== "") {
    const numberOfPlayers = Number(form.numberOfPlayers);
    if (Number.isNaN(numberOfPlayers) || numberOfPlayers < 1) {
      errors.numberOfPlayers = "Number of players must be at least 1.";
    }
  }

  if (form.repetitions.trim() !== "") {
    const repetitions = Number(form.repetitions);
    if (Number.isNaN(repetitions) || repetitions < 1) {
      errors.repetitions = "Repetitions must be at least 1.";
    }
  }

  return errors;
}

export default function ExerciseFields({ onAdd }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const fieldErrors = validate(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    onAdd({
      id: newId(),
      description: form.description.trim(),
      duration: Number(form.duration),
      numberOfPlayers:
        form.numberOfPlayers.trim() === "" ? null : Number(form.numberOfPlayers),
      repetitions:
        form.repetitions.trim() === "" ? null : Number(form.repetitions),
      image: "",
    });

    setForm(EMPTY_FORM);
    setErrors({});
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium" htmlFor="exercise-description">
          Description
        </label>
        <input
          id="exercise-description"
          type="text"
          name="description"
          value={form.description}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
          placeholder="Exercise description"
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium" htmlFor="exercise-duration">
          Duration (minutes)
        </label>
        <input
          id="exercise-duration"
          type="number"
          name="duration"
          value={form.duration}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />
        {errors.duration && <p className="text-sm text-red-500">{errors.duration}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium" htmlFor="exercise-players">
          Number of players
        </label>
        <input
          id="exercise-players"
          type="number"
          name="numberOfPlayers"
          value={form.numberOfPlayers}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />
        {errors.numberOfPlayers && (
          <p className="text-sm text-red-500">{errors.numberOfPlayers}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium" htmlFor="exercise-repetitions">
          Repetitions
        </label>
        <input
          id="exercise-repetitions"
          type="number"
          name="repetitions"
          value={form.repetitions}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />
        {errors.repetitions && (
          <p className="text-sm text-red-500">{errors.repetitions}</p>
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          className="px-3 py-2 bg-blue-500 text-white rounded"
        >
          Add
        </button>
      </div>
    </div>
  );
}
