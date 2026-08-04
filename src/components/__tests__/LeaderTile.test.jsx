import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen, within } from "@testing-library/react";
import LeaderTile from "../LeaderTile";

const componentsDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test("renders up to 3 entries with rank, name and value (AC DASH-05.1)", () => {
  render(
    <LeaderTile
      label="Most Goals"
      data={{
        entries: [
          { id: 1, name: "Ana", value: 10, rank: 1 },
          { id: 2, name: "Beatriz", value: 5, rank: 2 },
          { id: 3, name: "Carla", value: 2, rank: 3 },
        ],
        overflow: 0,
      }}
    />
  );

  const items = screen.getAllByRole("listitem");
  expect(items).toHaveLength(3);
  expect(within(items[0]).getByText("1. Ana")).toBeInTheDocument();
  expect(within(items[0]).getByText("10")).toBeInTheDocument();
});

test("renders tied entries sharing the same rank number (AC DASH-05.4)", () => {
  render(
    <LeaderTile
      label="Most Goals"
      data={{
        entries: [
          { id: 1, name: "Ana", value: 5, rank: 1 },
          { id: 2, name: "Carla", value: 5, rank: 1 },
        ],
        overflow: 0,
      }}
    />
  );

  expect(screen.getByText("1. Ana")).toBeInTheDocument();
  expect(screen.getByText("1. Carla")).toBeInTheDocument();
});

test("renders only the entries given when fewer than 3 qualify, never padding (AC DASH-05.6)", () => {
  render(
    <LeaderTile
      label="Most Goals"
      data={{ entries: [{ id: 1, name: "Ana", value: 2, rank: 1 }], overflow: 0 }}
    />
  );

  expect(screen.getAllByRole("listitem")).toHaveLength(1);
});

test("renders 'No data yet' for an empty entries list (AC DASH-05.5)", () => {
  render(<LeaderTile label="Most Goals" data={{ entries: [], overflow: 0 }} />);

  expect(screen.getByText("No data yet")).toBeInTheDocument();
  expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
});

test("treats a missing data prop the same as an empty result", () => {
  render(<LeaderTile label="Most Goals" />);

  expect(screen.getByText("No data yet")).toBeInTheDocument();
});

test("renders the overflow cap indicator from a 20-way tie (edge case)", () => {
  render(
    <LeaderTile
      label="Most Goals"
      data={{
        entries: [{ id: 1, name: "Ana", value: 3, rank: 1 }],
        overflow: 10,
      }}
    />
  );

  expect(screen.getByText("+10 more tied")).toBeInTheDocument();
});

test("does not render an overflow indicator when overflow is 0", () => {
  render(
    <LeaderTile
      label="Most Goals"
      data={{ entries: [{ id: 1, name: "Ana", value: 3, rank: 1 }], overflow: 0 }}
    />
  );

  expect(screen.queryByText(/more tied/)).not.toBeInTheDocument();
});

test("supports a two-part value via renderValue, for the cards tile's yellow/red split (AC DASH-05.3)", () => {
  render(
    <LeaderTile
      label="Most Cards"
      data={{
        entries: [{ id: 1, name: "Ana", value: { yellow: 2, red: 1 }, rank: 1 }],
        overflow: 0,
      }}
      renderValue={(v) => `${v.yellow}Y / ${v.red}R`}
    />
  );

  expect(screen.getByText("2Y / 1R")).toBeInTheDocument();
});

test("renders an optional note under the label, e.g. the Most Games disclosure (AC DASH-05.2)", () => {
  render(
    <LeaderTile
      label="Most Games"
      note="Team appearances, not individual"
      data={{ entries: [{ id: 1, name: "Amadora Sub-11", value: 4, rank: 1 }], overflow: 0 }}
    />
  );

  expect(screen.getByText("Team appearances, not individual")).toBeInTheDocument();
});

test("renders a loading placeholder rather than an empty state while loading", () => {
  render(<LeaderTile label="Most Goals" loading data={{ entries: [], overflow: 0 }} />);

  expect(screen.queryByText("No data yet")).not.toBeInTheDocument();
  expect(screen.getByText("—")).toBeInTheDocument();
});

test("renders through the shared Tile surface (h-full present) when populated (AC DGRID-04.1)", () => {
  render(
    <LeaderTile
      label="Most Goals"
      data={{ entries: [{ id: 1, name: "Ana", value: 3, rank: 1 }], overflow: 0 }}
    />
  );

  expect(screen.getByText("Most Goals").parentElement.className).toMatch(/\bh-full\b/);
});

test("the loading skeleton occupies the same surface class as the populated state (AC DGRID-05.2)", () => {
  const { unmount } = render(
    <LeaderTile
      label="Most Goals"
      data={{ entries: [{ id: 1, name: "Ana", value: 3, rank: 1 }], overflow: 0 }}
    />
  );
  const populatedClass = screen.getByText("Most Goals").parentElement.className;
  unmount();

  render(<LeaderTile label="Most Goals" loading data={{ entries: [], overflow: 0 }} />);
  const loadingClass = screen.getByText("Most Goals").parentElement.className;

  expect(loadingClass).toBe(populatedClass);
});

test("the empty state occupies the same surface class as the populated state (AC DGRID-05.3)", () => {
  const { unmount } = render(
    <LeaderTile
      label="Most Goals"
      data={{ entries: [{ id: 1, name: "Ana", value: 3, rank: 1 }], overflow: 0 }}
    />
  );
  const populatedClass = screen.getByText("Most Goals").parentElement.className;
  unmount();

  render(<LeaderTile label="Most Goals" data={{ entries: [], overflow: 0 }} />);
  const emptyClass = screen.getByText("Most Goals").parentElement.className;

  expect(emptyClass).toBe(populatedClass);
});

test("TILE_CLASS is declared in exactly one module — StatTile and LeaderTile no longer define their own copy (AC DGRID-04.5)", () => {
  const statTileSrc = fs.readFileSync(path.join(componentsDir, "StatTile.jsx"), "utf-8");
  const leaderTileSrc = fs.readFileSync(path.join(componentsDir, "LeaderTile.jsx"), "utf-8");
  const tileSrc = fs.readFileSync(path.join(componentsDir, "Tile.jsx"), "utf-8");

  expect(statTileSrc).not.toMatch(/\bTILE_CLASS\s*=/);
  expect(leaderTileSrc).not.toMatch(/\bTILE_CLASS\s*=/);
  expect(tileSrc).toMatch(/\bTILE_CLASS\s*=/);
});
