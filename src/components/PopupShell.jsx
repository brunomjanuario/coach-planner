import { useId } from "react";

/**
 * Overlay + panel every popup renders through. The panel caps at 85vh and
 * only its body scrolls — the title and footer stay pinned outside the
 * scroll region so a tall popup can never strand its own action row.
 */
export default function PopupShell({ title, children, footer, width = "max-w-md" }) {
  const titleId = useId();

  return (
    <div className="fixed inset-0 bg-black/[var(--bg-opacity)] [--bg-opacity:50%] flex items-center justify-center z-50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`bg-white p-6 rounded-2xl shadow-md w-full ${width} text-black max-h-[85vh] flex flex-col`}
      >
        <h2 id={titleId} className="text-xl mb-4 font-bold flex-shrink-0">
          {title}
        </h2>
        <div className="overflow-y-auto min-h-0">{children}</div>
        {footer && (
          <div className="flex-shrink-0 pt-4 mt-2 border-t border-gray-200">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
