import { describe, it, expect, afterEach, vi } from "vitest";
import { standingsService } from "../standingsService";
import { NotFoundError, ValidationError } from "../../lib/errors";

function validRow(overrides = {}) {
  return {
    name: "Benfica B",
    played: 4,
    won: 3,
    drawn: 1,
    lost: 0,
    goalsFor: 10,
    goalsAgainst: 2,
    ...overrides,
  };
}

describe("standingsService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getAll returns the persisted list of rival rows", async () => {
    const rows = await standingsService.getAll();
    expect(Array.isArray(rows)).toBe(true);
  });

  it("getAll returns non-reference-identical arrays across two calls (AD-004)", async () => {
    const first = await standingsService.getAll();
    const second = await standingsService.getAll();
    expect(first).not.toBe(second);
  });

  it("create persists name, played, won, drawn, lost, goalsFor and goalsAgainst (AC GAME-09.1)", async () => {
    const created = await standingsService.create(validRow());

    expect(created).toMatchObject(validRow());
    const all = await standingsService.getAll();
    expect(all.find((r) => r.id === created.id)).toEqual(created);
  });

  it("create assigns an id via newId()", async () => {
    const created = await standingsService.create(validRow());
    expect(typeof created.id).toBe("string");
    expect(created.id.length).toBeGreaterThan(0);
  });

  it("create does not persist points or goalDifference — they are derived, not input (AC GAME-09.2)", async () => {
    const created = await standingsService.create(
      validRow({ points: 999, goalDifference: 999 })
    );

    expect(created.points).toBeUndefined();
    expect(created.goalDifference).toBeUndefined();
  });

  it("create throws ValidationError when won + drawn + lost does not sum to played (AC GAME-09.3)", async () => {
    await expect(
      standingsService.create(validRow({ played: 5, won: 3, drawn: 1, lost: 0 }))
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("create's ValidationError message names the discrepancy (AC GAME-09.3)", async () => {
    await expect(
      standingsService.create(validRow({ played: 5, won: 3, drawn: 1, lost: 0 }))
    ).rejects.toThrow(/4.*5|5.*4/);
  });

  it("create does not persist a row when validation fails", async () => {
    const before = await standingsService.getAll();
    await expect(
      standingsService.create(validRow({ played: 5, won: 3, drawn: 1, lost: 0 }))
    ).rejects.toBeInstanceOf(ValidationError);
    const after = await standingsService.getAll();
    expect(after.length).toBe(before.length);
  });

  it("create rejects a negative figure", async () => {
    await expect(
      standingsService.create(validRow({ goalsFor: -1 }))
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("create rejects a negative played/won/drawn/lost/goalsAgainst figure too", async () => {
    await expect(
      standingsService.create(validRow({ lost: -1, played: 3 }))
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("update edits and persists an existing row, and re-derivable data stays consistent (AC GAME-09.4)", async () => {
    const created = await standingsService.create(validRow());

    const updated = await standingsService.update({
      ...created,
      goalsFor: 20,
    });

    expect(updated.goalsFor).toBe(20);
    const all = await standingsService.getAll();
    expect(all.find((r) => r.id === created.id).goalsFor).toBe(20);
  });

  it("update throws a typed NotFoundError for an unknown id", async () => {
    await expect(
      standingsService.update(validRow({ id: "no-such-row" }))
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update throws ValidationError before checking existence when the sum is wrong", async () => {
    await expect(
      standingsService.update(
        validRow({ id: "no-such-row", played: 5, won: 3, drawn: 1, lost: 0 })
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("delete persists the removal — a subsequent getAll no longer includes the row (AC GAME-09.4)", async () => {
    const created = await standingsService.create(validRow());

    await standingsService.delete(created.id);

    const all = await standingsService.getAll();
    expect(all.find((r) => r.id === created.id)).toBeUndefined();
  });
});
