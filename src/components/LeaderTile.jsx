const TILE_CLASS = "w-full border px-3 py-2 rounded-2xl";

function defaultRenderValue(value) {
  return String(value);
}

/**
 * A ranked top-N list (players or teams). `data` is the `{ entries, overflow }`
 * shape returned by dashboardStats' ranking functions — already sorted,
 * tied, and capped, so this component only renders what it's given. Shares
 * `StatTile`'s empty/loading text conventions without a common base
 * component: the two bodies differ enough (a list vs. a single figure) that
 * extracting a shared wrapper for two call sites would be a premature
 * abstraction.
 */
export default function LeaderTile({
  label,
  data,
  renderValue = defaultRenderValue,
  loading = false,
  emptyLabel = "No data yet",
  note,
}) {
  if (loading) {
    return (
      <div className={TILE_CLASS}>
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-sm text-gray-300" aria-hidden="true">
          —
        </div>
      </div>
    );
  }

  const entries = data?.entries ?? [];
  const overflow = data?.overflow ?? 0;

  return (
    <div className={TILE_CLASS}>
      <div className="text-sm text-gray-500">{label}</div>
      {note && <div className="text-xs text-gray-400">{note}</div>}
      {entries.length === 0 ? (
        <div className="text-sm">{emptyLabel}</div>
      ) : (
        <ol>
          {entries.map((entry) => (
            <li key={entry.id} className="flex justify-between gap-2 text-sm">
              <span>
                {entry.rank}. {entry.name}
              </span>
              <span>{renderValue(entry.value)}</span>
            </li>
          ))}
        </ol>
      )}
      {overflow > 0 && (
        <div className="text-xs text-gray-400">+{overflow} more tied</div>
      )}
    </div>
  );
}
