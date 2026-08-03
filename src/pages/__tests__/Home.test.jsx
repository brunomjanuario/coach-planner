import { render, screen, within, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "../Home";
import { teamService } from "../../services/teamService";
import { trainingService } from "../../services/trainingService";
import { gameService } from "../../services/gameService";
import { cardService } from "../../services/cardService";

afterEach(() => {
  vi.restoreAllMocks();
});

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

function getTile(labelText) {
  return screen.getByText(labelText).parentElement;
}

test("the Teams tile shows the number of teams (AC DASH-04.1)", async () => {
  renderHome();

  await screen.findByText("Teams");
  expect(within(getTile("Teams")).getByText("2")).toBeInTheDocument();
});

test("the Training tile shows the total split into past and upcoming (AC DASH-04.2)", async () => {
  renderHome();

  await screen.findByText("Training");
  expect(await screen.findByText("2 past · 0 upcoming")).toBeInTheDocument();
});

test("the Games tile shows the total split into played and upcoming (AC DASH-04.3)", async () => {
  renderHome();

  await screen.findByText("Games");
  expect(await screen.findByText("1 played · 1 upcoming")).toBeInTheDocument();
});

test("a zero count renders the signposted empty state (AC DASH-04.4)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(trainingService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(gameService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(cardService, "getAll").mockResolvedValueOnce([]);

  renderHome();

  await waitFor(() => {
    expect(screen.getAllByText("No data yet")).toHaveLength(6);
  });
  expect(
    within(getTile("Teams")).getByRole("link", { name: "Add one" })
  ).toHaveAttribute("href", "/teams");
});

test("revisiting after a record is created elsewhere shows the updated count (AC DASH-04.5)", async () => {
  const { unmount } = renderHome();
  await screen.findByText("Teams");
  expect(within(getTile("Teams")).getByText("2")).toBeInTheDocument();

  await teamService.create({ name: "Sub-15", club: "Amadora", players: [] });
  unmount();

  renderHome();

  await screen.findByText("Teams");
  expect(within(getTile("Teams")).getByText("3")).toBeInTheDocument();
});

test("preserves the existing 3x2 grid layout", async () => {
  const { container } = renderHome();
  await screen.findByText("Teams");

  const grid = container.querySelector(".grid");
  expect(grid.className).toContain("grid-cols-3");
  expect(grid.className).toContain("grid-rows-2");
  expect(grid.children).toHaveLength(6);
});

test("renders a loading placeholder rather than 0 before the initial load resolves (edge case)", () => {
  vi.spyOn(teamService, "getAll").mockReturnValue(new Promise(() => {}));
  vi.spyOn(trainingService, "getAll").mockReturnValue(new Promise(() => {}));
  vi.spyOn(gameService, "getAll").mockReturnValue(new Promise(() => {}));
  vi.spyOn(cardService, "getAll").mockReturnValue(new Promise(() => {}));

  renderHome();

  expect(screen.queryByText("0")).not.toBeInTheDocument();
  expect(screen.getAllByText("—")).toHaveLength(6);
});

test("Most Goals lists the top 3 scorers with their totals (AC DASH-05.1)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([
    {
      id: 1,
      club: "Amadora",
      name: "Sub-11",
      players: [
        { id: 1, name: "Ana", goals: 10 },
        { id: 2, name: "Beatriz", goals: 5 },
        { id: 3, name: "Carla", goals: 1 },
        { id: 4, name: "Diana", goals: 0 },
      ],
    },
  ]);
  vi.spyOn(trainingService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(gameService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(cardService, "getAll").mockResolvedValueOnce([]);

  renderHome();

  const tile = within(getTile("Most Goals"));
  await tile.findByText("1. Ana");
  expect(tile.getByText("10")).toBeInTheDocument();
  expect(tile.getByText("2. Beatriz")).toBeInTheDocument();
  expect(tile.getByText("3. Carla")).toBeInTheDocument();
  expect(tile.queryByText(/Diana/)).not.toBeInTheDocument();
});

test("Most Games shows games played per team, labelled as team appearances (AC DASH-05.2)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([
    { id: 1, club: "Amadora", name: "Sub-11", players: [] },
  ]);
  vi.spyOn(trainingService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(gameService, "getAll").mockResolvedValueOnce([
    { id: 1, teamId: 1, usScore: 1, themScore: 0 },
    { id: 2, teamId: 1, usScore: 0, themScore: 2 },
  ]);
  vi.spyOn(cardService, "getAll").mockResolvedValueOnce([]);

  renderHome();

  const tile = within(getTile("Most Games"));
  await tile.findByText("1. Amadora Sub-11");
  expect(tile.getByText("2")).toBeInTheDocument();
  expect(
    tile.getByText("Team appearances, not individual")
  ).toBeInTheDocument();
});

test("Most Cards lists the top 3 with yellows and reds shown separately (AC DASH-05.3)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([
    {
      id: 1,
      club: "Amadora",
      name: "Sub-11",
      players: [{ id: 1, name: "Ana" }],
    },
  ]);
  vi.spyOn(trainingService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(gameService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(cardService, "getAll").mockResolvedValueOnce([
    { id: 1, playerId: 1, gameId: 1, type: "yellow" },
    { id: 2, playerId: 1, gameId: 1, type: "yellow" },
    { id: 3, playerId: 1, gameId: 2, type: "red" },
  ]);

  renderHome();

  const tile = within(getTile("Most Cards"));
  await tile.findByText("1. Ana");
  expect(tile.getByText("2Y / 1R")).toBeInTheDocument();
});

test("all-zero data renders the empty state, not three players tied on zero (edge case)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([
    {
      id: 1,
      club: "Amadora",
      name: "Sub-11",
      players: [
        { id: 1, name: "Ana", goals: 0 },
        { id: 2, name: "Beatriz", goals: 0 },
      ],
    },
  ]);
  vi.spyOn(trainingService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(gameService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(cardService, "getAll").mockResolvedValueOnce([]);

  renderHome();

  await screen.findByText("Most Goals");
  expect(within(getTile("Most Goals")).getByText("No data yet")).toBeInTheDocument();
  expect(within(getTile("Most Games")).getByText("No data yet")).toBeInTheDocument();
  expect(within(getTile("Most Cards")).getByText("No data yet")).toBeInTheDocument();
});

test("ties render every tied player (AC DASH-05.4)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([
    {
      id: 1,
      club: "Amadora",
      name: "Sub-11",
      players: [
        { id: 1, name: "Ana", goals: 5 },
        { id: 2, name: "Beatriz", goals: 5 },
        { id: 3, name: "Carla", goals: 2 },
      ],
    },
  ]);
  vi.spyOn(trainingService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(gameService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(cardService, "getAll").mockResolvedValueOnce([]);

  renderHome();

  const tile = within(getTile("Most Goals"));
  await tile.findByText("1. Ana");
  expect(tile.getByText("1. Beatriz")).toBeInTheDocument();
});
