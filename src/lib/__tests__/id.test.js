import { describe, it, expect, vi, afterEach } from "vitest";
import { newId } from "../id";

describe("newId", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns crypto.randomUUID() when available", () => {
    const spy = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("11111111-1111-1111-1111-111111111111");

    expect(newId()).toBe("11111111-1111-1111-1111-111111111111");
    expect(spy).toHaveBeenCalled();
  });

  it("falls back to a timestamp+counter string when crypto.randomUUID is absent", () => {
    const original = crypto.randomUUID;
    crypto.randomUUID = undefined;

    const id = newId();
    expect(id).toMatch(/^\d+-\d+$/);

    crypto.randomUUID = original;
  });

  it("produces 10,000 distinct values across 10,000 successive calls", () => {
    const ids = new Set();
    for (let i = 0; i < 10000; i++) {
      ids.add(newId());
    }
    expect(ids.size).toBe(10000);
  });

  it("always returns a string", () => {
    expect(typeof newId()).toBe("string");

    const original = crypto.randomUUID;
    crypto.randomUUID = undefined;
    expect(typeof newId()).toBe("string");
    crypto.randomUUID = original;
  });
});
