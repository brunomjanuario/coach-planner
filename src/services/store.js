import * as storage from "../lib/storage";
import { createSeed } from "../model/seed";
import { newId } from "../lib/id";

const SCHEMA_KEY = "schemaVersion";
const SCHEMA_VERSION = 4;
const DATE_FIELDS = {
  teams: [],
  trainings: ["day"],
  games: ["date"],
  standings: [],
  cards: [],
  ratings: [],
  competitions: [],
  opponents: [],
};
const COLLECTION_NAMES = Object.keys(DATE_FIELDS);

/** Distinct, trimmed, case-insensitively deduped values of `field` across `games`. */
function distinctGameFieldValues(games, field) {
  const canonicalByKey = new Map();

  for (const game of games) {
    const raw = game[field];
    if (typeof raw !== "string" || raw.trim() === "") continue;

    const trimmed = raw.trim();
    const key = trimmed.toLowerCase();
    if (!canonicalByKey.has(key)) canonicalByKey.set(key, trimmed);
  }

  return [...canonicalByKey.values()];
}

// Migration registry: keyed by the version a stored payload migrates *to*.
const MIGRATIONS = {
  // Derives the `competitions` collection from the distinct competition
  // names already sitting on stored games (AC COMP-02.1).
  2: () => {
    const games = storage.read("games", DATE_FIELDS.games) ?? [];
    const competitions = distinctGameFieldValues(games, "competition").map(
      (name) => ({ id: newId(), name })
    );
    storage.write("competitions", competitions);
  },
  // Derives the `opponents` collection from the distinct opponent names
  // already sitting on stored games (AC OPP-02.1).
  3: () => {
    const games = storage.read("games", DATE_FIELDS.games) ?? [];
    const opponents = distinctGameFieldValues(games, "opponent").map((name) => ({
      id: newId(),
      name,
    }));
    storage.write("opponents", opponents);
  },
  // Backfills `diagram: null` on every exercise already stored on a
  // training, per AD-015/29-exercise-designer's data model. Every other
  // field on the exercise — including the legacy, still-unused `image` —
  // is spread through untouched. Reading `exercise.diagram` when it is
  // already set (re-running against already-migrated data) preserves it
  // rather than clobbering it, which is what makes this idempotent.
  4: () => {
    const trainings = storage.read("trainings", DATE_FIELDS.trainings) ?? [];
    const migrated = trainings.map((training) => ({
      ...training,
      exercises: Array.isArray(training.exercises)
        ? training.exercises.map((exercise) => ({
            ...exercise,
            diagram: exercise.diagram ?? null,
          }))
        : training.exercises,
    }));
    storage.write("trainings", migrated);
  },
};

function runMigrations(storedVersion) {
  let version = storedVersion;
  while (version < SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version + 1];
    if (migrate) migrate();
    version += 1;
  }
}

function ensureSeeded() {
  const storedVersion = storage.read(SCHEMA_KEY);

  if (storedVersion !== null) {
    if (storedVersion < SCHEMA_VERSION) {
      runMigrations(storedVersion);
      storage.write(SCHEMA_KEY, SCHEMA_VERSION);
    }
    return;
  }

  const seed = createSeed();
  for (const name of COLLECTION_NAMES) {
    storage.write(name, seed[name]);
  }
  storage.write(SCHEMA_KEY, SCHEMA_VERSION);
}

/** Returns a freshly parsed copy of a collection, seeding first-run data. */
export function getCollection(name) {
  ensureSeeded();
  return storage.read(name, DATE_FIELDS[name] ?? []) ?? [];
}

/** Persists a collection as-is. Does not touch the schema-version key. */
export function setCollection(name, value) {
  storage.write(name, value);
}

/** Clears every known collection and the schema-version key, then re-seeds. */
export function reset() {
  for (const name of COLLECTION_NAMES) {
    storage.remove(name);
  }
  storage.remove(SCHEMA_KEY);
  ensureSeeded();
}
