import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch, apiFetchBlob } from "../apiClient";
import {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAuthFailureHandler,
} from "../tokenStore";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  AuthError,
  ApiError,
  NetworkError,
} from "../errors";

function jsonResponse(body, status = 200) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function problemResponse(status, type, detail = "problem", errors) {
  return jsonResponse({ type: `https://coachplanner.dev/problems/${type}`, detail, errors }, status);
}

describe("apiFetch", () => {
  let fetchMock;
  let authFailures;

  beforeEach(() => {
    clearTokens();
    authFailures = 0;
    setAuthFailureHandler(() => {
      authFailures += 1;
    });
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearTokens();
    setAuthFailureHandler(() => {});
  });

  it("attaches Authorization: Bearer <accessToken> when one is set", async () => {
    setTokens("token-abc", "refresh-abc");
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch("/teams");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer token-abc");
  });

  it("does not attach an Authorization header when no access token is set", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch("/auth/login", { method: "POST", body: { email: "a", password: "b" } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("on a token-expired 401, refreshes once and retries the original request, returning its result", async () => {
    setTokens("expired-token", "refresh-abc");
    fetchMock
      .mockResolvedValueOnce(problemResponse(401, "token-expired")) // original request
      .mockResolvedValueOnce(jsonResponse({ accessToken: "new-token", refreshToken: "new-refresh" })) // /auth/refresh
      .mockResolvedValueOnce(jsonResponse({ teams: [] })); // retried original request

    const result = await apiFetch("/teams");

    expect(result).toEqual({ teams: [] });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(getAccessToken()).toBe("new-token");
    expect(getRefreshToken()).toBe("new-refresh");
    // third call is the retry, carrying the new token
    const [, retryInit] = fetchMock.mock.calls[2];
    expect(retryInit.headers.Authorization).toBe("Bearer new-token");
  });

  it("dedupes concurrent token-expired 401s into a single refresh call", async () => {
    setTokens("expired-token", "refresh-abc");

    // Both concurrent calls 401 on their first attempt; the retried calls
    // (post-refresh) succeed. Counted per path since both fire concurrently.
    let teamsCalls = 0;
    let playersCalls = 0;
    fetchMock.mockImplementation((url) => {
      const u = String(url);
      if (u.includes("/auth/refresh")) {
        return Promise.resolve(jsonResponse({ accessToken: "new-token", refreshToken: "new-refresh" }));
      }
      if (u.includes("/teams")) {
        teamsCalls += 1;
        return Promise.resolve(teamsCalls === 1 ? problemResponse(401, "token-expired") : jsonResponse({ ok: true }));
      }
      if (u.includes("/players")) {
        playersCalls += 1;
        return Promise.resolve(playersCalls === 1 ? problemResponse(401, "token-expired") : jsonResponse({ ok: true }));
      }
      throw new Error(`unexpected url ${u}`);
    });

    await Promise.all([apiFetch("/teams"), apiFetch("/players")]);

    const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/auth/refresh"));
    expect(refreshCalls).toHaveLength(1);
  });

  it("clears tokens and notifies the auth-failure handler when the refresh call itself fails, and propagates AuthError", async () => {
    setTokens("expired-token", "refresh-abc");
    fetchMock
      .mockResolvedValueOnce(problemResponse(401, "token-expired")) // original request
      .mockResolvedValueOnce(problemResponse(401, "invalid-credentials")); // /auth/refresh fails

    await expect(apiFetch("/teams")).rejects.toBeInstanceOf(AuthError);

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(authFailures).toBe(1);
  });

  it("does not loop when the retried request also 401s", async () => {
    setTokens("expired-token", "refresh-abc");
    fetchMock
      .mockResolvedValueOnce(problemResponse(401, "token-expired")) // original
      .mockResolvedValueOnce(jsonResponse({ accessToken: "new-token", refreshToken: "new-refresh" })) // refresh
      .mockResolvedValueOnce(problemResponse(401, "token-expired")); // retry also 401s

    await expect(apiFetch("/teams")).rejects.toBeInstanceOf(AuthError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("maps 404 to NotFoundError", async () => {
    fetchMock.mockResolvedValueOnce(problemResponse(404, "not-found", "Team not found."));
    await expect(apiFetch("/teams/1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("maps 400 to ValidationError carrying the field-keyed errors map", async () => {
    fetchMock.mockResolvedValueOnce(
      problemResponse(400, "validation-failed", "One or more fields are invalid.", { name: "must not be blank" })
    );
    try {
      await apiFetch("/auth/register", { method: "POST", body: {} });
      throw new Error("expected apiFetch to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.errors).toEqual({ name: "must not be blank" });
    }
  });

  it("maps 409 to ConflictError", async () => {
    fetchMock.mockResolvedValueOnce(problemResponse(409, "email-already-registered"));
    await expect(apiFetch("/auth/register", { method: "POST", body: {} })).rejects.toBeInstanceOf(ConflictError);
  });

  it("maps a non-token-expired 401 to AuthError without attempting a refresh", async () => {
    fetchMock.mockResolvedValueOnce(problemResponse(401, "invalid-credentials", "Invalid email or password."));
    await expect(apiFetch("/auth/login", { method: "POST", body: {} })).rejects.toBeInstanceOf(AuthError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps any other error status to a generic ApiError carrying the status", async () => {
    fetchMock.mockResolvedValueOnce(problemResponse(500, "internal-error", "Something broke."));
    try {
      await apiFetch("/teams");
      throw new Error("expected apiFetch to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(500);
    }
  });

  it("throws NetworkError when fetch itself rejects", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(apiFetch("/teams")).rejects.toBeInstanceOf(NetworkError);
  });

  it("returns null for a 204 response", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const result = await apiFetch("/teams/1", { method: "DELETE" });
    expect(result).toBeNull();
  });
});

function pdfResponse(bytes, { status = 200, disposition } = {}) {
  return new Response(bytes, {
    status,
    headers: {
      "Content-Type": "application/pdf",
      ...(disposition ? { "Content-Disposition": disposition } : {}),
    },
  });
}

// jsdom's Blob has no .text()/.arrayBuffer() (verified: only .size/.type),
// unlike a real browser's. FileReader is the one thing jsdom does implement
// that can read a Blob's content back out for assertions.
function readBlobAsText(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe("apiFetchBlob", () => {
  let fetchMock;
  let authFailures;

  beforeEach(() => {
    clearTokens();
    authFailures = 0;
    setAuthFailureHandler(() => {
      authFailures += 1;
    });
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearTokens();
    setAuthFailureHandler(() => {});
  });

  it("attaches Authorization: Bearer <accessToken> when one is set (PDFEX-08)", async () => {
    setTokens("token-abc", "refresh-abc");
    fetchMock.mockResolvedValueOnce(pdfResponse("%PDF-1.4"));

    await apiFetchBlob("/trainings/1/export.pdf");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer token-abc");
  });

  it("does not attach an Authorization header when no access token is set (PDFEX-08)", async () => {
    fetchMock.mockResolvedValueOnce(pdfResponse("%PDF-1.4"));

    await apiFetchBlob("/trainings/1/export.pdf");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("on a token-expired 401, refreshes once and retries the original request, resolving the retried response's bytes (PDFEX-09)", async () => {
    setTokens("expired-token", "refresh-abc");
    fetchMock
      .mockResolvedValueOnce(problemResponse(401, "token-expired")) // original request
      .mockResolvedValueOnce(jsonResponse({ accessToken: "new-token", refreshToken: "new-refresh" })) // /auth/refresh
      .mockResolvedValueOnce(
        pdfResponse("%PDF-retried", { disposition: 'attachment; filename="retry.pdf"' })
      ); // retried original request

    const result = await apiFetchBlob("/trainings/1/export.pdf");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.filename).toBe("retry.pdf");
    expect(await readBlobAsText(result.blob)).toBe("%PDF-retried");
    const [, retryInit] = fetchMock.mock.calls[2];
    expect(retryInit.headers.Authorization).toBe("Bearer new-token");
  });

  it("does not refresh a second time when the retried request also 401s (PDFEX-09)", async () => {
    setTokens("expired-token", "refresh-abc");
    fetchMock
      .mockResolvedValueOnce(problemResponse(401, "token-expired")) // original
      .mockResolvedValueOnce(jsonResponse({ accessToken: "new-token", refreshToken: "new-refresh" })) // refresh
      .mockResolvedValueOnce(problemResponse(401, "token-expired")); // retry also 401s

    await expect(apiFetchBlob("/trainings/1/export.pdf")).rejects.toBeInstanceOf(AuthError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("shares one in-flight refresh call with a concurrent apiFetch on an expired token (PDFEX-10)", async () => {
    setTokens("expired-token", "refresh-abc");

    let exportCalls = 0;
    let teamsCalls = 0;
    fetchMock.mockImplementation((url) => {
      const u = String(url);
      if (u.includes("/auth/refresh")) {
        return Promise.resolve(jsonResponse({ accessToken: "new-token", refreshToken: "new-refresh" }));
      }
      if (u.includes("/export.pdf")) {
        exportCalls += 1;
        return Promise.resolve(
          exportCalls === 1 ? problemResponse(401, "token-expired") : pdfResponse("%PDF-ok")
        );
      }
      if (u.includes("/teams")) {
        teamsCalls += 1;
        return Promise.resolve(teamsCalls === 1 ? problemResponse(401, "token-expired") : jsonResponse({ ok: true }));
      }
      throw new Error(`unexpected url ${u}`);
    });

    await Promise.all([apiFetchBlob("/trainings/1/export.pdf"), apiFetch("/teams")]);

    const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/auth/refresh"));
    expect(refreshCalls).toHaveLength(1);
  });

  it("notifies the auth-failure handler and rejects with AuthError when the refresh itself fails, resolving no blob (PDFEX-11)", async () => {
    setTokens("expired-token", "refresh-abc");
    fetchMock
      .mockResolvedValueOnce(problemResponse(401, "token-expired")) // original request
      .mockResolvedValueOnce(problemResponse(401, "invalid-credentials")); // /auth/refresh fails

    await expect(apiFetchBlob("/trainings/1/export.pdf")).rejects.toBeInstanceOf(AuthError);
    expect(authFailures).toBe(1);
  });

  it.each([
    ["404", 404, "not-found", NotFoundError],
    ["400", 400, "validation-failed", ValidationError],
    ["409", 409, "conflict", ConflictError],
    ["401 (non-expired)", 401, "invalid-credentials", AuthError],
    ["500", 500, "internal-error", ApiError],
  ])("maps a %s response to the matching typed error and resolves no blob (PDFEX-12)", async (_label, status, type, ErrorType) => {
    fetchMock.mockResolvedValueOnce(problemResponse(status, type));
    await expect(apiFetchBlob("/trainings/1/export.pdf")).rejects.toBeInstanceOf(ErrorType);
  });

  it("maps a 500 status onto the thrown ApiError (PDFEX-12)", async () => {
    fetchMock.mockResolvedValueOnce(problemResponse(500, "internal-error"));
    try {
      await apiFetchBlob("/trainings/1/export.pdf");
      throw new Error("expected apiFetchBlob to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(500);
    }
  });

  it("throws NetworkError when fetch itself rejects (PDFEX-13)", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(apiFetchBlob("/trainings/1/export.pdf")).rejects.toBeInstanceOf(NetworkError);
  });

  it("resolves { blob, filename } derived from Content-Disposition on success (PDFEX-14)", async () => {
    fetchMock.mockResolvedValueOnce(
      pdfResponse("%PDF-1.4 body", {
        disposition: 'attachment; filename="sub-11-session-3-2026-08-25.pdf"',
      })
    );

    const result = await apiFetchBlob("/trainings/1/export.pdf", { fallbackFilename: "training-1.pdf" });

    expect(result.filename).toBe("sub-11-session-3-2026-08-25.pdf");
    expect(await readBlobAsText(result.blob)).toBe("%PDF-1.4 body");
  });

  it("falls back to the caller-supplied filename when Content-Disposition is absent (PDFEX-14)", async () => {
    fetchMock.mockResolvedValueOnce(pdfResponse("%PDF-1.4 body"));

    const result = await apiFetchBlob("/trainings/1/export.pdf", { fallbackFilename: "training-1.pdf" });

    expect(result.filename).toBe("training-1.pdf");
  });
});
