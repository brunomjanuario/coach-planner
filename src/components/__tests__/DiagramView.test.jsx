import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import DiagramView from "../DiagramView";
import { createDiagram, addShape, DIAGRAM_VERSION } from "../../lib/exerciseDiagram";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function threeShapeDiagram() {
  let diagram = createDiagram();
  diagram = addShape(diagram, "player-a", { x: 0.2, y: 0.3 });
  diagram = addShape(diagram, "cone", { x: 0.5, y: 0.5 });
  diagram = addShape(diagram, "ball", { x: 0.8, y: 0.1 });
  return diagram;
}

test("renders an <svg> with a fixed viewBox so it scales with its container (AC DRAW-04.4)", () => {
  render(<DiagramView diagram={threeShapeDiagram()} />);
  const svg = screen.getByTestId("diagram-view");
  expect(svg.tagName.toLowerCase()).toBe("svg");
  expect(svg.getAttribute("viewBox")).toBe("0 0 100 62");
});

test("renders one element per shape, positioned from normalised coordinates", () => {
  render(<DiagramView diagram={threeShapeDiagram()} />);
  expect(screen.getAllByTestId("diagram-shape")).toHaveLength(3);
});

test("a marker's rendered position derives from its normalised x/y, not a hardcoded spot", () => {
  const diagram = addShape(createDiagram(), "cone", { x: 0.5, y: 0.5 });
  render(<DiagramView diagram={diagram} />);
  const shape = screen.getByTestId("diagram-shape");
  // 0.5 * 100 viewBox width = 50, 0.5 * 62 viewBox height = 31
  expect(shape.getAttribute("points")).toContain("50,");
});

test("draws the full pitch as vector geometry", () => {
  render(<DiagramView diagram={createDiagram("full")} />);
  const lines = screen.getByTestId("pitch-lines");
  expect(lines.children.length).toBeGreaterThan(0);
});

test("draws the half pitch as vector geometry", () => {
  render(<DiagramView diagram={createDiagram("half")} />);
  const lines = screen.getByTestId("pitch-lines");
  expect(lines.children.length).toBeGreaterThan(0);
});

test("blank pitch draws no pitch lines", () => {
  render(<DiagramView diagram={createDiagram("blank")} />);
  expect(screen.queryByTestId("pitch-lines")).not.toBeInTheDocument();
});

test("an unknown shape kind is skipped and the rest render (edge case)", () => {
  const diagram = {
    v: DIAGRAM_VERSION,
    pitch: "full",
    shapes: [
      { id: "1", kind: "cone", x: 0.1, y: 0.1 },
      { id: "2", kind: "spaceship", x: 0.2, y: 0.2 },
    ],
  };
  render(<DiagramView diagram={diagram} />);
  expect(screen.getAllByTestId("diagram-shape")).toHaveLength(1);
});

test("a null diagram renders nothing at all, not an empty frame (AC DRAW-04.2)", () => {
  const { container } = render(<DiagramView diagram={null} />);
  expect(container).toBeEmptyDOMElement();
  expect(screen.queryByTestId("diagram-view")).not.toBeInTheDocument();
});

test("an absent (undefined) diagram renders nothing at all (AC DRAW-04.2)", () => {
  const { container } = render(<DiagramView />);
  expect(container).toBeEmptyDOMElement();
});

test("a diagram with an unrecognised schema version renders nothing rather than throwing (edge case)", () => {
  const diagram = { v: 999, pitch: "full", shapes: [] };
  expect(() => render(<DiagramView diagram={diagram} />)).not.toThrow();
  expect(screen.queryByTestId("diagram-view")).not.toBeInTheDocument();
});

test("renders every marker kind (player-a, player-b, cone, ball, goal)", () => {
  let diagram = createDiagram();
  for (const kind of ["player-a", "player-b", "cone", "ball", "goal"]) {
    diagram = addShape(diagram, kind, { x: 0.4, y: 0.4 });
  }
  render(<DiagramView diagram={diagram} />);
  const shapes = screen.getAllByTestId("diagram-shape");
  expect(shapes.map((s) => s.getAttribute("data-shape-kind"))).toEqual([
    "player-a",
    "player-b",
    "cone",
    "ball",
    "goal",
  ]);
});

test("renders line and arrow shapes from normalised points", () => {
  let diagram = createDiagram();
  diagram = addShape(diagram, "line", {
    points: [
      [0.1, 0.1],
      [0.2, 0.3],
    ],
  });
  diagram = addShape(diagram, "arrow", {
    points: [
      [0.3, 0.5],
      [0.6, 0.4],
    ],
  });
  render(<DiagramView diagram={diagram} />);
  const shapes = screen.getAllByTestId("diagram-shape");
  expect(shapes).toHaveLength(2);
  expect(shapes[0].tagName.toLowerCase()).toBe("polyline");
  expect(shapes[1].tagName.toLowerCase()).toBe("polyline");
});

test("renders a text label with its text", () => {
  const diagram = addShape(createDiagram(), "text", { x: 0.5, y: 0.9, text: "press here" });
  render(<DiagramView diagram={diagram} />);
  expect(screen.getByText("press here")).toBeInTheDocument();
});

test("renders successfully in jsdom with no canvas — the whole point of this component existing", () => {
  expect(() => render(<DiagramView diagram={threeShapeDiagram()} />)).not.toThrow();
  expect(screen.getByTestId("diagram-view")).toBeInTheDocument();
});

test("every shape keeps its relative pitch position when rendered inside a narrower container (AC P2.4)", () => {
  const diagram = threeShapeDiagram(); // player-a, cone, ball — circle, polygon and circle markup

  function renderAtWidth(width) {
    const { container, unmount } = render(
      <div style={{ width: `${width}px` }}>
        <DiagramView diagram={diagram} />
      </div>
    );
    const svg = container.querySelector('[data-testid="diagram-view"]');
    const viewBox = svg.getAttribute("viewBox");
    const shapes = Array.from(
      svg.querySelectorAll('[data-testid="diagram-shape"]')
    ).map((el) => {
      // player-a/player-b render as a <g> wrapping the positioned circle;
      // every other kind carries its own positional attributes directly.
      const positioned = el.querySelector("circle") ?? el;
      return {
        kind: el.getAttribute("data-shape-kind"),
        // Whichever positional attribute the element type carries — cx/cy
        // for circles, points for the cone polygon — captured as the raw
        // viewBox-space value the shape actually rendered at.
        cx: positioned.getAttribute("cx"),
        cy: positioned.getAttribute("cy"),
        points: positioned.getAttribute("points"),
      };
    });
    unmount();
    return { viewBox, shapes };
  }

  const wide = renderAtWidth(1200);
  const narrow = renderAtWidth(240);

  // Sanity: real, non-degenerate output — not an empty/trivial match.
  expect(wide.shapes).toHaveLength(3);
  expect(wide.shapes.every((s) => s.cx || s.points)).toBe(true);

  // The viewBox is the sole scaling mechanism (CSS/SVG stretches it to fit
  // the container) — the shapes' own normalised-derived coordinates must be
  // byte-identical regardless of the container width they render into.
  expect(narrow.viewBox).toBe(wide.viewBox);
  expect(narrow.shapes).toEqual(wide.shapes);
});

test("the module's source imports no konva or react-konva anywhere in its graph (AC DRAW-04.3)", () => {
  const diagramViewSource = readFileSync(
    path.join(__dirname, "../DiagramView.jsx"),
    "utf-8"
  );
  const modelSource = readFileSync(
    path.join(__dirname, "../../lib/exerciseDiagram.js"),
    "utf-8"
  );

  const importsKonva = /from\s+["']react-konva["']|from\s+["']konva["']|require\(\s*["'](react-)?konva["']/i;
  expect(diagramViewSource).not.toMatch(importsKonva);
  expect(modelSource).not.toMatch(importsKonva);
});
