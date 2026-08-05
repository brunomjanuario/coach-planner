import { getCollection, setCollection } from "./store";
import { newId } from "../lib/id";
import { NotFoundError, ValidationError } from "../lib/errors";
import { gameService } from "./gameService";

function getOpponents() {
  return getCollection("opponents");
}

function saveOpponents(opponents) {
  setCollection("opponents", opponents);
}

function normalize(name) {
  return name.trim().toLowerCase();
}

function assertValidName(name) {
  if (typeof name !== "string" || name.trim() === "") {
    throw new ValidationError("Opponent name cannot be empty.");
  }
}

function assertNoDuplicate(opponents, trimmedName, excludeId) {
  const normalized = normalize(trimmedName);
  const collides = opponents.some(
    (opponent) => opponent.id !== excludeId && normalize(opponent.name) === normalized
  );
  if (collides) {
    throw new ValidationError(`An opponent named "${trimmedName}" already exists.`);
  }
}

export const opponentService = {
  getAll: async () => {
    return getOpponents();
  },

  create: async (name) => {
    assertValidName(name);
    const trimmed = name.trim();
    const opponents = getOpponents();
    assertNoDuplicate(opponents, trimmed, null);

    const newOpponent = { id: newId(), name: trimmed };
    opponents.push(newOpponent);
    saveOpponents(opponents);
    return newOpponent;
  },

  /**
   * Renames an opponent and cascades to every game carrying the old name
   * (AC OPP-04.3). The cascade match is case-insensitive on the trimmed
   * name, mirroring the v-migration's dedup. Only the `games` collection is
   * touched — a same-named standings rival row is a separate model (AD-010)
   * and is never written here.
   */
  update: async ({ id, name }) => {
    assertValidName(name);
    const trimmed = name.trim();
    const opponents = getOpponents();
    const index = opponents.findIndex((opponent) => opponent.id === id);
    if (index === -1) {
      throw new NotFoundError(`Opponent not found: ${id}`);
    }
    assertNoDuplicate(opponents, trimmed, id);

    const oldName = opponents[index].name;
    opponents[index] = { ...opponents[index], name: trimmed };
    saveOpponents(opponents);

    if (trimmed !== oldName) {
      const normalizedOld = normalize(oldName);
      const games = await gameService.getAll();
      const affected = games.filter(
        (game) =>
          typeof game.opponent === "string" &&
          normalize(game.opponent) === normalizedOld
      );
      await Promise.all(
        affected.map((game) => gameService.update({ ...game, opponent: trimmed }))
      );
    }

    return opponents[index];
  },

  delete: async (id) => {
    const opponents = getOpponents().filter((opponent) => opponent.id !== id);
    saveOpponents(opponents);
  },
};
