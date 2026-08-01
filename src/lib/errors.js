/** Typed error for "no record with this id" — replaces a bare TypeError on an unfound record. */
export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
  }
}

/** Typed error for a record that fails validation (e.g. a rival row whose won+drawn+lost don't sum to played, or a negative figure). */
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}
