import { describe, it, expect, vi, afterEach } from "vitest";
import { read, write, remove, StorageQuotaError } from "../storage";

describe("storage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("round-trips a plain array through write then read", () => {
    write("teams", [{ id: "1", name: "Sub-11" }]);
    expect(read("teams")).toEqual([{ id: "1", name: "Sub-11" }]);
  });

  it("stores serialized data under the namespaced key coachplanner:v1:<collection>", () => {
    write("teams", [{ id: "1" }]);
    expect(localStorage.getItem("coachplanner:v1:teams")).toBe(
      JSON.stringify([{ id: "1" }])
    );
  });

  it("revives listed date fields to Date instances on read", () => {
    write("trainings", [{ id: "1", day: new Date("2024-10-24T15:00:00Z") }]);
    const [result] = read("trainings", ["day"]);
    expect(result.day).toBeInstanceOf(Date);
    expect(result.day.toISOString()).toBe("2024-10-24T15:00:00.000Z");
  });

  it("returns null when the key is absent", () => {
    expect(read("nonexistent")).toBeNull();
  });

  it("returns null and logs one warning when stored JSON is corrupt", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem("coachplanner:v1:broken", "{not valid json");

    expect(read("broken")).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("revives a malformed date string as an Invalid Date rather than throwing", () => {
    localStorage.setItem(
      "coachplanner:v1:trainings",
      JSON.stringify([{ id: "1", day: "not-a-date" }])
    );

    expect(() => read("trainings", ["day"])).not.toThrow();
    const [result] = read("trainings", ["day"]);
    expect(result.day).toBeInstanceOf(Date);
    expect(Number.isNaN(result.day.getTime())).toBe(true);
  });

  it("throws a typed StorageQuotaError carrying the collection name when the write exceeds quota, leaving prior data intact", () => {
    write("teams", [{ id: "1" }]);

    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        const err = new DOMException("quota exceeded", "QuotaExceededError");
        throw err;
      });

    let caught;
    try {
      write("teams", [{ id: "1" }, { id: "2" }]);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(StorageQuotaError);
    expect(caught.collection).toBe("teams");

    setItemSpy.mockRestore();
    expect(read("teams")).toEqual([{ id: "1" }]);
  });

  it("falls back to an in-memory store for the session when localStorage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("unavailable", "SecurityError");
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.resetModules();
    const fresh = await import("../storage?fallback-test");

    fresh.write("teams", [{ id: "memory-1" }]);
    expect(fresh.read("teams")).toEqual([{ id: "memory-1" }]);
  });

  it("warns only once when localStorage is unavailable across multiple calls", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("unavailable", "SecurityError");
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.resetModules();
    const fresh = await import("../storage?warn-once-test");

    fresh.write("teams", [{ id: "1" }]);
    fresh.write("trainings", [{ id: "2" }]);
    fresh.read("teams");

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("removes the namespaced key so a subsequent read returns null", () => {
    write("teams", [{ id: "1" }]);
    remove("teams");
    expect(read("teams")).toBeNull();
  });
});
