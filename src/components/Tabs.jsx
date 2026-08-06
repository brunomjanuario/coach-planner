import { useId } from "react";

const TAB_CLASS =
  "px-4 py-2 rounded-t-md border-b-2 focus:outline-2 focus:outline-blue-500";

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
        className="flex overflow-x-auto border-b border-gray-200"
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
                  ? "border-blue-500 font-semibold"
                  : "border-transparent hover:bg-gray-50"
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
