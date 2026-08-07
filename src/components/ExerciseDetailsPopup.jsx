import { useState } from "react";
import { plannedShare } from "../lib/trainingDuration";
import { deserialize } from "../lib/exerciseDiagram";
import Button from "./Button";
import DiagramView from "./DiagramView";
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
 * list: used to compute this exercise's share of planned time, and to step
 * between exercises with Previous/Next without closing and reopening.
 * `exercise.diagram` (feature 29) renders read-only via `DiagramView` in
 * this slot when present — `deserialize` also treats a corrupt/unrecognised
 * diagram as absent, so the region renders exactly when there is a diagram
 * to show, never a throw and never an empty frame.
 */
export default function ExerciseDetailsPopup({ exercise, exercises, onClose }) {
  const [index, setIndex] = useState(() =>
    exercises.findIndex((ex) => ex.id === exercise.id)
  );
  const current = exercises[index];
  const share = plannedShare(current, exercises);
  const canGoPrevious = index > 0;
  const canGoNext = index < exercises.length - 1;
  const hasDiagram = deserialize(current.diagram) != null;

  return (
    <PopupShell
      title={current.description}
      footer={
        <PopupActions>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="secondary"
            disabled={!canGoPrevious}
            onClick={() => setIndex((i) => i - 1)}
          >
            Previous
          </Button>
          <Button variant="secondary" disabled={!canGoNext} onClick={() => setIndex((i) => i + 1)}>
            Next
          </Button>
        </PopupActions>
      }
    >
      <div className="space-y-4">
        <Field label="Description" value={current.description} />
        <Field label="Duration (minutes)" value={current.duration} />
        <Field label="Number of players" value={current.numberOfPlayers} />
        <Field label="Repetitions" value={current.repetitions} />
        {share != null && (
          <p className="text-sm text-gray-500">
            {share}% of the session's planned time
          </p>
        )}
        {hasDiagram && (
          <div>
            <label className="block text-sm font-medium">Diagram</label>
            <DiagramView diagram={current.diagram} className="w-full rounded border bg-gray-50" />
          </div>
        )}
      </div>
    </PopupShell>
  );
}
