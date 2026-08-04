import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NextGameCard from "../NextGameCard";

function baseGame(overrides = {}) {
  return {
    id: "g1",
    opponent: "Benfica",
    isHome: true,
    date: new Date(2027, 0, 16, 15, 0),
    competition: "District League",
    ...overrides,
  };
}

test("shows the opponent and home/away prefix (AC GLAY-04.2)", () => {
  render(<NextGameCard game={baseGame({ isHome: true })} onSelect={() => {}} />);

  expect(screen.getByText("vs Benfica")).toBeInTheDocument();
});

test("shows the away prefix for an away fixture (AC GLAY-04.2)", () => {
  render(<NextGameCard game={baseGame({ isHome: false })} onSelect={() => {}} />);

  expect(screen.getByText("@ Benfica")).toBeInTheDocument();
});

test("shows the date and time (AC GLAY-04.2)", () => {
  const game = baseGame({ date: new Date(2027, 0, 16, 15, 0) });
  render(<NextGameCard game={game} onSelect={() => {}} />);

  expect(screen.getByText(game.date.toLocaleString())).toBeInTheDocument();
});

test("shows the competition (AC GLAY-04.2)", () => {
  render(<NextGameCard game={baseGame({ competition: "Cup" })} onSelect={() => {}} />);

  expect(screen.getByText("Cup")).toBeInTheDocument();
});

test("a missing competition renders nothing in that slot rather than an empty separator", () => {
  const { container } = render(
    <NextGameCard game={baseGame({ competition: undefined })} onSelect={() => {}} />
  );

  expect(container.textContent).not.toMatch(/undefined/);
  expect(screen.queryByText("District League")).not.toBeInTheDocument();
});

test("renders the team name only when given (no-filter case) (AC GLAY-04.2)", () => {
  render(<NextGameCard game={baseGame()} teamName="Amadora Sub-11" onSelect={() => {}} />);

  expect(screen.getByText("Amadora Sub-11")).toBeInTheDocument();
});

test("renders no team name when none is given (team filter active)", () => {
  const { container } = render(<NextGameCard game={baseGame()} onSelect={() => {}} />);

  expect(container.textContent).not.toContain("Amadora");
});

test("with no game, renders the explicit empty state (AC GLAY-04.3)", () => {
  render(<NextGameCard game={null} onSelect={() => {}} />);

  expect(screen.getByText("No upcoming games")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("is a focusable control (AC GLAY-04.5)", async () => {
  const user = userEvent.setup();
  render(<NextGameCard game={baseGame()} onSelect={() => {}} />);

  await user.tab();

  expect(screen.getByRole("button")).toHaveFocus();
});

test("clicking the card fires onSelect with the game (AC GLAY-04.5)", async () => {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  const game = baseGame();
  render(<NextGameCard game={game} onSelect={onSelect} />);

  await user.click(screen.getByRole("button"));

  expect(onSelect).toHaveBeenCalledExactlyOnceWith(game);
});

test("pressing Enter while focused fires onSelect (AC GLAY-04.5)", async () => {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  const game = baseGame();
  render(<NextGameCard game={game} onSelect={onSelect} />);

  screen.getByRole("button").focus();
  await user.keyboard("{Enter}");

  expect(onSelect).toHaveBeenCalledExactlyOnceWith(game);
});

test("is visually distinct from a GameRow via its own bordered rounded-2xl surface, not GameRow's plain rounded li", () => {
  render(<NextGameCard game={baseGame()} onSelect={() => {}} />);

  const card = screen.getByRole("button");
  expect(card.className).toMatch(/\bborder-2\b/);
  expect(card.className).toMatch(/\brounded-2xl\b/);
});
