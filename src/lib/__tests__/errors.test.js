import { describe, it, expect } from "vitest";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  AuthError,
  ApiError,
  NetworkError,
} from "../errors";

describe("NotFoundError", () => {
  it("is an Error with name NotFoundError and carries the message", () => {
    const err = new NotFoundError("not found");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.name).toBe("NotFoundError");
    expect(err.message).toBe("not found");
  });
});

describe("ValidationError", () => {
  it("is an Error with name ValidationError and carries the message", () => {
    const err = new ValidationError("invalid");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.name).toBe("ValidationError");
    expect(err.message).toBe("invalid");
  });

  it("accepts an optional field-keyed errors map as a second constructor arg", () => {
    const errors = { email: "must be a valid email address" };
    const err = new ValidationError("invalid", errors);
    expect(err.errors).toBe(errors);
  });

  it("leaves errors undefined when no second arg is given", () => {
    const err = new ValidationError("invalid");
    expect(err.errors).toBeUndefined();
  });
});

describe("ConflictError", () => {
  it("is an Error with name ConflictError and carries the message", () => {
    const err = new ConflictError("conflict");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ConflictError);
    expect(err.name).toBe("ConflictError");
    expect(err.message).toBe("conflict");
  });
});

describe("AuthError", () => {
  it("is an Error with name AuthError and carries the message", () => {
    const err = new AuthError("unauthorized");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AuthError);
    expect(err.name).toBe("AuthError");
    expect(err.message).toBe("unauthorized");
  });
});

describe("ApiError", () => {
  it("is an Error with name ApiError, carries the message and status", () => {
    const err = new ApiError("server error", 500);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.name).toBe("ApiError");
    expect(err.message).toBe("server error");
    expect(err.status).toBe(500);
  });
});

describe("NetworkError", () => {
  it("is an Error with name NetworkError and carries the message", () => {
    const err = new NetworkError("offline");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(NetworkError);
    expect(err.name).toBe("NetworkError");
    expect(err.message).toBe("offline");
  });
});
