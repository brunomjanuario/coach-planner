import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GameRow from "../GameRow";

const scheduledGame = {
  id: "g1",
  teamId: 1,
  opponent: "Benfica",
  date: new Date(2027, 5, 15, 14, 30),
  isHome: true,
  competition: "League",
  usScore: null,
  themScore: null,
};

test("renders the opponent (AC GAME-04.5)", () => {
  render(<GameRow game={scheduledGame} />);

  expect(screen.getByText(/Benfica/)).toBeInTheDocument();
});

test("renders a locale-formatted date (AC GAME-04.5)", () => {
  render(<GameRow game={scheduledGame} />);

  expect(
    screen.getByText(scheduledGame.date.toLocaleString())
  ).toBeInTheDocument();
});

test("renders a home indicator for a home game (AC GAME-04.5)", () => {
  render(<GameRow game={scheduledGame} />);

  expect(screen.getByText(/vs Benfica/)).toBeInTheDocument();
});

test("renders an away indicator for an away game (AC GAME-04.5)", () => {
  render(<GameRow game={{ ...scheduledGame, isHome: false }} />);

  expect(screen.getByText(/@ Benfica/)).toBeInTheDocument();
});

test("does not render a scoreline for a scheduled game with no result", () => {
  const { container } = render(<GameRow game={scheduledGame} />);

  expect(container.textContent).not.toMatch(/–/);
});

test("a played game additionally renders the scoreline (AC GAME-04.6)", () => {
  const playedGame = { ...scheduledGame, usScore: 2, themScore: 1 };

  render(<GameRow game={playedGame} />);

  expect(screen.getByText("2–1")).toBeInTheDocument();
});

test("a played game shows a win/draw/loss indicator derived from the scores, never from a stored field (AC GAME-06.3)", () => {
  const playedGame = {
    ...scheduledGame,
    usScore: 3,
    themScore: 1,
    outcome: "loss", // a bogus stored field that must be ignored
  };

  render(<GameRow game={playedGame} />);

  expect(screen.getByText("win")).toBeInTheDocument();
  expect(screen.queryByText("loss")).not.toBeInTheDocument();
});

test("a 0-0 game renders as a draw, not as unplayed (null-vs-zero edge case)", () => {
  const drawGame = { ...scheduledGame, usScore: 0, themScore: 0 };

  render(<GameRow game={drawGame} />);

  expect(screen.getByText("0–0")).toBeInTheDocument();
  expect(screen.getByText("draw")).toBeInTheDocument();
});

test("a very long opponent name renders with wrapping styling rather than breaking the row (edge case)", () => {
  const longOpponent =
    "A Very Long Football Club Name That Could Otherwise Break The Layout";

  render(<GameRow game={{ ...scheduledGame, opponent: longOpponent }} />);

  const opponentText = screen.getByText(new RegExp(longOpponent));
  expect(opponentText).toHaveClass("break-words");
});

test("renders 'Invalid date' rather than crashing when the game's date is invalid", () => {
  render(<GameRow game={{ ...scheduledGame, date: new Date("not-a-date") }} />);

  expect(screen.getByText("Invalid date")).toBeInTheDocument();
});

test("clicking the row calls onSelect with the game", async () => {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  render(<GameRow game={scheduledGame} onSelect={onSelect} />);

  await user.click(screen.getByText(/Benfica/));

  expect(onSelect).toHaveBeenCalledWith(scheduledGame);
});
