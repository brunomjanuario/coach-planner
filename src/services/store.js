import * as storage from "../lib/storage";
import { createSeed } from "../model/seed";

const SCHEMA_KEY = "schemaVersion";
const SCHEMA_VERSION = 1;
const DATE_FIELDS = {
  teams: [],
  trainings: ["day"],
  games: ["date"],
  standings: [],
  cards: [],
  ratings: [],
  competitions: [],
};
const COLLECTION_NAMES = Object.keys(DATE_FIELDS);

// Migration registry: keyed by the version a stored payload migrates *to*.
// Empty today — v1 is the first schema version, so there is nothing to
// migrate from. A future v2 adds `{ 2: (data) => ... }` here.
const MIGRATIONS = {};

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
    runMigrations(storedVersion);
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
