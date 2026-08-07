import { Component, Suspense, lazy, useMemo, useState } from "react";
import PopupShell from "./PopupShell";
import Button from "./Button";
import PopupActions from "./PopupActions";
import {
  createDiagram,
  deserialize,
  addShape,
  moveShape,
  removeShape,
  clearShapes,
  normalise,
  SHAPE_KINDS,
} from "../lib/exerciseDiagram";

// The tools that place a single-point marker on a stage click.
const MARKER_KINDS = ["player-a", "player-b", "cone", "ball", "goal"];

// design.md: undo is a stack of whole diagrams, 20 deep, in memory only.
const UNDO_LIMIT = 20;

/**
 * Editor shell (design.md: a PopupShell hosting a lazily-loaded Konva
 * stage). `import("react-konva")` below is a **dynamic** import — Vite
 * code-splits it into its own chunk regardless of it being written inside
 * this file, so Konva never lands in the initial bundle even though the
 * wiring lives in one file rather than two (AC DRAW-04.3). It only resolves
 * when this popup actually mounts.
 */
const DEFAULT_KONVA_LOADER = () => import("react-konva");

const STAGE_SIZE = { width: 600, height: 372 }; // 100:62 aspect, matches DiagramView's viewBox

const TOOL_LABELS = {
  select: "Select",
  "player-a": "Player A",
  "player-b": "Player B",
  cone: "Cone",
  ball: "Ball",
  goal: "Goal",
  line: "Line",
  arrow: "Arrow",
  text: "Text",
};

const TOOLS = ["select", ...SHAPE_KINDS];

function flattenPoints(points, size) {
  return (points ?? []).flatMap(([x, y]) => [x * size.width, y * size.height]);
}

function KonvaSurface({
  konva,
  diagram,
  stageSize,
  onStageClick,
  onStageMouseDown,
  onStageMouseMove,
  onStageMouseUp,
  onShapeClick,
  onShapeDragEnd,
  selectedId,
}) {
  const { Stage, Layer, Circle, Line, Text, Group } = konva;

  return (
    <Stage
      data-testid="diagram-stage"
      width={stageSize.width}
      height={stageSize.height}
      onClick={onStageClick}
      onMouseDown={onStageMouseDown}
      onMouseMove={onStageMouseMove}
      onMouseUp={onStageMouseUp}
    >
      <Layer>
        {diagram.shapes.map((shape) => {
          const isPointShape = "x" in shape && "y" in shape;
          return (
            <Group
              key={shape.id}
              id={shape.id}
              data-testid="konva-shape"
              data-shape-kind={shape.kind}
              data-selected={shape.id === selectedId}
              draggable={isPointShape}
              onClick={() => onShapeClick?.(shape.id)}
              onDragEnd={isPointShape ? (e) => onShapeDragEnd?.(shape.id, e) : undefined}
            >
              {shape.kind === "line" || shape.kind === "arrow" ? (
                <Line points={flattenPoints(shape.points, stageSize)} />
              ) : shape.kind === "text" ? (
                <Text x={shape.x * stageSize.width} y={shape.y * stageSize.height} text={shape.text ?? ""} />
              ) : (
                <Circle x={shape.x * stageSize.width} y={shape.y * stageSize.height} radius={10} />
              )}
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
}

/**
 * Class component: React's error boundary mechanism has no Hook
 * equivalent. Catches a rejected `konvaLoader()` (edge case: "the browser
 * cannot construct a canvas") and renders a message inside the popup
 * instead of letting the error take the whole popup down.
 */
class CanvasErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <p role="alert" className="text-sm text-red-500">
          Could not load the diagram editor. Please try again.
        </p>
      );
    }
    return this.props.children;
  }
}

export default function ExerciseDiagramEditor({
  diagram: initialDiagram,
  onSave,
  onClose,
  konvaLoader = DEFAULT_KONVA_LOADER,
}) {
  const [diagram, setDiagram] = useState(() => deserialize(initialDiagram) ?? createDiagram());
  const [tool, setTool] = useState("select");
  const [selectedId, setSelectedId] = useState(null);
  // Points captured so far for an in-progress line/arrow drag; null when
  // not currently drawing a path.
  const [drawingPoints, setDrawingPoints] = useState(null);
  // Undo stack: previous whole diagrams, capped at UNDO_LIMIT (design.md —
  // a stack of whole diagrams, not per-tool inverse operations). In-memory
  // component state only, so it never survives the popup unmounting.
  const [history, setHistory] = useState([]);

  // Loaded once per popup instance (deps only on konvaLoader, never on
  // `diagram`) — `diagram` is passed down as a prop on every render instead
  // of being captured in this closure, which would otherwise go stale after
  // the lazy component resolves once and never re-runs its factory.
  const DiagramCanvas = useMemo(
    () =>
      lazy(() =>
        konvaLoader().then((konva) => ({
          default: function DiagramCanvasInner(props) {
            return <KonvaSurface konva={konva} {...props} />;
          },
        }))
      ),
    [konvaLoader]
  );

  const handleSave = () => {
    if (onSave) onSave(diagram);
    onClose();
  };

  // Pushes the diagram as it is *before* this change onto the undo stack,
  // capped at UNDO_LIMIT, then applies the change. Every mutation in this
  // editor goes through here so undo is a plain pop, not a per-tool inverse.
  const applyChange = (mutate) => {
    setHistory((h) => [...h, diagram].slice(-UNDO_LIMIT));
    setDiagram(mutate(diagram));
  };

  // Placing a marker or a text label consumes the click; the select tool
  // (and line/arrow, which draw via mousedown/mousemove/mouseup instead)
  // leave the diagram untouched.
  const handleStageClick = (e) => {
    const pointer = e.target.getStage().getPointerPosition();
    const point = normalise(pointer, STAGE_SIZE);

    if (tool === "text") {
      const text = window.prompt("Enter label text:");
      if (text === null) return;
      applyChange((d) => addShape(d, "text", { ...point, text }));
      return;
    }

    if (!MARKER_KINDS.includes(tool)) return;
    applyChange((d) => addShape(d, tool, point));
  };

  // line captures every point along the drag (freehand); arrow only needs
  // its start and end (design.md's data model: line ships a polyline, arrow
  // ships exactly two points).
  const handleStageMouseDown = (e) => {
    if (tool !== "line" && tool !== "arrow") return;
    const pointer = e.target.getStage().getPointerPosition();
    setDrawingPoints([normalise(pointer, STAGE_SIZE)]);
  };

  const handleStageMouseMove = (e) => {
    if (tool !== "line" || !drawingPoints) return;
    const pointer = e.target.getStage().getPointerPosition();
    const point = normalise(pointer, STAGE_SIZE);
    setDrawingPoints((points) => [...points, point]);
  };

  const handleStageMouseUp = (e) => {
    if ((tool !== "line" && tool !== "arrow") || !drawingPoints) return;
    const pointer = e.target.getStage().getPointerPosition();
    const endPoint = normalise(pointer, STAGE_SIZE);
    const rawPoints = tool === "arrow" ? [drawingPoints[0], endPoint] : [...drawingPoints, endPoint];
    // addShape's path-kind branch expects [x, y] tuples, not {x, y} objects.
    const points = rawPoints.map((p) => [p.x, p.y]);
    applyChange((d) => addShape(d, tool, { points }));
    setDrawingPoints(null);
  };

  const handleShapeClick = (shapeId) => {
    setSelectedId(shapeId);
  };

  const handleShapeDragEnd = (shapeId, e) => {
    const pixel = { x: e.target.x(), y: e.target.y() };
    const point = normalise(pixel, STAGE_SIZE);
    applyChange((d) => moveShape(d, shapeId, point));
  };

  const handleDelete = () => {
    if (!selectedId) return;
    applyChange((d) => removeShape(d, selectedId));
    setSelectedId(null);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setDiagram(previous);
    setSelectedId(null);
  };

  const handleClear = () => {
    applyChange((d) => clearShapes(d));
    setSelectedId(null);
  };

  return (
    <PopupShell
      title="Draw diagram"
      footer={
        <PopupActions>
          <Button variant="secondary" disabled={history.length === 0} onClick={handleUndo}>
            Undo
          </Button>
          <Button variant="secondary" onClick={handleClear}>
            Clear
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </PopupActions>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Diagram tools">
          {TOOLS.map((toolId) => (
            <Button
              key={toolId}
              type="button"
              variant={tool === toolId ? "primary" : "secondary"}
              aria-pressed={tool === toolId}
              onClick={() => setTool(toolId)}
            >
              {TOOL_LABELS[toolId]}
            </Button>
          ))}
        </div>
        <div>
          <Button type="button" variant="danger" disabled={!selectedId} onClick={handleDelete}>
            Delete
          </Button>
        </div>
        <CanvasErrorBoundary>
          <Suspense fallback={<div role="status">Loading the diagram editor…</div>}>
            <DiagramCanvas
              diagram={diagram}
              stageSize={STAGE_SIZE}
              onStageClick={handleStageClick}
              onStageMouseDown={handleStageMouseDown}
              onStageMouseMove={handleStageMouseMove}
              onStageMouseUp={handleStageMouseUp}
              onShapeClick={handleShapeClick}
              onShapeDragEnd={handleShapeDragEnd}
              selectedId={selectedId}
            />
          </Suspense>
        </CanvasErrorBoundary>
      </div>
    </PopupShell>
  );
}
