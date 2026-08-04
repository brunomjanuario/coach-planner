import { getCollection, setCollection } from "./store";
import { newId } from "../lib/id";
import { ValidationError } from "../lib/errors";

function getRatings() {
  return getCollection("ratings");
}

function saveRatings(ratings) {
  setCollection("ratings", ratings);
}

function isValidValue(value) {
  return Number.isInteger(value) && value >= 0 && value <= 10;
}

export const ratingService = {
  getAll: async () => {
    return getRatings();
  },

  getByEvent: async (eventType, eventId) => {
    return getRatings().filter(
      (rating) => rating.eventType === eventType && rating.eventId === eventId
    );
  },

  getByPlayer: async (playerId, eventType) => {
    return getRatings().filter((rating) => {
      if (rating.playerId !== playerId) return false;
      if (eventType != null && rating.eventType !== eventType) return false;
      return true;
    });
  },

  /**
   * Upserts a rating keyed by (playerId, eventType, eventId) (AC RATE-01.4).
   * A `value` of `null` clears (removes) the existing record rather than
   * storing null — an absent player never contributes a rating. A `value`
   * of exactly `0` is a real rating and is stored as such (null-vs-zero
   * trap). Any other value must be an integer 0-10 (AC RATE-01.5).
   */
  setRating: async ({ playerId, eventType, eventId, value }) => {
    const ratings = getRatings();
    const index = ratings.findIndex(
      (rating) =>
        rating.playerId === playerId &&
        rating.eventType === eventType &&
        rating.eventId === eventId
    );

    if (value === null) {
      if (index !== -1) {
        ratings.splice(index, 1);
        saveRatings(ratings);
      }
      return null;
    }

    if (!isValidValue(value)) {
      throw new ValidationError(`Invalid rating value: ${value}`);
    }

    if (index !== -1) {
      ratings[index] = { ...ratings[index], value };
      saveRatings(ratings);
      return ratings[index];
    }

    const newRating = { id: newId(), playerId, eventType, eventId, value };
    ratings.push(newRating);
    saveRatings(ratings);
    return newRating;
  },

  remove: async (id) => {
    const ratings = getRatings().filter((rating) => rating.id !== id);
    saveRatings(ratings);
  },

  /** Cascade hook for trainingService.delete / gameService.delete — removes every rating tied to a deleted event. */
  removeByEvent: async (eventType, eventId) => {
    const ratings = getRatings().filter(
      (rating) => !(rating.eventType === eventType && rating.eventId === eventId)
    );
    saveRatings(ratings);
  },

  /** Cascade hook for teamService.deletePlayer — removes every rating tied to a deleted player. */
  removeByPlayer: async (playerId) => {
    const ratings = getRatings().filter((rating) => rating.playerId !== playerId);
    saveRatings(ratings);
  },
};
