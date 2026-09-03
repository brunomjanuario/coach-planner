import { useState } from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

const FIELD_CLASS =
  "w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white placeholder-neutral-500 focus-visible:outline-2 focus-visible:outline-blue-500";

/**
 * Labeled input shared by both auth forms — associates a `<label>` with its
 * `<input>` via `htmlFor`/`id`. When `type="password"`, renders an
 * accessible show/hide toggle that flips the input between `password` and
 * `text` (REQ-12) without changing the field's own props/contract.
 */
export function AuthField({
  id,
  name,
  type = "text",
  label,
  value,
  onChange,
  required,
  autoComplete,
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && visible ? "text" : type;

  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-neutral-300">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          className={isPassword ? `${FIELD_CLASS} pr-10` : FIELD_CLASS}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400 hover:text-neutral-200 focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            {visible ? (
              <IconEyeOff size={18} aria-hidden="true" />
            ) : (
              <IconEye size={18} aria-hidden="true" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Presentational scaffold shared by the Sign In and Sign Up screens: a
 * centered dark card with an optional brand mark, a single page heading, a
 * form slot, an announced error region, and a footer-link slot.
 *
 * Deliberately renders a plain `div` tree — no `<main>` and no element
 * combining `.h-screen` + `.overflow-hidden` — because `/signin`/`/signup`
 * are mounted outside the app shell (App.test.jsx pins this contract).
 */
export default function AuthLayout({ title, error, children, footer }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-lightblack px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-neutral-900 p-8 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-white">
          {title}
        </h1>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-center text-sm text-red-400"
          >
            {error}
          </div>
        )}

        {children}

        {footer && (
          <div className="mt-6 text-center text-sm text-neutral-400">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
