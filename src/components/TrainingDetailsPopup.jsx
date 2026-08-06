import React, { useState } from "react";
import { totalPlannedMinutes } from "../lib/trainingDuration";
import Button from "./Button";
import ConfirmationPopup from "./ConfirmationPopup";
import ExerciseDetailsPopup from "./ExerciseDetailsPopup";
import PopupActions from "./PopupActions";
import SquadRatingPopup from "./SquadRatingPopup";
import PopupShell from "./PopupShell";

export default function TrainingDetailsPopup({ training, onClose, onEdit, onDelete }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);

  if (!training) return null;

  const selectedExercise =
    training.exercises?.find((ex) => ex.id === selectedExerciseId) ?? null;

  const trainingLabel =
    typeof training.number === "number"
      ? `Training #${training.number}`
      : "this training";

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    if (onDelete) await onDelete(training);
    onClose();
  };

  return (
    <>
      <PopupShell
        title={
          typeof training.number === "number"
            ? `Training #${training.number}`
            : "Training Details"
        }
        footer={
          <PopupActions
            destructive={
              <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                Delete
              </Button>
            }
          >
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button variant="secondary" onClick={() => setShowRatingPopup(true)}>
              Rate squad
            </Button>
            <Button variant="primary" onClick={onEdit}>
              Edit
            </Button>
          </PopupActions>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Date & Time</label>
            <div className="w-full border px-3 py-2 rounded bg-gray-100">
              {training.day instanceof Date
                ? training.day.toLocaleString()
                : new Date(training.day).toLocaleString()}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">
              Duration (minutes)
            </label>
            <div className="w-full border px-3 py-2 rounded bg-gray-100">
              {training.duration}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Exercises</label>
            <ul>
              {training.exercises && training.exercises.length > 0 ? (
                training.exercises.map((ex) => (
                  <li key={ex.id} className="mb-1">
                    <button
                      type="button"
                      onClick={() => setSelectedExerciseId(ex.id)}
                      className="w-full text-left bg-gray-100 rounded px-2 py-1 break-words hover:bg-gray-200 focus:outline-2 focus:outline-blue-500"
                    >
                      {ex.description} — {ex.duration != null ? ex.duration : "—"}min
                      {" · "}
                      {ex.numberOfPlayers != null ? ex.numberOfPlayers : "—"} players
                      {" · x"}
                      {ex.repetitions != null ? ex.repetitions : "—"}
                    </button>
                  </li>
                ))
              ) : (
                <li className="text-gray-500">No exercises</li>
              )}
            </ul>
            {training.exercises && training.exercises.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Total planned time: {totalPlannedMinutes(training.exercises)}min
              </p>
            )}
          </div>
        </div>
      </PopupShell>
      {showDeleteConfirm && (
        <ConfirmationPopup
          message={`Delete ${trainingLabel}?`}
          onSubmit={handleDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
      {showRatingPopup && (
        <SquadRatingPopup
          eventType="training"
          eventId={training.id}
          teamId={training.teamId}
          onClose={() => setShowRatingPopup(false)}
        />
      )}
      {selectedExercise && (
        <ExerciseDetailsPopup
          exercise={selectedExercise}
          exercises={training.exercises}
          onClose={() => setSelectedExerciseId(null)}
        />
      )}
    </>
  );
}
