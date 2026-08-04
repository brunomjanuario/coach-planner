import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Tile from "../Tile";

function renderTile(props = {}) {
  return render(
    <MemoryRouter>
      <Tile label="Teams" {...props}>
        <div>Body</div>
      </Tile>
    </MemoryRouter>
  );
}

test("renders the surface, the label row and the body (AC DGRID-04.1)", () => {
  renderTile();

  expect(screen.getByText("Teams")).toBeInTheDocument();
  expect(screen.getByText("Body")).toBeInTheDocument();
});

test("the surface carries h-full so a stretched grid cell is filled (AC DGRID-01.2)", () => {
  renderTile();

  expect(screen.getByText("Teams").parentElement.className).toMatch(/\bh-full\b/);
});

test("passing href renders a Link, not a div or button (AC DGRID-04.4)", () => {
  renderTile({ href: "/teams" });

  const link = screen.getByRole("link");
  expect(link).toHaveAttribute("href", "/teams");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("passing onClick renders a button, not a div or link (AC DGRID-04.4)", () => {
  const onClick = vi.fn();
  renderTile({ onClick });

  expect(screen.getByRole("button")).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

test("neither href nor onClick renders a plain, non-interactive surface", () => {
  renderTile();

  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("passing both href and onClick is a defined outcome: href wins", () => {
  const onClick = vi.fn();
  renderTile({ href: "/teams", onClick });

  expect(screen.getByRole("link")).toHaveAttribute("href", "/teams");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("focus/hover styling comes from the shared definition for the Link variant (AC DGRID-04.4)", () => {
  renderTile({ href: "/teams" });

  const link = screen.getByRole("link");
  expect(link.className).toMatch(/hover:bg-gray-50/);
  expect(link.className).toMatch(/focus:outline-2/);
});

test("focus/hover styling comes from the shared definition for the button variant (AC DGRID-04.4)", () => {
  renderTile({ onClick: vi.fn() });

  const button = screen.getByRole("button");
  expect(button.className).toMatch(/hover:bg-gray-50/);
  expect(button.className).toMatch(/focus:outline-2/);
});

test("the label is rendered as the same element and typography for every variant", () => {
  const { unmount } = renderTile();
  const plainLabelClass = screen.getByText("Teams").className;
  unmount();

  renderTile({ href: "/teams" });
  const linkLabelClass = screen.getByText("Teams").className;

  expect(linkLabelClass).toBe(plainLabelClass);
});

test("renders an optional note under the label", () => {
  renderTile({ note: "Team appearances, not individual" });

  expect(screen.getByText("Team appearances, not individual")).toBeInTheDocument();
});

test("renders no note element when none is given", () => {
  const { container } = renderTile();

  expect(container.textContent).not.toContain("appearances");
});
