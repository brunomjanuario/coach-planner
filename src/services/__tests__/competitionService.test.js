import { describe, it, expect } from "vitest";
import { competitionService } from "../competitionService";
import { getCollection, setCollection, reset } from "../store";
import { createSeed } from "../../model/seed";
import { NotFoundError, ValidationError } from "../../lib/errors";

describe("competitionService", () => {
  describe("seeding and reset (AC COMP-01.1, COMP-01.6)", () => {
    it("createSeed() returns a competitions array matching the seed games' competition names", () => {
      const seed = createSeed();
      const gameCompetitionNames = [
        ...new Set(seed.games.map((game) => game.competition)),
      ];
      expect(seed.competitions.map((c) => c.name)).toEqual(gameCompetitionNames);
    });

    it("a fresh install seeds the competitions collection", async () => {
      const competitions = await competitionService.getAll();
      const seed = createSeed();
      expect(competitions).toEqual(seed.competitions);
    });

    it("reset() clears and re-seeds the competitions collection, not just re-lists the key", async () => {
      await competitionService.getAll(); // establish first-run seed
      setCollection("competitions", [{ id: "custom", name: "Custom Cup" }]);
      expect(await competitionService.getAll()).toEqual([
        { id: "custom", name: "Custom Cup" },
      ]);

      reset();

      const seed = createSeed();
      expect(await competitionService.getAll()).toEqual(seed.competitions);
    });
  });

  describe("getAll (AD-004, AC COMP-01.2)", () => {
    it("returns a copy — mutating the result does not affect a subsequent read", async () => {
      const first = await competitionService.getAll();
      first.push({ id: "injected", name: "Should not persist" });

      const second = await competitionService.getAll();
      expect(second.find((c) => c.id === "injected")).toBeUndefined();
    });
  });

  describe("create", () => {
    it("assigns an id via newId() and returns the created record (AC COMP-01.3)", async () => {
      const created = await competitionService.create("Cup");

      expect(typeof created.id).toBe("string");
      expect(created.id.length).toBeGreaterThan(0);
      expect(created.name).toBe("Cup");
    });

    it("persists the created competition, retrievable by a subsequent read", async () => {
      const created = await competitionService.create("Cup");

      const all = await competitionService.getAll();
      expect(all.find((c) => c.id === created.id)).toEqual(created);
    });

    it("trims the name before storing (edge case)", async () => {
      const created = await competitionService.create("  Cup  ");
      expect(created.name).toBe("Cup");
    });

    it("rejects an exact duplicate name (AC COMP-01.4)", async () => {
      await competitionService.create("Cup");
      await expect(competitionService.create("Cup")).rejects.toThrow(
        ValidationError
      );
    });

    it("rejects a duplicate differing only by case (AC COMP-01.4)", async () => {
      await competitionService.create("Cup");
      await expect(competitionService.create("cup")).rejects.toThrow(
        ValidationError
      );
    });

    it("rejects a duplicate differing only by surrounding whitespace (AC COMP-01.4)", async () => {
      await competitionService.create("Cup");
      await expect(competitionService.create("  Cup  ")).rejects.toThrow(
        ValidationError
      );
    });

    it("does not persist a rejected duplicate", async () => {
      const before = await competitionService.getAll();
      await competitionService.create("Cup");
      await expect(competitionService.create("cup")).rejects.toThrow(
        ValidationError
      );
      const after = await competitionService.getAll();
      expect(after).toHaveLength(before.length + 1);
    });

    it("rejects an empty name (AC COMP-01.5)", async () => {
      await expect(competitionService.create("")).rejects.toThrow(
        ValidationError
      );
    });

    it("rejects a whitespace-only name (AC COMP-01.5)", async () => {
      await expect(competitionService.create("   ")).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe("update", () => {
    it("rejects a rename that collides with another competition's name (edge case)", async () => {
      await competitionService.create("Cup");
      const league = await competitionService.create("League");

      await expect(
        competitionService.update({ id: league.id, name: "Cup" })
      ).rejects.toThrow(ValidationError);
    });

    it("allows a pure case change of the record's own name (edge case)", async () => {
      const cup = await competitionService.create("Cup");

      const updated = await competitionService.update({
        id: cup.id,
        name: "CUP",
      });

      expect(updated.name).toBe("CUP");
    });

    it("throws NotFoundError for a missing id", async () => {
      await expect(
        competitionService.update({ id: "no-such-id", name: "Cup" })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("delete", () => {
    it("removes only the named record", async () => {
      const before = await competitionService.getAll();
      const cup = await competitionService.create("Cup");
      const league = await competitionService.create("League");

      await competitionService.delete(cup.id);

      const remaining = await competitionService.getAll();
      expect(remaining).toEqual([...before, league]);
    });
  });

  it("competitions is included in COLLECTION_NAMES and covered by getCollection", () => {
    expect(getCollection("competitions")).toEqual(createSeed().competitions);
  });
});
