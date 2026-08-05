import { getCollection, setCollection } from "./store";
import { newId } from "../lib/id";
import { NotFoundError, ValidationError } from "../lib/errors";
import { gameService } from "./gameService";

function getCompetitions() {
  return getCollection("competitions");
}

function saveCompetitions(competitions) {
  setCollection("competitions", competitions);
}

function normalize(name) {
  return name.trim().toLowerCase();
}

function assertValidName(name) {
  if (typeof name !== "string" || name.trim() === "") {
    throw new ValidationError("Competition name cannot be empty.");
  }
}

function assertNoDuplicate(competitions, trimmedName, excludeId) {
  const normalized = normalize(trimmedName);
  const collides = competitions.some(
    (competition) =>
      competition.id !== excludeId && normalize(competition.name) === normalized
  );
  if (collides) {
    throw new ValidationError(
      `A competition named "${trimmedName}" already exists.`
    );
  }
}

export const competitionService = {
  getAll: async () => {
    return getCompetitions();
  },

  create: async (name) => {
    assertValidName(name);
    const trimmed = name.trim();
    const competitions = getCompetitions();
    assertNoDuplicate(competitions, trimmed, null);

    const newCompetition = { id: newId(), name: trimmed };
    competitions.push(newCompetition);
    saveCompetitions(competitions);
    return newCompetition;
  },

  /**
   * Renames a competition and cascades to every game carrying the old name
   * (AC COMP-04.3). The cascade match is case-insensitive on the trimmed
   * name, mirroring how the v1->v2 migration collapsed case/whitespace
   * variants into a single competition (AD-010).
   */
  update: async ({ id, name }) => {
    assertValidName(name);
    const trimmed = name.trim();
    const competitions = getCompetitions();
    const index = competitions.findIndex((competition) => competition.id === id);
    if (index === -1) {
      throw new NotFoundError(`Competition not found: ${id}`);
    }
    assertNoDuplicate(competitions, trimmed, id);

    const oldName = competitions[index].name;
    competitions[index] = { ...competitions[index], name: trimmed };
    saveCompetitions(competitions);

    if (trimmed !== oldName) {
      const normalizedOld = normalize(oldName);
      const games = await gameService.getAll();
      const affected = games.filter(
        (game) =>
          typeof game.competition === "string" &&
          normalize(game.competition) === normalizedOld
      );
      await Promise.all(
        affected.map((game) =>
          gameService.update({ ...game, competition: trimmed })
        )
      );
    }

    return competitions[index];
  },

  delete: async (id) => {
    const competitions = getCompetitions().filter(
      (competition) => competition.id !== id
    );
    saveCompetitions(competitions);
  },
};
