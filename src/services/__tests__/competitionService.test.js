import { describe, it, expect } from "vitest";
import { competitionService } from "../competitionService";
import { gameService } from "../gameService";
import { teamService } from "../teamService";
import { getCollection, setCollection, reset } from "../store";
import { createSeed } from "../../model/seed";
import { NotFoundError, ValidationError } from "../../lib/errors";

async function seedGame({ teamId, competition }) {
  return gameService.create({
    teamId,
    opponent: "Rivals FC",
    date: new Date("2030-01-01T10:00:00Z"),
    isHome: true,
    competition,
  });
}

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

    describe("cascade to games (AC COMP-04.3, AC COMP-04.4, AC COMP-04.5)", () => {
      it("updates every game whose competition matches the old name, and leaves a non-matching game alone", async () => {
        const [team] = await teamService.getAll();
        const cup = await competitionService.create("Cup");
        const matchA = await seedGame({ teamId: team.id, competition: "Cup" });
        const matchB = await seedGame({ teamId: team.id, competition: "Cup" });
        const other = await seedGame({ teamId: team.id, competition: "League" });

        await competitionService.update({ id: cup.id, name: "Cup Renamed" });

        const games = await gameService.getAll();
        expect(games.find((g) => g.id === matchA.id).competition).toBe(
          "Cup Renamed"
        );
        expect(games.find((g) => g.id === matchB.id).competition).toBe(
          "Cup Renamed"
        );
        expect(games.find((g) => g.id === other.id).competition).toBe(
          "League"
        );
      });

      it("cascades to a game whose stored name differs only by case, matching how the migration collapsed them", async () => {
        const [team] = await teamService.getAll();
        const cup = await competitionService.create("Cup");
        const differentCase = await seedGame({
          teamId: team.id,
          competition: "cup",
        });

        await competitionService.update({ id: cup.id, name: "Cup Renamed" });

        const games = await gameService.getAll();
        expect(games.find((g) => g.id === differentCase.id).competition).toBe(
          "Cup Renamed"
        );
      });

      it("leaves games with no competition untouched", async () => {
        const [team] = await teamService.getAll();
        const cup = await competitionService.create("Cup");
        const noCompetition = await seedGame({
          teamId: team.id,
          competition: null,
        });

        await competitionService.update({ id: cup.id, name: "Cup Renamed" });

        const games = await gameService.getAll();
        expect(games.find((g) => g.id === noCompetition.id).competition).toBe(
          null
        );
      });

      it("rejects a colliding rename before writing anything, leaving the games collection unchanged (edge case)", async () => {
        const [team] = await teamService.getAll();
        const cup = await competitionService.create("Cup");
        await competitionService.create("League");
        const game = await seedGame({ teamId: team.id, competition: "Cup" });
        const gamesBefore = await gameService.getAll();

        await expect(
          competitionService.update({ id: cup.id, name: "League" })
        ).rejects.toThrow(ValidationError);

        const gamesAfter = await gameService.getAll();
        expect(gamesAfter).toEqual(gamesBefore);
        expect(gamesAfter.find((g) => g.id === game.id).competition).toBe(
          "Cup"
        );
      });

      it("a pure case change cascades to matching games (edge case)", async () => {
        const [team] = await teamService.getAll();
        const cup = await competitionService.create("Cup");
        const game = await seedGame({ teamId: team.id, competition: "Cup" });

        await competitionService.update({ id: cup.id, name: "CUP" });

        const games = await gameService.getAll();
        expect(games.find((g) => g.id === game.id).competition).toBe("CUP");
      });
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
