import React, { useState, useEffect } from "react";
import { AuthContext } from "./AuthContextInstance";
import { apiFetch, silentRefresh } from "../lib/apiClient";
import { setTokens, clearTokens, getRefreshToken, setAuthFailureHandler } from "../lib/tokenStore";
import { AuthError, ConflictError, ValidationError } from "../lib/errors";

// Real authentication against coach-planner-api: no plaintext credentials,
// no localStorage-stored password. See docs/08-authentication.md.

function messageFromError(e) {
  if (e instanceof ValidationError) {
    return e.errors ? Object.values(e.errors).join(" ") : e.message;
  }
  return e.message;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthFailureHandler(() => {
      clearTokens();
      setUser(null);
    });

    (async () => {
      if (!getRefreshToken()) {
        setLoading(false);
        return;
      }
      try {
        await silentRefresh();
        const me = await apiFetch("/users/me");
        setUser(me);
      } catch {
        clearTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (email, password) => {
    try {
      const { accessToken, refreshToken, user: u } = await apiFetch("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setTokens(accessToken, refreshToken);
      setUser(u);
      return { success: true };
    } catch (e) {
      return {
        success: false,
        message: e instanceof AuthError ? "Invalid email or password" : e.message,
      };
    }
  };

  const signUp = async (username, email, password) => {
    try {
      const { accessToken, refreshToken, user: u } = await apiFetch("/auth/register", {
        method: "POST",
        body: { name: username, email, password },
      });
      setTokens(accessToken, refreshToken);
      setUser(u);
      return { success: true };
    } catch (e) {
      if (e instanceof ConflictError || e instanceof ValidationError) {
        return { success: false, message: messageFromError(e) };
      }
      return { success: false, message: e.message };
    }
  };

  const signOut = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // best-effort — a network failure here still clears local state
    }
    clearTokens();
    setUser(null);
  };

  const updateProfile = async ({ name, email }) => {
    try {
      const updated = await apiFetch("/users/me", { method: "PATCH", body: { name, email } });
      setUser(updated);
      return { success: true, message: "Profile updated" };
    } catch (e) {
      if (e instanceof ConflictError || e instanceof ValidationError) {
        return { success: false, message: messageFromError(e) };
      }
      return { success: false, message: e.message };
    }
  };

  const changePassword = async ({ current, next, confirm }) => {
    if (next !== confirm) {
      return { success: false, message: "New passwords do not match" };
    }
    try {
      await apiFetch("/users/me/password", {
        method: "PUT",
        body: { currentPassword: current, newPassword: next },
      });
      // The API has already revoked every refresh token server-side.
      clearTokens();
      setUser(null);
      return { success: true, message: "Password updated. Please sign in again." };
    } catch (e) {
      if (e instanceof ValidationError && !e.errors) {
        return { success: false, message: "Current password is incorrect" };
      }
      if (e instanceof ValidationError) {
        return { success: false, message: messageFromError(e) };
      }
      return { success: false, message: e.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        signIn,
        signOut,
        signUp,
        loading,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
