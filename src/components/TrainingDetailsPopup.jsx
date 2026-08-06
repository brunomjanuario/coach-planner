import React, { useState } from "react";
import { totalPlannedMinutes } from "../lib/trainingDuration";
import Button from "./Button";
import ConfirmationPopup from "./ConfirmationPopup";
import PopupActions from "./PopupActions";
import SquadRatingPopup from "./SquadRatingPopup";
import PopupShell from "./PopupShell";

export default function TrainingDetailsPopup({ training, onClose, onEdit, onDelete }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRatingPopup, setShowRatingPopup] = useState(false);

  if (!training) return null;

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
                  <li
                    key={ex.id}
                    className="bg-gray-100 rounded px-2 py-1 mb-1 break-words"
                  >
                    {ex.description} — {ex.duration != null ? ex.duration : "—"}min
                    {" · "}
                    {ex.numberOfPlayers != null ? ex.numberOfPlayers : "—"} players
                    {" · x"}
                    {ex.repetitions != null ? ex.repetitions : "—"}
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
    </>
  );
}
