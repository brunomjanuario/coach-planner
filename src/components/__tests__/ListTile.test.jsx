import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import ListTile from "../ListTile";

function renderTile(props = {}) {
  return render(
    <MemoryRouter>
      <ListTile label="Teams" {...props} />
    </MemoryRouter>
  );
}

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

const rows = [
  { id: 1, label: "Amadora Sub-11", href: "/teams?team=1" },
  { id: 2, label: "Areias Sub-19", href: "/teams?team=2" },
];

test("renders both the count and the rows beneath it (AC DTILE-01.1)", () => {
  renderTile({ count: 5, rows });

  expect(screen.getByText("5")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Amadora Sub-11" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Areias Sub-19" })).toBeInTheDocument();
});

test("renders a breakdown line alongside the count when given", () => {
  renderTile({ count: 5, rows, breakdown: "2 past · 3 upcoming" });

  expect(screen.getByText("2 past · 3 upcoming")).toBeInTheDocument();
});

test("renders a +N more indicator matching the given overflow (AC DTILE-01.4)", () => {
  renderTile({ count: 5, rows, overflow: 2 });

  expect(screen.getByText("+2 more")).toBeInTheDocument();
});

test("renders no overflow indicator when overflow is 0 (edge case)", () => {
  renderTile({ count: 2, rows, overflow: 0 });

  expect(screen.queryByText(/more$/)).not.toBeInTheDocument();
});

test("each row is a Link carrying its href and a visible focus class (AC DTILE-03.4)", () => {
  renderTile({ count: 5, rows });

  const link = screen.getByRole("link", { name: "Amadora Sub-11" });
  expect(link).toHaveAttribute("href", "/teams?team=1");
  expect(link.className).toMatch(/focus:outline/);
});

test("renders the empty state and emptyHref link when count is 0 (AC DTILE-01.5)", () => {
  renderTile({ count: 0, rows: [], emptyHref: "/teams", emptyLinkLabel: "Add one" });

  expect(screen.getByText("No data yet")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Add one" })).toHaveAttribute("href", "/teams");
  expect(screen.queryByRole("link", { name: "Amadora Sub-11" })).not.toBeInTheDocument();
});

test("renders the empty state when count is null, not a rendered 'null'", () => {
  renderTile({ count: null, rows: [] });

  expect(screen.getByText("No data yet")).toBeInTheDocument();
});

test("renders the same loading skeleton as StatTile so the grid does not jump (edge case)", () => {
  renderTile({ count: 5, rows, loading: true });

  const skeleton = screen.getByText("—");
  expect(skeleton).toHaveAttribute("aria-hidden", "true");
  expect(skeleton.className).toMatch(/text-2xl/);
  expect(skeleton.className).toMatch(/text-gray-300/);
  expect(screen.queryByText("5")).not.toBeInTheDocument();
});

test("a 'past' basis renders a 'most recent' note", () => {
  renderTile({ count: 3, rows, basis: "past" });

  expect(screen.getByText("most recent")).toBeInTheDocument();
});

test("an 'upcoming' basis renders no note (edge case)", () => {
  renderTile({ count: 3, rows, basis: "upcoming" });

  expect(screen.queryByText("most recent")).not.toBeInTheDocument();
});

test("a long row label wraps and carries no truncation class (edge case)", () => {
  const longLabel = "A Very Long Club Name That Could Plausibly Wrap Across Lines FC";
  renderTile({
    count: 1,
    rows: [{ id: 1, label: longLabel, href: "/teams?team=1" }],
  });

  const link = screen.getByRole("link", { name: longLabel });
  expect(link.className).toMatch(/break-words/);
  expect(link.className).not.toMatch(/truncate/);
});

test("a row activates on Enter, navigating to its href (AC DTILE-03.4)", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<ListTile label="Teams" count={5} rows={rows} />} />
        <Route path="/teams" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>
  );

  await user.tab();
  expect(screen.getByRole("link", { name: "Amadora Sub-11" })).toHaveFocus();
  await user.keyboard("{Enter}");

  expect(await screen.findByTestId("location")).toHaveTextContent("/teams?team=1");
});

test("renders rows in the order given, without re-sorting", () => {
  const { container } = renderTile({
    count: 2,
    rows: [
      { id: 2, label: "Second", href: "/teams?team=2" },
      { id: 1, label: "First", href: "/teams?team=1" },
    ],
  });

  const links = within(container).getAllByRole("link").map((l) => l.textContent);
  expect(links).toEqual(["Second", "First"]);
});

test("carries the shared minimum-height class in populated, empty and loading states (AC DFILT-01.1, DFILT-01.5)", () => {
  const { unmount } = renderTile({ count: 5, rows });
  expect(screen.getByText("Teams").parentElement.className).toMatch(/min-h-36/);
  unmount();

  const { unmount: unmountEmpty } = renderTile({ count: 0, rows: [] });
  expect(screen.getByText("Teams").parentElement.className).toMatch(/min-h-36/);
  unmountEmpty();

  renderTile({ count: 5, rows, loading: true });
  expect(screen.getByText("Teams").parentElement.className).toMatch(/min-h-36/);
});
