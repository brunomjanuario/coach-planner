import { formatTrainingDate, exerciseSummary } from "../lib/trainingDisplay";

/**
 * Renders a single training everywhere it's listed: number badge, date,
 * duration, team and exercise summary, as a keyboard-reachable button
 * (AC TCARD-01, TCARD-03). Explicit colours on both the normal and `past`
 * treatments (never an inherited page colour) so contrast never depends on
 * the surrounding panel — guard against the `14` defect class.
 */
export default function TrainingCard({ training, teamName, past = false, onSelect }) {
  const number = training.number ?? "—";
  const dateLabel = formatTrainingDate(training.day);
  const resolvedTeamName = teamName || "Unassigned";
  const summary = exerciseSummary(training.exercises);
  const mismatch = summary.count > 0 && summary.plannedMinutes !== training.duration;
  const exerciseText = mismatch ? `${summary.text} of ${training.duration}` : summary.text;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Training #${number}, ${dateLabel}, ${resolvedTeamName}`}
      className={`w-full text-left p-3 rounded focus:outline-2 focus:outline-blue-500 ${
        past ? "bg-lightgrey text-gray-300" : "bg-lightblack text-white hover:bg-hover"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">Training #{number}</span>
        <span className="text-sm">{dateLabel}</span>
      </div>
      <div className="text-sm break-words">{resolvedTeamName}</div>
      <div className="text-sm">{training.duration} min</div>
      <div className="text-xs opacity-80">{exerciseText}</div>
    </button>
  );
}
