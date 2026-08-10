import { useId } from "react";

const TAB_CLASS =
  "px-4 py-2 rounded-md font-medium focus:outline-2 focus:outline-blue-500";

/**
 * Segmented control: a bg-gray-100 track holds the tabs, with the active one
 * lifted onto a white pill (with a shadow) instead of a bottom-border
 * hairline. Both states share the same font weight so switching tabs never
 * shifts a label's width. Hand-verified contrast (WCAG relative luminance,
 * jsdom can't measure this): inactive text-gray-700 on the bg-gray-100 track
 * ≈ 9.4:1; active text-gray-900 on the white pill ≈ 17.7:1 — both clear the
 * 4.5:1 AA floor.
 */
export default function Tabs({ tabs, active, onChange }) {
  const baseId = useId();
  const activeTab = tabs.find((tab) => tab.id === active) ?? tabs[0];

  const handleKeyDown = (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab.id);
    const delta = e.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + delta + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    onChange(nextTab.id);
    document.getElementById(`${baseId}-tab-${nextTab.id}`)?.focus();
  };

  return (
    <div>
      <div
        role="tablist"
        className="flex gap-1 p-1 bg-gray-100 rounded-lg overflow-x-auto"
      >
        {tabs.map((tab) => {
          const selected = tab.id === activeTab.id;
          return (
            <button
              key={tab.id}
              id={`${baseId}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected ? "true" : "false"}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={handleKeyDown}
              className={`${TAB_CLASS} ${
                selected
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        id={`${baseId}-panel-${activeTab.id}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${activeTab.id}`}
      >
        {activeTab.panel}
      </div>
    </div>
  );
}
