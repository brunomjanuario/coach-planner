import { describe, it, expect, vi, afterEach } from "vitest";
import { trainingService } from "../trainingService";
import { teamService } from "../teamService";
import { NotFoundError } from "../../lib/errors";

describe("trainingService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getAll returns the persisted list of trainings", async () => {
    const trainings = await trainingService.getAll();
    expect(Array.isArray(trainings)).toBe(true);
    expect(trainings.length).toBeGreaterThan(0);
  });

  it("getAll returns non-reference-identical arrays across two calls", async () => {
    const first = await trainingService.getAll();
    const second = await trainingService.getAll();
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });

  it("getById returns the matching training for a known id", async () => {
    const [seedTraining] = await trainingService.getAll();
    const found = await trainingService.getById(seedTraining.id);
    expect(found).toEqual(seedTraining);
  });

  it("getById returns null (not a throw) for an unknown id", async () => {
    const result = await trainingService.getById("no-such-training");
    expect(result).toBeNull();
  });

  it("getById does not call the global fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("fetch should not be called");
    });

    await trainingService.getById("any-id");

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("create assigns an id via newId() and persists", async () => {
    const created = await trainingService.create({
      teamId: "team-1",
      day: new Date("2030-01-01T10:00:00Z"),
      duration: 60,
      exercises: [],
    });

    expect(typeof created.id).toBe("string");
    expect(created.id.length).toBeGreaterThan(0);

    const all = await trainingService.getAll();
    expect(all.find((t) => t.id === created.id)).toEqual(created);
  });

  it("a saved training's day is a Date instance after being re-read (AC PERSIST-05.1)", async () => {
    const created = await trainingService.create({
      teamId: "team-1",
      day: new Date("2030-01-01T10:00:00Z"),
      duration: 60,
      exercises: [],
    });

    const reread = await trainingService.getById(created.id);
    expect(reread.day).toBeInstanceOf(Date);
    expect(reread.day.toISOString()).toBe("2030-01-01T10:00:00.000Z");
  });

  it("a future training still sorts into the future bucket after reload (AC PERSIST-05.2)", async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const created = await trainingService.create({
      teamId: "team-1",
      day: future,
      duration: 60,
      exercises: [],
    });

    const reread = await trainingService.getById(created.id);
    expect(reread.day >= new Date()).toBe(true);
  });

  it("update takes a whole training object, persists and returns it", async () => {
    const [seedTraining] = await trainingService.getAll();

    const updated = await trainingService.update({
      ...seedTraining,
      duration: 120,
    });

    expect(updated.duration).toBe(120);
    const reread = await trainingService.getById(seedTraining.id);
    expect(reread.duration).toBe(120);
  });

  it("update does not call the global fetch", async () => {
    const [seedTraining] = await trainingService.getAll();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("fetch should not be called");
    });

    await trainingService.update({ ...seedTraining, duration: 45 });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("update throws a typed NotFoundError for an unknown id", async () => {
    await expect(
      trainingService.update({ id: "no-such-training", duration: 45 })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("delete persists the removal — a subsequent getAll no longer includes the training", async () => {
    const [seedTraining] = await trainingService.getAll();

    await trainingService.delete(seedTraining.id);

    const all = await trainingService.getAll();
    expect(all.find((t) => t.id === seedTraining.id)).toBeUndefined();
  });

  it("getUnassigned returns trainings with a null teamId (AC TTA-05.1)", async () => {
    const created = await trainingService.create({
      teamId: null,
      day: new Date("2030-01-01T10:00:00Z"),
      duration: 60,
      exercises: [],
    });

    const unassigned = await trainingService.getUnassigned();

    expect(unassigned.find((t) => t.id === created.id)).toBeTruthy();
  });

  it("getUnassigned returns trainings whose teamId matches no existing team (dangling-reference edge case)", async () => {
    const created = await trainingService.create({
      teamId: "no-such-team",
      day: new Date("2030-01-01T10:00:00Z"),
      duration: 60,
      exercises: [],
    });

    const unassigned = await trainingService.getUnassigned();

    expect(unassigned.find((t) => t.id === created.id)).toBeTruthy();
  });

  it("getUnassigned does not return a training whose teamId matches an existing team", async () => {
    const [existingTeam] = await teamService.getAll();
    const created = await trainingService.create({
      teamId: existingTeam.id,
      day: new Date("2030-01-01T10:00:00Z"),
      duration: 60,
      exercises: [],
    });

    const unassigned = await trainingService.getUnassigned();

    expect(unassigned.find((t) => t.id === created.id)).toBeUndefined();
  });

  it("getUnassigned returns an empty array when every training has a valid teamId (AC TTA-05.2)", async () => {
    const trainings = await trainingService.getAll();
    const [existingTeam] = await teamService.getAll();
    for (const training of trainings) {
      await trainingService.update({ ...training, teamId: existingTeam.id });
    }

    const unassigned = await trainingService.getUnassigned();

    expect(unassigned).toEqual([]);
  });

  it("getUnassigned does not call the global fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("fetch should not be called");
    });

    await trainingService.getUnassigned();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("delete does not call the global fetch", async () => {
    const [seedTraining] = await trainingService.getAll();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("fetch should not be called");
    });

    await trainingService.delete(seedTraining.id);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
