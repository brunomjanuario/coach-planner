/**
 * The one action row every popup footer renders through (feature 27).
 * Destructive actions sit on the left via mr-auto, everything else stays
 * right-aligned in the same row — no popup decides its own button order.
 */
export default function PopupActions({ destructive, children }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {destructive && (
        <div className="flex flex-wrap items-center gap-2 mr-auto">{destructive}</div>
      )}
      {children}
    </div>
  );
}
