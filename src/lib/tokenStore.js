// Token storage per the backend-integration design (Decision 1): the access
// token lives only in memory (a module-level variable, lost on reload); the
// refresh token persists in localStorage so a session survives a browser
// restart. No React dependency — importable from apiClient and AuthContext.

const REFRESH_TOKEN_KEY = "refreshToken";

let accessToken = null;
let onAuthFailure = () => {};

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(newAccessToken, newRefreshToken) {
  accessToken = newAccessToken;
  localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
}

export function clearTokens() {
  accessToken = null;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** Registers the callback apiClient invokes when a refresh-and-retry is exhausted. AuthContext registers this once on mount to force sign-out. */
export function setAuthFailureHandler(fn) {
  onAuthFailure = fn;
}

export function notifyAuthFailure() {
  onAuthFailure();
}
