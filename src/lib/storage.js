const PREFIX = "coachplanner:v1:";

export class StorageQuotaError extends Error {
  constructor(collection) {
    super(`Storage quota exceeded while writing "${collection}"`);
    this.name = "StorageQuotaError";
    this.collection = collection;
  }
}

let backend = null; // "localStorage" | "memory", decided once per session
let warnedUnavailable = false;
const memoryStore = new Map();

function isQuotaExceededError(err) {
  return (
    err instanceof DOMException &&
    (err.name === "QuotaExceededError" || err.code === 22)
  );
}

function resolveBackend() {
  if (backend !== null) return backend;

  try {
    const probeKey = `${PREFIX}__probe__`;
    localStorage.setItem(probeKey, "1");
    localStorage.removeItem(probeKey);
    backend = "localStorage";
  } catch {
    backend = "memory";
    if (!warnedUnavailable) {
      warnedUnavailable = true;
      console.warn(
        "localStorage is unavailable; falling back to in-memory storage for this session."
      );
    }
  }

  return backend;
}

function reviveDateFields(parsed, dateFields) {
  if (!Array.isArray(parsed) || dateFields.length === 0) return parsed;

  return parsed.map((item) => {
    const revived = { ...item };
    for (const field of dateFields) {
      if (field in revived) revived[field] = new Date(revived[field]);
    }
    return revived;
  });
}

/**
 * Reads a namespaced JSON value. Returns null when the key is absent or the
 * stored JSON is corrupt (both signal "nothing usable is stored").
 */
export function read(key, dateFields = []) {
  const fullKey = PREFIX + key;
  const raw =
    resolveBackend() === "localStorage"
      ? localStorage.getItem(fullKey)
      : (memoryStore.get(fullKey) ?? null);

  if (raw === null) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.warn(`Corrupt JSON stored under "${key}"; treating as absent.`, err);
    return null;
  }

  return reviveDateFields(parsed, dateFields);
}

/**
 * Serializes and stores a value under the namespaced key. Throws
 * StorageQuotaError (carrying the collection name) when the write exceeds
 * the storage quota; prior data is left intact because the throwing write
 * never completes.
 */
export function write(key, value) {
  const fullKey = PREFIX + key;
  const serialized = JSON.stringify(value);

  if (resolveBackend() === "localStorage") {
    try {
      localStorage.setItem(fullKey, serialized);
    } catch (err) {
      if (isQuotaExceededError(err)) throw new StorageQuotaError(key);
      throw err;
    }
  } else {
    memoryStore.set(fullKey, serialized);
  }
}

/** Deletes the namespaced key, if present. */
export function remove(key) {
  const fullKey = PREFIX + key;
  if (resolveBackend() === "localStorage") {
    localStorage.removeItem(fullKey);
  } else {
    memoryStore.delete(fullKey);
  }
}
