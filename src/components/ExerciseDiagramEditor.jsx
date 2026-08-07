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
  normalise,
  SHAPE_KINDS,
} from "../lib/exerciseDiagram";

// The tools that place a single-point marker on a stage click. line/arrow/
// text are placed differently (T6) and are not wired to the stage click yet.
const MARKER_KINDS = ["player-a", "player-b", "cone", "ball", "goal"];

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

  // Placing a marker consumes the click; the select tool (or any tool this
  // editor doesn't yet place from a stage click — line/arrow/text, T6)
  // leaves the diagram untouched.
  const handleStageClick = (e) => {
    if (!MARKER_KINDS.includes(tool)) return;
    const pointer = e.target.getStage().getPointerPosition();
    const point = normalise(pointer, STAGE_SIZE);
    setDiagram((d) => addShape(d, tool, point));
  };

  const handleShapeClick = (shapeId) => {
    setSelectedId(shapeId);
  };

  const handleShapeDragEnd = (shapeId, e) => {
    const pixel = { x: e.target.x(), y: e.target.y() };
    const point = normalise(pixel, STAGE_SIZE);
    setDiagram((d) => moveShape(d, shapeId, point));
  };

  const handleDelete = () => {
    if (!selectedId) return;
    setDiagram((d) => removeShape(d, selectedId));
    setSelectedId(null);
  };

  return (
    <PopupShell
      title="Draw diagram"
      footer={
        <PopupActions>
          <Button variant="secondary" disabled>
            Undo
          </Button>
          <Button variant="secondary" disabled>
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
