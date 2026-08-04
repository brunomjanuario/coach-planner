import Tile from "./Tile";

function defaultRenderValue(value) {
  return String(value);
}

/**
 * A ranked top-N list (players or teams). `data` is the `{ entries, overflow }`
 * shape returned by dashboardStats' ranking functions — already sorted,
 * tied, and capped, so this component only renders what it's given.
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
      <Tile label={label}>
        <div className="text-sm text-gray-300" aria-hidden="true">
          —
        </div>
      </Tile>
    );
  }

  const entries = data?.entries ?? [];
  const overflow = data?.overflow ?? 0;

  return (
    <Tile label={label} note={note}>
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
    </Tile>
  );
}
