import React, { useState, useEffect } from "react";
import { AuthContext } from "./AuthContextInstance";
import { apiFetch } from "../lib/apiClient";
import { setTokens, clearTokens } from "../lib/tokenStore";
import { AuthError, ConflictError, ValidationError } from "../lib/errors";

// Real authentication against coach-planner-api: no plaintext credentials,
// no localStorage-stored password. See docs/08-authentication.md.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    setLoading(false);
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

  const updateProfile = ({ name, email }) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, message: "Name cannot be empty" };
    }
    const trimmedEmail = email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      return { success: false, message: "Enter a valid email address" };
    }

    setUser({ ...user, name: trimmedName, email: trimmedEmail });
    return { success: true, message: "Profile updated" };
  };

  const changePassword = ({ current, next, confirm }) => {
    if (current !== user.password) {
      return { success: false, message: "Current password is incorrect" };
    }
    if (!next) {
      return { success: false, message: "New password cannot be empty" };
    }
    if (next !== confirm) {
      return { success: false, message: "New passwords do not match" };
    }

    setUser({ ...user, password: next });
    return { success: true, message: "Password updated" };
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
