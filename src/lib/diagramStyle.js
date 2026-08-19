/**
 * Shared look of an exercise diagram (feature 29). The editor draws with
 * Konva and the viewer draws with SVG ("Konva writes, SVG reads"), so the
 * only way the two can agree on what a cone looks like is to read the same
 * numbers from here.
 *
 * Every geometry value is expressed in the pitch's own unit space
 * (`PITCH_UNITS`, 100x62 — DiagramView's viewBox). The editor multiplies
 * them by `stageWidth / 100` to get pixels; the viewer uses them as-is.
 *
 * Contains no React, no SVG and above all no Konva import — DiagramView
 * pulls this in, and a stray Konva import here would put Konva back in the
 * initial bundle (design.md risk table).
 */

export const PITCH_UNITS = Object.freeze({ width: 100, height: 62 });

export const DIAGRAM_COLORS = Object.freeze({
  pitch: "#15803d",
  pitchLine: "#ffffff",
  playerA: "#2563eb",
  playerB: "#dc2626",
  playerStroke: "#ffffff",
  cone: "#f97316",
  ball: "#ffffff",
  ballStroke: "#111827",
  goal: "#ffffff",
  path: "#111827",
  text: "#ffffff",
  selection: "#facc15",
});

export const DIAGRAM_SIZES = Object.freeze({
  pitchLineWidth: 0.3,
  playerRadius: 2,
  playerStrokeWidth: 0.25,
  coneHalf: 1.5,
  ballRadius: 1,
  ballStrokeWidth: 0.2,
  goalWidth: 6,
  goalHeight: 1.5,
  goalStrokeWidth: 0.3,
  pathWidth: 0.5,
  arrowHead: 2,
  fontSize: 3,
  selectionRadius: 3.6,
  selectionWidth: 0.4,
});
