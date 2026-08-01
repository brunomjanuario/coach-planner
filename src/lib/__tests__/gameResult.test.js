import { describe, it, expect } from "vitest";
import { hasResult, deriveOutcome } from "../gameResult";

describe("hasResult", () => {
  it("returns true when both usScore and themScore are recorded numbers", () => {
    expect(hasResult({ usScore: 2, themScore: 1 })).toBe(true);
  });

  it("returns true for a 0-0 scoreline (the null-vs-zero trap edge case)", () => {
    expect(hasResult({ usScore: 0, themScore: 0 })).toBe(true);
  });

  it("returns false when usScore is null", () => {
    expect(hasResult({ usScore: null, themScore: 1 })).toBe(false);
  });

  it("returns false when themScore is null", () => {
    expect(hasResult({ usScore: 1, themScore: null })).toBe(false);
  });
});

describe("deriveOutcome", () => {
  it("returns null when hasResult(game) is false", () => {
    expect(deriveOutcome({ usScore: null, themScore: null })).toBeNull();
  });

  it("returns 'win' when usScore is greater than themScore (AC GAME-06.3)", () => {
    expect(deriveOutcome({ usScore: 2, themScore: 1 })).toBe("win");
  });

  it("returns 'draw' for an equal scoreline, including 0-0 (AC GAME-06.3, null-vs-zero edge case)", () => {
    expect(deriveOutcome({ usScore: 0, themScore: 0 })).toBe("draw");
  });

  it("returns 'loss' when usScore is less than themScore (AC GAME-06.3)", () => {
    expect(deriveOutcome({ usScore: 0, themScore: 2 })).toBe("loss");
  });
});
