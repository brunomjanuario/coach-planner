import { Component, Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
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
  validate,
  SHAPE_KINDS,
} from "../lib/exerciseDiagram";
import { PITCH_UNITS, DIAGRAM_COLORS, DIAGRAM_SIZES } from "../lib/diagramStyle";

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

// Fallback stage size, and the size every normalised coordinate is computed
// against until the stage has been measured (100:62, DiagramView's viewBox).
// The real size comes from the popup's own width — see `stageSize` below.
const STAGE_SIZE = { width: 600, height: 372 };
const PITCH_ASPECT = PITCH_UNITS.height / PITCH_UNITS.width;
// PopupShell caps the dialog at 85vh; this is roughly what the title, the
// tool palette, the Delete row and the pinned action row take out of that,
// so the rest is the stage's to fill.
const DIALOG_VIEWPORT_FRACTION = 0.85;
const DIALOG_CHROME_HEIGHT = 330;
const MIN_STAGE_HEIGHT = 160;

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

const PATH_KINDS = new Set(["line", "arrow"]);

function flattenPoints(points, size) {
  return (points ?? []).flatMap(([x, y]) => [x * size.width, y * size.height]);
}

/**
 * The pitch itself. `listening={false}` throughout so a click on the grass
 * reaches the Stage handler rather than being swallowed by the background
 * rect — the editor places markers from the Stage's click, not the pitch's.
 */
function Pitch({ konva, pitch, size, scale }) {
  const { Rect, Line, Circle } = konva;
  const stroke = {
    stroke: DIAGRAM_COLORS.pitchLine,
    strokeWidth: DIAGRAM_SIZES.pitchLineWidth * scale,
    listening: false,
  };

  return (
    <>
      <Rect
        x={0}
        y={0}
        width={size.width}
        height={size.height}
        fill={DIAGRAM_COLORS.pitch}
        listening={false}
      />
      {pitch !== "blank" && (
        <>
          <Rect x={1 * scale} y={1 * scale} width={98 * scale} height={60 * scale} {...stroke} />
          <Rect x={1 * scale} y={21 * scale} width={12 * scale} height={20 * scale} {...stroke} />
          <Rect x={87 * scale} y={21 * scale} width={12 * scale} height={20 * scale} {...stroke} />
          {pitch === "full" && (
            <>
              <Line points={[50 * scale, 1 * scale, 50 * scale, 61 * scale]} {...stroke} />
              <Circle x={50 * scale} y={31 * scale} radius={8 * scale} {...stroke} fill={null} />
            </>
          )}
        </>
      )}
    </>
  );
}

/**
 * One shape's body, drawn in the parent Group's **local** coordinates —
 * the Group carries the position, so everything here is centred on (0, 0).
 * That is what makes dragging correct: a dragged Group's `x()`/`y()` is
 * then the shape's new absolute position, not an offset from the origin.
 *
 * Geometry and colour come from lib/diagramStyle so this matches, mark for
 * mark, what DiagramView renders for the same saved diagram.
 */
function ShapeBody({ konva, shape, size, scale }) {
  const { Circle, Line, Rect, Text, Arrow } = konva;
  const s = scale;

  switch (shape.kind) {
    case "player-a":
    case "player-b":
      return (
        <Circle
          radius={DIAGRAM_SIZES.playerRadius * s}
          fill={shape.kind === "player-a" ? DIAGRAM_COLORS.playerA : DIAGRAM_COLORS.playerB}
          stroke={DIAGRAM_COLORS.playerStroke}
          strokeWidth={DIAGRAM_SIZES.playerStrokeWidth * s}
        />
      );

    case "cone": {
      const h = DIAGRAM_SIZES.coneHalf * s;
      return (
        <Line points={[0, -h, -h, h, h, h]} closed fill={DIAGRAM_COLORS.cone} />
      );
    }

    case "ball":
      return (
        <Circle
          radius={DIAGRAM_SIZES.ballRadius * s}
          fill={DIAGRAM_COLORS.ball}
          stroke={DIAGRAM_COLORS.ballStroke}
          strokeWidth={DIAGRAM_SIZES.ballStrokeWidth * s}
        />
      );

    case "goal":
      return (
        <Rect
          x={(-DIAGRAM_SIZES.goalWidth / 2) * s}
          y={(-DIAGRAM_SIZES.goalHeight / 2) * s}
          width={DIAGRAM_SIZES.goalWidth * s}
          height={DIAGRAM_SIZES.goalHeight * s}
          stroke={DIAGRAM_COLORS.goal}
          strokeWidth={DIAGRAM_SIZES.goalStrokeWidth * s}
        />
      );

    case "text":
      return (
        <Text
          // SVG anchors text on its baseline, Konva on its top edge; the
          // offset keeps a label in the same place in both renderers.
          y={-DIAGRAM_SIZES.fontSize * 0.8 * s}
          text={shape.text ?? ""}
          fontSize={DIAGRAM_SIZES.fontSize * s}
          fill={DIAGRAM_COLORS.text}
        />
      );

    case "arrow":
      return (
        <Arrow
          points={flattenPoints(shape.points, size)}
          stroke={DIAGRAM_COLORS.path}
          fill={DIAGRAM_COLORS.path}
          strokeWidth={DIAGRAM_SIZES.pathWidth * s}
          pointerLength={DIAGRAM_SIZES.arrowHead * s}
          pointerWidth={DIAGRAM_SIZES.arrowHead * s}
          lineCap="round"
          lineJoin="round"
        />
      );

    case "line":
      return (
        <Line
          points={flattenPoints(shape.points, size)}
          stroke={DIAGRAM_COLORS.path}
          strokeWidth={DIAGRAM_SIZES.pathWidth * s}
          lineCap="round"
          lineJoin="round"
        />
      );

    default:
      return null;
  }
}

/** The highlight drawn under the selected shape so selection is visible. */
function SelectionMark({ konva, shape, size, scale }) {
  const { Circle, Line } = konva;
  const common = {
    stroke: DIAGRAM_COLORS.selection,
    strokeWidth: DIAGRAM_SIZES.selectionWidth * scale,
    listening: false,
  };

  if (PATH_KINDS.has(shape.kind)) {
    return (
      <Line
        points={flattenPoints(shape.points, size)}
        {...common}
        strokeWidth={DIAGRAM_SIZES.pathWidth * 2.5 * scale}
        opacity={0.7}
        lineCap="round"
        lineJoin="round"
      />
    );
  }

  return <Circle radius={DIAGRAM_SIZES.selectionRadius * scale} dash={[2 * scale, 1.5 * scale]} {...common} />;
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
  drawingShape,
}) {
  const { Stage, Layer, Group } = konva;
  const scale = stageSize.width / PITCH_UNITS.width;

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
        <Pitch konva={konva} pitch={diagram.pitch} size={stageSize} scale={scale} />
        {diagram.shapes.map((shape) => {
          const isPointShape = "x" in shape && "y" in shape;
          const isSelected = shape.id === selectedId;
          return (
            <Group
              key={shape.id}
              id={shape.id}
              data-testid="konva-shape"
              data-shape-kind={shape.kind}
              data-selected={isSelected}
              // A point shape's Group carries its position, so a drag end
              // reports the position itself; path shapes keep their points
              // in stage space and stay put.
              x={isPointShape ? shape.x * stageSize.width : 0}
              y={isPointShape ? shape.y * stageSize.height : 0}
              draggable={isPointShape}
              onClick={(e) => onShapeClick?.(shape.id, e)}
              onTap={(e) => onShapeClick?.(shape.id, e)}
              onDragEnd={isPointShape ? (e) => onShapeDragEnd?.(shape.id, e) : undefined}
            >
              {isSelected && (
                <SelectionMark konva={konva} shape={shape} size={stageSize} scale={scale} />
              )}
              <ShapeBody konva={konva} shape={shape} size={stageSize} scale={scale} />
            </Group>
          );
        })}
        {drawingShape && (
          <Group listening={false} data-testid="konva-drawing-preview">
            <ShapeBody konva={konva} shape={drawingShape} size={stageSize} scale={scale} />
          </Group>
        )}
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
  // The size-guard refusal message (edge case: over 60 shapes or 8192
  // bytes) — set on a failed Save, cleared on the next successful mutation
  // or Save attempt, and never closes the popup or drops any work.
  const [saveError, setSaveError] = useState(null);

  // The stage is sized from the popup's own width so it never overflows the
  // dialog and every part of the pitch stays clickable; STAGE_SIZE is the
  // fallback until the container has been measured (and in jsdom, which has
  // no layout and no ResizeObserver, it is the size for good).
  const containerRef = useRef(null);
  const [stageSize, setStageSize] = useState(STAGE_SIZE);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const available = el.clientWidth;
      if (!available) return;
      // Also bounded by height: PopupShell caps the dialog at 85vh and only
      // its body scrolls, so an unbounded stage would push the pitch half
      // out of view on a short window.
      const maxHeight = Math.max(
        MIN_STAGE_HEIGHT,
        window.innerHeight * DIALOG_VIEWPORT_FRACTION - DIALOG_CHROME_HEIGHT
      );
      const width = Math.min(available, Math.round(maxHeight / PITCH_ASPECT));
      setStageSize({ width, height: Math.round(width * PITCH_ASPECT) });
    };

    measure();
    window.addEventListener("resize", measure);
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(el);
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, []);

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

  // Refuses to save an over-limit diagram (edge case: > 60 shapes or > 8192
  // bytes serialized) — the editor stays open and every shape stays exactly
  // as it was, so nothing is lost just because it could not be saved yet.
  const handleSave = () => {
    const result = validate(diagram);
    if (!result.ok) {
      setSaveError(result.reason);
      return;
    }
    setSaveError(null);
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

  // Placing a marker or a text label consumes the click; line/arrow draw
  // via mousedown/mousemove/mouseup instead, and the select tool treats a
  // click on empty grass as "deselect".
  const handleStageClick = (e) => {
    if (tool === "select") {
      setSelectedId(null);
      return;
    }

    const pointer = e.target.getStage().getPointerPosition();
    const point = normalise(pointer, stageSize);

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
    setDrawingPoints([normalise(pointer, stageSize)]);
  };

  const handleStageMouseMove = (e) => {
    if ((tool !== "line" && tool !== "arrow") || !drawingPoints) return;
    const pointer = e.target.getStage().getPointerPosition();
    const point = normalise(pointer, stageSize);
    // An arrow is always straight, so a move replaces its end point rather
    // than extending the path — the preview follows the cursor either way.
    setDrawingPoints((points) =>
      tool === "arrow" ? [points[0], point] : [...points, point]
    );
  };

  const handleStageMouseUp = (e) => {
    if ((tool !== "line" && tool !== "arrow") || !drawingPoints) return;
    const pointer = e.target.getStage().getPointerPosition();
    const endPoint = normalise(pointer, stageSize);
    const rawPoints = tool === "arrow" ? [drawingPoints[0], endPoint] : [...drawingPoints, endPoint];
    // addShape's path-kind branch expects [x, y] tuples, not {x, y} objects.
    const points = rawPoints.map((p) => [p.x, p.y]);
    applyChange((d) => addShape(d, tool, { points }));
    setDrawingPoints(null);
  };

  // Selecting is the select tool's job; with a placement tool active the
  // click falls through to the stage so a marker can be dropped on top of
  // an existing one.
  const handleShapeClick = (shapeId, e) => {
    if (tool !== "select") return;
    if (e) {
      e.cancelBubble = true;
      e.evt?.stopPropagation?.();
    }
    setSelectedId(shapeId);
  };

  const handleShapeDragEnd = (shapeId, e) => {
    const pixel = { x: e.target.x(), y: e.target.y() };
    const point = normalise(pixel, stageSize);
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

  // The line/arrow being dragged right now, shaped like a real shape so the
  // canvas can draw it with exactly the same code as a committed one.
  const drawingShape =
    drawingPoints && drawingPoints.length > 1
      ? { id: "__drawing__", kind: tool, points: drawingPoints.map((p) => [p.x, p.y]) }
      : null;

  return (
    <PopupShell
      title="Draw diagram"
      width="max-w-3xl"
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
        {saveError && (
          <p role="alert" className="text-sm text-red-500">
            {saveError}
          </p>
        )}
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
        <div ref={containerRef} className="flex w-full justify-center overflow-hidden rounded">
          <CanvasErrorBoundary>
            <Suspense fallback={<div role="status">Loading the diagram editor…</div>}>
              <DiagramCanvas
                diagram={diagram}
                stageSize={stageSize}
                onStageClick={handleStageClick}
                onStageMouseDown={handleStageMouseDown}
                onStageMouseMove={handleStageMouseMove}
                onStageMouseUp={handleStageMouseUp}
                onShapeClick={handleShapeClick}
                onShapeDragEnd={handleShapeDragEnd}
                selectedId={selectedId}
                drawingShape={drawingShape}
              />
            </Suspense>
          </CanvasErrorBoundary>
        </div>
      </div>
    </PopupShell>
  );
}
