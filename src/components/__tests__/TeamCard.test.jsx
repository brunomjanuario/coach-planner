import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TeamCard from "../TeamCard";
import { teamService } from "../../services/teamService";

afterEach(() => {
  vi.restoreAllMocks();
});

const team = {
  id: 1,
  name: "Sub-11",
  club: "Amadora",
  season: "23/24",
  players: [],
};

test("renders the team's club, name and season", () => {
  render(<TeamCard team={team} onClose={() => {}} onUpdated={() => {}} />);

  expect(screen.getByText("Amadora Sub-11")).toBeInTheDocument();
  expect(screen.getByText("23/24")).toBeInTheDocument();
});

test("confirming delete awaits the service before calling onClose (AC CRUD-01.4)", async () => {
  const deleteSpy = vi.spyOn(teamService, "delete").mockResolvedValue();
  const onClose = vi.fn();
  const user = userEvent.setup();
  const { container } = render(
    <TeamCard team={team} onClose={onClose} onUpdated={() => {}} />
  );

  await user.click(container.querySelector(".tabler-icon-trash"));
  await user.click(await screen.findByRole("button", { name: "Submit" }));

  expect(deleteSpy).toHaveBeenCalledWith(team.id);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("a rejected delete renders an inline error and does not close (AC CRUD-01.3)", async () => {
  vi.spyOn(teamService, "delete").mockRejectedValue(new Error("boom"));
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const onClose = vi.fn();
  const user = userEvent.setup();
  const { container } = render(
    <TeamCard team={team} onClose={onClose} onUpdated={() => {}} />
  );

  await user.click(container.querySelector(".tabler-icon-trash"));
  await user.click(await screen.findByRole("button", { name: "Submit" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Failed to delete the team. Please try again."
  );
  expect(onClose).not.toHaveBeenCalled();
  expect(errorSpy).toHaveBeenCalledWith("Failed to delete team:", expect.any(Error));
  expect(screen.getByText("Amadora Sub-11")).toBeInTheDocument();
});

test("cancelling delete does not call teamService.delete", async () => {
  const deleteSpy = vi.spyOn(teamService, "delete");
  const user = userEvent.setup();
  const { container } = render(
    <TeamCard team={team} onClose={() => {}} onUpdated={() => {}} />
  );

  await user.click(container.querySelector(".tabler-icon-trash"));
  await user.click(await screen.findByRole("button", { name: "Cancel" }));

  expect(deleteSpy).not.toHaveBeenCalled();
});
