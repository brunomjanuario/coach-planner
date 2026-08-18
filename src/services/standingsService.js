import { apiFetch } from "../lib/apiClient";
import { ValidationError } from "../lib/errors";

const FIGURE_FIELDS = [
  "played",
  "won",
  "drawn",
  "lost",
  "goalsFor",
  "goalsAgainst",
];

/**
 * Throws ValidationError when any figure is negative, or when won + drawn +
 * lost doesn't sum to played (AC GAME-09.3) — kept as an early, cheap
 * client-side reject in addition to the server's own 400 (F6 AC9), so both
 * agree on the same rule.
 */
function validate(rowData) {
  for (const field of FIGURE_FIELDS) {
    if (Number(rowData[field]) < 0) {
      throw new ValidationError(`${field} cannot be negative.`);
    }
  }

  const summed = rowData.won + rowData.drawn + rowData.lost;
  if (summed !== rowData.played) {
    throw new ValidationError(
      `Won, drawn and lost (${summed}) must add up to played (${rowData.played}).`
    );
  }
}

// Rival standings rows against the real API (F6 AC9). getAll maps to
// GET /standings/rivals, matching the backend's own routing table — used
// by the rival-row manager UI, which still needs raw rows. getTable is the
// full, server-computed table (our row + rivals, already sorted) that
// Games.jsx renders directly (T17).
export const standingsService = {
  getAll: () => apiFetch("/standings/rivals"),

  getTable: (teamId) => apiFetch(`/standings?teamId=${teamId}`),

  create: async (rowData) => {
    validate(rowData);
    return apiFetch("/standings/rivals", { method: "POST", body: rowData });
  },

  update: async (rowData) => {
    validate(rowData);
    return apiFetch(`/standings/rivals/${rowData.id}`, {
      method: "PATCH",
      body: rowData,
    });
  },

  delete: (id) => apiFetch(`/standings/rivals/${id}`, { method: "DELETE" }),
};
