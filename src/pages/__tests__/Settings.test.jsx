import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Settings from "../Settings";
import { teamService } from "../../services/teamService";

const CONFIRM_MESSAGE =
  "Reset all data to the demo seed? This cannot be undone.";

test("renders a Reset demo data button", () => {
  render(<Settings />);

  expect(
    screen.getByRole("button", { name: "Reset demo data" })
  ).toBeInTheDocument();
});

test("clicking the button opens a confirmation popup without resetting anything yet", async () => {
  const user = userEvent.setup();
  await teamService.create({
    name: "Extra",
    club: "Extra",
    season: "24/25",
    players: [],
  });

  render(<Settings />);
  await user.click(screen.getByRole("button", { name: "Reset demo data" }));

  expect(screen.getByText(CONFIRM_MESSAGE)).toBeInTheDocument();
  const teams = await teamService.getAll();
  expect(teams).toHaveLength(3);
});

test("confirming the popup clears stored data and re-seeds", async () => {
  const user = userEvent.setup();
  await teamService.create({
    name: "Extra",
    club: "Extra",
    season: "24/25",
    players: [],
  });

  render(<Settings />);
  await user.click(screen.getByRole("button", { name: "Reset demo data" }));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  const teams = await teamService.getAll();
  expect(teams.map((t) => t.name)).toEqual(["Sub-11", "Sub-19"]);
});

test("confirming the popup leaves the auth session untouched", async () => {
  const user = userEvent.setup();
  localStorage.setItem("user", JSON.stringify({ email: "user@email.com" }));

  render(<Settings />);
  await user.click(screen.getByRole("button", { name: "Reset demo data" }));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(localStorage.getItem("user")).toBe(
    JSON.stringify({ email: "user@email.com" })
  );
});

test("canceling the popup changes nothing", async () => {
  const user = userEvent.setup();
  await teamService.create({
    name: "Extra",
    club: "Extra",
    season: "24/25",
    players: [],
  });

  render(<Settings />);
  await user.click(screen.getByRole("button", { name: "Reset demo data" }));
  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByText(CONFIRM_MESSAGE)).not.toBeInTheDocument();
  const teams = await teamService.getAll();
  expect(teams.map((t) => t.name)).toEqual(["Sub-11", "Sub-19", "Extra"]);
});
