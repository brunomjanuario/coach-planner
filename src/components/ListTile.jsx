import { Link } from "react-router-dom";
import Tile from "./Tile";

/**
 * A dashboard tile that shows both a count and up to N linked rows to the
 * records behind it (feature 25) — StatTile shows only the number, this
 * shows the number *and* which records they are. `rows` are pre-shaped
 * `{ id, label, href }` by the caller, so this component stays agnostic to
 * whether they're teams, trainings or games. `overflow`/`basis` come
 * straight from dashboardStats' `teamRows`/`upcomingRows`.
 */
export default function ListTile({
  label,
  count,
  breakdown,
  rows = [],
  overflow = 0,
  basis,
  loading = false,
  emptyHref,
  emptyLabel = "No data yet",
  emptyLinkLabel = "Add one",
}) {
  if (loading) {
    return (
      <Tile label={label}>
        <div className="text-2xl font-semibold text-gray-300" aria-hidden="true">
          —
        </div>
      </Tile>
    );
  }

  const isEmpty = count == null || count === 0;

  if (isEmpty) {
    return (
      <Tile label={label}>
        <div className="text-sm">
          {emptyLabel}
          {emptyHref && (
            <>
              {" "}
              <Link
                to={emptyHref}
                className="text-blue-600 underline focus:outline-2 focus:outline-blue-500"
              >
                {emptyLinkLabel}
              </Link>
            </>
          )}
        </div>
      </Tile>
    );
  }

  return (
    <Tile label={label} note={basis === "past" ? "most recent" : undefined}>
      <div className="text-2xl font-semibold break-words">{count}</div>
      {breakdown && <div className="text-sm text-gray-500 break-words">{breakdown}</div>}
      <ul className="mt-1 space-y-1">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              to={row.href}
              className="block text-sm text-blue-600 hover:underline break-words focus:outline-2 focus:outline-blue-500"
            >
              {row.label}
            </Link>
          </li>
        ))}
      </ul>
      {overflow > 0 && <div className="text-xs text-gray-400">+{overflow} more</div>}
    </Tile>
  );
}
