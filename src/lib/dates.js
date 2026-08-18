/**
 * Rehydrates an ISO instant string (e.g. training.day, game.date) returned
 * by the API into a Date, matching what store.js's DATE_FIELDS handling
 * used to do so pages calling .getMonth()/.toLocaleDateString() etc. on
 * these fields keep working. Null-safe: null/undefined pass through as
 * null rather than becoming Invalid Date.
 */
export function parseApiDate(value) {
  if (value == null) return null;
  return new Date(value);
}

/**
 * Serializes a Date back into an ISO instant string for the API. Null-safe:
 * null/undefined pass through as null.
 */
export function serializeApiDate(date) {
  if (date == null) return null;
  return date.toISOString();
}
