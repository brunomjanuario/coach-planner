function pad(n) {
  return String(n).padStart(2, "0");
}

/**
 * Formats a Date as the local "YYYY-MM-DDTHH:mm" string a datetime-local
 * input requires. Uses local getters (not toISOString) so the displayed
 * value matches the browser's timezone instead of shifting by the UTC
 * offset (AC TEDIT-03.2).
 */
export function toInputValue(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Parses a "YYYY-MM-DDTHH:mm" datetime-local string back into a Date at the
 * same local instant. Returns null for an empty string rather than
 * Invalid Date.
 */
export function fromInputValue(value) {
  if (!value) return null;

  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  return new Date(year, month - 1, day, hours, minutes);
}
