import { render, screen, within } from "@testing-library/react";
import LeagueTable from "../LeagueTable";

const ourRow = {
  name: "Amadora Sub-11",
  played: 3,
  won: 2,
  drawn: 1,
  lost: 0,
  goalsFor: 7,
  goalsAgainst: 2,
  goalDifference: 5,
  points: 7,
  isOurs: true,
};

const rivalRow = {
  name: "Benfica B",
  played: 3,
  won: 3,
  drawn: 0,
  lost: 0,
  goalsFor: 9,
  goalsAgainst: 1,
  goalDifference: 8,
  points: 9,
  isOurs: false,
};

function getRow(name) {
  return screen.getByText(name).closest("tr");
}

test("renders one row per team with position, name and every column value", () => {
  render(<LeagueTable rows={[rivalRow, ourRow]} />);

  const row = getRow("Amadora Sub-11");
  const cells = within(row).getAllByRole("cell");
  expect(cells.map((c) => c.textContent)).toEqual([
    "2", // position (2nd row)
    "Amadora Sub-11",
    "3", // played
    "2", // won
    "1", // drawn
    "0", // lost
    "7", // GF
    "2", // GA
    "5", // GD
    "7", // points
  ]);
});

test("highlights our row visually (AC GAME-08.4)", () => {
  render(<LeagueTable rows={[rivalRow, ourRow]} />);

  expect(getRow("Amadora Sub-11").className).toMatch(/bg-blue-500/);
  expect(getRow("Benfica B").className).not.toMatch(/bg-blue-500/);
});

test("shows our row's position number based on render order (AC GAME-08.4)", () => {
  render(<LeagueTable rows={[rivalRow, ourRow]} />);

  const cells = within(getRow("Amadora Sub-11")).getAllByRole("cell");
  expect(cells[0]).toHaveTextContent("2");
});

test("renders rows in the order given, without re-sorting", () => {
  render(<LeagueTable rows={[ourRow, rivalRow]} />);

  const rowsRendered = screen.getAllByRole("row").slice(1); // skip header
  expect(within(rowsRendered[0]).getByText("Amadora Sub-11")).toBeInTheDocument();
  expect(within(rowsRendered[1]).getByText("Benfica B")).toBeInTheDocument();
});

test("with only our row present, renders a single row at position 1 (AC GAME-07.6)", () => {
  render(<LeagueTable rows={[ourRow]} />);

  const dataRows = screen.getAllByRole("row").slice(1);
  expect(dataRows).toHaveLength(1);
  expect(within(dataRows[0]).getAllByRole("cell")[0]).toHaveTextContent("1");
});

test("renders a header row with the expected column labels", () => {
  render(<LeagueTable rows={[ourRow]} />);

  const header = screen.getAllByRole("row")[0];
  ["#", "Team", "P", "W", "D", "L", "GF", "GA", "GD", "Pts"].forEach((label) => {
    expect(within(header).getByText(label)).toBeInTheDocument();
  });
});

test("renders correct P/W/D/L/GF/GA/GD/Pts values for a rival row", () => {
  render(<LeagueTable rows={[rivalRow]} />);

  const row = getRow("Benfica B");
  const cells = within(row).getAllByRole("cell");
  // #, Team, P, W, D, L, GF, GA, GD, Pts
  expect(cells.map((c) => c.textContent)).toEqual([
    "1",
    "Benfica B",
    "3",
    "3",
    "0",
    "0",
    "9",
    "1",
    "8",
    "9",
  ]);
});

test("wraps the table in a horizontally-scrollable container rather than overflowing the page", () => {
  const { container } = render(<LeagueTable rows={[ourRow]} />);

  expect(container.querySelector(".overflow-x-auto")).toBeInTheDocument();
});

test("renders no data rows for an empty rows array", () => {
  render(<LeagueTable rows={[]} />);

  expect(screen.getAllByRole("row")).toHaveLength(1); // header only
});
