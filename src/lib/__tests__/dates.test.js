import { describe, it, expect } from "vitest";
import { parseApiDate, serializeApiDate } from "../dates";

describe("parseApiDate", () => {
  it("parses an ISO instant string into an equivalent Date", () => {
    const result = parseApiDate("2026-08-18T09:37:35.887Z");
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe("2026-08-18T09:37:35.887Z");
  });

  it("returns null for null", () => {
    expect(parseApiDate(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseApiDate(undefined)).toBeNull();
  });
});

describe("serializeApiDate", () => {
  it("serializes a Date into the same ISO instant string it was parsed from", () => {
    const original = "2026-08-18T09:37:35.887Z";
    const date = parseApiDate(original);
    expect(serializeApiDate(date)).toBe(original);
  });

  it("returns null for null", () => {
    expect(serializeApiDate(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(serializeApiDate(undefined)).toBeNull();
  });
});
