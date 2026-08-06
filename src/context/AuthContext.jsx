import React, { useState, useEffect } from "react";
import { AuthContext } from "./AuthContextInstance";

// This is a mock, not authentication: credentials are stored as plaintext in
// localStorage, readable by any script on the origin, with no server, no
// session token and no hashing. See docs/08-authentication.md.

const STORAGE_KEY = "user";
const DEMO_EMAIL = "user@email.com";
const DEMO_PASSWORD = "password";

function normalizeStoredUser(raw) {
  if (!raw || typeof raw !== "object") return raw;
  return raw.name ? raw : { ...raw, name: raw.username };
}

function readStoredUser() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return normalizeStoredUser(JSON.parse(raw));
  } catch {
    return null;
  }
}

function emailsMatch(a, b) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(readStoredUser());
    setLoading(false);
  }, []);

  const signIn = (email, password) => {
    const stored = readStoredUser();

    if (stored) {
      const storedPassword = stored.password ?? DEMO_PASSWORD;
      if (emailsMatch(stored.email, email) && password === storedPassword) {
        setUser(stored);
        return { success: true };
      }
      return { success: false, message: "Invalid email or password" };
    }

    if (emailsMatch(DEMO_EMAIL, email) && password === DEMO_PASSWORD) {
      const userObj = { email: DEMO_EMAIL };
      setUser(userObj);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userObj));
      return { success: true };
    }
    return { success: false, message: "Invalid email or password" };
  };

  const signUp = (username, email, password) => {
    if (email === DEMO_EMAIL) {
      return { success: false, message: "Email already taken" };
    }
    const userObj = { username, email, password };
    setUser(userObj);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userObj));
    return { success: true };
  };

  const signOut = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, signUp, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
