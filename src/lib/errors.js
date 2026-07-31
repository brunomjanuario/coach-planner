/** Typed error for "no record with this id" — replaces a bare TypeError on an unfound record. */
export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
  }
}
