import { describe, it, expect } from "vitest";
import { filenameFromDisposition } from "../contentDisposition";

const FALLBACK = "fallback.pdf";

describe("filenameFromDisposition", () => {
  it("returns the quoted filename= value (PDFEX-16)", () => {
    expect(
      filenameFromDisposition('attachment; filename="sub-11-session-3-2026-08-25.pdf"', FALLBACK)
    ).toBe("sub-11-session-3-2026-08-25.pdf");
  });

  it("returns the unquoted filename= value (PDFEX-16)", () => {
    expect(
      filenameFromDisposition("attachment; filename=sub-11-session-3-2026-08-25.pdf", FALLBACK)
    ).toBe("sub-11-session-3-2026-08-25.pdf");
  });

  it("decodes filename* and prefers it over a filename= in the same header (PDFEX-17)", () => {
    const header =
      "attachment; filename=\"training.pdf\"; filename*=UTF-8''se%C3%A7%C3%A3o.pdf";
    expect(filenameFromDisposition(header, FALLBACK)).toBe("seção.pdf");
  });

  it("returns the fallback when header is null (PDFEX-18)", () => {
    expect(filenameFromDisposition(null, FALLBACK)).toBe(FALLBACK);
  });

  it("returns the fallback when header is empty (PDFEX-18)", () => {
    expect(filenameFromDisposition("", FALLBACK)).toBe(FALLBACK);
  });

  it("returns the fallback when header has no filename parameter (PDFEX-18)", () => {
    expect(filenameFromDisposition("attachment", FALLBACK)).toBe(FALLBACK);
  });

  it("keeps only the final path segment for a relative traversal path (PDFEX-19)", () => {
    expect(
      filenameFromDisposition('attachment; filename="../evil.pdf"', FALLBACK)
    ).toBe("evil.pdf");
  });

  it("keeps only the final path segment for a traversal path in filename* too (PDFEX-19, PDFEX-17)", () => {
    // filename* is percent-decoded before path-stripping, so the traversal
    // segments themselves are plain text in the encoded value.
    expect(
      filenameFromDisposition("attachment; filename*=UTF-8''..%2Fevil.pdf", FALLBACK)
    ).toBe("evil.pdf");
  });

  it("keeps only the final path segment for an absolute unix path (PDFEX-19)", () => {
    expect(
      filenameFromDisposition('attachment; filename="/etc/x.pdf"', FALLBACK)
    ).toBe("x.pdf");
  });

  it("keeps only the final path segment for a windows-style backslash path (PDFEX-19)", () => {
    expect(
      filenameFromDisposition('attachment; filename="a\\\\b.pdf"', FALLBACK)
    ).toBe("b.pdf");
  });

  it("falls back when stripping the path leaves nothing usable (PDFEX-19)", () => {
    expect(
      filenameFromDisposition('attachment; filename="../"', FALLBACK)
    ).toBe(FALLBACK);
  });

  it("falls back when filename* percent-decoding throws (malformed escape)", () => {
    const header = "attachment; filename*=UTF-8''%E0%A4%A";
    expect(filenameFromDisposition(header, FALLBACK)).toBe(FALLBACK);
  });
});
