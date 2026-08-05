import * as storage from "../lib/storage";
import { createSeed } from "../model/seed";
import { newId } from "../lib/id";

const SCHEMA_KEY = "schemaVersion";
const SCHEMA_VERSION = 2;
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

// Migration registry: keyed by the version a stored payload migrates *to*.
// v2 derives the `competitions` collection from the distinct competition
// names already sitting on stored games (AC COMP-02.1).
const MIGRATIONS = {
  2: () => {
    const games = storage.read("games", DATE_FIELDS.games) ?? [];
    const canonicalByKey = new Map();

    for (const game of games) {
      const raw = game.competition;
      if (typeof raw !== "string" || raw.trim() === "") continue;

      const trimmed = raw.trim();
      const key = trimmed.toLowerCase();
      if (!canonicalByKey.has(key)) canonicalByKey.set(key, trimmed);
    }

    const competitions = [...canonicalByKey.values()].map((name) => ({
      id: newId(),
      name,
    }));
    storage.write("competitions", competitions);
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
