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
    expect(localStorage.getItem("coachplanner:v1:schemaVersion")).toBe("1");
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

  it("runs the identity migration hook without altering already-current (v1) data", () => {
    getCollection("teams"); // establish schema version 1
    setCollection("teams", [{ id: "same", name: "Unchanged" }]);
    getCollection("teams"); // ensureSeeded runs the migration-check path (no-op at v1)
    expect(getCollection("teams")).toEqual([{ id: "same", name: "Unchanged" }]);
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
