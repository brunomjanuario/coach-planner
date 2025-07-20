import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SignIn() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = signIn(form.email, form.password);
    if (result.success) {
      setError("");
      navigate("/");
    } else {
      setError(result.message);
    }
  };

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "80px auto",
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        padding: 32,
        color: "black",
        height: "50%",
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>
        Sign In
      </h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 18 }}>
          <label
            htmlFor="email"
            style={{ display: "block", fontWeight: 500, marginBottom: 6 }}
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 6,
              border: "1px solid #ccc",
              fontSize: 16,
            }}
            required
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label
            htmlFor="password"
            style={{ display: "block", fontWeight: 500, marginBottom: 6 }}
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 6,
              border: "1px solid #ccc",
              fontSize: 16,
            }}
            required
          />
        </div>
        <button
          type="submit"
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            background: "#1a73e8",
            color: "#fff",
            fontWeight: 600,
            fontSize: 16,
            border: "none",
            cursor: "pointer",
          }}
        >
          Sign In
        </button>
        {error && (
          <div style={{ color: "#d32f2f", marginTop: 16, textAlign: "center" }}>
            {error}
          </div>
        )}
      </form>
      <div style={{ marginTop: 24, textAlign: "center" }}>
        Don't have an account?{" "}
        <Link to="/signup" style={{ color: "#1a73e8", fontWeight: 600 }}>
          Sign Up
        </Link>
      </div>
    </div>
  );
}
