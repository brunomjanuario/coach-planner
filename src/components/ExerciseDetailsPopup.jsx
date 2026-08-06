import { plannedShare } from "../lib/trainingDuration";
import Button from "./Button";
import PopupActions from "./PopupActions";
import PopupShell from "./PopupShell";

function Field({ label, value }) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <div className="w-full border px-3 py-2 rounded bg-gray-100">
        {value != null ? value : "—"}
      </div>
    </div>
  );
}

/**
 * One exercise's full detail, stacked over TrainingDetailsPopup the same
 * way SquadRatingPopup already is (feature 28) — the crammed one-line
 * exercise row becomes labelled fields. `exercises` is the training's full
 * list, needed only to compute this exercise's share of planned time.
 * `exercise.diagram` is reserved for feature 29 — nothing renders here
 * until that feature fills it.
 */
export default function ExerciseDetailsPopup({ exercise, exercises, onClose }) {
  const share = plannedShare(exercise, exercises);

  return (
    <PopupShell
      title={exercise.description}
      footer={
        <PopupActions>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </PopupActions>
      }
    >
      <div className="space-y-4">
        <Field label="Description" value={exercise.description} />
        <Field
          label="Duration (minutes)"
          value={exercise.duration}
        />
        <Field label="Number of players" value={exercise.numberOfPlayers} />
        <Field label="Repetitions" value={exercise.repetitions} />
        {share != null && (
          <p className="text-sm text-gray-500">
            {share}% of the session's planned time
          </p>
        )}
      </div>
    </PopupShell>
  );
}
