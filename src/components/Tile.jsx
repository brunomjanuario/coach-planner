import { Link } from "react-router-dom";

export const TILE_CLASS = "w-full h-full border px-3 py-2 rounded-2xl block";
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
