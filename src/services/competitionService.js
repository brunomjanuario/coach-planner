import { apiFetch } from "../lib/apiClient";

// Competitions against the real API (F8). The client-side assertNoDuplicate
// check and the fetch-all-games-then-update-each rename cascade are both
// gone (F8 AC2/AC3) — the backend owns case-insensitive uniqueness (409 ->
// ConflictError) and cascades a rename to affected games in one
// transaction, so a single PATCH call is sufficient.
export const competitionService = {
  getAll: () => apiFetch("/competitions"),

  create: (name) => apiFetch("/competitions", { method: "POST", body: { name } }),

  update: ({ id, name }) =>
    apiFetch(`/competitions/${id}`, { method: "PATCH", body: { name } }),

  delete: (id) => apiFetch(`/competitions/${id}`, { method: "DELETE" }),
};
