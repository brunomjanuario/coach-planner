import { getCollection, setCollection } from "./store";
import { newId } from "../lib/id";
import { NotFoundError, ValidationError } from "../lib/errors";

const CARD_TYPES = ["yellow", "red"];

function getCards() {
  return getCollection("cards");
}

function saveCards(cards) {
  setCollection("cards", cards);
}

function findPlayerInTeam(teamId, playerId) {
  const teams = getCollection("teams");
  const team = teams.find((t) => t.id === teamId);
  return team?.players.find((p) => p.id === playerId) ?? null;
}

export const cardService = {
  getAll: async () => {
    return getCards();
  },

  getByGame: async (gameId) => {
    return getCards().filter((card) => card.gameId === gameId);
  },

  getByPlayer: async (playerId) => {
    return getCards().filter((card) => card.playerId === playerId);
  },

  record: async ({ playerId, gameId, type }) => {
    if (!CARD_TYPES.includes(type)) {
      throw new ValidationError(`Invalid card type: ${type}`);
    }

    const games = getCollection("games");
    const game = games.find((g) => g.id === gameId);
    if (!game) {
      throw new NotFoundError(`Game not found: ${gameId}`);
    }

    if (!findPlayerInTeam(game.teamId, playerId)) {
      throw new ValidationError(
        `Player ${playerId} is not in the team playing game ${gameId}`
      );
    }

    const cards = getCards();
    const newCard = { id: newId(), playerId, gameId, type };
    cards.push(newCard);
    saveCards(cards);
    return newCard;
  },

  remove: async (id) => {
    const cards = getCards().filter((card) => card.id !== id);
    saveCards(cards);
  },

  /** Cascade hook for gameService.delete — removes every card tied to a deleted game (AC CARD-01.5). */
  removeByGame: async (gameId) => {
    const cards = getCards().filter((card) => card.gameId !== gameId);
    saveCards(cards);
  },

  /** Cascade hook for teamService.deletePlayer — removes every card tied to a deleted player. */
  removeByPlayer: async (playerId) => {
    const cards = getCards().filter((card) => card.playerId !== playerId);
    saveCards(cards);
  },
};
