import { describe, it, expect, vi, afterEach } from "vitest";
import { triggerDownload } from "../download";

// jsdom implements neither URL.createObjectURL nor URL.revokeObjectURL, so
// every test stubs both -- there is nothing "real" to fall back to here.
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function stubObjectUrl(url = "blob:mock-url") {
  const createObjectURL = vi.fn(() => url);
  const revokeObjectURL = vi.fn();
  vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
  return { createObjectURL, revokeObjectURL, url };
}

describe("triggerDownload", () => {
  it("creates an object URL from the blob and sets it as the anchor's href, and clicks it once (PDFEX-05)", () => {
    const { createObjectURL, url } = stubObjectUrl();
    const blob = new Blob(["%PDF-1.4"], { type: "application/pdf" });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    triggerDownload(blob, "session.pdf");

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    // the anchor that was clicked is the one carrying our url/filename --
    // captured via the click spy's `this` binding.
    const clickedAnchor = clickSpy.mock.contexts[0];
    expect(clickedAnchor.href).toBe(url);
  });

  it("sets the anchor's download attribute to the exact filename passed in (PDFEX-05)", () => {
    stubObjectUrl();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const blob = new Blob(["%PDF-1.4"]);

    triggerDownload(blob, "sub-11-session-3-2026-08-25.pdf");

    const clickedAnchor = clickSpy.mock.contexts[0];
    expect(clickedAnchor.download).toBe("sub-11-session-3-2026-08-25.pdf");
  });

  it("leaves no anchor in the document and revokes the created URL after the call (PDFEX-05)", () => {
    const { revokeObjectURL, url } = stubObjectUrl();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const blob = new Blob(["%PDF-1.4"]);

    triggerDownload(blob, "session.pdf");

    expect(document.querySelectorAll("a").length).toBe(0);
    expect(revokeObjectURL).toHaveBeenCalledWith(url);
  });

  it("still revokes the URL and removes the anchor when click() throws", () => {
    const { revokeObjectURL, url } = stubObjectUrl();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("blocked by popup blocker");
    });
    const blob = new Blob(["%PDF-1.4"]);

    expect(() => triggerDownload(blob, "session.pdf")).toThrow("blocked by popup blocker");

    expect(document.querySelectorAll("a").length).toBe(0);
    expect(revokeObjectURL).toHaveBeenCalledWith(url);
  });
});
