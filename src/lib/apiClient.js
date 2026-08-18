// Shared HTTP client: attaches the bearer token, retries once on an expired
// access token via /auth/refresh, and translates RFC 9457 problem+json
// error responses into the app's typed errors. Every service module calls
// through apiFetch instead of reimplementing this.

import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  notifyAuthFailure,
} from "./tokenStore";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  AuthError,
  ApiError,
  NetworkError,
} from "./errors";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";

let refreshInFlight = null; // dedupes concurrent 401s into one refresh call

async function doRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new AuthError("No refresh token");

  let res;
  try {
    res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    throw new NetworkError("Could not reach the API at /auth/refresh");
  }

  if (!res.ok) {
    clearTokens();
    throw new AuthError("Refresh failed");
  }
  const { accessToken, refreshToken: newRefresh } = await res.json();
  setTokens(accessToken, newRefresh);
  return accessToken;
}

async function toTypedError(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* no body */
  }
  const message = body?.detail ?? body?.title ?? `Request failed (${res.status})`;
  if (res.status === 404) return new NotFoundError(message);
  if (res.status === 400) return new ValidationError(message, body?.errors);
  if (res.status === 409) return new ConflictError(message);
  if (res.status === 401) return new AuthError(message);
  return new ApiError(message, res.status);
}

export async function apiFetch(path, { method = "GET", body, isRetry = false } = {}) {
  const accessToken = getAccessToken();
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new NetworkError(`Could not reach the API at ${path}`);
  }

  if (res.status === 401 && !isRetry) {
    const problem = await res.clone().json().catch(() => null);
    if (problem?.type?.includes("token-expired")) {
      refreshInFlight ??= doRefresh().finally(() => {
        refreshInFlight = null;
      });
      try {
        await refreshInFlight; // throws AuthError/NetworkError on failure
      } catch (err) {
        if (err instanceof AuthError) notifyAuthFailure();
        throw err;
      }
      return apiFetch(path, { method, body, isRetry: true });
    }
  }

  if (!res.ok) {
    throw await toTypedError(res);
  }
  if (res.status === 204) return null;
  return res.json();
}
