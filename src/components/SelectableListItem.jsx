export default function SelectableListItem({ selected, onSelect, children }) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className={`mt-2 w-full text-left p-3 rounded cursor-pointer border-l-4 ${
          selected
            ? "bg-selected border-selected-border"
            : "border-transparent hover:bg-hover"
        }`}
      >
        {children}
      </button>
    </li>
  );
}
