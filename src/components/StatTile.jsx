import { Link } from "react-router-dom";
import Tile from "./Tile";

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
  emptyLinkLabel = "Add one",
  loading = false,
  href,
  onClick,
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

  const isEmpty = value == null || value === 0;

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
    <Tile label={label} href={href} onClick={onClick}>
      <div className="text-2xl font-semibold break-words">{value}</div>
      {breakdown && <div className="text-sm text-gray-500 break-words">{breakdown}</div>}
    </Tile>
  );
}
