import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import AuthLayout, { AuthField } from "../components/AuthLayout";
import Button from "../components/Button";

export default function SignUp() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await signUp(form.username, form.email, form.password);
      if (result.success) {
        setError("");
        navigate("/");
      } else {
        setError(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Sign Up"
      error={error}
      footer={
        <>
          Already have an account?{" "}
          <Link to="/signin" className="font-semibold text-blue-500 hover:text-blue-400">
            Sign In
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <AuthField
          id="username"
          name="username"
          type="text"
          label="Name"
          value={form.username}
          onChange={handleChange}
          autoComplete="name"
          required
        />
        <AuthField
          id="email"
          name="email"
          type="email"
          label="Email"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          required
        />
        <AuthField
          id="password"
          name="password"
          type="password"
          label="Password"
          value={form.password}
          onChange={handleChange}
          autoComplete="new-password"
          required
        />
        <Button type="submit" variant="primary" disabled={submitting} className="w-full mt-2">
          {submitting ? "Creating account…" : "Sign Up"}
        </Button>
      </form>
    </AuthLayout>
  );
}
