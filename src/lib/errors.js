/** Typed error for "no record with this id" — replaces a bare TypeError on an unfound record. */
export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
  }
}

/** Typed error for a record that fails validation (e.g. a rival row whose won+drawn+lost don't sum to played, or a negative figure). */
export class ValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = "ValidationError";
    this.errors = errors;
  }
}

/** Typed error for a request that conflicts with existing state (e.g. a duplicate email or name). */
export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConflictError";
  }
}

/** Typed error for an authentication failure (invalid credentials, expired/revoked session). */
export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthError";
  }
}

/** Generic typed error for any API failure that doesn't map to a more specific type, carrying the HTTP status. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Typed error for when the request never reached the server (offline, DNS failure, CORS block). */
export class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = "NetworkError";
  }
}
