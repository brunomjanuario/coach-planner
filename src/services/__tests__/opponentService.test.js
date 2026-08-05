import { describe, it, expect } from "vitest";
import { opponentService } from "../opponentService";
import { getCollection, setCollection, reset } from "../store";
import { createSeed } from "../../model/seed";
import { NotFoundError, ValidationError } from "../../lib/errors";

describe("opponentService", () => {
  describe("seeding and reset (AC OPP-01.1, OPP-01.6)", () => {
    it("createSeed() returns an opponents array matching the seed games' opponents", () => {
      const seed = createSeed();
      const gameOpponentNames = [...new Set(seed.games.map((game) => game.opponent))];
      expect(seed.opponents.map((o) => o.name)).toEqual(gameOpponentNames);
    });

    it("a fresh install seeds the opponents collection", async () => {
      const opponents = await opponentService.getAll();
      const seed = createSeed();
      expect(opponents).toEqual(seed.opponents);
    });

    it("reset() clears and re-seeds the opponents collection, not just re-lists the key", async () => {
      await opponentService.getAll(); // establish first-run seed
      setCollection("opponents", [{ id: "custom", name: "Custom FC" }]);
      expect(await opponentService.getAll()).toEqual([
        { id: "custom", name: "Custom FC" },
      ]);

      reset();

      const seed = createSeed();
      expect(await opponentService.getAll()).toEqual(seed.opponents);
    });
  });

  describe("getAll (AD-004, AC OPP-01.2)", () => {
    it("returns a copy — mutating the result does not affect a subsequent read", async () => {
      const first = await opponentService.getAll();
      first.push({ id: "injected", name: "Should not persist" });

      const second = await opponentService.getAll();
      expect(second.find((o) => o.id === "injected")).toBeUndefined();
    });
  });

  describe("create", () => {
    it("assigns an id via newId() and returns the created record (AC OPP-01.3)", async () => {
      const created = await opponentService.create("Porto");

      expect(typeof created.id).toBe("string");
      expect(created.id.length).toBeGreaterThan(0);
      expect(created.name).toBe("Porto");
    });

    it("persists the created opponent, retrievable by a subsequent read", async () => {
      const created = await opponentService.create("Porto");

      const all = await opponentService.getAll();
      expect(all.find((o) => o.id === created.id)).toEqual(created);
    });

    it("trims the name before storing (edge case)", async () => {
      const created = await opponentService.create("  Porto  ");
      expect(created.name).toBe("Porto");
    });

    it("rejects an exact duplicate name (AC OPP-01.4)", async () => {
      await opponentService.create("Porto");
      await expect(opponentService.create("Porto")).rejects.toThrow(ValidationError);
    });

    it("rejects a duplicate differing only by case (AC OPP-01.4)", async () => {
      await opponentService.create("Porto");
      await expect(opponentService.create("porto")).rejects.toThrow(ValidationError);
    });

    it("rejects a duplicate differing only by surrounding whitespace (AC OPP-01.4)", async () => {
      await opponentService.create("Porto");
      await expect(opponentService.create("  Porto  ")).rejects.toThrow(
        ValidationError
      );
    });

    it("does not persist a rejected duplicate", async () => {
      const before = await opponentService.getAll();
      await opponentService.create("Porto");
      await expect(opponentService.create("porto")).rejects.toThrow(
        ValidationError
      );
      const after = await opponentService.getAll();
      expect(after).toHaveLength(before.length + 1);
    });

    it("rejects an empty name (AC OPP-01.5)", async () => {
      await expect(opponentService.create("")).rejects.toThrow(ValidationError);
    });

    it("rejects a whitespace-only name (AC OPP-01.5)", async () => {
      await expect(opponentService.create("   ")).rejects.toThrow(ValidationError);
    });
  });

  describe("update", () => {
    it("rejects a rename that collides with another opponent's name (edge case)", async () => {
      await opponentService.create("Porto");
      const braga = await opponentService.create("Braga");

      await expect(
        opponentService.update({ id: braga.id, name: "Porto" })
      ).rejects.toThrow(ValidationError);
    });

    it("allows a pure case change of the record's own name (edge case)", async () => {
      const porto = await opponentService.create("Porto");

      const updated = await opponentService.update({ id: porto.id, name: "PORTO" });

      expect(updated.name).toBe("PORTO");
    });

    it("throws NotFoundError for a missing id", async () => {
      await expect(
        opponentService.update({ id: "no-such-id", name: "Porto" })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("delete", () => {
    it("removes only the named record", async () => {
      const before = await opponentService.getAll();
      const porto = await opponentService.create("Porto");
      const braga = await opponentService.create("Braga");

      await opponentService.delete(porto.id);

      const remaining = await opponentService.getAll();
      expect(remaining).toEqual([...before, braga]);
    });
  });

  it("opponents is included in COLLECTION_NAMES and covered by getCollection", () => {
    expect(getCollection("opponents")).toEqual(createSeed().opponents);
  });
});
