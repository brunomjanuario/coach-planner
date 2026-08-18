import { apiFetch } from "../lib/apiClient";

// Teams and players against the real API (F4). Cascades to a deleted
// team/player's cards and ratings are performed server-side via FK actions
// (F4 AC4/AC7) — this module no longer calls cardService/ratingService.
export const teamService = {
  getAll: () => apiFetch("/teams"),

  getById: (id) => apiFetch(`/teams/${id}`),

  create: (teamData) => apiFetch("/teams", { method: "POST", body: teamData }),

  update: (teamData) =>
    apiFetch(`/teams/${teamData.id}`, { method: "PATCH", body: teamData }),

  delete: (id) => apiFetch(`/teams/${id}`, { method: "DELETE" }),

  addPlayer: (teamId, playerData) =>
    apiFetch(`/teams/${teamId}/players`, { method: "POST", body: playerData }),

  updatePlayer: (playerData) =>
    apiFetch(`/teams/${playerData.teamId}/players/${playerData.id}`, {
      method: "PATCH",
      body: playerData,
    }),

  deletePlayer: (playerData) =>
    apiFetch(`/teams/${playerData.teamId}/players/${playerData.id}`, {
      method: "DELETE",
    }),
};
