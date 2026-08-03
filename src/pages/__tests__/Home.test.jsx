import { render, screen, within, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "../Home";
import { teamService } from "../../services/teamService";
import { trainingService } from "../../services/trainingService";
import { gameService } from "../../services/gameService";

afterEach(() => {
  vi.restoreAllMocks();
});

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

function getTile(labelText) {
  return screen.getByText(labelText).parentElement;
}

test("the Teams tile shows the number of teams (AC DASH-04.1)", async () => {
  renderHome();

  await screen.findByText("Teams");
  expect(within(getTile("Teams")).getByText("2")).toBeInTheDocument();
});

test("the Training tile shows the total split into past and upcoming (AC DASH-04.2)", async () => {
  renderHome();

  await screen.findByText("Training");
  expect(await screen.findByText("2 past · 0 upcoming")).toBeInTheDocument();
});

test("the Games tile shows the total split into played and upcoming (AC DASH-04.3)", async () => {
  renderHome();

  await screen.findByText("Games");
  expect(await screen.findByText("1 played · 1 upcoming")).toBeInTheDocument();
});

test("a zero count renders the signposted empty state (AC DASH-04.4)", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(trainingService, "getAll").mockResolvedValueOnce([]);
  vi.spyOn(gameService, "getAll").mockResolvedValueOnce([]);

  renderHome();

  await waitFor(() => {
    expect(screen.getAllByText("No data yet")).toHaveLength(3);
  });
  expect(
    within(getTile("Teams")).getByRole("link", { name: "Add one" })
  ).toHaveAttribute("href", "/teams");
});

test("revisiting after a record is created elsewhere shows the updated count (AC DASH-04.5)", async () => {
  const { unmount } = renderHome();
  await screen.findByText("Teams");
  expect(within(getTile("Teams")).getByText("2")).toBeInTheDocument();

  await teamService.create({ name: "Sub-15", club: "Amadora", players: [] });
  unmount();

  renderHome();

  await screen.findByText("Teams");
  expect(within(getTile("Teams")).getByText("3")).toBeInTheDocument();
});

test("preserves the existing 3x2 grid layout", async () => {
  const { container } = renderHome();
  await screen.findByText("Teams");

  const grid = container.querySelector(".grid");
  expect(grid.className).toContain("grid-cols-3");
  expect(grid.className).toContain("grid-rows-2");
  expect(grid.children).toHaveLength(6);
});

test("renders a loading placeholder rather than 0 before the initial load resolves (edge case)", () => {
  vi.spyOn(teamService, "getAll").mockReturnValue(new Promise(() => {}));
  vi.spyOn(trainingService, "getAll").mockReturnValue(new Promise(() => {}));
  vi.spyOn(gameService, "getAll").mockReturnValue(new Promise(() => {}));

  renderHome();

  expect(screen.queryByText("0")).not.toBeInTheDocument();
  expect(screen.getAllByText("—").length).toBeGreaterThan(0);
});
