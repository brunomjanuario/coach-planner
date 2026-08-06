import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import Calendar from "../Calendar";
import { trainingService } from "../../services/trainingService";
import { gameService } from "../../services/gameService";
import { teamService } from "../../services/teamService";
import { EVENT_STYLES } from "../../lib/calendarEvents";

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

  const chip = (await screen.findByText(/09:00/)).closest("button");
  expect(within(chip).getByText(/Amadora Sub-11/)).toBeInTheDocument();
  expect(within(chip).getByText(/Training/)).toBeInTheDocument();
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

test("a game chip renders the orange event style (AC CALCOL-01.1)", async () => {
  const today = new Date();
  mockData({
    games: [
      { id: 7, teamId: 1, opponent: "Benfica", date: new Date(today.getFullYear(), today.getMonth(), 14, 18, 0) },
    ],
  });

  renderCalendar();

  const gameButton = (await screen.findByText(/18:00/)).closest("button");
  expect(gameButton.className).toContain("bg-orange-200");
  expect(gameButton.className).toContain("border-orange-600");
  expect(gameButton.className).toContain("text-orange-900");
});

test("a training chip renders the blue event style (AC CALCOL-01.2)", async () => {
  const today = new Date();
  mockData({
    trainings: [
      { id: 42, teamId: 1, day: new Date(today.getFullYear(), today.getMonth(), 14, 9, 0), duration: 60 },
    ],
  });

  renderCalendar();

  const trainingButton = (await screen.findByText(/09:00/)).closest("button");
  expect(trainingButton.className).toContain("bg-blue-200");
  expect(trainingButton.className).toContain("border-blue-600");
  expect(trainingButton.className).toContain("text-blue-900");
});

test("both a game and a training chip render a type-coloured left border (AC CALCOL-01.3)", async () => {
  const day = new Date();
  mockData({
    trainings: [{ id: 1, teamId: 1, day: new Date(day.getFullYear(), day.getMonth(), 15, 9, 0), duration: 60 }],
    games: [{ id: 2, teamId: 1, opponent: "Benfica", date: new Date(day.getFullYear(), day.getMonth(), 15, 18, 0) }],
  });

  renderCalendar();

  const trainingButton = (await screen.findByText(/09:00/)).closest("button");
  const gameButton = (await screen.findByText(/18:00/)).closest("button");
  expect(trainingButton.className).toMatch(/border-l-4/);
  expect(trainingButton.className).toContain("border-blue-600");
  expect(gameButton.className).toMatch(/border-l-4/);
  expect(gameButton.className).toContain("border-orange-600");
});

test("a training chip's accessible name includes its type, time and title (AC CALCOL-01.5)", async () => {
  const today = new Date();
  mockData({
    trainings: [
      { id: 42, teamId: 1, day: new Date(today.getFullYear(), today.getMonth(), 14, 9, 0), duration: 60 },
    ],
  });

  renderCalendar();

  const button = await screen.findByRole("button", { name: /Training/ });
  expect(button).toHaveAccessibleName(/Training/);
  expect(button).toHaveAccessibleName(/09:00/);
  expect(button).toHaveAccessibleName(/Training/);
});

test("a game chip's accessible name includes its type, time and title (AC CALCOL-01.5)", async () => {
  const today = new Date();
  mockData({
    games: [
      { id: 7, teamId: 1, opponent: "Benfica", date: new Date(today.getFullYear(), today.getMonth(), 14, 18, 0) },
    ],
  });

  renderCalendar();

  const button = await screen.findByRole("button", { name: /Game/ });
  expect(button).toHaveAccessibleName(/Game/);
  expect(button).toHaveAccessibleName(/18:00/);
  expect(button).toHaveAccessibleName(/vs Benfica/);
});

test("the '+N more' indicator carries no event colour (edge case)", async () => {
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

  const moreIndicator = await screen.findByText("+1 more");
  expect(moreIndicator.className).not.toMatch(/bg-(orange|blue|gray)-\d/);
  expect(moreIndicator.className).not.toMatch(/border-(orange|blue|gray)-\d/);
});

test("an event chip on today's cell stays distinguishable from the today highlight (edge case)", async () => {
  const today = new Date();
  mockData({
    trainings: [
      { id: 42, teamId: 1, day: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0), duration: 60 },
    ],
  });

  renderCalendar();

  const chip = (await screen.findByText(/09:00/)).closest("button");
  const cell = chip.closest("div.h-25");
  expect(cell.className).toContain("bg-blue-50");
  expect(chip.className).toContain("bg-blue-200");
  expect(chip.className).not.toContain("bg-blue-50");
});

test("a hovered or focused chip keeps its type colour classes (edge case)", async () => {
  const today = new Date();
  mockData({
    games: [
      { id: 7, teamId: 1, opponent: "Benfica", date: new Date(today.getFullYear(), today.getMonth(), 14, 18, 0) },
    ],
  });

  renderCalendar();

  const chip = (await screen.findByText(/18:00/)).closest("button");
  chip.focus();
  expect(chip.className).toContain("bg-orange-200");
  expect(chip.className).toContain("border-orange-600");
  expect(chip.className).not.toMatch(/hover:bg-|focus:bg-/);
});

test("a chip with a long title truncates without losing its colour or border (edge case)", async () => {
  const today = new Date();
  mockData({
    games: [
      {
        id: 7,
        teamId: 1,
        opponent: "A Very Long Opponent Name That Should Truncate Instead Of Wrapping",
        date: new Date(today.getFullYear(), today.getMonth(), 14, 18, 0),
      },
    ],
  });

  renderCalendar();

  const chip = (await screen.findByText(/18:00/)).closest("button");
  expect(chip.className).toContain("truncate");
  expect(chip.className).toContain("bg-orange-200");
  expect(chip.className).toContain("border-orange-600");
});

test("the header renders a labelled swatch per mapped event type, coloured to match (AC CALCOL-04.1)", async () => {
  mockData();

  renderCalendar();

  await waitFor(() => expect(trainingService.getAll).toHaveBeenCalled());
  const legend = screen.getByLabelText("Event type legend");
  const items = within(legend).getAllByRole("listitem");
  expect(items).toHaveLength(2);

  const gameItem = within(legend).getByText("Game").closest("li");
  const gameSwatch = gameItem.querySelector("span[aria-hidden='true']");
  expect(gameSwatch.className).toContain("bg-orange-200");
  expect(gameSwatch.className).toContain("border-orange-600");

  const trainingItem = within(legend).getByText("Training").closest("li");
  const trainingSwatch = trainingItem.querySelector("span[aria-hidden='true']");
  expect(trainingSwatch.className).toContain("bg-blue-200");
  expect(trainingSwatch.className).toContain("border-blue-600");
});

test("adding a mapping entry adds a third legend item with no change to the page (AC CALCOL-04.3)", async () => {
  mockData();
  EVENT_STYLES.tournament = {
    label: "Tournament",
    background: "bg-purple-200",
    border: "border-purple-600",
    text: "text-purple-900",
  };

  try {
    renderCalendar();

    await waitFor(() => expect(trainingService.getAll).toHaveBeenCalled());
    const legend = screen.getByLabelText("Event type legend");
    expect(within(legend).getAllByRole("listitem")).toHaveLength(3);
    expect(within(legend).getByText("Tournament")).toBeInTheDocument();
  } finally {
    delete EVENT_STYLES.tournament;
  }
});

test("the neutral fallback is not listed in the legend", async () => {
  mockData();

  renderCalendar();

  await waitFor(() => expect(trainingService.getAll).toHaveBeenCalled());
  const legend = screen.getByLabelText("Event type legend");
  expect(within(legend).queryByText("Event")).not.toBeInTheDocument();
  expect(within(legend).queryByText(/fallback/i)).not.toBeInTheDocument();
});

test("month navigation still works with the legend present", async () => {
  const user = userEvent.setup();
  const today = new Date();
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 10, 12, 0);
  mockData({
    trainings: [{ id: 1, teamId: 1, day: nextMonthDate, duration: 60 }],
  });

  renderCalendar();
  await waitFor(() => expect(trainingService.getAll).toHaveBeenCalled());
  screen.getByLabelText("Event type legend");

  expect(screen.queryByText(/12:00/)).not.toBeInTheDocument();
  await user.click(screen.getByText(">"));

  await waitFor(() => expect(screen.getByText(/12:00/)).toBeInTheDocument());
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

test("does not declare its own h-screen or min-h-screen — the app shell owns that (AC SHELL-03.1)", async () => {
  mockData();
  const { container } = renderCalendar();
  await screen.findByRole("heading", { level: 2 });

  expect(container.querySelector(".h-screen")).not.toBeInTheDocument();
  expect(container.querySelector(".min-h-screen")).not.toBeInTheDocument();
});

test("has no overflow-y-auto container of its own — the shell's <main> is the only scroll region (AC SHELL-03.2)", async () => {
  mockData();
  const { container } = renderCalendar();
  await screen.findByRole("heading", { level: 2 });

  expect(container.querySelector(".overflow-y-auto")).not.toBeInTheDocument();
});
