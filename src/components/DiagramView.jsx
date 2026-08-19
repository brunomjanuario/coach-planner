import { deserialize } from "../lib/exerciseDiagram";
import { PITCH_UNITS, DIAGRAM_COLORS, DIAGRAM_SIZES } from "../lib/diagramStyle";

/**
 * Read-only diagram viewer (design.md: "Konva writes, SVG reads"). Renders
 * the same normalised JSON the editor writes as a plain inline `<svg>` with
 * a fixed viewBox, so it scales with its container with no recalculation
 * and costs nothing to render — no canvas, no Konva, testable in jsdom.
 *
 * Never import "konva" or "react-konva" from this module or anything it
 * imports (design.md risk table) — a stray import puts Konva back in the
 * initial bundle and breaks the whole point of this component existing.
 */

const PITCH_WIDTH = PITCH_UNITS.width;
const PITCH_HEIGHT = PITCH_UNITS.height;
const VIEW_BOX = `0 0 ${PITCH_WIDTH} ${PITCH_HEIGHT}`;

function toPixel(point) {
  return { x: (point?.x ?? 0) * PITCH_WIDTH, y: (point?.y ?? 0) * PITCH_HEIGHT };
}

function pointsToAttr(points) {
  return (points ?? [])
    .map(([x, y]) => `${x * PITCH_WIDTH},${y * PITCH_HEIGHT}`)
    .join(" ");
}

function PitchLines({ pitch }) {
  if (pitch === "blank") return null;

  return (
    <g
      data-testid="pitch-lines"
      stroke={DIAGRAM_COLORS.pitchLine}
      fill="none"
      strokeWidth={DIAGRAM_SIZES.pitchLineWidth}
    >
      <rect x="1" y="1" width={PITCH_WIDTH - 2} height={PITCH_HEIGHT - 2} />
      <rect x="1" y="21" width="12" height="20" />
      <rect x={PITCH_WIDTH - 13} y="21" width="12" height="20" />
      {pitch === "full" && (
        <>
          <line x1={PITCH_WIDTH / 2} y1="1" x2={PITCH_WIDTH / 2} y2={PITCH_HEIGHT - 1} />
          <circle cx={PITCH_WIDTH / 2} cy={PITCH_HEIGHT / 2} r="8" />
        </>
      )}
    </g>
  );
}

function Shape({ shape }) {
  const { kind } = shape;

  if (kind === "player-a" || kind === "player-b") {
    const { x, y } = toPixel(shape);
    const fill = kind === "player-a" ? DIAGRAM_COLORS.playerA : DIAGRAM_COLORS.playerB;
    return (
      <g data-testid="diagram-shape" data-shape-kind={kind}>
        <circle
          cx={x}
          cy={y}
          r={DIAGRAM_SIZES.playerRadius}
          fill={fill}
          stroke={DIAGRAM_COLORS.playerStroke}
          strokeWidth={DIAGRAM_SIZES.playerStrokeWidth}
        />
        {shape.label != null && (
          <text
            x={x}
            y={y}
            fontSize="2"
            fill={DIAGRAM_COLORS.text}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {shape.label}
          </text>
        )}
      </g>
    );
  }

  if (kind === "cone") {
    const { x, y } = toPixel(shape);
    return (
      <polygon
        data-testid="diagram-shape"
        data-shape-kind={kind}
        points={`${x},${y - DIAGRAM_SIZES.coneHalf} ${x - DIAGRAM_SIZES.coneHalf},${
          y + DIAGRAM_SIZES.coneHalf
        } ${x + DIAGRAM_SIZES.coneHalf},${y + DIAGRAM_SIZES.coneHalf}`}
        fill={DIAGRAM_COLORS.cone}
      />
    );
  }

  if (kind === "ball") {
    const { x, y } = toPixel(shape);
    return (
      <circle
        data-testid="diagram-shape"
        data-shape-kind={kind}
        cx={x}
        cy={y}
        r={DIAGRAM_SIZES.ballRadius}
        fill={DIAGRAM_COLORS.ball}
        stroke={DIAGRAM_COLORS.ballStroke}
        strokeWidth={DIAGRAM_SIZES.ballStrokeWidth}
      />
    );
  }

  if (kind === "goal") {
    const { x, y } = toPixel(shape);
    return (
      <rect
        data-testid="diagram-shape"
        data-shape-kind={kind}
        x={x - DIAGRAM_SIZES.goalWidth / 2}
        y={y - DIAGRAM_SIZES.goalHeight / 2}
        width={DIAGRAM_SIZES.goalWidth}
        height={DIAGRAM_SIZES.goalHeight}
        fill="none"
        stroke={DIAGRAM_COLORS.goal}
        strokeWidth={DIAGRAM_SIZES.goalStrokeWidth}
      />
    );
  }

  if (kind === "line") {
    return (
      <polyline
        data-testid="diagram-shape"
        data-shape-kind={kind}
        points={pointsToAttr(shape.points)}
        fill="none"
        stroke={DIAGRAM_COLORS.path}
        strokeWidth={DIAGRAM_SIZES.pathWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  if (kind === "arrow") {
    return (
      <polyline
        data-testid="diagram-shape"
        data-shape-kind={kind}
        points={pointsToAttr(shape.points)}
        fill="none"
        stroke={DIAGRAM_COLORS.path}
        strokeWidth={DIAGRAM_SIZES.pathWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd="url(#diagram-arrowhead)"
      />
    );
  }

  if (kind === "text") {
    const { x, y } = toPixel(shape);
    return (
      <text
        data-testid="diagram-shape"
        data-shape-kind={kind}
        x={x}
        y={y}
        fontSize={DIAGRAM_SIZES.fontSize}
        fill={DIAGRAM_COLORS.text}
      >
        {shape.text}
      </text>
    );
  }

  // Unknown kind: rendered by deserialize's own guard for stored data, but
  // an in-memory diagram passed straight from the editor could still carry
  // one — skip it rather than render something meaningless (edge case).
  return null;
}

export default function DiagramView({ diagram, className }) {
  const parsed = deserialize(diagram);
  if (!parsed) return null;

  return (
    <svg
      className={className}
      viewBox={VIEW_BOX}
      role="img"
      aria-label="Exercise diagram"
      data-testid="diagram-view"
    >
      <defs>
        <marker
          id="diagram-arrowhead"
          markerWidth="4"
          markerHeight="4"
          refX="3"
          refY="2"
          orient="auto"
        >
          <path d="M0,0 L4,2 L0,4 Z" fill={DIAGRAM_COLORS.path} />
        </marker>
      </defs>
      {/* The grass. Without it the white pitch lines below are drawn onto
          whatever the container's background happens to be — invisible on
          a light one. */}
      <rect
        x="0"
        y="0"
        width={PITCH_WIDTH}
        height={PITCH_HEIGHT}
        fill={DIAGRAM_COLORS.pitch}
      />
      <PitchLines pitch={parsed.pitch} />
      {parsed.shapes.map((shape) => (
        <Shape key={shape.id} shape={shape} />
      ))}
    </svg>
  );
}
