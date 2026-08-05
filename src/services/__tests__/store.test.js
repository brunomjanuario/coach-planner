import { describe, it, expect } from "vitest";
import { getCollection, setCollection, reset } from "../store";
import { createSeed } from "../../model/seed";

describe("store", () => {
  it("seeds from createSeed() and persists it on first run with empty storage", () => {
    const seed = createSeed();
    expect(getCollection("teams")).toEqual(seed.teams);
    expect(getCollection("trainings").length).toBe(seed.trainings.length);
  });

  it("writes a schema-version key on first run", () => {
    getCollection("teams");
    expect(localStorage.getItem("coachplanner:v1:schemaVersion")).toBe("3");
  });

  it("does not re-seed when data is already present", () => {
    getCollection("teams"); // triggers first-run seed
    setCollection("teams", [{ id: "custom", name: "Custom FC" }]);

    const result = getCollection("teams");
    expect(result).toEqual([{ id: "custom", name: "Custom FC" }]);
  });

  it("setCollection persists a value retrievable by getCollection", () => {
    getCollection("teams"); // establish first-run seed/schema before writing directly
    setCollection("teams", [{ id: "x1", name: "Set Directly" }]);
    expect(getCollection("teams")).toEqual([{ id: "x1", name: "Set Directly" }]);
  });

  it("returns non-reference-identical results across two getCollection calls", () => {
    const first = getCollection("teams");
    const second = getCollection("teams");
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });

  it("returns a deep copy — mutating the result does not affect the store", () => {
    const first = getCollection("teams");
    first.push({ id: "injected", name: "Should not persist" });
    first[0].name = "Mutated";

    const second = getCollection("teams");
    expect(second.find((t) => t.id === "injected")).toBeUndefined();
    expect(second[0].name).not.toBe("Mutated");
  });

  it("revives registered date fields per collection (trainings.day)", () => {
    const [training] = getCollection("trainings");
    expect(training.day).toBeInstanceOf(Date);
  });

  it("does not revive date fields for collections with no registered date fields (teams)", () => {
    getCollection("teams"); // establish first-run seed/schema before writing directly
    setCollection("teams", [{ id: "t1", name: "Team", createdAt: "2024-01-01T00:00:00Z" }]);
    const [team] = getCollection("teams");
    expect(typeof team.createdAt).toBe("string");
  });

  it("leaves already-current (v3) data untouched on a subsequent load", () => {
    getCollection("teams"); // establish current schema version
    setCollection("teams", [{ id: "same", name: "Unchanged" }]);
    getCollection("teams"); // ensureSeeded runs the migration-check path (no-op at current version)
    expect(getCollection("teams")).toEqual([{ id: "same", name: "Unchanged" }]);
  });

  describe("v1 -> v2 migration: competitions derived from stored games (AC COMP-02)", () => {
    function seedV1Store(games) {
      localStorage.setItem("coachplanner:v1:schemaVersion", "1");
      localStorage.setItem("coachplanner:v1:games", JSON.stringify(games));
    }

    it("derives one competition per distinct non-empty game.competition value (AC COMP-02.1)", () => {
      seedV1Store([
        { id: 1, competition: "District League" },
        { id: 2, competition: "Cup" },
      ]);

      const competitions = getCollection("competitions");

      expect(competitions.map((c) => c.name).sort()).toEqual(["Cup", "District League"]);
    });

    it("collapses names differing only by case or surrounding whitespace into one competition (AC COMP-02.2)", () => {
      seedV1Store([
        { id: 1, competition: "District League" },
        { id: 2, competition: "district league" },
        { id: 3, competition: "  District League  " },
      ]);

      const competitions = getCollection("competitions");

      expect(competitions).toHaveLength(1);
      expect(competitions[0].name).toBe("District League");
    });

    it("games with a null, undefined or empty competition contribute nothing (AC COMP-02.3)", () => {
      seedV1Store([
        { id: 1, competition: null },
        { id: 2, competition: undefined },
        { id: 3, competition: "" },
        { id: 4, competition: "   " },
        { id: 5, competition: "Cup" },
      ]);

      const competitions = getCollection("competitions");

      expect(competitions.map((c) => c.name)).toEqual(["Cup"]);
    });

    it("does not modify any game record (AC COMP-02.4)", () => {
      const games = [
        { id: 1, competition: "District League" },
        { id: 2, competition: "Cup" },
      ];
      seedV1Store(games);

      getCollection("competitions"); // triggers the migration

      expect(getCollection("games")).toEqual(games);
    });

    it("migrates from v1 all the way to the current version, and a second load does not re-run or duplicate (AC COMP-02.5)", () => {
      seedV1Store([{ id: 1, competition: "Cup" }]);

      getCollection("competitions"); // first load: runs both v1->v2 and v2->v3 migrations
      expect(localStorage.getItem("coachplanner:v1:schemaVersion")).toBe("3");

      const afterFirstLoad = getCollection("competitions");
      const afterSecondLoad = getCollection("competitions"); // second load: must not re-run

      expect(afterSecondLoad).toEqual(afterFirstLoad);
      expect(afterSecondLoad).toHaveLength(1);
    });

    it("a fresh install (no stored version) seeds directly and does not run the migration", () => {
      // No localStorage.setItem call — this is a genuinely empty store.
      const competitions = getCollection("competitions");
      const seed = createSeed();

      expect(competitions).toEqual(seed.competitions);
    });

    it("a store already at the current version is left alone", () => {
      localStorage.setItem("coachplanner:v1:schemaVersion", "3");
      localStorage.setItem(
        "coachplanner:v1:games",
        JSON.stringify([{ id: 1, competition: "Cup" }])
      );
      localStorage.setItem(
        "coachplanner:v1:competitions",
        JSON.stringify([{ id: "existing", name: "Already Stored" }])
      );

      const competitions = getCollection("competitions");

      expect(competitions).toEqual([{ id: "existing", name: "Already Stored" }]);
    });

    it("is exercised through getCollection, the real entry point", () => {
      seedV1Store([{ id: 1, competition: "Cup" }]);

      // Calling getCollection (not the migration function directly) must be
      // sufficient to trigger the migration and populate the collection.
      const competitions = getCollection("competitions");

      expect(competitions).toEqual([{ id: expect.any(String), name: "Cup" }]);
    });
  });

  describe("v2 -> v3 migration: opponents derived from stored games (AC OPP-02)", () => {
    function seedV2Store(games) {
      localStorage.setItem("coachplanner:v1:schemaVersion", "2");
      localStorage.setItem("coachplanner:v1:games", JSON.stringify(games));
    }

    it("derives one opponent per distinct non-empty game.opponent value (AC OPP-02.1)", () => {
      seedV2Store([
        { id: 1, opponent: "Benfica" },
        { id: 2, opponent: "Porto" },
      ]);

      const opponents = getCollection("opponents");

      expect(opponents.map((o) => o.name).sort()).toEqual(["Benfica", "Porto"]);
    });

    it("collapses names differing only by case or surrounding whitespace into one opponent (AC OPP-02.2)", () => {
      seedV2Store([
        { id: 1, opponent: "Benfica" },
        { id: 2, opponent: "benfica" },
        { id: 3, opponent: "  Benfica  " },
      ]);

      const opponents = getCollection("opponents");

      expect(opponents).toHaveLength(1);
      expect(opponents[0].name).toBe("Benfica");
    });

    it("games with a null, undefined or empty opponent contribute nothing (AC OPP-02.3)", () => {
      seedV2Store([
        { id: 1, opponent: null },
        { id: 2, opponent: undefined },
        { id: 3, opponent: "" },
        { id: 4, opponent: "   " },
        { id: 5, opponent: "Porto" },
      ]);

      const opponents = getCollection("opponents");

      expect(opponents.map((o) => o.name)).toEqual(["Porto"]);
    });

    it("does not modify any game record (AC OPP-02.4)", () => {
      const games = [
        { id: 1, opponent: "Benfica" },
        { id: 2, opponent: "Porto" },
      ];
      seedV2Store(games);

      getCollection("opponents"); // triggers the migration

      expect(getCollection("games")).toEqual(games);
    });

    it("a second load does not re-run the migration or duplicate records (AC OPP-02.5)", () => {
      seedV2Store([{ id: 1, opponent: "Porto" }]);

      const afterFirstLoad = getCollection("opponents");
      expect(localStorage.getItem("coachplanner:v1:schemaVersion")).toBe("3");
      const afterSecondLoad = getCollection("opponents");

      expect(afterSecondLoad).toEqual(afterFirstLoad);
      expect(afterSecondLoad).toHaveLength(1);
    });

    it("registered under the next unused schema version (v3, since v2 already belongs to 20-competitions) (AC OPP-02.6)", () => {
      seedV2Store([{ id: 1, opponent: "Porto" }]);

      getCollection("opponents");

      expect(localStorage.getItem("coachplanner:v1:schemaVersion")).toBe("3");
    });

    it("a store two versions behind (v1) runs both migrations in order and ends at the current version", () => {
      localStorage.setItem("coachplanner:v1:schemaVersion", "1");
      localStorage.setItem(
        "coachplanner:v1:games",
        JSON.stringify([
          { id: 1, competition: "Cup", opponent: "Benfica" },
          { id: 2, competition: "League", opponent: "Porto" },
        ])
      );

      const opponents = getCollection("opponents");
      const competitions = getCollection("competitions");

      expect(localStorage.getItem("coachplanner:v1:schemaVersion")).toBe("3");
      expect(opponents.map((o) => o.name).sort()).toEqual(["Benfica", "Porto"]);
      expect(competitions.map((c) => c.name).sort()).toEqual(["Cup", "League"]);
    });

    it("a fresh install (no stored version) seeds directly and does not run the migration", () => {
      const opponents = getCollection("opponents");
      const seed = createSeed();

      expect(opponents).toEqual(seed.opponents);
    });
  });

  it("reset() clears all coachplanner:v1:* keys and re-seeds", () => {
    setCollection("teams", [{ id: "custom", name: "Custom FC" }]);
    reset();

    const seed = createSeed();
    expect(getCollection("teams")).toEqual(seed.teams);
  });

  it("reset() leaves the auth session's user key untouched", () => {
    localStorage.setItem("user", JSON.stringify({ email: "user@email.com" }));
    getCollection("teams");

    reset();

    expect(localStorage.getItem("user")).toBe(
      JSON.stringify({ email: "user@email.com" })
    );
  });

  it("reset() leaves the store re-seeded rather than empty", () => {
    getCollection("teams");
    reset();

    expect(getCollection("teams").length).toBeGreaterThan(0);
    expect(getCollection("trainings").length).toBeGreaterThan(0);
  });
});
