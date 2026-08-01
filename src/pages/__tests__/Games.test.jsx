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
