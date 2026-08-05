/**
 * Turns a managed list (`[{ id, name }]`) plus a form's current stored value
 * into the options a `<select>` should render: the list alphabetically,
 * case-insensitively, plus the current value appended as a flagged
 * `inList: false` option if it isn't already present (case-insensitively) —
 * so editing a legacy record never silently drops its stored string.
 */
export function toOptions(items, currentValue) {
  const options = [...items]
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    .map((item) => ({ value: item.name, label: item.name, inList: true }));

  const trimmedCurrent = typeof currentValue === "string" ? currentValue.trim() : "";
  if (trimmedCurrent === "") return options;

  const alreadyListed = options.some(
    (option) => option.value.toLowerCase() === trimmedCurrent.toLowerCase()
  );
  if (!alreadyListed) {
    options.push({ value: currentValue, label: currentValue, inList: false });
  }

  return options;
}
