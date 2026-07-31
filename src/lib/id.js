let counter = 0;

/**
 * Collision-free id generator (AD-003). Prefers crypto.randomUUID(); falls
 * back to a timestamp+counter string for environments without it (older
 * Safari). Always returns a string — callers must not assume numeric ids.
 */
export function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  counter += 1;
  return `${Date.now()}-${counter}`;
}
