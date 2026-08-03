import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import Home from "../Home";
import { teamService } from "../../services/teamService";
import { trainingService } from "../../services/trainingService";
import { gameService } from "../../services/gameService";
import { cardService } from "../../services/cardService";
import { ratingService } from "../../services/ratingService";

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

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderHomeWithLocation() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<LocationDisplay />} />
      </Routes>
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
  vi.spyOn(ratingService, "getAll").mockResolvedValueOnce([]);

  renderHome();

  await waitFor(() => {
    expect(screen.getAllByText("No data yet")).toHaveLength(7);
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

test("preserves the 3-column grid layout, grown to fit the added tiles", async () => {
  const { container } = renderHome();
  await screen.findByText("Teams");

  const grid = container.querySelector(".grid");
  expect(grid.className).toContain("grid-cols-3");
  expect(grid.children).toHaveLength(8);
});

test("renders a loading placeholder rather than 0 before the initial load resolves (edge case)", () => {
  vi.spyOn(teamService, "getAll").mockReturnValue(new Promise(() => {}));
  vi.spyOn(trainingService, "getAll").mockReturnValue(new Promise(() => {}));
  vi.spyOn(gameService, "getAll").mockReturnValue(new Promise(() => {}));
  vi.spyOn(cardService, "getAll").mockReturnValue(new Promise(() => {}));
  vi.spyOn(ratingService, "getAll").mockReturnValue(new Promise(() => {}));

  renderHome();

  expect(screen.queryByText("0")).not.toBeInTheDocument();
  expect(screen.getAllByText("—")).toHaveLength(8);
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

test("shows the soonest future event with date, time, type and team (AC DASH-06.1)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([
    { id: 1, club: "Amadora", name: "Sub-11", players: [] },
  ]);
  vi.spyOn(trainingService, "getAll").mockResolvedValueOnce([
    {
      id: 42,
      teamId: 1,
      day: new Date(Date.now() + 86_400_000),
      duration: 60,
    },
  ]);
  vi.spyOn(gameService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(cardService, "getAll").mockResolvedValueOnce([]);

  renderHome();

  await screen.findByText(/Training · Amadora Sub-11/);
});

test("picks the sooner of a training and a game (AC DASH-06.2)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([
    { id: 1, club: "Amadora", name: "Sub-11", players: [] },
  ]);
  vi.spyOn(trainingService, "getAll").mockResolvedValueOnce([
    { id: 1, teamId: 1, day: new Date(Date.now() + 7 * 86_400_000), duration: 60 },
  ]);
  vi.spyOn(gameService, "getAll").mockResolvedValueOnce([
    {
      id: 1,
      teamId: 1,
      opponent: "Benfica",
      date: new Date(Date.now() + 86_400_000),
    },
  ]);
  vi.spyOn(cardService, "getAll").mockResolvedValueOnce([]);

  renderHome();

  await screen.findByText(/vs Benfica/);
});

test("clicking the next-event tile navigates to the record via ?training= or ?game= (AC DASH-06.3)", async () => {
  const user = userEvent.setup();
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([
    { id: 1, club: "Amadora", name: "Sub-11", players: [] },
  ]);
  vi.spyOn(trainingService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(gameService, "getAll").mockResolvedValueOnce([
    {
      id: 99,
      teamId: 1,
      opponent: "Benfica",
      date: new Date(Date.now() + 86_400_000),
    },
  ]);
  vi.spyOn(cardService, "getAll").mockResolvedValueOnce([]);

  renderHomeWithLocation();

  const link = await screen.findByRole("link", { name: /Next Event/ });
  await user.click(link);

  expect(await screen.findByTestId("location")).toHaveTextContent(
    "/games?game=99"
  );
});

test("shows a message linking to the calendar when no future events exist (AC DASH-06.4)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(trainingService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(gameService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(cardService, "getAll").mockResolvedValueOnce([]);

  renderHome();

  const tile = within(getTile("Next Event"));
  await tile.findByText("No upcoming events");
  expect(tile.getByRole("link", { name: "View calendar" })).toHaveAttribute(
    "href",
    "/calendar"
  );
});

test("the next-event tile is keyboard-activatable", async () => {
  const user = userEvent.setup();
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([
    { id: 1, club: "Amadora", name: "Sub-11", players: [] },
  ]);
  vi.spyOn(trainingService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(gameService, "getAll").mockResolvedValueOnce([
    {
      id: 99,
      teamId: 1,
      opponent: "Benfica",
      date: new Date(Date.now() + 86_400_000),
    },
  ]);
  vi.spyOn(cardService, "getAll").mockResolvedValueOnce([]);

  renderHomeWithLocation();

  const link = await screen.findByRole("link", { name: /Next Event/ });
  link.focus();
  await user.keyboard("{Enter}");

  expect(await screen.findByTestId("location")).toHaveTextContent(
    "/games?game=99"
  );
});

test("Top Rated lists the top 3 players by average rating, to one decimal (AC DASH-07.1)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([
    {
      id: 1,
      club: "Amadora",
      name: "Sub-11",
      players: [
        { id: 1, name: "Ana" },
        { id: 2, name: "Beatriz" },
      ],
    },
  ]);
  vi.spyOn(trainingService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(gameService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(cardService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(ratingService, "getAll").mockResolvedValueOnce([
    { playerId: 1, value: 8 },
    { playerId: 1, value: 7 },
    { playerId: 2, value: 4 },
  ]);

  renderHome();

  const tile = within(getTile("Top Rated"));
  await tile.findByText("1. Ana");
  expect(tile.getByText("7.5")).toBeInTheDocument();
});

test("excludes an unrated player rather than ranking them as 0 (AC DASH-07.2)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([
    {
      id: 1,
      club: "Amadora",
      name: "Sub-11",
      players: [
        { id: 1, name: "Ana" },
        { id: 2, name: "Beatriz" },
      ],
    },
  ]);
  vi.spyOn(trainingService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(gameService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(cardService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(ratingService, "getAll").mockResolvedValueOnce([
    { playerId: 1, value: 6 },
  ]);

  renderHome();

  const tile = within(getTile("Top Rated"));
  await tile.findByText("1. Ana");
  expect(tile.queryByText(/Beatriz/)).not.toBeInTheDocument();
});

test("no ratings renders the empty state (AC DASH-07.3)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([
    { id: 1, club: "Amadora", name: "Sub-11", players: [{ id: 1, name: "Ana" }] },
  ]);
  vi.spyOn(trainingService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(gameService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(cardService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(ratingService, "getAll").mockResolvedValueOnce([]);

  renderHome();

  await screen.findByText("Top Rated");
  expect(within(getTile("Top Rated")).getByText("No data yet")).toBeInTheDocument();
});

function mockTwoTeamsFixture() {
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([
    {
      id: 1,
      club: "Amadora",
      name: "Sub-11",
      players: [{ id: 1, name: "Ana", goals: 5 }],
    },
    {
      id: 2,
      club: "Areias",
      name: "Sub-19",
      players: [{ id: 2, name: "Beatriz", goals: 3 }],
    },
  ]);
  vi.spyOn(trainingService, "getAll").mockResolvedValueOnce([
    { id: 1, teamId: 1, day: new Date(Date.now() + 86_400_000), duration: 60 },
    { id: 2, teamId: 2, day: new Date(Date.now() + 86_400_000), duration: 60 },
    { id: 3, teamId: null, day: new Date(Date.now() + 86_400_000), duration: 60 },
  ]);
  vi.spyOn(gameService, "getAll").mockResolvedValueOnce([
    { id: 1, teamId: 1, usScore: 1, themScore: 0 },
    { id: 2, teamId: 2, usScore: 2, themScore: 2 },
  ]);
  vi.spyOn(cardService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(ratingService, "getAll").mockResolvedValueOnce([]);
}

test("selecting a team recomputes every tile for that team only (AC DASH-08.1)", async () => {
  const user = userEvent.setup();
  mockTwoTeamsFixture();
  renderHome();
  await screen.findByText("Teams");

  await user.selectOptions(screen.getByLabelText("Team"), "1");

  expect(within(getTile("Teams")).getByText("1")).toBeInTheDocument();
  expect(within(getTile("Training")).getByText("0 past · 1 upcoming")).toBeInTheDocument();
  const goalsTile = within(getTile("Most Goals"));
  expect(goalsTile.getByText("1. Ana")).toBeInTheDocument();
  expect(goalsTile.queryByText(/Beatriz/)).not.toBeInTheDocument();
});

test("clearing the filter recomputes across all teams (AC DASH-08.2)", async () => {
  const user = userEvent.setup();
  mockTwoTeamsFixture();
  renderHome();
  await screen.findByText("Teams");

  await user.selectOptions(screen.getByLabelText("Team"), "1");
  expect(within(getTile("Teams")).getByText("1")).toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText("Team"), "");

  expect(within(getTile("Teams")).getByText("2")).toBeInTheDocument();
  const goalsTile = within(getTile("Most Goals"));
  expect(goalsTile.getByText("1. Ana")).toBeInTheDocument();
  expect(goalsTile.getByText("2. Beatriz")).toBeInTheDocument();
});

test("a team with no data selected shows every tile's empty state, never stale figures (AC DASH-08.3)", async () => {
  const user = userEvent.setup();
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([
    { id: 1, club: "Amadora", name: "Sub-11", players: [{ id: 1, name: "Ana", goals: 5 }] },
    { id: 2, club: "Zero", name: "Team", players: [] },
  ]);
  vi.spyOn(trainingService, "getAll").mockResolvedValueOnce([
    { id: 1, teamId: 1, day: new Date(Date.now() + 86_400_000), duration: 60 },
  ]);
  vi.spyOn(gameService, "getAll").mockResolvedValueOnce([
    { id: 1, teamId: 1, usScore: 1, themScore: 0 },
  ]);
  vi.spyOn(cardService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(ratingService, "getAll").mockResolvedValueOnce([]);

  renderHome();
  await screen.findByText("Teams");

  await user.selectOptions(screen.getByLabelText("Team"), "2");

  expect(within(getTile("Training")).getByText("No data yet")).toBeInTheDocument();
  expect(within(getTile("Games")).getByText("No data yet")).toBeInTheDocument();
  expect(within(getTile("Most Goals")).getByText("No data yet")).toBeInTheDocument();
  expect(within(getTile("Most Games")).getByText("No data yet")).toBeInTheDocument();
  expect(within(getTile("Most Cards")).getByText("No data yet")).toBeInTheDocument();
  expect(within(getTile("Top Rated")).getByText("No data yet")).toBeInTheDocument();
  expect(screen.getByText("No upcoming events")).toBeInTheDocument();
});

test("filter changes recompute without re-fetching or reloading (AC DASH-08.4)", async () => {
  const user = userEvent.setup();
  mockTwoTeamsFixture();
  renderHome();
  await screen.findByText("Teams");

  expect(teamService.getAll).toHaveBeenCalledTimes(1);

  await user.selectOptions(screen.getByLabelText("Team"), "1");
  await within(getTile("Teams")).findByText("1");

  expect(teamService.getAll).toHaveBeenCalledTimes(1);
});

test("excludes an unassigned training when filtered, counts it when unfiltered (edge case)", async () => {
  const user = userEvent.setup();
  mockTwoTeamsFixture();
  renderHome();
  await screen.findByText("Teams");

  expect(within(getTile("Training")).getByText("3")).toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText("Team"), "1");

  expect(within(getTile("Training")).getByText("1")).toBeInTheDocument();
});

test("excludes a player whose team has been deleted from the leader tiles (edge case)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([
    {
      id: 1,
      club: "Amadora",
      name: "Sub-11",
      players: [{ id: 1, name: "Ana", goals: 10 }],
    },
  ]);
  vi.spyOn(trainingService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(gameService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(cardService, "getAll").mockResolvedValueOnce([
    { id: 1, playerId: 99, gameId: 1, type: "yellow" },
  ]);
  vi.spyOn(ratingService, "getAll").mockResolvedValueOnce([
    { playerId: 99, value: 8 },
  ]);

  renderHome();

  await screen.findByText("Most Goals");
  expect(within(getTile("Most Goals")).getByText("1. Ana")).toBeInTheDocument();
  expect(within(getTile("Most Cards")).getByText("No data yet")).toBeInTheDocument();
  expect(within(getTile("Top Rated")).getByText("No data yet")).toBeInTheDocument();
});
