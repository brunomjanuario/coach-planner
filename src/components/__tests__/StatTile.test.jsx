import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import StatTile from "../StatTile";

function renderTile(props = {}) {
  return render(
    <MemoryRouter>
      <StatTile label="Teams" {...props} />
    </MemoryRouter>
  );
}

test("renders a label, a primary value and an optional breakdown line", () => {
  renderTile({ value: 4, breakdown: "2 past · 2 upcoming" });

  expect(screen.getByText("Teams")).toBeInTheDocument();
  expect(screen.getByText("4")).toBeInTheDocument();
  expect(screen.getByText("2 past · 2 upcoming")).toBeInTheDocument();
});

test("renders without a breakdown line when none is given", () => {
  const { container } = renderTile({ value: 4 });

  expect(container.textContent).not.toContain("past");
});

test("renders 'No data yet' with a link to the creating page when value is 0 (AC DASH-04.4)", () => {
  renderTile({ value: 0, emptyHref: "/teams" });

  expect(screen.getByText("No data yet")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Add one" })).toHaveAttribute(
    "href",
    "/teams"
  );
});

test("renders a custom empty-link label when emptyLinkLabel is given", () => {
  renderTile({ value: null, emptyHref: "/calendar", emptyLinkLabel: "View calendar" });

  expect(screen.getByRole("link", { name: "View calendar" })).toHaveAttribute(
    "href",
    "/calendar"
  );
});

test("renders 'No data yet' when value is null, even without an emptyHref", () => {
  renderTile({ value: null });

  expect(screen.getByText("No data yet")).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

test("renders a loading placeholder instead of 0 while loading (edge case)", () => {
  renderTile({ value: 0, loading: true });

  expect(screen.queryByText("No data yet")).not.toBeInTheDocument();
  expect(screen.queryByText("0")).not.toBeInTheDocument();
  expect(screen.getByText("—")).toBeInTheDocument();
});

test("renders as a focusable link when href is given, reachable by Tab", async () => {
  const user = userEvent.setup();
  renderTile({ value: 4, href: "/calendar" });

  await user.tab();

  const link = screen.getByRole("link", { name: /Teams/ });
  expect(link).toHaveAttribute("href", "/calendar");
  expect(link).toHaveFocus();
});

test("renders as a focusable button when onClick is given, reachable by Tab", async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();
  renderTile({ value: 4, onClick });

  await user.tab();
  const button = screen.getByRole("button", { name: /Teams/ });
  expect(button).toHaveFocus();

  await user.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("renders as a plain, non-interactive tile when neither href nor onClick is given", () => {
  renderTile({ value: 4 });

  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("renders through the shared Tile surface (h-full present) when populated (AC DGRID-04.1)", () => {
  renderTile({ value: 4 });

  expect(screen.getByText("Teams").parentElement.className).toMatch(/\bh-full\b/);
});

test("the loading skeleton occupies the same surface class as the populated state (AC DGRID-05.2)", () => {
  const { unmount } = renderTile({ value: 4 });
  const populatedClass = screen.getByText("Teams").parentElement.className;
  unmount();

  renderTile({ value: 4, loading: true });
  const loadingClass = screen.getByText("Teams").parentElement.className;

  expect(loadingClass).toBe(populatedClass);
});

test("the empty state occupies the same surface class as the populated state (AC DGRID-05.3)", () => {
  const { unmount } = renderTile({ value: 4 });
  const populatedClass = screen.getByText("Teams").parentElement.className;
  unmount();

  renderTile({ value: 0 });
  const emptyClass = screen.getByText("Teams").parentElement.className;

  expect(emptyClass).toBe(populatedClass);
});

test("an interactive tile's surface class matches the plain tile's surface class (AC DGRID-04.4)", () => {
  const { unmount } = renderTile({ value: 4 });
  const plainClass = screen.getByText("Teams").parentElement.className;
  unmount();

  renderTile({ value: 4, href: "/calendar" });
  const linkClass = screen.getByText("Teams").parentElement.className;

  expect(linkClass).toContain(plainClass);
});
