import { describe, it, expect, beforeEach } from "vitest";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  setAuthFailureHandler,
  notifyAuthFailure,
} from "../tokenStore";

describe("tokenStore", () => {
  beforeEach(() => {
    clearTokens();
    setAuthFailureHandler(() => {});
  });

  it("starts with no access token and no refresh token", () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("setTokens stores the access token in memory and the refresh token in localStorage", () => {
    setTokens("access-123", "refresh-456");

    expect(getAccessToken()).toBe("access-123");
    expect(getRefreshToken()).toBe("refresh-456");
    expect(localStorage.getItem("refreshToken")).toBe("refresh-456");
  });

  it("clearTokens removes both the in-memory access token and the stored refresh token", () => {
    setTokens("access-123", "refresh-456");
    clearTokens();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
  });

  it("invokes the registered auth-failure handler when notifyAuthFailure is called", () => {
    let called = false;
    setAuthFailureHandler(() => {
      called = true;
    });

    notifyAuthFailure();

    expect(called).toBe(true);
  });

  it("does nothing (no throw) when notifyAuthFailure is called with no handler explicitly set beyond the default", () => {
    expect(() => notifyAuthFailure()).not.toThrow();
  });
});
