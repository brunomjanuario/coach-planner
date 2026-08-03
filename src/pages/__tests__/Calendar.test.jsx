import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import Calendar from "../Calendar";
import { trainingService } from "../../services/trainingService";
import { gameService } from "../../services/gameService";
import { teamService } from "../../services/teamService";

afterEach(() => {
  vi.restoreAllMocks();
});

const teams = [{ id: 1, club: "Amadora", name: "Sub-11" }];

function mockData({ trainings = [], games = [] } = {}) {
  vi.spyOn(trainingService, "getAll").mockResolvedValue(trainings);
  vi.spyOn(gameService, "getAll").mockResolvedValue(games);
  vi.spyOn(teamService, "getAll").mockResolvedValue(teams);
}

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderCalendar() {
  return render(
    <MemoryRouter initialEntries={["/calendar"]}>
      <Routes>
        <Route path="/calendar" element={<Calendar />} />
        <Route path="*" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>
  );
}

test("renders a training on its correct day cell with time and a team + type label (AC CAL-01.2)", async () => {
  const today = new Date();
  mockData({
    trainings: [
      {
        id: 1,
        teamId: 1,
        day: new Date(today.getFullYear(), today.getMonth(), 14, 9, 0),
        duration: 60,
      },
    ],
  });

  renderCalendar();

  await waitFor(() => screen.getByText(/09:00/));
  expect(screen.getByText(/Amadora Sub-11/)).toBeInTheDocument();
  expect(screen.getByText(/Training/)).toBeInTheDocument();
});

test("renders a training and a game on the same day, visually distinguished by type (AC CAL-01.3)", async () => {
  const day = new Date();
  mockData({
    trainings: [{ id: 1, teamId: 1, day: new Date(day.getFullYear(), day.getMonth(), 15, 9, 0), duration: 60 }],
    games: [{ id: 2, teamId: 1, opponent: "Benfica", date: new Date(day.getFullYear(), day.getMonth(), 15, 18, 0) }],
  });

  const { container } = renderCalendar();

  await waitFor(() => screen.getByText(/09:00/));
  const trainingEvent = screen.getByText(/09:00/).closest("button, div");
  const gameEvent = screen.getByText(/18:00/).closest("button, div");

  expect(trainingEvent.className).not.toBe(gameEvent.className);
  expect(container.textContent).toMatch(/vs Benfica/);
});

test("shows no event content on a day with no events (AC CAL-01.4)", async () => {
  mockData();

  renderCalendar();

  await waitFor(() => expect(trainingService.getAll).toHaveBeenCalled());
  const today = new Date();
  const dayCell = screen.getByText(String(today.getDate())).closest("div");
  expect(dayCell.textContent).toBe(String(today.getDate()));
});

test("recomputes events when the month is changed (AC CAL-01.5)", async () => {
  const user = userEvent.setup();
  const today = new Date();
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 10, 12, 0);
  mockData({
    trainings: [{ id: 1, teamId: 1, day: nextMonthDate, duration: 60 }],
  });

  renderCalendar();
  await waitFor(() => expect(trainingService.getAll).toHaveBeenCalled());

  expect(screen.queryByText(/12:00/)).not.toBeInTheDocument();

  await user.click(screen.getByText(">"));

  await waitFor(() => expect(screen.getByText(/12:00/)).toBeInTheDocument());
});

test("shows the first three events plus a '+N more' indicator when a day has more than three (edge case)", async () => {
  const today = new Date();
  const day = new Date(today.getFullYear(), today.getMonth(), 10);
  mockData({
    trainings: [
      { id: 1, teamId: 1, day: new Date(day.getTime()), duration: 60 },
      { id: 2, teamId: 1, day: new Date(day.getTime() + 3600_000), duration: 60 },
      { id: 3, teamId: 1, day: new Date(day.getTime() + 7200_000), duration: 60 },
      { id: 4, teamId: 1, day: new Date(day.getTime() + 10800_000), duration: 60 },
    ],
  });

  renderCalendar();

  await waitFor(() => expect(screen.getByText("+1 more")).toBeInTheDocument());
});

test("renders the grid normally for a month with no events at all (edge case)", async () => {
  mockData();

  renderCalendar();

  await waitFor(() => expect(trainingService.getAll).toHaveBeenCalled());
  expect(screen.getByText("Sun")).toBeInTheDocument();
  expect(screen.getAllByText("Mon").length).toBeGreaterThan(0);
});

test("does not render the removed mockEvents fixture data (AC CAL-01.6)", async () => {
  mockData();

  renderCalendar();

  await waitFor(() => expect(trainingService.getAll).toHaveBeenCalled());
  expect(screen.queryByText(/Match vs Tigers/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Morning Training/)).not.toBeInTheDocument();
});

test("clicking a training event navigates to /trainings?training=<id> (AC CAL-04.1)", async () => {
  const user = userEvent.setup();
  const today = new Date();
  mockData({
    trainings: [
      { id: 42, teamId: 1, day: new Date(today.getFullYear(), today.getMonth(), 14, 9, 0), duration: 60 },
    ],
  });

  renderCalendar();

  await user.click(await screen.findByText(/09:00/));

  expect(await screen.findByTestId("location")).toHaveTextContent(
    "/trainings?training=42"
  );
});

test("clicking a game event navigates to /games?game=<id> (AC CAL-04.2)", async () => {
  const user = userEvent.setup();
  const today = new Date();
  mockData({
    games: [
      {
        id: 7,
        teamId: 1,
        opponent: "Benfica",
        date: new Date(today.getFullYear(), today.getMonth(), 14, 18, 0),
      },
    ],
  });

  renderCalendar();

  await user.click(await screen.findByText(/18:00/));

  expect(await screen.findByTestId("location")).toHaveTextContent(
    "/games?game=7"
  );
});

test("activating an event with the keyboard (Enter) navigates identically to a click (AC CAL-04.5)", async () => {
  const user = userEvent.setup();
  const today = new Date();
  mockData({
    trainings: [
      { id: 42, teamId: 1, day: new Date(today.getFullYear(), today.getMonth(), 14, 9, 0), duration: 60 },
    ],
  });

  renderCalendar();

  const eventButton = (await screen.findByText(/09:00/)).closest("button");
  eventButton.focus();
  await user.keyboard("{Enter}");

  expect(await screen.findByTestId("location")).toHaveTextContent(
    "/trainings?training=42"
  );
});

test("activating an event with the keyboard (Space) navigates identically to a click (AC CAL-04.5)", async () => {
  const user = userEvent.setup();
  const today = new Date();
  mockData({
    games: [
      {
        id: 7,
        teamId: 1,
        opponent: "Benfica",
        date: new Date(today.getFullYear(), today.getMonth(), 14, 18, 0),
      },
    ],
  });

  renderCalendar();

  const eventButton = (await screen.findByText(/18:00/)).closest("button");
  eventButton.focus();
  await user.keyboard(" ");

  expect(await screen.findByTestId("location")).toHaveTextContent(
    "/games?game=7"
  );
});

test("each event is a real focusable button control with an accessible name, not a bare div", async () => {
  const today = new Date();
  mockData({
    trainings: [
      { id: 42, teamId: 1, day: new Date(today.getFullYear(), today.getMonth(), 14, 9, 0), duration: 60 },
    ],
  });

  renderCalendar();

  const eventButton = await screen.findByRole("button", {
    name: /Amadora Sub-11/,
  });
  expect(eventButton.tagName).toBe("BUTTON");
});

test("clicking the day cell background does not navigate", async () => {
  const user = userEvent.setup();
  const today = new Date();
  mockData({
    trainings: [
      { id: 42, teamId: 1, day: new Date(today.getFullYear(), today.getMonth(), 14, 9, 0), duration: 60 },
    ],
  });

  renderCalendar();
  await screen.findByText(/09:00/);

  await user.click(screen.getByText("14"));

  expect(screen.queryByTestId("location")).not.toBeInTheDocument();
});
