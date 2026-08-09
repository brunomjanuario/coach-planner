import { describe, it, expect } from "vitest";
import { getCollection, setCollection, reset } from "../store";
import { createSeed } from "../../model/seed";
import { trainingService } from "../trainingService";

describe("store", () => {
  it("seeds from createSeed() and persists it on first run with empty storage", () => {
    const seed = createSeed();
    expect(getCollection("teams")).toEqual(seed.teams);
    expect(getCollection("trainings").length).toBe(seed.trainings.length);
  });

  it("writes a schema-version key on first run", () => {
    getCollection("teams");
    expect(localStorage.getItem("coachplanner:v1:schemaVersion")).toBe("4");
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
      expect(localStorage.getItem("coachplanner:v1:schemaVersion")).toBe("4");

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
      expect(localStorage.getItem("coachplanner:v1:schemaVersion")).toBe("4");
      const afterSecondLoad = getCollection("opponents");

      expect(afterSecondLoad).toEqual(afterFirstLoad);
      expect(afterSecondLoad).toHaveLength(1);
    });

    it("registered under the next unused schema version (v3, since v2 already belongs to 20-competitions) (AC OPP-02.6)", () => {
      seedV2Store([{ id: 1, opponent: "Porto" }]);

      getCollection("opponents");

      expect(localStorage.getItem("coachplanner:v1:schemaVersion")).toBe("4");
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

      expect(localStorage.getItem("coachplanner:v1:schemaVersion")).toBe("4");
      expect(opponents.map((o) => o.name).sort()).toEqual(["Benfica", "Porto"]);
      expect(competitions.map((c) => c.name).sort()).toEqual(["Cup", "League"]);
    });

    it("a fresh install (no stored version) seeds directly and does not run the migration", () => {
      const opponents = getCollection("opponents");
      const seed = createSeed();

      expect(opponents).toEqual(seed.opponents);
    });
  });

  describe("v3 -> v4 migration: diagram: null backfilled onto every exercise (AC DRAW-01)", () => {
    function seedV3Store(trainings) {
      localStorage.setItem("coachplanner:v1:schemaVersion", "3");
      localStorage.setItem("coachplanner:v1:trainings", JSON.stringify(trainings));
    }

    it("sets diagram: null on every exercise across every training (AC DRAW-01)", () => {
      seedV3Store([
        { id: "t1", exercises: [{ id: "e1", description: "SSG", image: "" }] },
        {
          id: "t2",
          exercises: [
            { id: "e2", description: "Rondo", image: "" },
            { id: "e3", description: "Passing", image: "" },
          ],
        },
      ]);

      const trainings = getCollection("trainings");

      expect(
        trainings.every((t) => t.exercises.every((ex) => ex.diagram === null))
      ).toBe(true);
    });

    it("preserves every other field on the exercise, including the legacy image field", () => {
      seedV3Store([
        {
          id: "t1",
          exercises: [
            {
              id: "e1",
              description: "SSG",
              duration: 20,
              numberOfPlayers: 8,
              repetitions: 3,
              image: "",
            },
          ],
        },
      ]);

      const [training] = getCollection("trainings");

      expect(training.exercises[0]).toEqual({
        id: "e1",
        description: "SSG",
        duration: 20,
        numberOfPlayers: 8,
        repetitions: 3,
        image: "",
        diagram: null,
      });
    });

    it("preserves every other field on the training itself", () => {
      seedV3Store([{ id: "t1", teamId: "team-1", duration: 90, exercises: [] }]);

      const [training] = getCollection("trainings");

      expect(training).toMatchObject({ id: "t1", teamId: "team-1", duration: 90 });
    });

    it("bumps the stored schema version to 4", () => {
      seedV3Store([{ id: "t1", exercises: [] }]);

      getCollection("trainings");

      expect(localStorage.getItem("coachplanner:v1:schemaVersion")).toBe("4");
    });

    it("a second load does not re-run the migration or duplicate exercises (idempotency)", () => {
      seedV3Store([{ id: "t1", exercises: [{ id: "e1", image: "" }] }]);

      const afterFirstLoad = getCollection("trainings");
      expect(localStorage.getItem("coachplanner:v1:schemaVersion")).toBe("4");
      const afterSecondLoad = getCollection("trainings");

      expect(afterSecondLoad).toEqual(afterFirstLoad);
      expect(afterSecondLoad[0].exercises).toHaveLength(1);
    });

    it("a store already at version 4 is not re-migrated — an existing non-null diagram is left as-is", () => {
      localStorage.setItem("coachplanner:v1:schemaVersion", "4");
      localStorage.setItem(
        "coachplanner:v1:trainings",
        JSON.stringify([
          {
            id: "t1",
            exercises: [
              { id: "e1", diagram: { v: 1, pitch: "full", shapes: [{ id: "s1", kind: "cone", x: 0.1, y: 0.1 }] } },
            ],
          },
        ])
      );

      const [training] = getCollection("trainings");

      expect(training.exercises[0].diagram).toEqual({
        v: 1,
        pitch: "full",
        shapes: [{ id: "s1", kind: "cone", x: 0.1, y: 0.1 }],
      });
    });

    it("a fresh install (no stored version) seeds directly, without running the migration", () => {
      const trainings = getCollection("trainings");
      const seed = createSeed();

      expect(trainings.length).toBe(seed.trainings.length);
    });

    it("a store two versions behind (v2) runs migrations in order and ends at v4 with diagram backfilled", () => {
      localStorage.setItem("coachplanner:v1:schemaVersion", "2");
      localStorage.setItem(
        "coachplanner:v1:games",
        JSON.stringify([{ id: 1, opponent: "Benfica" }])
      );
      localStorage.setItem(
        "coachplanner:v1:trainings",
        JSON.stringify([{ id: "t1", exercises: [{ id: "e1", image: "" }] }])
      );

      const trainings = getCollection("trainings");

      expect(localStorage.getItem("coachplanner:v1:schemaVersion")).toBe("4");
      expect(trainings[0].exercises[0].diagram).toBeNull();
    });
  });

  describe("exercise diagram persistence via trainingService (AC P1.6)", () => {
    it("a diagram round-trips through trainingService.update and a store re-read (reload proof)", async () => {
      const diagram = {
        v: 1,
        pitch: "full",
        shapes: [{ id: "s1", kind: "cone", x: 0.2, y: 0.3 }],
      };
      const created = await trainingService.create({
        teamId: "team-1",
        day: new Date("2030-01-01T10:00:00Z"),
        duration: 60,
        exercises: [
          { id: "e1", description: "SSG", duration: 20, image: "", diagram },
        ],
      });

      await trainingService.update({ ...created });

      const reread = await trainingService.getById(created.id);
      expect(reread.exercises[0].diagram).toEqual(diagram);
    });

    it("deleting an exercise removes its diagram with it — no orphan (edge case)", async () => {
      const diagram = {
        v: 1,
        pitch: "full",
        shapes: [{ id: "s1", kind: "ball", x: 0.5, y: 0.5 }],
      };
      const created = await trainingService.create({
        teamId: "team-1",
        day: new Date("2030-01-01T10:00:00Z"),
        duration: 60,
        exercises: [
          { id: "e1", description: "SSG", duration: 20, image: "", diagram },
          { id: "e2", description: "Passing", duration: 10, image: "", diagram: null },
        ],
      });

      await trainingService.update({
        ...created,
        exercises: created.exercises.filter((ex) => ex.id !== "e1"),
      });

      const reread = await trainingService.getById(created.id);
      expect(reread.exercises.find((ex) => ex.id === "e1")).toBeUndefined();
      expect(reread.exercises).toEqual([
        { id: "e2", description: "Passing", duration: 10, image: "", diagram: null },
      ]);
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
