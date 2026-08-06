import { Link } from "react-router-dom";

/**
 * min-h-36 (144px) is hand-measured against LeaderTile's tallest real
 * variant — label + 3 ranked rows + an overflow line — so every tile in
 * both dashboard sections renders at one height instead of two rows sized
 * independently (feature 32, the gap 18-dashboard-grid's per-row
 * auto-rows-fr didn't reach). Verified by eye in the browser at
 * implementation; re-measure here if a tile ever grows a fourth line.
 */
export const TILE_CLASS =
  "w-full h-full min-h-36 border px-3 py-2 rounded-2xl block";
const INTERACTIVE_CLASS = "text-left hover:bg-gray-50 focus:outline-2 focus:outline-blue-500";

/**
 * The one dashboard tile surface: border, radius, padding, h-full (so a
 * stretched grid cell is filled, AC DGRID-01.2), the label row, and the
 * interactive/focus styling shared by every variant (AC DGRID-04.1,
 * DGRID-04.4). StatTile and LeaderTile render their bodies as `children`.
 * If both `href` and `onClick` are given, `href` wins — a defined choice,
 * not an accident.
 */
export default function Tile({ label, note, children, href, onClick }) {
  const content = (
    <>
      <div className="text-sm text-gray-500">{label}</div>
      {note && <div className="text-xs text-gray-400">{note}</div>}
      {children}
    </>
  );

  if (href) {
    return (
      <Link to={href} className={`${TILE_CLASS} ${INTERACTIVE_CLASS}`}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${TILE_CLASS} ${INTERACTIVE_CLASS}`}>
        {content}
      </button>
    );
  }

  return <div className={TILE_CLASS}>{content}</div>;
}
