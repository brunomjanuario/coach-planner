import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TeamCard from "../TeamCard";
import { teamService } from "../../services/teamService";
import { cardService } from "../../services/cardService";
import { ratingService } from "../../services/ratingService";
import { gameService } from "../../services/gameService";

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

test("renders the crest image via an imported asset, not a raw source-tree path (AC ASSET-01.2)", () => {
  render(<TeamCard team={team} onClose={() => {}} onUpdated={() => {}} />);

  const img = screen.getByRole("img", { name: "Amadora Sub-11 crest" });
  expect(img).toHaveAttribute("src");
  expect(img.getAttribute("src")).not.toBe("src/assets/images/logo.png");
});

test("the crest image has descriptive alt text naming the team (AC ASSET-01.3)", () => {
  render(<TeamCard team={team} onClose={() => {}} onUpdated={() => {}} />);

  expect(
    screen.getByAltText("Amadora Sub-11 crest")
  ).toBeInTheDocument();
});

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

describe("delete cascade (feature 35)", () => {
  async function createTeamWithPlayer() {
    const created = await teamService.create({
      name: "Cascade Sub-11",
      club: "Cascade FC",
      season: "24/25",
      players: [],
    });
    const player = await teamService.addPlayer(created.id, {
      name: "Test Player",
      age: 12,
      shirtNumber: 9,
      goals: 0,
      assists: 0,
      concededGoals: 0,
      position: "ST",
    });
    return { created, player };
  }

  test("removes every card belonging to the deleted team's players (AC CRUD-02.1)", async () => {
    const { created, player } = await createTeamWithPlayer();
    const game = await gameService.create({
      teamId: created.id,
      opponent: "Rivals",
      date: new Date("2030-01-01T10:00:00Z"),
      isHome: true,
      competition: "League",
    });
    await cardService.record({ playerId: player.id, gameId: game.id, type: "yellow" });

    const user = userEvent.setup();
    const { container } = render(
      <TeamCard team={created} onClose={() => {}} onUpdated={() => {}} />
    );
    await user.click(container.querySelector(".tabler-icon-trash"));
    await user.click(await screen.findByRole("button", { name: "Submit" }));

    await vi.waitFor(async () => {
      expect(await cardService.getByPlayer(player.id)).toEqual([]);
    });
  });

  test("removes every rating belonging to the deleted team's players (AC CRUD-02.2)", async () => {
    const { created, player } = await createTeamWithPlayer();
    await ratingService.setRating({
      playerId: player.id,
      eventType: "training",
      eventId: "t1",
      value: 7,
    });

    const user = userEvent.setup();
    const { container } = render(
      <TeamCard team={created} onClose={() => {}} onUpdated={() => {}} />
    );
    await user.click(container.querySelector(".tabler-icon-trash"));
    await user.click(await screen.findByRole("button", { name: "Submit" }));

    await vi.waitFor(async () => {
      expect(await ratingService.getByPlayer(player.id)).toEqual([]);
    });
  });

  test("leaves the deleted team's games untouched, not deleted (AC CRUD-02.3)", async () => {
    const { created } = await createTeamWithPlayer();
    const game = await gameService.create({
      teamId: created.id,
      opponent: "Rivals",
      date: new Date("2030-01-01T10:00:00Z"),
      isHome: true,
      competition: "League",
    });

    const user = userEvent.setup();
    const { container } = render(
      <TeamCard team={created} onClose={() => {}} onUpdated={() => {}} />
    );
    await user.click(container.querySelector(".tabler-icon-trash"));
    await user.click(await screen.findByRole("button", { name: "Submit" }));

    await vi.waitFor(async () => {
      const allGames = await gameService.getAll();
      expect(allGames.find((g) => g.id === game.id)).toBeDefined();
    });
  });

  test("deleting a team with no players does not error (edge case, AC CRUD-02.4)", async () => {
    const created = await teamService.create({
      name: "Empty Sub-11",
      club: "Empty FC",
      season: "24/25",
      players: [],
    });
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <TeamCard team={created} onClose={onClose} onUpdated={() => {}} />
    );

    await user.click(container.querySelector(".tabler-icon-trash"));
    await user.click(await screen.findByRole("button", { name: "Submit" }));

    await vi.waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
