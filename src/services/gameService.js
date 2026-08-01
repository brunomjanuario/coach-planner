import { getCollection, setCollection } from "./store";
import { newId } from "../lib/id";
import { NotFoundError } from "../lib/errors";
import { hasResult } from "../lib/gameResult";
import { cardService } from "./cardService";

function getGames() {
  return getCollection("games");
}

function saveGames(games) {
  setCollection("games", games);
}

export const gameService = {
  getAll: async (teamId) => {
    const games = getGames();
    return teamId != null ? games.filter((game) => game.teamId === teamId) : games;
  },

  getScheduled: async (teamId) => {
    const games = await gameService.getAll(teamId);
    return games.filter((game) => !hasResult(game));
  },

  getPlayed: async (teamId) => {
    const games = await gameService.getAll(teamId);
    return games.filter((game) => hasResult(game));
  },

  getUnassigned: async () => {
    const games = getGames();
    const teamIds = new Set(getCollection("teams").map((team) => team.id));
    return games.filter(
      (game) => game.teamId == null || !teamIds.has(game.teamId)
    );
  },

  create: async (gameData) => {
    const games = getGames();
    const newGame = {
      ...gameData,
      id: newId(),
      usScore: null,
      themScore: null,
    };
    games.push(newGame);
    saveGames(games);
    return newGame;
  },

  update: async (gameData) => {
    const games = getGames();
    const index = games.findIndex((game) => game.id === gameData.id);
    if (index === -1) {
      throw new NotFoundError(`Game not found: ${gameData.id}`);
    }
    games[index] = { ...games[index], ...gameData };
    saveGames(games);
    return games[index];
  },

  delete: async (id) => {
    const games = getGames().filter((game) => game.id !== id);
    saveGames(games);
    await cardService.removeByGame(id);
  },

  recordResult: async (id, { us, them }) => {
    const games = getGames();
    const index = games.findIndex((game) => game.id === id);
    if (index === -1) {
      throw new NotFoundError(`Game not found: ${id}`);
    }
    games[index] = { ...games[index], usScore: us, themScore: them };
    saveGames(games);
    return games[index];
  },

  clearResult: async (id) => {
    const games = getGames();
    const index = games.findIndex((game) => game.id === id);
    if (index === -1) {
      throw new NotFoundError(`Game not found: ${id}`);
    }
    games[index] = { ...games[index], usScore: null, themScore: null };
    saveGames(games);
    return games[index];
  },
};
