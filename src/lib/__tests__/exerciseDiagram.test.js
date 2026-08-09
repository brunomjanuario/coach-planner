import {
  DIAGRAM_VERSION,
  SHAPE_KINDS,
  LIMITS,
  createDiagram,
  addShape,
  moveShape,
  removeShape,
  clearShapes,
  clampToPitch,
  normalise,
  denormalise,
  serialize,
  deserialize,
  validate,
} from "../exerciseDiagram";

// --- createDiagram --------------------------------------------------------

test("createDiagram returns v:1, pitch:full, empty shapes", () => {
  expect(createDiagram()).toEqual({ v: 1, pitch: "full", shapes: [] });
});

test("createDiagram accepts an explicit pitch", () => {
  expect(createDiagram("half")).toEqual({ v: 1, pitch: "half", shapes: [] });
});

// --- addShape ---------------------------------------------------------

test("addShape returns a new diagram and leaves the input untouched", () => {
  const original = createDiagram();
  const frozenOriginal = JSON.parse(JSON.stringify(original));

  const next = addShape(original, "cone", { x: 0.5, y: 0.5 });

  expect(next).not.toBe(original);
  expect(original).toEqual(frozenOriginal);
  expect(next.shapes).toHaveLength(1);
});

test("addShape places a marker at the given normalised position", () => {
  const diagram = addShape(createDiagram(), "player-a", { x: 0.31, y: 0.55 });
  expect(diagram.shapes[0]).toMatchObject({ kind: "player-a", x: 0.31, y: 0.55 });
});

test("addShape assigns a generated id, not undefined or a collision-prone counter", () => {
  const diagram = addShape(createDiagram(), "cone", { x: 0.1, y: 0.1 });
  expect(typeof diagram.shapes[0].id).toBe("string");
  expect(diagram.shapes[0].id.length).toBeGreaterThan(0);
});

test("addShape carries extra fields (e.g. a text label) through to the shape", () => {
  const diagram = addShape(createDiagram(), "text", { x: 0.5, y: 0.9, text: "press here" });
  expect(diagram.shapes[0]).toMatchObject({ kind: "text", text: "press here" });
});

test("addShape stores a normalised polyline for a line shape", () => {
  const diagram = addShape(createDiagram(), "line", {
    points: [
      [0.1, 0.1],
      [0.2, 0.3],
    ],
  });
  expect(diagram.shapes[0]).toMatchObject({
    kind: "line",
    points: [
      [0.1, 0.1],
      [0.2, 0.3],
    ],
  });
});

test("addShape stores a normalised polyline for an arrow shape", () => {
  const diagram = addShape(createDiagram(), "arrow", {
    points: [
      [0.3, 0.5],
      [0.6, 0.4],
    ],
  });
  expect(diagram.shapes[0].kind).toBe("arrow");
  expect(diagram.shapes[0].points).toEqual([
    [0.3, 0.5],
    [0.6, 0.4],
  ]);
});

test("addShape on a null diagram does not throw and returns null", () => {
  expect(addShape(null, "cone", { x: 0.1, y: 0.1 })).toBeNull();
});

test("addShape with no point defaults to a clamped 0,0", () => {
  const diagram = addShape(createDiagram(), "cone");
  expect(diagram.shapes[0]).toMatchObject({ x: 0, y: 0 });
});

// --- moveShape ----------------------------------------------------------

test("moveShape returns a new diagram and leaves the input untouched", () => {
  const original = addShape(createDiagram(), "cone", { x: 0.1, y: 0.1 });
  const id = original.shapes[0].id;
  const frozenOriginal = JSON.parse(JSON.stringify(original));

  const next = moveShape(original, id, { x: 0.7, y: 0.8 });

  expect(next).not.toBe(original);
  expect(original).toEqual(frozenOriginal);
  expect(next.shapes[0]).toMatchObject({ x: 0.7, y: 0.8 });
});

test("moveShape clamps x/y above 1 back into the pitch (edge case)", () => {
  const diagram = addShape(createDiagram(), "cone", { x: 0.5, y: 0.5 });
  const id = diagram.shapes[0].id;
  const moved = moveShape(diagram, id, { x: 1.4, y: 2.1 });
  expect(moved.shapes[0]).toMatchObject({ x: 1, y: 1 });
});

test("moveShape clamps x/y below 0 back into the pitch (edge case)", () => {
  const diagram = addShape(createDiagram(), "cone", { x: 0.5, y: 0.5 });
  const id = diagram.shapes[0].id;
  const moved = moveShape(diagram, id, { x: -0.4, y: -1.1 });
  expect(moved.shapes[0]).toMatchObject({ x: 0, y: 0 });
});

test("moveShape with an unknown id is a no-op, not a throw", () => {
  const diagram = addShape(createDiagram(), "cone", { x: 0.5, y: 0.5 });
  const moved = moveShape(diagram, "does-not-exist", { x: 0.1, y: 0.1 });
  expect(moved.shapes).toEqual(diagram.shapes);
});

test("moveShape on a null diagram does not throw", () => {
  expect(moveShape(null, "any", { x: 0.1, y: 0.1 })).toBeNull();
});

// --- removeShape ----------------------------------------------------------

test("removeShape returns a new diagram and leaves the input untouched", () => {
  const original = addShape(createDiagram(), "cone", { x: 0.1, y: 0.1 });
  const id = original.shapes[0].id;
  const frozenOriginal = JSON.parse(JSON.stringify(original));

  const next = removeShape(original, id);

  expect(next).not.toBe(original);
  expect(original).toEqual(frozenOriginal);
  expect(next.shapes).toHaveLength(0);
});

test("removeShape with an unknown id does nothing and throws nothing", () => {
  const diagram = addShape(createDiagram(), "cone", { x: 0.1, y: 0.1 });
  const next = removeShape(diagram, "does-not-exist");
  expect(next.shapes).toHaveLength(1);
});

test("removeShape on a null diagram does not throw", () => {
  expect(removeShape(null, "any")).toBeNull();
});

// --- clearShapes ------------------------------------------------------

test("clearShapes returns a new diagram and leaves the input untouched", () => {
  const original = addShape(addShape(createDiagram(), "cone", { x: 0.1, y: 0.1 }), "ball", {
    x: 0.2,
    y: 0.2,
  });
  const frozenOriginal = JSON.parse(JSON.stringify(original));

  const next = clearShapes(original);

  expect(next).not.toBe(original);
  expect(original).toEqual(frozenOriginal);
  expect(next.shapes).toEqual([]);
});

test("clearShapes on a null diagram does not throw", () => {
  expect(clearShapes(null)).toBeNull();
});

// --- clampToPitch -------------------------------------------------------

test("clampToPitch leaves an in-bounds point unchanged", () => {
  expect(clampToPitch({ x: 0.4, y: 0.6 })).toEqual({ x: 0.4, y: 0.6 });
});

test("clampToPitch clamps out-of-bounds values on both axes", () => {
  expect(clampToPitch({ x: -1, y: 5 })).toEqual({ x: 0, y: 1 });
});

test("clampToPitch on undefined input does not throw", () => {
  expect(clampToPitch(undefined)).toEqual({ x: 0, y: 0 });
});

// --- normalise / denormalise --------------------------------------------

test("normalise converts a pixel point to 0..1 within its container", () => {
  expect(normalise({ x: 450, y: 310 }, { width: 900, height: 620 })).toEqual({ x: 0.5, y: 0.5 });
});

test("normalise clamps a point outside the container", () => {
  expect(normalise({ x: 1000, y: -50 }, { width: 900, height: 620 })).toEqual({ x: 1, y: 0 });
});

test("normalise with a zero-size container does not throw or divide into Infinity", () => {
  expect(normalise({ x: 10, y: 10 }, { width: 0, height: 0 })).toEqual({ x: 0, y: 0 });
});

test("denormalise converts a 0..1 point back to pixels", () => {
  expect(denormalise({ x: 0.5, y: 0.5 }, { width: 900, height: 620 })).toEqual({ x: 450, y: 310 });
});

test("denormalise with a missing size does not throw", () => {
  expect(denormalise({ x: 0.5, y: 0.5 }, undefined)).toEqual({ x: 0, y: 0 });
});

// --- serialize / deserialize --------------------------------------------

test("serialize/deserialize round-trips a diagram containing every kind in SHAPE_KINDS", () => {
  let diagram = createDiagram();
  for (const kind of SHAPE_KINDS) {
    if (kind === "line" || kind === "arrow") {
      diagram = addShape(diagram, kind, {
        points: [
          [0.1, 0.2],
          [0.3, 0.4],
        ],
      });
    } else if (kind === "text") {
      diagram = addShape(diagram, kind, { x: 0.5, y: 0.5, text: "press" });
    } else {
      diagram = addShape(diagram, kind, { x: 0.2, y: 0.2 });
    }
  }

  const json = serialize(diagram);
  const round = deserialize(json);

  expect(round).toEqual(diagram);
  expect(round.shapes.map((s) => s.kind)).toEqual(SHAPE_KINDS.slice());
});

test("deserialize returns null for an unrecognised schema version (edge case)", () => {
  const json = JSON.stringify({ v: 999, pitch: "full", shapes: [] });
  expect(deserialize(json)).toBeNull();
});

test("deserialize never throws on garbage input", () => {
  expect(deserialize("not json at all {{{")).toBeNull();
  expect(deserialize(42)).toBeNull();
  expect(deserialize([])).toBeNull();
  expect(deserialize(undefined)).toBeNull();
});

test("deserialize drops shapes with an unknown kind and keeps the rest (edge case)", () => {
  const raw = JSON.stringify({
    v: DIAGRAM_VERSION,
    pitch: "full",
    shapes: [
      { id: "1", kind: "cone", x: 0.1, y: 0.1 },
      { id: "2", kind: "spaceship", x: 0.2, y: 0.2 },
      { id: "3", kind: "ball", x: 0.3, y: 0.3 },
    ],
  });

  const diagram = deserialize(raw);

  expect(diagram.shapes).toHaveLength(2);
  expect(diagram.shapes.map((s) => s.kind)).toEqual(["cone", "ball"]);
});

// --- validate -------------------------------------------------------------

test("validate rejects a diagram over 60 shapes, naming the limit", () => {
  let diagram = createDiagram();
  for (let i = 0; i < LIMITS.maxShapes + 1; i += 1) {
    diagram = addShape(diagram, "cone", { x: 0.1, y: 0.1 });
  }

  const result = validate(diagram);

  expect(result.ok).toBe(false);
  expect(result.reason).toContain(String(LIMITS.maxShapes));
});

test("validate accepts a diagram at exactly 60 shapes (boundary)", () => {
  let diagram = createDiagram();
  for (let i = 0; i < LIMITS.maxShapes; i += 1) {
    diagram = addShape(diagram, "cone", { x: 0.1, y: 0.1 });
  }

  expect(validate(diagram).ok).toBe(true);
});

test("validate rejects a diagram over 8192 serialized bytes, naming the limit", () => {
  const diagram = addShape(createDiagram(), "text", {
    x: 0.5,
    y: 0.5,
    text: "x".repeat(LIMITS.maxBytes),
  });

  const result = validate(diagram);

  expect(result.ok).toBe(false);
  expect(result.reason).toContain(String(LIMITS.maxBytes));
});

test("validate accepts a diagram at exactly the byte limit (boundary)", () => {
  const base = addShape(createDiagram(), "text", { x: 0.5, y: 0.5, text: "" });
  const currentBytes = new TextEncoder().encode(serialize(base)).length;
  const padLength = LIMITS.maxBytes - currentBytes;
  const diagram = {
    ...base,
    shapes: [{ ...base.shapes[0], text: "x".repeat(padLength) }],
  };

  const bytes = new TextEncoder().encode(serialize(diagram)).length;
  expect(bytes).toBe(LIMITS.maxBytes);
  expect(validate(diagram).ok).toBe(true);
});

test("validate rejects a malformed diagram without throwing", () => {
  expect(validate(null)).toEqual({ ok: false, reason: expect.any(String) });
  expect(validate({})).toEqual({ ok: false, reason: expect.any(String) });
  expect(validate("garbage")).toEqual({ ok: false, reason: expect.any(String) });
});

// --- totality across the module --------------------------------------------

test("every exported function tolerates undefined/null arguments without throwing", () => {
  expect(() => clampToPitch()).not.toThrow();
  expect(() => createDiagram(undefined)).not.toThrow();
  expect(() => addShape(undefined, undefined, undefined)).not.toThrow();
  expect(() => moveShape(undefined, undefined, undefined)).not.toThrow();
  expect(() => removeShape(undefined, undefined)).not.toThrow();
  expect(() => clearShapes(undefined)).not.toThrow();
  expect(() => normalise(undefined, undefined)).not.toThrow();
  expect(() => denormalise(undefined, undefined)).not.toThrow();
  expect(() => serialize(undefined)).not.toThrow();
  expect(() => deserialize(undefined)).not.toThrow();
  expect(() => validate(undefined)).not.toThrow();
});
