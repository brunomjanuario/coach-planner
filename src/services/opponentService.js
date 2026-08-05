import { getCollection, setCollection } from "./store";
import { newId } from "../lib/id";
import { NotFoundError, ValidationError } from "../lib/errors";

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

  update: async ({ id, name }) => {
    assertValidName(name);
    const trimmed = name.trim();
    const opponents = getOpponents();
    const index = opponents.findIndex((opponent) => opponent.id === id);
    if (index === -1) {
      throw new NotFoundError(`Opponent not found: ${id}`);
    }
    assertNoDuplicate(opponents, trimmed, id);

    opponents[index] = { ...opponents[index], name: trimmed };
    saveOpponents(opponents);
    return opponents[index];
  },

  delete: async (id) => {
    const opponents = getOpponents().filter((opponent) => opponent.id !== id);
    saveOpponents(opponents);
  },
};
