import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { AuthProvider } from "../AuthContext";
import { useAuth } from "../useAuth";
import { apiFetch, silentRefresh } from "../../lib/apiClient";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "../../lib/tokenStore";
import { ConflictError, ValidationError, AuthError } from "../../lib/errors";

vi.mock("../../lib/apiClient", () => ({
  apiFetch: vi.fn(),
  silentRefresh: vi.fn(),
  apiFetchBlob: vi.fn(),
}));

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

beforeEach(() => {
  apiFetch.mockReset();
  silentRefresh.mockReset();
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

describe("boot-time silent refresh (F1 AC6, F2 AC7)", () => {
  test("resolves loading:false with user:null and makes no API call when no refresh token exists (AC7)", async () => {
    const { result } = renderAuth();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(silentRefresh).not.toHaveBeenCalled();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  test("refreshes then loads the profile when a refresh token exists, resolving loading:false with user set", async () => {
    setTokens("stale-access", "refresh-boot");
    silentRefresh.mockResolvedValueOnce("new-access");
    apiFetch.mockResolvedValueOnce({ id: "u1", name: "Coach", email: "coach@club.pt" });

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(silentRefresh).toHaveBeenCalled();
    expect(apiFetch).toHaveBeenCalledWith("/users/me");
    expect(result.current.user).toEqual({ id: "u1", name: "Coach", email: "coach@club.pt" });
  });

  test("clears tokens and resolves signed-out (no hang) when the refresh token is invalid/expired", async () => {
    setTokens("stale-access", "refresh-boot");
    silentRefresh.mockRejectedValueOnce(new AuthError("Refresh failed"));

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});

describe("updateProfile (F3 AC1-AC2)", () => {
  test("PATCHes /users/me and updates user from the response on success (AC2)", async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));

    apiFetch.mockResolvedValueOnce({ id: "u1", name: "New Name", email: "new@club.pt" });

    let updateResult;
    await act(async () => {
      updateResult = await result.current.updateProfile({ name: "New Name", email: "new@club.pt" });
    });

    expect(apiFetch).toHaveBeenCalledWith("/users/me", {
      method: "PATCH",
      body: { name: "New Name", email: "new@club.pt" },
    });
    expect(updateResult).toEqual({ success: true, message: "Profile updated" });
    expect(result.current.user).toEqual({ id: "u1", name: "New Name", email: "new@club.pt" });
  });

  test("returns {success:false, message} on 409 without mutating user", async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));

    apiFetch.mockRejectedValueOnce(new ConflictError("Email already registered."));

    let updateResult;
    await act(async () => {
      updateResult = await result.current.updateProfile({ name: "Coach", email: "taken@club.pt" });
    });

    expect(updateResult).toEqual({ success: false, message: "Email already registered." });
    expect(result.current.user).toBeNull();
  });
});

describe("changePassword (F3 AC3-AC4)", () => {
  test("rejects locally without calling the API when next !== confirm (AC3)", async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));

    let changeResult;
    await act(async () => {
      changeResult = await result.current.changePassword({
        current: "old-pass",
        next: "new-pass-1",
        confirm: "new-pass-2",
      });
    });

    expect(changeResult).toEqual({ success: false, message: "New passwords do not match" });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  test("on 400 incorrect-password returns the fixed message without mutating user (AC4)", async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));

    apiFetch.mockRejectedValueOnce(new ValidationError("Current password is incorrect."));

    let changeResult;
    await act(async () => {
      changeResult = await result.current.changePassword({
        current: "wrong",
        next: "new-password-1",
        confirm: "new-password-1",
      });
    });

    expect(changeResult).toEqual({ success: false, message: "Current password is incorrect" });
  });

  test("on success PUTs /users/me/password, clears the local refresh token, and signs the user out (AC4)", async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));

    apiFetch
      .mockResolvedValueOnce({
        accessToken: "access-5",
        refreshToken: "refresh-5",
        user: { id: "u1", name: "Coach", email: "coach@club.pt" },
      })
      .mockResolvedValueOnce(null); // /users/me/password success

    await act(async () => {
      await result.current.signIn("coach@club.pt", "hunter22");
    });
    expect(result.current.user).not.toBeNull();

    let changeResult;
    await act(async () => {
      changeResult = await result.current.changePassword({
        current: "hunter22",
        next: "new-password-1",
        confirm: "new-password-1",
      });
    });

    expect(apiFetch).toHaveBeenCalledWith("/users/me/password", {
      method: "PUT",
      body: { currentPassword: "hunter22", newPassword: "new-password-1" },
    });
    expect(changeResult.success).toBe(true);
    expect(result.current.user).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
