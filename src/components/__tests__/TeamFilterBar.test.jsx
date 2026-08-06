import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TeamFilterBar from "../TeamFilterBar";

const teams = [
  { id: 1, club: "Amadora", name: "Sub-11" },
  { id: 2, club: "Areias", name: "Sub-19" },
];

test("renders a group with an accessible name and one button per team plus All teams (AC DFILT-02.1)", () => {
  render(<TeamFilterBar teams={teams} activeTeamId={null} onChange={() => {}} />);

  expect(screen.getByRole("group", { name: /filter dashboard by team/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "All teams" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Amadora Sub-11" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Areias Sub-19" })).toBeInTheDocument();
});

test("exactly one chip is pressed at a time, others explicitly false (AC DFILT-02.2)", () => {
  render(<TeamFilterBar teams={teams} activeTeamId={1} onChange={() => {}} />);

  expect(screen.getByRole("button", { name: "Amadora Sub-11" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  expect(screen.getByRole("button", { name: "All teams" })).toHaveAttribute(
    "aria-pressed",
    "false"
  );
  expect(screen.getByRole("button", { name: "Areias Sub-19" })).toHaveAttribute(
    "aria-pressed",
    "false"
  );
});

test("activating a team chip calls onChange with that team's id (AC DFILT-02.3)", async () => {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<TeamFilterBar teams={teams} activeTeamId={null} onChange={onChange} />);

  await user.click(screen.getByRole("button", { name: "Areias Sub-19" }));

  expect(onChange).toHaveBeenCalledWith(2);
});

test("activating All teams calls onChange with null (AC DFILT-02.3)", async () => {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<TeamFilterBar teams={teams} activeTeamId={1} onChange={onChange} />);

  await user.click(screen.getByRole("button", { name: "All teams" }));

  expect(onChange).toHaveBeenCalledWith(null);
});

test("holds no selection state of its own — the parent owns it", () => {
  const onChange = vi.fn();
  const { rerender } = render(
    <TeamFilterBar teams={teams} activeTeamId={null} onChange={onChange} />
  );

  expect(screen.getByRole("button", { name: "All teams" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  rerender(<TeamFilterBar teams={teams} activeTeamId={1} onChange={onChange} />);

  expect(screen.getByRole("button", { name: "All teams" })).toHaveAttribute(
    "aria-pressed",
    "false"
  );
  expect(screen.getByRole("button", { name: "Amadora Sub-11" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
});

test("chips carry a visible focus ring and activate on Enter and Space (AC DFILT-02.7)", async () => {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<TeamFilterBar teams={teams} activeTeamId={null} onChange={onChange} />);

  const chip = screen.getByRole("button", { name: "Amadora Sub-11" });
  expect(chip.className).toMatch(/focus-visible:outline/);

  chip.focus();
  await user.keyboard("{Enter}");
  expect(onChange).toHaveBeenCalledWith(1);

  onChange.mockClear();
  chip.focus();
  await user.keyboard(" ");
  expect(onChange).toHaveBeenCalledWith(1);
});

test("carries a horizontal-scroll class and no chip is truncated (AC DFILT-04.1, DFILT-04.3)", () => {
  const { container } = render(
    <TeamFilterBar teams={teams} activeTeamId={null} onChange={() => {}} />
  );

  expect(container.firstChild.className).toMatch(/overflow-x-auto/);
  const chip = screen.getByRole("button", { name: "Amadora Sub-11" });
  expect(chip.className).not.toMatch(/truncate/);
});

test("with no teams, only All teams renders, pressed (edge case)", () => {
  render(<TeamFilterBar teams={[]} activeTeamId={null} onChange={() => {}} />);

  expect(screen.getAllByRole("button")).toHaveLength(1);
  expect(screen.getByRole("button", { name: "All teams" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
});

test("with one team, both chips render (edge case)", () => {
  render(
    <TeamFilterBar teams={[teams[0]]} activeTeamId={null} onChange={() => {}} />
  );

  expect(screen.getAllByRole("button")).toHaveLength(2);
});

test("a team with an empty name renders its club alone, with no trailing space (edge case)", () => {
  render(
    <TeamFilterBar
      teams={[{ id: 3, club: "Benfica", name: "" }]}
      activeTeamId={null}
      onChange={() => {}}
    />
  );

  const chip = screen.getByRole("button", { name: "Benfica" });
  expect(chip.textContent).toBe("Benfica");
});
