import { describe, it, expect, vi, afterEach } from "vitest";
import { parseApiDate, serializeApiDate, browserTimeZone } from "../dates";

describe("parseApiDate", () => {
  it("parses an ISO instant string into an equivalent Date", () => {
    const result = parseApiDate("2026-08-18T09:37:35.887Z");
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe("2026-08-18T09:37:35.887Z");
  });

  it("returns null for null", () => {
    expect(parseApiDate(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseApiDate(undefined)).toBeNull();
  });
});

describe("serializeApiDate", () => {
  it("serializes a Date into the same ISO instant string it was parsed from", () => {
    const original = "2026-08-18T09:37:35.887Z";
    const date = parseApiDate(original);
    expect(serializeApiDate(date)).toBe(original);
  });

  it("returns null for null", () => {
    expect(serializeApiDate(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(serializeApiDate(undefined)).toBeNull();
  });
});

describe("browserTimeZone", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns Intl.DateTimeFormat().resolvedOptions().timeZone when available (PDFEX-03)", () => {
    vi.stubGlobal("Intl", {
      DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: "America/Sao_Paulo" }) }),
    });
    expect(browserTimeZone()).toBe("America/Sao_Paulo");
  });

  it("returns null when Intl is absent (PDFEX-03)", () => {
    vi.stubGlobal("Intl", undefined);
    expect(browserTimeZone()).toBeNull();
  });

  it("returns null when resolvedOptions() throws (PDFEX-03)", () => {
    vi.stubGlobal("Intl", {
      DateTimeFormat: () => ({
        resolvedOptions: () => {
          throw new Error("boom");
        },
      }),
    });
    expect(browserTimeZone()).toBeNull();
  });

  it("returns null when the resolved zone is an empty string (PDFEX-03)", () => {
    vi.stubGlobal("Intl", {
      DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: "" }) }),
    });
    expect(browserTimeZone()).toBeNull();
  });

  it("returns null when the resolved zone is undefined (PDFEX-03)", () => {
    vi.stubGlobal("Intl", {
      DateTimeFormat: () => ({ resolvedOptions: () => ({}) }),
    });
    expect(browserTimeZone()).toBeNull();
  });
});
