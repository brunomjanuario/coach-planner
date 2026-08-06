const TRACK_CLASS =
  "flex items-center gap-1 overflow-x-auto rounded-full bg-gray-100 p-1";
const CHIP_CLASS =
  "flex-shrink-0 px-3 py-1.5 rounded-full text-sm whitespace-normal break-words focus-visible:outline-2 focus-visible:outline-blue-500";
const PRESSED_CLASS = "bg-white text-gray-900 shadow-sm";
const UNPRESSED_CLASS = "text-gray-600 hover:bg-gray-200";

function teamLabel(team) {
  return team.name ? `${team.club} ${team.name}` : team.club;
}

/**
 * A segmented chip bar replacing the dashboard's bare team <select>
 * (feature 32) — shows every option and the active one at once, which a
 * closed dropdown can't. Toggle-button semantics (`role="group"` +
 * `aria-pressed`), not tabs: there's no per-chip panel and no roving focus,
 * so borrowing tablist semantics would mislead a screen reader. Purely
 * controlled — the parent owns `activeTeamId`.
 */
export default function TeamFilterBar({ teams = [], activeTeamId, onChange }) {
  return (
    <div className={TRACK_CLASS} role="group" aria-label="Filter dashboard by team">
      <button
        type="button"
        className={`${CHIP_CLASS} ${activeTeamId == null ? PRESSED_CLASS : UNPRESSED_CLASS}`}
        aria-pressed={activeTeamId == null ? "true" : "false"}
        onClick={() => onChange(null)}
      >
        All teams
      </button>
      {teams.map((team) => {
        const pressed = activeTeamId === team.id;
        return (
          <button
            key={team.id}
            type="button"
            className={`${CHIP_CLASS} ${pressed ? PRESSED_CLASS : UNPRESSED_CLASS}`}
            aria-pressed={pressed ? "true" : "false"}
            onClick={() => onChange(team.id)}
          >
            {teamLabel(team)}
          </button>
        );
      })}
    </div>
  );
}
