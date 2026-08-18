import { apiFetch } from "../lib/apiClient";
import { parseApiDate } from "../lib/dates";

// Games against the real API (F6). getScheduled/getPlayed become
// ?status= querystring calls instead of fetch-all-then-filter with
// hasResult() (F6 AC2). Cascades to a deleted game's cards/ratings are
// performed server-side via FK actions (F6 AC6) — this module no longer
// calls cardService/ratingService.
const hydrate = (game) => ({ ...game, date: parseApiDate(game.date) });

function gamesQuery({ status, teamId } = {}) {
  const params = new URLSearchParams();
  if (status != null) params.set("status", status);
  if (teamId != null) params.set("teamId", teamId);
  const qs = params.toString();
  return qs ? `/games?${qs}` : "/games";
}

export const gameService = {
  getAll: async (teamId) => (await apiFetch(gamesQuery({ teamId }))).map(hydrate),

  getScheduled: async (teamId) =>
    (await apiFetch(gamesQuery({ status: "scheduled", teamId }))).map(hydrate),

  getPlayed: async (teamId) =>
    (await apiFetch(gamesQuery({ status: "played", teamId }))).map(hydrate),

  getUnassigned: async () => (await apiFetch("/games?assigned=false")).map(hydrate),

  create: async (gameData) =>
    hydrate(await apiFetch("/games", { method: "POST", body: gameData })),

  update: async (gameData) =>
    hydrate(await apiFetch(`/games/${gameData.id}`, { method: "PATCH", body: gameData })),

  delete: (id) => apiFetch(`/games/${id}`, { method: "DELETE" }),

  recordResult: async (id, { us, them }) =>
    hydrate(
      await apiFetch(`/games/${id}/result`, {
        method: "PUT",
        body: { us, them },
      })
    ),

  clearResult: async (id) =>
    hydrate(await apiFetch(`/games/${id}/result`, { method: "DELETE" })),
};
