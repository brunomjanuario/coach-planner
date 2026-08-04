import React, { useId, useState, useEffect } from "react";
import { IconArrowUp, IconArrowDown } from "@tabler/icons-react";
import { teamService } from "../services/teamService";
import ExerciseFields from "./ExerciseFields";
import { totalPlannedMinutes } from "../lib/trainingDuration";
import { toInputValue, fromInputValue } from "../lib/datetime";
import PopupShell from "./PopupShell";

export default function TrainingSavePopup({ training, teamId, onClose, onSubmit }) {
  const formId = useId();
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(() => ({
    id: training?.id,
    teamId: training?.teamId ?? null,
    day: training
      ? toInputValue(training.day instanceof Date ? training.day : new Date(training.day))
      : "",
    duration: training?.duration ?? 90,
    exercises: training?.exercises ?? [],
  }));
  const [editingExerciseId, setEditingExerciseId] = useState(null);

  useEffect(() => {
    async function loadTeams() {
      try {
        const data = await teamService.getAll();
        setTeams(data);
        if (
          training == null &&
          teamId != null &&
          data.some((team) => team.id === teamId)
        ) {
          setFormData((prev) => ({ ...prev, teamId }));
        }
      } catch (err) {
        console.error("Failed to load teams:", err);
      } finally {
        setLoadingTeams(false);
      }
    }

    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "teamId") {
      if (error) setError("");
      const matched = teams.find((team) => String(team.id) === value);
      setFormData((prev) => ({ ...prev, teamId: matched ? matched.id : null }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddExercise = (exercise) => {
    if (editingExerciseId != null) {
      setFormData((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === editingExerciseId ? { ...ex, ...exercise } : ex
        ),
      }));
      setEditingExerciseId(null);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        { ...exercise, trainingId: prev.id ?? null },
      ],
    }));
  };

  const handleMoveExercise = (id, direction) => {
    setFormData((prev) => {
      const index = prev.exercises.findIndex((ex) => ex.id === id);
      const swapWith = index + direction;
      if (index === -1 || swapWith < 0 || swapWith >= prev.exercises.length) {
        return prev;
      }

      const exercises = [...prev.exercises];
      [exercises[index], exercises[swapWith]] = [exercises[swapWith], exercises[index]];
      return { ...prev, exercises };
    });
  };

  const handleRemoveExercise = (id) => {
    if (editingExerciseId === id) setEditingExerciseId(null);
    setFormData((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((ex) => ex.id !== id),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.teamId) {
      setError("Please select a team.");
      return;
    }

    const currentTeams = await teamService.getAll();
    if (!currentTeams.some((team) => team.id === formData.teamId)) {
      setError("Selected team no longer exists. Please choose another team.");
      return;
    }

    const day = fromInputValue(formData.day);
    if (!day || isNaN(day.getTime())) {
      setError("Please enter a valid date and time.");
      return;
    }

    setError("");
    try {
      if (onSubmit) {
        await onSubmit({
          id: formData.id,
          teamId: formData.teamId,
          day,
          duration: Number(formData.duration),
          exercises: formData.exercises,
        });
      }
      onClose();
    } catch (err) {
      console.error("Failed to save training:", err);
      setError("Failed to save the training. Please try again.");
    }
  };

  return (
    <PopupShell
      title={training ? "Edit Training" : "Create Training"}
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
            {training ? "Save" : "Create"}
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Team</label>
          <select
            name="teamId"
            value={formData.teamId ?? ""}
            onChange={handleChange}
            disabled={loadingTeams || teams.length === 0}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="">Select a team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.club} {team.name}
              </option>
            ))}
          </select>
          {!loadingTeams && teams.length === 0 && (
            <p className="text-sm text-red-500">
              No teams yet. Add one on the Teams page first.
            </p>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
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
          <ExerciseFields
            key={editingExerciseId ?? "new"}
            exercise={formData.exercises.find((ex) => ex.id === editingExerciseId) ?? null}
            onAdd={handleAddExercise}
            onCancelEdit={() => setEditingExerciseId(null)}
          />
          <ul className="max-h-48 overflow-y-auto mt-2">
            {formData.exercises.map((ex, index) => (
              <li
                key={ex.id}
                className="flex justify-between items-center bg-gray-100 rounded px-2 py-1 mb-1"
              >
                <span className="break-words">
                  {ex.description} — {ex.duration}min
                  {ex.numberOfPlayers != null ? ` · ${ex.numberOfPlayers} players` : ""}
                  {ex.repetitions != null ? ` · x${ex.repetitions}` : ""}
                </span>
                <span className="flex gap-2 ml-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMoveExercise(ex.id, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                    className="disabled:opacity-30"
                  >
                    <IconArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveExercise(ex.id, 1)}
                    disabled={index === formData.exercises.length - 1}
                    aria-label="Move down"
                    className="disabled:opacity-30"
                  >
                    <IconArrowDown size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingExerciseId(ex.id)}
                    className="text-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(ex.id)}
                    className="text-red-500"
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {formData.exercises.length > 0 &&
            (() => {
              const total = totalPlannedMinutes(formData.exercises);
              const sessionDuration = Number(formData.duration);
              const overage = total - sessionDuration;
              return overage > 0 ? (
                <p className="text-sm text-red-500 mt-2">
                  Planned time {total}min exceeds the session by {overage} minutes.
                </p>
              ) : (
                <p className="text-sm text-gray-500 mt-2">
                  Planned time {total}min — {-overage} minutes remaining.
                </p>
              );
            })()}
        </div>
      </form>
    </PopupShell>
  );
}
