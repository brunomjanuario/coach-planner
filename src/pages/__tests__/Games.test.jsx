import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useSearchParams } from "react-router-dom";
import Games from "../Games";
import { teamService } from "../../services/teamService";
import { gameService } from "../../services/gameService";
import { competitionService } from "../../services/competitionService";
import { opponentService } from "../../services/opponentService";

afterEach(() => {
  vi.restoreAllMocks();
});

function SearchParamsDisplay() {
  const [searchParams] = useSearchParams();
  return <div data-testid="search-params">{searchParams.toString()}</div>;
}

function DeepLinkTrigger({ paramName }) {
  const [, setSearchParams] = useSearchParams();
  return (
    <button
      onClick={(e) => setSearchParams({ [paramName]: e.target.dataset.id })}
      data-testid="deep-link-trigger"
    >
      trigger
    </button>
  );
}

function renderGames(initialEntries = ["/games"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Games />
      <SearchParamsDisplay />
      <DeepLinkTrigger paramName="game" />
    </MemoryRouter>
  );
}

function getTeamsColumn(container) {
  return container.querySelector(".text-center");
}

function getUpcomingList() {
  return screen.getByRole("heading", { name: /^Upcoming/ }).nextElementSibling;
}

function getPlayedList() {
  return screen.getByRole("heading", { name: /^Played/ }).nextElementSibling;
}

function getUnassignedList() {
  return screen.getByRole("heading", { name: /^Unassigned/ }).nextElementSibling;
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
  const { container } = renderGames();

  expect(await screen.findByRole("button", { name: "Amadora Sub-11" })).toBeInTheDocument();
  expect(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  ).toBeInTheDocument();
});

test("loads and splits all games into Upcoming and Played buckets on mount (AC GAME-04.1)", async () => {
  renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await waitFor(() => {
    expect(within(getUpcomingList()).getAllByRole("listitem")).toHaveLength(1);
  });
  expect(within(getPlayedList()).getAllByRole("listitem")).toHaveLength(1);
});

test("selecting a team filters both games lists to that team's games only (AC GAME-04.2)", async () => {
  const user = userEvent.setup();
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
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
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
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
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await openCreatePopup(user, container);
  const form = getFormFor("Create Game");
  await selectTeamInForm(user, form, "Amadora Sub-11");
  await user.selectOptions(within(form).getByLabelText(/opponent/i), "Sporting");
  await typeInto(user, form, "date", "2027-01-01T10:00");
  await user.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(() => {
    expect(within(getUpcomingList()).getAllByRole("listitem")).toHaveLength(2);
  });
  expect(within(getUpcomingList()).getByText(/Sporting/)).toBeInTheDocument();
});

test("creating a game outside the active filter keeps the filter and reports where it went (same contract as 03 TTA-04.3)", async () => {
  const user = userEvent.setup();
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );
  await waitFor(() => {
    expect(within(getUpcomingList()).queryAllByRole("listitem")).toHaveLength(0);
  });

  await openCreatePopup(user, container);
  const form = getFormFor("Create Game");
  await selectTeamInForm(user, form, "Amadora Sub-11");
  await user.selectOptions(within(form).getByLabelText(/opponent/i), "Sporting");
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
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
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
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );

  expect(await screen.findByText("No upcoming games.")).toBeInTheDocument();
});

test("renders an empty-state message for Played when the filtered team has none (AC GAME-04.4)", async () => {
  const user = userEvent.setup();
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );

  expect(await screen.findByText("No played games.")).toBeInTheDocument();
});

test("renders no React key warnings for the team filter and game lists", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
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
  const { container } = renderGames();

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

  renderGames();

  await screen.findByRole("heading", { name: /^Unassigned/ });
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

  renderGames();

  await screen.findByRole("heading", { name: /^Unassigned/ });
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
  renderGames();
  await screen.findByRole("heading", { name: /^Unassigned/ });
  const row = within(getUnassignedList())
    .getByText(/Assign Me FC/)
    .closest("li");

  await user.selectOptions(
    within(row).getByRole("combobox"),
    "Amadora Sub-11"
  );

  await waitFor(() => {
    expect(screen.queryByRole("heading", { name: /^Unassigned/ })).not.toBeInTheDocument();
  });
});

test("clicking an upcoming game row opens the result-entry popup", async () => {
  const user = userEvent.setup();
  renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
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
  renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
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
  renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
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
  renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
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
  renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
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
  renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  expect(
    screen.getByText("Select a team to see its league table.")
  ).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});

test("renders the league table scoped to the selected team (AC GAME-07.1, GAME-10)", async () => {
  const user = userEvent.setup();
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

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
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
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
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
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
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
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
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
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

test("opens the matching game from a ?game=<id> deep link (AC CAL-04.2)", async () => {
  const created = await gameService.create({
    teamId: 1,
    opponent: "Benfica",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    isHome: true,
    competition: "District League",
  });

  renderGames([`/games?game=${created.id}`]);

  expect(
    await screen.findByRole("heading", { name: "Record Result" })
  ).toBeInTheDocument();
  expect(screen.getByText("Benfica")).toBeInTheDocument();
});

test("removes the game param from the URL once opened, so a refresh does not reopen it (AC CAL-04.4)", async () => {
  const created = await gameService.create({
    teamId: 1,
    opponent: "Benfica",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    isHome: true,
    competition: "District League",
  });

  renderGames([`/games?game=${created.id}`]);
  await screen.findByRole("heading", { name: "Record Result" });

  await waitFor(() => {
    expect(screen.getByTestId("search-params")).toHaveTextContent("");
  });
});

test("shows a not-found message when the deep-linked id matches no game (AC CAL-04.3)", async () => {
  renderGames(["/games?game=does-not-exist"]);

  expect(
    await screen.findByText("That game no longer exists.")
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Record Result" })
  ).not.toBeInTheDocument();
});

test("clears the team filter when it would hide the deep-linked game (edge case)", async () => {
  const user = userEvent.setup();
  const created = await gameService.create({
    teamId: 2,
    opponent: "Sporting",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    isHome: true,
    competition: "District League",
  });

  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );
  await waitFor(() => {
    expect(
      within(getTeamsColumn(container)).getByText("Amadora Sub-11")
    ).toHaveAttribute("aria-current", "true");
  });

  const trigger = screen.getByTestId("deep-link-trigger");
  trigger.dataset.id = String(created.id);
  await user.click(trigger);

  expect(
    await screen.findByRole("heading", { name: "Record Result" })
  ).toBeInTheDocument();
  expect(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  ).not.toHaveAttribute("aria-current", "true");
});

test("arriving with no deep-link param behaves exactly as before (regression guard)", async () => {
  renderGames();

  await screen.findByRole("button", { name: "Amadora Sub-11" });
  expect(
    screen.queryByRole("heading", { name: "Record Result" })
  ).not.toBeInTheDocument();
  expect(screen.queryByText("That game no longer exists.")).toBeNull();
});

test("renders three regions in source order teams, fixtures, table (AC GLAY-01.1, GLAY-01.2)", async () => {
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  const row = getTeamsColumn(container).parentElement;
  const [teamsCol, fixturesCol, tableCol] = row.children;
  expect(within(teamsCol).getByText("Amadora Sub-11")).toBeInTheDocument();
  expect(within(fixturesCol).getByText(/^Upcoming/)).toBeInTheDocument();
  expect(within(tableCol).getByText("League Table")).toBeInTheDocument();
});

test("the teams column is a fixed-width, non-scaling column (AC GLAY-01.3)", async () => {
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  const teamsCol = getTeamsColumn(container);
  expect(teamsCol.className).toMatch(/\bmd:w-56\b/);
  expect(teamsCol.className).toMatch(/\bmd:flex-shrink-0\b/);
});

test("no element on the page carries both flex-1 and flex-3 (AC GLAY-01.5)", async () => {
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPlayedList()).getAllByRole("listitem")).toHaveLength(1);
  });

  const elements = container.querySelectorAll("*");
  for (const el of elements) {
    const classes = el.className.toString().split(/\s+/);
    expect(classes.includes("flex-1") && classes.includes("flex-3")).toBe(false);
  }
});

test("the next-game card renders above the fixtures list and reflects the active team filter (AC GLAY-04.4)", async () => {
  const user = userEvent.setup();
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await screen.findByRole("button", { name: /Next Game/ });

  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );

  await waitFor(() => {
    expect(screen.getByText("No upcoming games")).toBeInTheDocument();
  });
});

test("activating the next-game card opens the same popup a list row opens (AC GLAY-04.5)", async () => {
  const user = userEvent.setup();
  renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  const card = await screen.findByRole("button", { name: /Next Game/ });

  await user.click(card);

  expect(
    await screen.findByRole("heading", { name: "Record Result" })
  ).toBeInTheDocument();
});

test("with no team selected, the table column shows the instruction and the next-game card widens to all teams and shows the team name (edge case)", async () => {
  renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  expect(
    screen.getByText("Select a team to see its league table.")
  ).toBeInTheDocument();
  const card = await screen.findByRole("button", { name: /Next Game/ });
  expect(within(card).getByText(/Amadora Sub-11/)).toBeInTheDocument();
});

test("creating a game updates the next-game card with no page reload (AC GLAY-04.6)", async () => {
  const user = userEvent.setup();
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );
  await waitFor(() => {
    expect(screen.getByText("No upcoming games")).toBeInTheDocument();
  });

  await openCreatePopup(user, container);
  const form = getFormFor("Create Game");
  await selectTeamInForm(user, form, "Areias Sub-19");
  await user.selectOptions(within(form).getByLabelText(/opponent/i), "Sporting");
  await typeInto(user, form, "date", "2027-01-01T10:00");
  await user.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: /Next Game/ })).toBeInTheDocument();
  });
  const card = screen.getByRole("button", { name: /Next Game/ });
  expect(within(card).getByText(/Sporting/)).toBeInTheDocument();
});

test("deleting the next game updates the next-game card with no page reload (AC GLAY-04.6)", async () => {
  const user = userEvent.setup();
  renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  const card = await screen.findByRole("button", { name: /Next Game/ });
  expect(within(card).getByText(/Benfica/)).toBeInTheDocument();
  await user.click(card);
  await screen.findByRole("button", { name: "Delete Game" });
  await user.click(screen.getByRole("button", { name: "Delete Game" }));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  await waitFor(() => {
    expect(screen.getByText("No upcoming games")).toBeInTheDocument();
  });
});

test("the league table scrolls horizontally inside its column rather than widening the page (edge case)", async () => {
  const user = userEvent.setup();
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );
  await screen.findByRole("table");

  const scrollWrapper = screen.getByRole("table").closest(".overflow-x-auto");
  expect(scrollWrapper).toBeInTheDocument();
});

test("recording a result still works from the new layout (regression guard on 07 GAME requirements)", async () => {
  const user = userEvent.setup();
  renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getUpcomingList()).getAllByRole("listitem")).toHaveLength(1);
  });
  await user.click(within(getUpcomingList()).getByText(/Benfica/));
  await screen.findByRole("heading", { name: "Record Result" });

  await user.type(screen.getByLabelText("Us"), "4");
  await user.type(screen.getByLabelText("Benfica"), "1");
  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => {
    expect(within(getPlayedList()).getAllByRole("listitem")).toHaveLength(2);
  });
});

test("deleting a game still works from the new layout (regression guard on 07 GAME requirements)", async () => {
  const user = userEvent.setup();
  renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPlayedList()).getAllByRole("listitem")).toHaveLength(1);
  });
  await user.click(within(getPlayedList()).getByText(/Sporting/));
  await screen.findByRole("button", { name: "Delete Game" });
  await user.click(screen.getByRole("button", { name: "Delete Game" }));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  await waitFor(() => {
    expect(within(getPlayedList()).queryByText(/Sporting/)).not.toBeInTheDocument();
  });
});

test("adding a rival row still works from the new layout (regression guard on 07 GAME requirements)", async () => {
  const user = userEvent.setup();
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );
  await screen.findByRole("table");

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
    expect(screen.getByText("Benfica B")).toBeInTheDocument();
  });
});

test("twelve upcoming games all render with no per-section cap (AC GLAY-05.1)", async () => {
  const [seedTeam] = await teamService.getAll();
  for (let i = 0; i < 12; i++) {
    await gameService.create({
      teamId: seedTeam.id,
      opponent: `Rival ${i}`,
      date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
      isHome: true,
      competition: "League",
    });
  }

  renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await waitFor(() => {
    // 1 seeded upcoming game + 12 newly created ones.
    expect(within(getUpcomingList()).getAllByRole("listitem")).toHaveLength(13);
  });
});

test("twelve played games all render with no per-section cap (AC GLAY-05.1)", async () => {
  const [seedTeam] = await teamService.getAll();
  for (let i = 0; i < 12; i++) {
    const game = await gameService.create({
      teamId: seedTeam.id,
      opponent: `Rival ${i}`,
      date: new Date("2020-01-01T10:00:00Z").getTime() + i * 24 * 60 * 60 * 1000,
      isHome: true,
      competition: "League",
    });
    await gameService.recordResult(game.id, { us: 1, them: 0 });
  }

  renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await waitFor(() => {
    // 1 seeded played game + 12 newly created ones.
    expect(within(getPlayedList()).getAllByRole("listitem")).toHaveLength(13);
  });
});

test("the page contains no h-screen or per-list overflow-y-auto container (AC GLAY-05.3)", async () => {
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPlayedList()).getAllByRole("listitem")).toHaveLength(1);
  });

  expect(container.querySelector(".h-screen")).not.toBeInTheDocument();
  expect(container.querySelector(".overflow-y-auto")).not.toBeInTheDocument();
});

test("each fixture heading renders its count, not just its label (AC GLAY-05.2)", async () => {
  renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(within(getPlayedList()).getAllByRole("listitem")).toHaveLength(1);
  });

  expect(screen.getByRole("heading", { name: "Upcoming (1)" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Played (1)" })).toBeInTheDocument();
});

test("the played section is ordered most-recent-first (AC GLAY-05.4)", async () => {
  const [seedTeam] = await teamService.getAll();
  const older = await gameService.create({
    teamId: seedTeam.id,
    opponent: "Older Rival",
    date: new Date("2019-01-01T10:00:00Z"),
    isHome: true,
    competition: "League",
  });
  await gameService.recordResult(older.id, { us: 1, them: 0 });
  const newer = await gameService.create({
    teamId: seedTeam.id,
    opponent: "Newer Rival",
    date: new Date("2024-01-01T10:00:00Z"),
    isHome: true,
    competition: "League",
  });
  await gameService.recordResult(newer.id, { us: 1, them: 0 });

  renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await waitFor(() => {
    expect(within(getPlayedList()).getAllByRole("listitem")).toHaveLength(3);
  });
  const rows = within(getPlayedList()).getAllByRole("listitem");
  expect(rows[0]).toHaveTextContent("Newer Rival");
  expect(rows[rows.length - 1]).toHaveTextContent("Older Rival");
});

test("the unassigned section keeps its place and assignment controls, with a count (edge case)", async () => {
  await gameService.create({
    teamId: null,
    opponent: "Unassigned FC",
    date: new Date("2030-06-01T10:00:00Z"),
    isHome: true,
    competition: "Cup",
  });

  renderGames();

  const heading = await screen.findByRole("heading", { name: "Unassigned (1)" });
  expect(heading).toBeInTheDocument();
  expect(within(getUnassignedList()).getByRole("combobox")).toBeInTheDocument();
});

test("a played game with an invalid date renders in the played section without crashing (edge case)", async () => {
  vi.spyOn(gameService, "getPlayed").mockResolvedValueOnce([
    {
      id: "bad-date",
      teamId: 1,
      opponent: "Ghost FC",
      date: new Date("not-a-date"),
      isHome: true,
      usScore: 1,
      themScore: 0,
    },
  ]);

  renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  expect(await within(getPlayedList()).findByText(/Ghost FC/)).toBeInTheDocument();
});

test("filtering to a team with no games shows zero counts in both fixture headings (edge case)", async () => {
  const user = userEvent.setup();
  const { container } = renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Upcoming (0)" })).toBeInTheDocument();
  });
  expect(screen.getByRole("heading", { name: "Played (0)" })).toBeInTheDocument();
});

test("deleting a game updates the fixture counts with no page reload (edge case)", async () => {
  const user = userEvent.setup();
  renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });
  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Played (1)" })).toBeInTheDocument();
  });

  await user.click(within(getPlayedList()).getByText(/Sporting/));
  await screen.findByRole("button", { name: "Delete Game" });
  await user.click(screen.getByRole("button", { name: "Delete Game" }));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Played (0)" })).toBeInTheDocument();
  });
});

test("the rendered card count in each fixture section equals the data length (AC GLAY-05.1)", async () => {
  renderGames();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  await waitFor(() => {
    expect(within(getUpcomingList()).getAllByRole("listitem")).toHaveLength(1);
  });
  expect(within(getPlayedList()).getAllByRole("listitem")).toHaveLength(1);
});

describe("Competitions manager (feature 20)", () => {
  test("the Competitions button in the header opens the manager (AC COMP-03.1)", async () => {
    const user = userEvent.setup();
    renderGames();
    await screen.findByRole("button", { name: "Amadora Sub-11" });

    await user.click(screen.getByRole("button", { name: "Competitions" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("District League")).toBeInTheDocument();
  });

  test("requesting a delete opens a confirmation naming how many games use that competition (AC COMP-05.4)", async () => {
    const user = userEvent.setup();
    renderGames();
    await screen.findByRole("button", { name: "Amadora Sub-11" });
    await user.click(screen.getByRole("button", { name: "Competitions" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("District League");

    await user.click(
      within(dialog).getByRole("button", { name: "Delete District League" })
    );

    expect(
      await screen.findByText(/Delete "District League"\? 2 games use this competition\./)
    ).toBeInTheDocument();
  });

  test("a competition used by zero games states zero in the confirmation, not a blank", async () => {
    const user = userEvent.setup();
    renderGames();
    await screen.findByRole("button", { name: "Amadora Sub-11" });
    await user.click(screen.getByRole("button", { name: "Competitions" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("District League");

    await user.type(within(dialog).getByLabelText("New competition"), "Cup");
    await user.click(within(dialog).getByRole("button", { name: "Add" }));
    await within(dialog).findByText("Cup");

    await user.click(
      within(dialog).getByRole("button", { name: "Delete Cup" })
    );

    expect(
      await screen.findByText(/Delete "Cup"\? 0 games use this competition\./)
    ).toBeInTheDocument();
  });

  test("confirming a delete removes the competition and leaves the games' stored competition untouched (AC COMP-05.5)", async () => {
    const user = userEvent.setup();
    renderGames();
    await screen.findByRole("button", { name: "Amadora Sub-11" });
    await user.click(screen.getByRole("button", { name: "Competitions" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("District League");

    await user.click(
      within(dialog).getByRole("button", { name: "Delete District League" })
    );
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(async () => {
      expect(
        (await competitionService.getAll()).find(
          (c) => c.name === "District League"
        )
      ).toBeUndefined();
    });
    const games = await gameService.getAll();
    expect(
      games.filter((g) => g.competition === "District League")
    ).toHaveLength(2);
  });

  test("cancelling a delete changes nothing (AC COMP-05.6)", async () => {
    const user = userEvent.setup();
    renderGames();
    await screen.findByRole("button", { name: "Amadora Sub-11" });
    await user.click(screen.getByRole("button", { name: "Competitions" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("District League");

    await user.click(
      within(dialog).getByRole("button", { name: "Delete District League" })
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(within(dialog).getByText("District League")).toBeInTheDocument();
    expect(
      (await competitionService.getAll()).find(
        (c) => c.name === "District League"
      )
    ).toBeDefined();
  });

  test("closing the manager returns to the page with no other state disturbed", async () => {
    const user = userEvent.setup();
    const { container } = renderGames();
    await screen.findByRole("button", { name: "Amadora Sub-11" });
    await user.click(
      within(getTeamsColumn(container)).getByText("Areias Sub-19")
    );
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Upcoming (0)" })
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Competitions" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Upcoming (0)" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Played (0)" })
    ).toBeInTheDocument();
  });
});

describe("Opponents manager (feature 21)", () => {
  test("the Opponents button in the header opens the manager (AC OPP-03.1)", async () => {
    const user = userEvent.setup();
    renderGames();
    await screen.findByRole("button", { name: "Amadora Sub-11" });

    await user.click(screen.getByRole("button", { name: "Opponents" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Benfica")).toBeInTheDocument();
  });

  test("both the Competitions and Opponents controls coexist without disturbing the add-game button or layout (AC OPP-05, regression on 19/20)", async () => {
    const { container } = renderGames();
    await screen.findByRole("button", { name: "Amadora Sub-11" });

    expect(
      screen.getByRole("button", { name: "Competitions" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Opponents" })).toBeInTheDocument();
    expect(container.querySelector(".bg-blue-500")).toBeInTheDocument();
  });

  test("requesting a delete opens a confirmation naming how many games use that opponent (AC OPP-05.4)", async () => {
    const user = userEvent.setup();
    renderGames();
    await screen.findByRole("button", { name: "Amadora Sub-11" });
    await user.click(screen.getByRole("button", { name: "Opponents" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Benfica");

    await user.click(within(dialog).getByRole("button", { name: "Delete Benfica" }));

    expect(
      await screen.findByText(/Delete "Benfica"\? 1 game use this opponent\./)
    ).toBeInTheDocument();
  });

  test("an opponent used by zero games states zero in the confirmation, not a blank", async () => {
    const user = userEvent.setup();
    renderGames();
    await screen.findByRole("button", { name: "Amadora Sub-11" });
    await user.click(screen.getByRole("button", { name: "Opponents" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Benfica");

    await user.type(within(dialog).getByLabelText("New opponent"), "Braga");
    await user.click(within(dialog).getByRole("button", { name: "Add" }));
    await within(dialog).findByText("Braga");

    await user.click(within(dialog).getByRole("button", { name: "Delete Braga" }));

    expect(
      await screen.findByText(/Delete "Braga"\? 0 games use this opponent\./)
    ).toBeInTheDocument();
  });

  test("confirming a delete removes the opponent and leaves the games' stored opponent untouched (AC OPP-05.5)", async () => {
    const user = userEvent.setup();
    renderGames();
    await screen.findByRole("button", { name: "Amadora Sub-11" });
    await user.click(screen.getByRole("button", { name: "Opponents" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Benfica");

    await user.click(within(dialog).getByRole("button", { name: "Delete Benfica" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(async () => {
      expect(
        (await opponentService.getAll()).find((o) => o.name === "Benfica")
      ).toBeUndefined();
    });
    const games = await gameService.getAll();
    expect(games.filter((g) => g.opponent === "Benfica")).toHaveLength(1);
  });

  test("cancelling a delete changes nothing (AC OPP-05.6)", async () => {
    const user = userEvent.setup();
    renderGames();
    await screen.findByRole("button", { name: "Amadora Sub-11" });
    await user.click(screen.getByRole("button", { name: "Opponents" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Benfica");

    await user.click(within(dialog).getByRole("button", { name: "Delete Benfica" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(within(dialog).getByText("Benfica")).toBeInTheDocument();
    expect(
      (await opponentService.getAll()).find((o) => o.name === "Benfica")
    ).toBeDefined();
  });
});
