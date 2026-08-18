import { apiFetch } from "../lib/apiClient";

// Opponents against the real API (F8). The client-side assertNoDuplicate
// check and the fetch-all-games-then-update-each rename cascade are both
// gone (F8 AC2/AC3) — the backend owns case-insensitive uniqueness (409 ->
// ConflictError) and cascades a rename to affected games (never a
// standings rival row — a separate model, AD-010) in one transaction, so a
// single PATCH call is sufficient.
export const opponentService = {
  getAll: () => apiFetch("/opponents"),

  create: (name) => apiFetch("/opponents", { method: "POST", body: { name } }),

  update: ({ id, name }) =>
    apiFetch(`/opponents/${id}`, { method: "PATCH", body: { name } }),

  delete: (id) => apiFetch(`/opponents/${id}`, { method: "DELETE" }),
};
