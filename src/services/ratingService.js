import { apiFetch } from "../lib/apiClient";

// Ratings against the real API (F7). removeByEvent/removeByPlayer are gone
// entirely (F7 AC8) — the backend cascades a deleted event/player's ratings
// via FK actions. 0-10 integer validation now lives server-side (400 ->
// ValidationError via apiClient), matching CARD-01's own delegation.
//
// setRating's `value: null` case (F7 AC6): verified directly against the
// running coach-planner-api — `PUT /ratings/{eventType}/{eventId}/players/
// {playerId}` with `{ value: null }` returns 204 and deletes the rating (no
// fallback GET+DELETE needed), matching the backend's own documented AC
// ("WHEN that endpoint receives value: null THEN the system SHALL delete
// any existing rating for the triple and return 204").
export const ratingService = {
  getAll: () => apiFetch("/ratings"),

  getByEvent: (eventType, eventId) =>
    apiFetch(`/ratings?eventType=${eventType}&eventId=${eventId}`),

  getByPlayer: (playerId, eventType) =>
    apiFetch(
      eventType != null
        ? `/ratings?playerId=${playerId}&eventType=${eventType}`
        : `/ratings?playerId=${playerId}`
    ),

  setRating: ({ playerId, eventType, eventId, value }) =>
    apiFetch(`/ratings/${eventType}/${eventId}/players/${playerId}`, {
      method: "PUT",
      body: { value },
    }),

  remove: (id) => apiFetch(`/ratings/${id}`, { method: "DELETE" }),
};
