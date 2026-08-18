import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { AuthProvider } from "../AuthContext";
import { useAuth } from "../useAuth";
import { apiFetch } from "../../lib/apiClient";
import { getAccessToken, getRefreshToken, clearTokens } from "../../lib/tokenStore";
import { ConflictError, ValidationError, AuthError } from "../../lib/errors";

vi.mock("../../lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

beforeEach(() => {
  apiFetch.mockReset();
  clearTokens();
});

describe("signUp (F2 AC1-AC3)", () => {
  test("POSTs /auth/register, stores tokens, sets user, and returns success (AC1)", async () => {
    apiFetch.mockResolvedValueOnce({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      user: { id: "u1", name: "Coach", email: "coach@club.pt" },
    });
    const { result } = renderAuth();

    let signUpResult;
    await act(async () => {
      signUpResult = await result.current.signUp("Coach", "coach@club.pt", "hunter22");
    });

    expect(apiFetch).toHaveBeenCalledWith("/auth/register", {
      method: "POST",
      body: { name: "Coach", email: "coach@club.pt", password: "hunter22" },
    });
    expect(signUpResult).toEqual({ success: true });
    expect(result.current.user).toEqual({ id: "u1", name: "Coach", email: "coach@club.pt" });
    expect(getAccessToken()).toBe("access-1");
    expect(getRefreshToken()).toBe("refresh-1");
  });

  test("returns {success:false, message} from the API on 409 email-already-registered without altering user or tokens (AC2)", async () => {
    apiFetch.mockRejectedValueOnce(new ConflictError("Email already registered."));
    const { result } = renderAuth();

    let signUpResult;
    await act(async () => {
      signUpResult = await result.current.signUp("Coach", "taken@club.pt", "hunter22");
    });

    expect(signUpResult).toEqual({ success: false, message: "Email already registered." });
    expect(result.current.user).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  test("builds the message from the field-keyed errors map on 400 (AC3)", async () => {
    apiFetch.mockRejectedValueOnce(
      new ValidationError("One or more fields are invalid.", { password: "must be at least 8 characters" })
    );
    const { result } = renderAuth();

    let signUpResult;
    await act(async () => {
      signUpResult = await result.current.signUp("Coach", "coach@club.pt", "short");
    });

    expect(signUpResult).toEqual({ success: false, message: "must be at least 8 characters" });
    expect(result.current.user).toBeNull();
  });
});

describe("signIn (F2 AC4-AC5)", () => {
  test("POSTs /auth/login, stores tokens, sets user, and returns success (AC4)", async () => {
    apiFetch.mockResolvedValueOnce({
      accessToken: "access-2",
      refreshToken: "refresh-2",
      user: { id: "u1", name: "Coach", email: "coach@club.pt" },
    });
    const { result } = renderAuth();

    let signInResult;
    await act(async () => {
      signInResult = await result.current.signIn("coach@club.pt", "hunter22");
    });

    expect(apiFetch).toHaveBeenCalledWith("/auth/login", {
      method: "POST",
      body: { email: "coach@club.pt", password: "hunter22" },
    });
    expect(signInResult).toEqual({ success: true });
    expect(result.current.user).toEqual({ id: "u1", name: "Coach", email: "coach@club.pt" });
    expect(getAccessToken()).toBe("access-2");
    expect(getRefreshToken()).toBe("refresh-2");
  });

  test("returns a generic invalid-credentials message on 401, indistinguishable between wrong password and unregistered email (AC5)", async () => {
    apiFetch.mockRejectedValueOnce(new AuthError("Invalid email or password."));
    const { result } = renderAuth();

    let signInResult;
    await act(async () => {
      signInResult = await result.current.signIn("nobody@club.pt", "wrong");
    });

    expect(signInResult).toEqual({ success: false, message: "Invalid email or password" });
    expect(result.current.user).toBeNull();
  });
});

describe("signOut (F2 AC6)", () => {
  test("calls /auth/logout, clears tokens, and sets user to null", async () => {
    apiFetch
      .mockResolvedValueOnce({
        accessToken: "access-3",
        refreshToken: "refresh-3",
        user: { id: "u1", name: "Coach", email: "coach@club.pt" },
      })
      .mockResolvedValueOnce(null); // /auth/logout
    const { result } = renderAuth();

    await act(async () => {
      await result.current.signIn("coach@club.pt", "hunter22");
    });
    expect(result.current.user).not.toBeNull();

    await act(async () => {
      await result.current.signOut();
    });

    expect(apiFetch).toHaveBeenCalledWith("/auth/logout", { method: "POST" });
    expect(result.current.user).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  test("still clears local state when the /auth/logout call fails (best-effort)", async () => {
    apiFetch
      .mockResolvedValueOnce({
        accessToken: "access-4",
        refreshToken: "refresh-4",
        user: { id: "u1", name: "Coach", email: "coach@club.pt" },
      })
      .mockRejectedValueOnce(new Error("network down"));
    const { result } = renderAuth();

    await act(async () => {
      await result.current.signIn("coach@club.pt", "hunter22");
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
