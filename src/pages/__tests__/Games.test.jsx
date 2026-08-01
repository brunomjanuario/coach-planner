import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Games from "../Games";
import { teamService } from "../../services/teamService";
import { gameService } from "../../services/gameService";

afterEach(() => {
  vi.restoreAllMocks();
});

function getTeamsColumn(container) {
  return container.querySelector(".text-center.overflow-y-auto");
}

function getUpcomingList() {
  return screen.getByText("Upcoming").nextElementSibling;
}

function getPlayedList() {
  return screen.getByText("Played").nextElementSibling;
}

function getUnassignedList() {
  return screen.getByText("Unassigned").nextElementSibling;
}

function getFormFor(headingText) {
  return screen
    .getByRole("heading", { name: headingText })
    .closest("div")
    .querySelector("form");
}

async function typeInto(user, form, name, value) {
  const input = form.querySelector(`[name="${name}"]`);
  await user.clear(input);
  await user.type(input, value);
}

async function openCreatePopup(user, container) {
  await user.click(container.querySelector(".bg-blue-500"));
}

async function selectTeamInForm(user, form, label) {
  const select = form.querySelector('[name="teamId"]');
  await within(form).findByRole("option", { name: label });
  await user.selectOptions(select, label);
}

test("renders teams returned by teamService.getAll on mount", async () => {
  const { container } = render(<Games />);

  expect(await screen.findByText("Amadora Sub-11")).toBeInTheDocument();
  expect(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  ).toBeInTheDocument();
});

test("loads and splits all games into Upcoming and Played buckets on mount (AC GAME-04.1)", async () => {
  render(<Games />);
  await screen.findByText("Amadora Sub-11");

  await waitFor(() => {
    expect(within(getUpcomingList()).getAllByRole("listitem")).toHaveLength(1);
  });
  expect(within(getPlayedList()).getAllByRole("listitem")).toHaveLength(1);
});

test("selecting a team filters both games lists to that team's games only (AC GAME-04.2)", async () => {
  const user = userEvent.setup();
  const { container } = render(<Games />);
  await screen.findByText("Amadora Sub-11");
  await waitFor(() => {
    expect(within(getUpcomingList()).getAllByRole("listitem")).toHaveLength(1);
  });

  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );

  await waitFor(() => {
    expect(within(getUpcomingList()).queryAllByRole("listitem")).toHaveLength(0);
  });
  expect(within(getPlayedList()).queryAllByRole("listitem")).toHaveLength(0);
});

test("deselecting the selected team reverts to showing all games (AC GAME-04.3)", async () => {
  const user = userEvent.setup();
  const { container } = render(<Games />);
  await screen.findByText("Amadora Sub-11");
  await waitFor(() => {
    expect(within(getUpcomingList()).getAllByRole("listitem")).toHaveLength(1);
  });

  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );
  await waitFor(() => {
    expect(within(getUpcomingList()).getAllByRole("listitem")).toHaveLength(1);
  });

  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );

  await waitFor(() => {
    expect(within(getUpcomingList()).getAllByRole("listitem")).toHaveLength(1);
  });
});

test("creating a game refreshes the Upcoming list without a manual reload", async () => {
  const user = userEvent.setup();
  const { container } = render(<Games />);
  await screen.findByText("Amadora Sub-11");

  await openCreatePopup(user, container);
  const form = getFormFor("Create Game");
  await selectTeamInForm(user, form, "Amadora Sub-11");
  await user.type(within(form).getByLabelText(/opponent/i), "Porto");
  await typeInto(user, form, "date", "2027-01-01T10:00");
  await user.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(() => {
    expect(within(getUpcomingList()).getAllByRole("listitem")).toHaveLength(2);
  });
  expect(within(getUpcomingList()).getByText(/Porto/)).toBeInTheDocument();
});

test("creating a game outside the active filter keeps the filter and reports where it went (same contract as 03 TTA-04.3)", async () => {
  const user = userEvent.setup();
  const { container } = render(<Games />);
  await screen.findByText("Amadora Sub-11");
  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );
  await waitFor(() => {
    expect(within(getUpcomingList()).queryAllByRole("listitem")).toHaveLength(0);
  });

  await openCreatePopup(user, container);
  const form = getFormFor("Create Game");
  await selectTeamInForm(user, form, "Amadora Sub-11");
  await user.type(within(form).getByLabelText(/opponent/i), "Porto");
  await typeInto(user, form, "date", "2027-01-01T10:00");
  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(
    await screen.findByText(/Game created for Amadora Sub-11/)
  ).toBeInTheDocument();
  expect(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  ).toHaveAttribute("aria-current", "true");
  expect(within(getUpcomingList()).queryAllByRole("listitem")).toHaveLength(0);
});

test("canceling the create-game popup does not add a game and preserves the current team filter", async () => {
  const user = userEvent.setup();
  const { container } = render(<Games />);
  await screen.findByText("Amadora Sub-11");
  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );
  await waitFor(() => {
    expect(within(getUpcomingList()).getAllByRole("listitem")).toHaveLength(1);
  });

  await openCreatePopup(user, container);
  await user.click(screen.getByRole("button", { name: "Cancel" }));

  await waitFor(() => {
    expect(within(getUpcomingList()).getAllByRole("listitem")).toHaveLength(1);
  });
  expect(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  ).toHaveAttribute("aria-current", "true");
});

test("renders an empty-state message for Upcoming when the filtered team has none (AC GAME-04.4)", async () => {
  const user = userEvent.setup();
  const { container } = render(<Games />);
  await screen.findByText("Amadora Sub-11");

  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );

  expect(await screen.findByText("No upcoming games.")).toBeInTheDocument();
});

test("renders an empty-state message for Played when the filtered team has none (AC GAME-04.4)", async () => {
  const user = userEvent.setup();
  const { container } = render(<Games />);
  await screen.findByText("Amadora Sub-11");

  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );

  expect(await screen.findByText("No played games.")).toBeInTheDocument();
});

test("renders no React key warnings for the team filter and game lists", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  render(<Games />);
  await screen.findByText("Amadora Sub-11");
  await waitFor(() => {
    expect(within(getPlayedList()).getAllByRole("listitem")).toHaveLength(1);
  });

  const keyWarning = errorSpy.mock.calls.find((call) =>
    String(call[0]).includes('unique "key" prop')
  );
  expect(keyWarning).toBeUndefined();
});

test("disables the create-game button with a message pointing at Teams when there are no teams (edge case)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([]);
  const { container } = render(<Games />);

  await screen.findByText("No teams yet. Add one on the Teams page first.");

  expect(container.querySelector(".bg-blue-500")).toBeDisabled();
});

test("renders a game with a null teamId in the Unassigned bucket (edge case)", async () => {
  await gameService.create({
    teamId: null,
    opponent: "Unassigned FC",
    date: new Date("2030-06-01T10:00:00Z"),
    isHome: true,
    competition: "Cup",
  });

  render(<Games />);

  await screen.findByText("Unassigned");
  expect(
    within(getUnassignedList()).getByText(/Unassigned FC/)
  ).toBeInTheDocument();
});

test("renders a game with a dangling teamId in the Unassigned bucket (edge case)", async () => {
  await gameService.create({
    teamId: "no-such-team",
    opponent: "Dangling FC",
    date: new Date("2030-06-01T10:00:00Z"),
    isHome: true,
    competition: "Cup",
  });

  render(<Games />);

  await screen.findByText("Unassigned");
  expect(
    within(getUnassignedList()).getByText(/Dangling FC/)
  ).toBeInTheDocument();
});

test("assigning a team to an unassigned game persists it and removes it from the bucket", async () => {
  await gameService.create({
    teamId: null,
    opponent: "Assign Me FC",
    date: new Date("2030-06-01T10:00:00Z"),
    isHome: true,
    competition: "Cup",
  });
  const user = userEvent.setup();
  render(<Games />);
  await screen.findByText("Unassigned");
  const row = within(getUnassignedList())
    .getByText(/Assign Me FC/)
    .closest("li");

  await user.selectOptions(
    within(row).getByRole("combobox"),
    "Amadora Sub-11"
  );

  await waitFor(() => {
    expect(screen.queryByText("Unassigned")).not.toBeInTheDocument();
  });
});

test("clicking an upcoming game row opens the result-entry popup", async () => {
  const user = userEvent.setup();
  render(<Games />);
  await screen.findByText("Amadora Sub-11");
  await waitFor(() => {
    expect(within(getUpcomingList()).getAllByRole("listitem")).toHaveLength(1);
  });

  await user.click(within(getUpcomingList()).getByText(/Benfica/));

  expect(
    await screen.findByRole("heading", { name: "Record Result" })
  ).toBeInTheDocument();
});

test("entering a result moves the game from Upcoming to Played (AC GAME-06.1)", async () => {
  const user = userEvent.setup();
  render(<Games />);
  await screen.findByText("Amadora Sub-11");
  await waitFor(() => {
    expect(within(getUpcomingList()).getAllByRole("listitem")).toHaveLength(1);
  });
  await user.click(within(getUpcomingList()).getByText(/Benfica/));
  await screen.findByRole("heading", { name: "Record Result" });

  await user.type(screen.getByLabelText("Us"), "4");
  await user.type(screen.getByLabelText("Benfica"), "1");
  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => {
    expect(within(getUpcomingList()).queryAllByRole("listitem")).toHaveLength(0);
  });
  expect(within(getPlayedList()).getAllByRole("listitem")).toHaveLength(2);
  const benficaRow = within(getPlayedList()).getByText(/Benfica/).closest("li");
  expect(within(benficaRow).getByText("4–1")).toBeInTheDocument();
});

test("recording a 0-0 result moves the game to Played, not leaving it Upcoming (null-vs-zero edge case)", async () => {
  const user = userEvent.setup();
  render(<Games />);
  await screen.findByText("Amadora Sub-11");
  await waitFor(() => {
    expect(within(getUpcomingList()).getAllByRole("listitem")).toHaveLength(1);
  });
  await user.click(within(getUpcomingList()).getByText(/Benfica/));
  await screen.findByRole("heading", { name: "Record Result" });

  await user.type(screen.getByLabelText("Us"), "0");
  await user.type(screen.getByLabelText("Benfica"), "0");
  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => {
    expect(within(getUpcomingList()).queryAllByRole("listitem")).toHaveLength(0);
  });
  expect(within(getPlayedList()).getByText("0–0")).toBeInTheDocument();
});

test("clicking a played game row opens the popup pre-filled and edits the result in place (AC GAME-06.4)", async () => {
  const user = userEvent.setup();
  render(<Games />);
  await screen.findByText("Amadora Sub-11");
  await waitFor(() => {
    expect(within(getPlayedList()).getAllByRole("listitem")).toHaveLength(1);
  });

  await user.click(within(getPlayedList()).getByText(/Sporting/));
  await screen.findByRole("heading", { name: "Edit Result" });
  expect(screen.getByLabelText("Us")).toHaveValue("2");
  const themInput = screen.getByLabelText("Sporting");
  await user.clear(themInput);
  await user.type(themInput, "3");
  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => {
    expect(within(getPlayedList()).getByText("2–3")).toBeInTheDocument();
  });
  const sportingRow = within(getPlayedList())
    .getByText(/Sporting/)
    .closest("li");
  expect(within(sportingRow).getByText("loss")).toBeInTheDocument();
});

test("clearing a result returns the game to Upcoming (AC GAME-06.5)", async () => {
  const user = userEvent.setup();
  render(<Games />);
  await screen.findByText("Amadora Sub-11");
  await waitFor(() => {
    expect(within(getPlayedList()).getAllByRole("listitem")).toHaveLength(1);
  });

  await user.click(within(getPlayedList()).getByText(/Sporting/));
  await screen.findByRole("button", { name: "Clear Result" });
  await user.click(screen.getByRole("button", { name: "Clear Result" }));

  await waitFor(() => {
    expect(within(getPlayedList()).queryAllByRole("listitem")).toHaveLength(0);
  });
  expect(within(getUpcomingList()).getByText(/Sporting/)).toBeInTheDocument();
});

function getLeagueTableSection() {
  return screen.getByText("League Table").nextElementSibling;
}

test("with no team selected, shows an instruction instead of a merged table (AC GAME-10)", async () => {
  render(<Games />);
  await screen.findByText("Amadora Sub-11");

  expect(
    screen.getByText("Select a team to see its league table.")
  ).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});

test("renders the league table scoped to the selected team (AC GAME-07.1, GAME-10)", async () => {
  const user = userEvent.setup();
  const { container } = render(<Games />);
  await screen.findByText("Amadora Sub-11");

  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );

  const row = await within(getLeagueTableSection()).findByText(
    "Amadora Sub-11"
  );
  const cells = within(row.closest("tr")).getAllByRole("cell");
  // #, Team, P, W, D, L, GF, GA, GD, Pts — from the seed's single played
  // game (2-1 win over Sporting).
  expect(cells.map((c) => c.textContent)).toEqual([
    "1",
    "Amadora Sub-11",
    "1",
    "1",
    "0",
    "0",
    "2",
    "1",
    "1",
    "3",
  ]);
});

test("recording a result recomputes our row with no page reload (AC GAME-07.5)", async () => {
  const user = userEvent.setup();
  const { container } = render(<Games />);
  await screen.findByText("Amadora Sub-11");
  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );
  await within(getLeagueTableSection()).findByText("Amadora Sub-11");

  await user.click(within(getUpcomingList()).getByText(/Benfica/));
  await screen.findByRole("heading", { name: "Record Result" });
  await user.type(screen.getByLabelText("Us"), "3");
  await user.type(screen.getByLabelText("Benfica"), "0");
  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => {
    const row = within(getLeagueTableSection()).getByText("Amadora Sub-11");
    const cells = within(row.closest("tr")).getAllByRole("cell");
    expect(cells[2]).toHaveTextContent("2"); // played
    expect(cells[9]).toHaveTextContent("6"); // points: two wins
  });
});

test("clearing a result recomputes our row with no page reload (AC GAME-07.5)", async () => {
  const user = userEvent.setup();
  const { container } = render(<Games />);
  await screen.findByText("Amadora Sub-11");
  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );
  await within(getLeagueTableSection()).findByText("Amadora Sub-11");

  await user.click(within(getPlayedList()).getByText(/Sporting/));
  await screen.findByRole("button", { name: "Clear Result" });
  await user.click(screen.getByRole("button", { name: "Clear Result" }));

  await waitFor(() => {
    const row = within(getLeagueTableSection()).getByText("Amadora Sub-11");
    const cells = within(row.closest("tr")).getAllByRole("cell");
    expect(cells[2]).toHaveTextContent("0"); // played
    expect(cells[9]).toHaveTextContent("0"); // points
  });
});

test("deleting a played game removes its contribution from the standings (edge case)", async () => {
  const user = userEvent.setup();
  const { container } = render(<Games />);
  await screen.findByText("Amadora Sub-11");
  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );
  await within(getLeagueTableSection()).findByText("Amadora Sub-11");

  await user.click(within(getPlayedList()).getByText(/Sporting/));
  await screen.findByRole("button", { name: "Delete Game" });
  await user.click(screen.getByRole("button", { name: "Delete Game" }));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  await waitFor(() => {
    const row = within(getLeagueTableSection()).getByText("Amadora Sub-11");
    const cells = within(row.closest("tr")).getAllByRole("cell");
    expect(cells[2]).toHaveTextContent("0"); // played
    expect(cells[9]).toHaveTextContent("0"); // points
  });
  expect(within(getPlayedList()).queryByText(/Sporting/)).not.toBeInTheDocument();
});

test("adding a rival row re-sorts the table immediately", async () => {
  const user = userEvent.setup();
  const { container } = render(<Games />);
  await screen.findByText("Amadora Sub-11");
  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );
  await within(getLeagueTableSection()).findByText("Amadora Sub-11");

  await user.click(screen.getByRole("button", { name: "Add Rival Row" }));
  const form = getFormFor("Add Rival Row");
  await typeInto(user, form, "name", "Benfica B");
  await typeInto(user, form, "played", "2");
  await typeInto(user, form, "won", "2");
  await typeInto(user, form, "drawn", "0");
  await typeInto(user, form, "lost", "0");
  await typeInto(user, form, "goalsFor", "5");
  await typeInto(user, form, "goalsAgainst", "0");
  await user.click(screen.getByRole("button", { name: "Add" }));

  await waitFor(() => {
    const dataRows = within(getLeagueTableSection())
      .getAllByRole("row")
      .slice(1);
    expect(within(dataRows[0]).getByText("Benfica B")).toBeInTheDocument();
    expect(within(dataRows[1]).getByText("Amadora Sub-11")).toBeInTheDocument();
  });
});
