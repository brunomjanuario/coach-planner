import { describe, it, expect, vi, afterEach } from "vitest";
import { trainingService } from "../trainingService";
import { apiFetch } from "../../lib/apiClient";
import { ratingService } from "../ratingService";
import { NotFoundError } from "../../lib/errors";

vi.mock("../../lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("../ratingService", () => ({
  ratingService: { removeByEvent: vi.fn(), removeByPlayer: vi.fn() },
}));

const RAW_TRAINING = {
  id: "tr1",
  teamId: "team-1",
  day: "2030-01-01T10:00:00.000Z",
  duration: 60,
  number: 1,
  exercises: [],
};

describe("trainingService", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("getAll() calls GET /trainings and hydrates day into a Date", async () => {
    apiFetch.mockResolvedValueOnce([RAW_TRAINING]);

    const trainings = await trainingService.getAll();

    expect(apiFetch).toHaveBeenCalledWith("/trainings");
    expect(trainings[0].day).toBeInstanceOf(Date);
    expect(trainings[0].day.toISOString()).toBe("2030-01-01T10:00:00.000Z");
  });

  it("getById(id) calls GET /trainings/{id} and hydrates day", async () => {
    apiFetch.mockResolvedValueOnce(RAW_TRAINING);

    const training = await trainingService.getById("tr1");

    expect(apiFetch).toHaveBeenCalledWith("/trainings/tr1");
    expect(training.day).toBeInstanceOf(Date);
  });

  it("getById propagates a typed NotFoundError for an unknown id", async () => {
    apiFetch.mockRejectedValueOnce(new NotFoundError("Training not found"));

    await expect(trainingService.getById("no-such-training")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("create(trainingData) calls POST /trainings with the training data as the body", async () => {
    const trainingData = {
      teamId: "team-1",
      day: new Date("2030-01-01T10:00:00Z"),
      duration: 60,
      exercises: [],
    };
    apiFetch.mockResolvedValueOnce({ ...RAW_TRAINING, ...trainingData, day: RAW_TRAINING.day });

    const created = await trainingService.create(trainingData);

    expect(apiFetch).toHaveBeenCalledWith("/trainings", {
      method: "POST",
      body: trainingData,
    });
    expect(created.day).toBeInstanceOf(Date);
  });

  it("update(trainingData) calls PATCH /trainings/{id} with the training data as the body", async () => {
    const trainingData = { id: "tr1", duration: 120 };
    apiFetch.mockResolvedValueOnce({ ...RAW_TRAINING, duration: 120 });

    const updated = await trainingService.update(trainingData);

    expect(apiFetch).toHaveBeenCalledWith("/trainings/tr1", {
      method: "PATCH",
      body: trainingData,
    });
    expect(updated.duration).toBe(120);
  });

  it("update propagates a typed NotFoundError for an unknown id", async () => {
    apiFetch.mockRejectedValueOnce(new NotFoundError("Training not found"));

    await expect(
      trainingService.update({ id: "no-such-training", duration: 45 })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("delete(id) calls DELETE /trainings/{id}", async () => {
    apiFetch.mockResolvedValueOnce(null);

    await trainingService.delete("tr1");

    expect(apiFetch).toHaveBeenCalledWith("/trainings/tr1", { method: "DELETE" });
  });

  it("delete does not call ratingService.removeByEvent — the backend cascades (F5 AC7)", async () => {
    apiFetch.mockResolvedValueOnce(null);

    await trainingService.delete("tr1");

    expect(ratingService.removeByEvent).not.toHaveBeenCalled();
  });

  it("getUnassigned() calls GET /trainings?assigned=false", async () => {
    apiFetch.mockResolvedValueOnce([{ ...RAW_TRAINING, teamId: null }]);

    const unassigned = await trainingService.getUnassigned();

    expect(apiFetch).toHaveBeenCalledWith("/trainings?assigned=false");
    expect(unassigned).toHaveLength(1);
  });

  it("getAllNumbered() with no teamId calls GET /trainings", async () => {
    apiFetch.mockResolvedValueOnce([RAW_TRAINING]);

    await trainingService.getAllNumbered();

    expect(apiFetch).toHaveBeenCalledWith("/trainings");
  });

  it("getAllNumbered(teamId) calls GET /trainings?teamId=", async () => {
    apiFetch.mockResolvedValueOnce([RAW_TRAINING]);

    await trainingService.getAllNumbered("team-1");

    expect(apiFetch).toHaveBeenCalledWith("/trainings?teamId=team-1");
  });

  it("getAllNumbered reads `number` straight from the response — no client-side recomputation", async () => {
    // A response deliberately out of the order a client-side numbering pass
    // would produce (e.g. sorted by day) — if the service recomputed
    // numbers itself, this order/values would be overwritten.
    apiFetch.mockResolvedValueOnce([
      { ...RAW_TRAINING, id: "tr1", number: 7 },
      { ...RAW_TRAINING, id: "tr2", number: 2 },
    ]);

    const numbered = await trainingService.getAllNumbered();

    expect(numbered.map((t) => t.number)).toEqual([7, 2]);
  });
});
