import { newId } from "./id";

/**
 * The whole diagram model (design.md: "Konva writes, SVG reads"). Pure data
 * in, new data out — no React, no Konva, no DOM. Every exported function is
 * total: it returns a value for every input and never throws, because the
 * editor and the read-only viewer both call into this module with data that
 * may be malformed (a corrupt localStorage record, a stale drag callback).
 */

export const DIAGRAM_VERSION = 1;

export const SHAPE_KINDS = Object.freeze([
  "player-a",
  "player-b",
  "cone",
  "ball",
  "goal",
  "line",
  "arrow",
  "text",
]);

const SHAPE_KIND_SET = new Set(SHAPE_KINDS);

// line/arrow store a polyline in `points`; every other kind is a single
// point (marker or text) and stores `x`/`y` directly on the shape.
const PATH_KINDS = new Set(["line", "arrow"]);

export const LIMITS = Object.freeze({
  maxShapes: 60,
  maxBytes: 8192,
});

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/** Clamps a `{x,y}` point into the pitch's normalised `0..1` bounds. */
export function clampToPitch(point) {
  return { x: clamp01(point?.x), y: clamp01(point?.y) };
}

/** A fresh, empty diagram. `pitch` defaults to a full pitch. */
export function createDiagram(pitch = "full") {
  return { v: DIAGRAM_VERSION, pitch, shapes: [] };
}

/**
 * Adds a shape of `kind` at `point` and returns a **new** diagram — the
 * input is never mutated, which is what makes undo-by-stack (design.md)
 * correct: every prior diagram in the stack stays exactly as it was pushed.
 *
 * For marker/text kinds, `point` is `{x, y, ...extra}` (`extra` carries
 * e.g. a text label). For `line`/`arrow`, `point` is `{points: [[x,y], …]}`.
 */
export function addShape(diagram, kind, point = {}) {
  if (!diagram || typeof diagram !== "object") return diagram;

  const shapes = Array.isArray(diagram.shapes) ? diagram.shapes : [];
  const id = newId();
  let shape;

  if (PATH_KINDS.has(kind)) {
    const rawPoints = Array.isArray(point?.points) ? point.points : [];
    shape = {
      id,
      kind,
      points: rawPoints.map(([x, y]) => [clamp01(x), clamp01(y)]),
    };
  } else {
    const { x, y, points: _ignored, ...rest } = point ?? {};
    shape = { id, kind, x: clamp01(x), y: clamp01(y), ...rest };
  }

  return { ...diagram, shapes: [...shapes, shape] };
}

/**
 * Moves the point-based shape with `id` to `point`, clamped to the pitch.
 * Path shapes (`line`/`arrow`, which have no single `x`/`y`) and unknown
 * ids are left untouched — always a new diagram, never a throw.
 */
export function moveShape(diagram, id, point) {
  if (!diagram || typeof diagram !== "object") return diagram;
  const shapes = Array.isArray(diagram.shapes) ? diagram.shapes : [];

  const nextShapes = shapes.map((shape) => {
    if (!shape || shape.id !== id) return shape;
    if (!("x" in shape) || !("y" in shape)) return shape;
    const { x, y } = clampToPitch(point ?? {});
    return { ...shape, x, y };
  });

  return { ...diagram, shapes: nextShapes };
}

/** Removes the shape with `id`. Removing an unknown id is a no-op. */
export function removeShape(diagram, id) {
  if (!diagram || typeof diagram !== "object") return diagram;
  const shapes = Array.isArray(diagram.shapes) ? diagram.shapes : [];
  return { ...diagram, shapes: shapes.filter((shape) => shape?.id !== id) };
}

/** Removes every shape, keeping `v`/`pitch`. */
export function clearShapes(diagram) {
  if (!diagram || typeof diagram !== "object") return diagram;
  return { ...diagram, shapes: [] };
}

/** Converts a pixel point within a `{width, height}` container to `0..1`. */
export function normalise(point, size) {
  const width = Number(size?.width);
  const height = Number(size?.height);
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    return { x: 0, y: 0 };
  }
  return clampToPitch({
    x: Number(point?.x) / width,
    y: Number(point?.y) / height,
  });
}

/** Converts a normalised `0..1` point back to pixels within `{width, height}`. */
export function denormalise(point, size) {
  const width = Number(size?.width);
  const height = Number(size?.height);
  const safeWidth = Number.isFinite(width) ? width : 0;
  const safeHeight = Number.isFinite(height) ? height : 0;
  const { x, y } = clampToPitch(point ?? {});
  return { x: x * safeWidth, y: y * safeHeight };
}

/** Serializes a diagram to a JSON string. */
export function serialize(diagram) {
  try {
    return JSON.stringify(diagram) ?? "null";
  } catch {
    return "null";
  }
}

/**
 * Parses a serialized diagram (or accepts an already-parsed object).
 * Returns `null` — never throws — for an unrecognised `v` or malformed
 * input (edge case). Shapes with an unknown `kind` are dropped; the rest
 * of the diagram still renders (edge case).
 */
export function deserialize(json) {
  if (json == null) return null;

  let parsed = json;
  if (typeof json === "string") {
    try {
      parsed = JSON.parse(json);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  if (parsed.v !== DIAGRAM_VERSION) return null;

  const shapes = Array.isArray(parsed.shapes) ? parsed.shapes : [];
  const validShapes = shapes.filter(
    (shape) => shape && typeof shape === "object" && SHAPE_KIND_SET.has(shape.kind)
  );

  return {
    v: DIAGRAM_VERSION,
    pitch: parsed.pitch ?? "full",
    shapes: validShapes,
  };
}

/**
 * Validates a diagram against the size guard (spec edge case): a diagram
 * over 60 shapes or 8192 serialized bytes is rejected, with a reason
 * naming the limit that was exceeded, so the caller (the editor, at save)
 * can show it and keep the work.
 */
export function validate(diagram) {
  if (!diagram || typeof diagram !== "object" || !Array.isArray(diagram.shapes)) {
    return { ok: false, reason: "Diagram is invalid." };
  }

  if (diagram.shapes.length > LIMITS.maxShapes) {
    return {
      ok: false,
      reason: `A diagram cannot have more than ${LIMITS.maxShapes} shapes.`,
    };
  }

  const bytes = new TextEncoder().encode(serialize(diagram)).length;
  if (bytes > LIMITS.maxBytes) {
    return {
      ok: false,
      reason: `A diagram cannot exceed ${LIMITS.maxBytes} bytes when saved.`,
    };
  }

  return { ok: true, reason: null };
}
