import { apiFetch } from "../lib/apiClient";
import { parseApiDate } from "../lib/dates";

// Trainings and exercises against the real API (F5). `number` comes
// straight from the response — no client-side numbering (lib/trainingNumber
// is deleted, F5 AC2). Cascades to a deleted training's ratings are
// performed server-side via FK actions (F5 AC7) — this module no longer
// calls ratingService.
//
// Exercise writes still round-trip the whole `exercises[]` array through
// create/update rather than the granular /trainings/{id}/exercises
// sub-resource endpoints (F5 AC8 as originally specified): the backend's
// own spec (00-backend-mvp, "Exercises on write") documents the granular
// endpoints as optional/future-use, not required for parity, because
// PATCH /trainings/{id} already replaces exercises wholesale and
// TrainingSavePopup already submits the whole array that way. Switching
// the popup to per-exercise calls would be a caller-side rewrite with no
// backend requirement behind it, so it's deliberately not done here.
const hydrate = (training) => ({ ...training, day: parseApiDate(training.day) });

export const trainingService = {
  getAll: async () => (await apiFetch("/trainings")).map(hydrate),

  getAllNumbered: async (teamId) =>
    (
      await apiFetch(teamId != null ? `/trainings?teamId=${teamId}` : "/trainings")
    ).map(hydrate),

  getUnassigned: async () => (await apiFetch("/trainings?assigned=false")).map(hydrate),

  getById: async (id) => hydrate(await apiFetch(`/trainings/${id}`)),

  create: async (trainingData) =>
    hydrate(await apiFetch("/trainings", { method: "POST", body: trainingData })),

  update: async (trainingData) =>
    hydrate(
      await apiFetch(`/trainings/${trainingData.id}`, {
        method: "PATCH",
        body: trainingData,
      })
    ),

  delete: (id) => apiFetch(`/trainings/${id}`, { method: "DELETE" }),
};
