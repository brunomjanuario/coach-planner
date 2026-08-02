import { useEffect, useState } from "react";

function isValidRating(n) {
  return Number.isInteger(n) && n >= 0 && n <= 10;
}

/**
 * A single-player 0-10 rating control (AD-007). Controlled by `value`
 * (number|null) — `null` renders empty and is distinguishable from `0`
 * (null-vs-zero trap). Emits `null` when cleared and only ever emits an
 * integer 0-10 otherwise; out-of-range or non-integer input is rejected
 * with an inline message rather than forwarded (AC RATE-01.5).
 *
 * Keeps its own draft text so a multi-digit, momentarily out-of-range value
 * (e.g. typing "11") stays visible while `onChange` isn't yet called for
 * it — it re-syncs from `value` whenever the parent changes it externally
 * (e.g. pre-filling an existing rating).
 */
export default function RatingInput({ value, onChange, label }) {
  const [text, setText] = useState(value != null ? String(value) : "");
  const [error, setError] = useState("");

  useEffect(() => {
    setText(value != null ? String(value) : "");
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    setText(raw);

    if (raw === "") {
      setError("");
      onChange(null);
      return;
    }

    const parsed = Number(raw);
    if (!isValidRating(parsed)) {
      setError("Enter a whole number between 0 and 10.");
      return;
    }

    setError("");
    onChange(parsed);
  };

  return (
    <div>
      <input
        type="number"
        min={0}
        max={10}
        step={1}
        inputMode="numeric"
        aria-label={label}
        value={text}
        onChange={handleChange}
        className="w-16 border px-2 py-1 rounded text-center"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
