import { Link } from "react-router-dom";

const TILE_CLASS = "w-full border px-3 py-2 rounded-2xl block";
const INTERACTIVE_CLASS = "text-left hover:bg-gray-50 focus:outline-2 focus:outline-blue-500";

/**
 * A single dashboard number with an optional breakdown line, a signposted
 * empty state, and an optional loading placeholder. `href`/`onClick` make
 * the tile itself a focusable link/button (used by the next-event tile);
 * `emptyHref` instead links from inside the empty state to the page that
 * creates the missing record (AC DASH-04.4) — the two never nest, since a
 * tile is either empty or interactive, never both at once.
 */
export default function StatTile({
  label,
  value,
  breakdown,
  emptyHref,
  emptyLabel = "No data yet",
  loading = false,
  href,
  onClick,
}) {
  if (loading) {
    return (
      <div className={TILE_CLASS}>
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-2xl font-semibold text-gray-300" aria-hidden="true">
          —
        </div>
      </div>
    );
  }

  const isEmpty = value == null || value === 0;

  if (isEmpty) {
    return (
      <div className={TILE_CLASS}>
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-sm">
          {emptyLabel}
          {emptyHref && (
            <>
              {" "}
              <Link
                to={emptyHref}
                className="text-blue-600 underline focus:outline-2 focus:outline-blue-500"
              >
                Add one
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const body = (
    <>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {breakdown && <div className="text-sm text-gray-500">{breakdown}</div>}
    </>
  );

  if (href) {
    return (
      <Link to={href} className={`${TILE_CLASS} ${INTERACTIVE_CLASS}`}>
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${TILE_CLASS} ${INTERACTIVE_CLASS}`}>
        {body}
      </button>
    );
  }

  return <div className={TILE_CLASS}>{body}</div>;
}
