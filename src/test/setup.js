import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import React from "react";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

/**
 * react-konva mock (feature 29-exercise-designer). Konva needs a real
 * `<canvas>` to render into, and jsdom does not implement one — a real
 * `Stage` cannot mount in any test in this repo. This mock stands in for
 * every react-konva primitive the diagram editor uses, as a plain `<div>`
 * that forwards the same event shapes real Konva produces:
 *   - `Stage`'s onClick receives `{ evt, target: { getStage: () =>
 *     ({ getPointerPosition: () => {x, y} }) } }`, with the pointer position
 *     computed from the native click's clientX/Y against the stage
 *     element's own bounding rect — the same relative-to-container
 *     computation Konva itself does, just against jsdom's (always-zero)
 *     layout rather than a real one.
 *   - Shape primitives (`Circle`, `Line`, `Text`, …) forward `onClick` with
 *     `{ evt, target: { id: () => props.id } }` and `onDragEnd` with
 *     `{ target: { x: () => <clientX>, y: () => <clientY> } }` — the caller
 *     drives the new position through a native `dragend` event's
 *     clientX/clientY, mirroring how a real Konva onDragEnd exposes the
 *     shape's post-drag position via `target.x()`/`target.y()`.
 *
 * Do not "fix" this by unmocking react-konva — the editor's actual drawing
 * logic (clamping, normalising, undo) lives in src/lib/exerciseDiagram.js
 * and is unit-tested there with no canvas involved at all; these tests only
 * need to prove the editor calls into that module correctly.
 */
vi.mock("react-konva", () => {
  function pointerFromEvent(nativeEvent, containerEl) {
    const rect = containerEl?.getBoundingClientRect?.() ?? { left: 0, top: 0 };
    return {
      x: nativeEvent.clientX - rect.left,
      y: nativeEvent.clientY - rect.top,
    };
  }

  const Stage = React.forwardRef(function MockKonvaStage(
    { children, onClick, width, height, ...rest },
    ref
  ) {
    const localRef = React.useRef(null);
    React.useImperativeHandle(ref, () => localRef.current);
    return React.createElement(
      "div",
      {
        "data-testid": "konva-stage",
        ref: localRef,
        "data-width": width,
        "data-height": height,
        onClick: (e) => {
          if (onClick) {
            onClick({
              evt: e,
              target: {
                getStage: () => ({
                  getPointerPosition: () => pointerFromEvent(e, localRef.current),
                }),
              },
            });
          }
        },
        ...Object.fromEntries(
          Object.entries(rest).filter(([key]) => key.startsWith("data-"))
        ),
      },
      children
    );
  });

  function makePrimitive(testId) {
    return function MockKonvaPrimitive(props) {
      const { children, onClick, onDragEnd, id, ...rest } = props;
      const domProps = Object.fromEntries(
        Object.entries(rest).filter(([key]) => key.startsWith("data-"))
      );
      return React.createElement(
        "div",
        {
          "data-testid": testId,
          "data-konva-id": id,
          ...domProps,
          onClick: (e) => {
            e.stopPropagation();
            if (onClick) {
              onClick({ evt: e, target: { id: () => id } });
            }
          },
          onDragEnd: (e) => {
            if (onDragEnd) {
              onDragEnd({
                target: { id: () => id, x: () => e.clientX, y: () => e.clientY },
              });
            }
          },
        },
        children
      );
    };
  }

  return {
    Stage,
    Layer: makePrimitive("konva-layer"),
    Group: makePrimitive("konva-group"),
    Circle: makePrimitive("konva-circle"),
    Rect: makePrimitive("konva-rect"),
    RegularPolygon: makePrimitive("konva-polygon"),
    Line: makePrimitive("konva-line"),
    Text: makePrimitive("konva-text"),
  };
});
