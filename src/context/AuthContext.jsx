import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for user
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const signIn = (email, password) => {
    // Mock sign in logic
    if (email === "user@email.com" && password === "password") {
      const userObj = { email };
      setUser(userObj);
      localStorage.setItem("user", JSON.stringify(userObj));
      return { success: true };
    }
    return { success: false, message: "Invalid email or password" };
  };

  const signUp = (username, email, password) => {
    // Mock sign up logic (accept any except the demo email)
    if (email === "user@email.com") {
      return { success: false, message: "Email already taken" };
    }
    const userObj = { username, email };
    setUser(userObj);
    localStorage.setItem("user", JSON.stringify(userObj));
    return { success: true };
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, signUp, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
