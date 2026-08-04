import { render, screen } from "@testing-library/react";
import PopupShell from "../PopupShell";

function renderShell(props = {}) {
  return render(
    <PopupShell title="Test Title" {...props}>
      <p>Body content</p>
    </PopupShell>
  );
}

test("renders overlay, panel, title, scrollable body and footer in order (AC POPUP-04.1)", () => {
  const { container } = renderShell({ footer: <button>Save</button> });

  const overlay = container.firstChild;
  expect(overlay.className).toMatch(/fixed inset-0/);
  const panel = overlay.firstChild;
  expect(panel).toHaveAttribute("role", "dialog");
  const [titleEl, bodyEl, footerEl] = panel.children;
  expect(titleEl).toHaveTextContent("Test Title");
  expect(bodyEl).toHaveTextContent("Body content");
  expect(footerEl).toHaveTextContent("Save");
});

test("the panel caps at 85vh and is a column flex container so the body can shrink (AC POPUP-01)", () => {
  const { container } = renderShell();

  const panel = container.querySelector('[role="dialog"]');
  expect(panel.className).toMatch(/max-h-\[85vh\]/);
  expect(panel.className).toMatch(/flex flex-col/);
});

test("the body region scrolls independently via overflow-y-auto and min-h-0 (AC POPUP-02.2)", () => {
  renderShell();

  const body = screen.getByText("Body content").parentElement;
  expect(body.className).toMatch(/overflow-y-auto/);
  expect(body.className).toMatch(/min-h-0/);
});

test("the title and footer are siblings of the scroll region, not inside it (AC POPUP-02.3, POPUP-02.4)", () => {
  renderShell({ footer: <button>Save</button> });

  const body = screen.getByText("Body content").parentElement;
  const title = screen.getByText("Test Title");
  const footerButton = screen.getByRole("button", { name: "Save" });

  expect(body).not.toContainElement(title);
  expect(body).not.toContainElement(footerButton);
  expect(body.parentElement).toBe(title.parentElement);
  expect(footerButton.closest("div").parentElement).toBe(title.parentElement);
});

test("omitting footer renders no action row and no divider (edge case)", () => {
  const { container } = renderShell();

  expect(container.querySelector(".border-t")).not.toBeInTheDocument();
});

test("a footer renders with a top border to separate it from the body", () => {
  renderShell({ footer: <button>Save</button> });

  const footerButton = screen.getByRole("button", { name: "Save" });
  expect(footerButton.closest("div").className).toMatch(/border-t/);
});

test("width overrides the default max-w-md (AC POPUP-04.4)", () => {
  const { container } = renderShell({ width: "max-w-2xl" });

  const panel = container.querySelector('[role="dialog"]');
  expect(panel.className).toMatch(/max-w-2xl/);
  expect(panel.className).not.toMatch(/max-w-md/);
});

test("defaults to max-w-md when no width is given", () => {
  const { container } = renderShell();

  const panel = container.querySelector('[role="dialog"]');
  expect(panel.className).toMatch(/max-w-md/);
});

test("the overlay keeps z-50 so a nested popup still stacks above it (edge case)", () => {
  const { container } = renderShell();

  expect(container.firstChild.className).toMatch(/z-50/);
});

test("renders as an accessible dialog labelled by its title", () => {
  renderShell();

  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveAttribute("aria-modal", "true");
  const labelledBy = dialog.getAttribute("aria-labelledby");
  expect(document.getElementById(labelledBy)).toHaveTextContent("Test Title");
});

test("a short popup has no fixed height class forcing it to fill the cap (AC POPUP-03)", () => {
  const { container } = renderShell();

  const panel = container.querySelector('[role="dialog"]');
  const classes = panel.className.split(/\s+/);
  expect(classes).not.toContain("h-[85vh]");
  expect(classes).toContain("max-h-[85vh]");
});
