import { apiFetch } from "../lib/apiClient";

// Cards against the real API (F7). removeByGame/removeByPlayer are gone
// entirely (F7 AC4) — the backend cascades a deleted game/player's cards
// via FK actions.
export const cardService = {
  getAll: () => apiFetch("/cards"),

  getByGame: (gameId) => apiFetch(`/cards?gameId=${gameId}`),

  getByPlayer: (playerId) => apiFetch(`/cards?playerId=${playerId}`),

  record: ({ playerId, gameId, type }) =>
    apiFetch("/cards", { method: "POST", body: { playerId, gameId, type } }),

  remove: (id) => apiFetch(`/cards/${id}`, { method: "DELETE" }),
};
