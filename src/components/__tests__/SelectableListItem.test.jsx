import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SelectableListItem from "../SelectableListItem";

function renderItem(props = {}) {
  return render(
    <ul>
      <SelectableListItem selected={false} onSelect={() => {}} {...props}>
        Row content
      </SelectableListItem>
    </ul>
  );
}

test("selected row renders the accent background and left border bar", () => {
  renderItem({ selected: true });

  const button = screen.getByRole("button", { name: "Row content" });
  expect(button.className).toContain("bg-selected");
  expect(button.className).toContain("border-selected-border");
});

test("hovered-not-selected row renders the hover token and not the selected background", () => {
  renderItem({ selected: false });

  const button = screen.getByRole("button", { name: "Row content" });
  expect(button.className).toContain("hover:bg-hover");
  expect(button.className).not.toContain("bg-selected");
});

test("selected row keeps selected styling dominant and carries no hover class", () => {
  renderItem({ selected: true });

  const button = screen.getByRole("button", { name: "Row content" });
  expect(button.className).not.toContain("hover:bg-hover");
  expect(button.className).toContain("bg-selected");
});

test("sets aria-current to true when selected", () => {
  renderItem({ selected: true });

  expect(screen.getByRole("button", { name: "Row content" })).toHaveAttribute(
    "aria-current",
    "true"
  );
});

test("does not set aria-current when not selected", () => {
  renderItem({ selected: false });

  expect(
    screen.getByRole("button", { name: "Row content" })
  ).not.toHaveAttribute("aria-current");
});

test("clicking the row invokes onSelect exactly once", async () => {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  renderItem({ onSelect });

  await user.click(screen.getByRole("button", { name: "Row content" }));

  expect(onSelect).toHaveBeenCalledTimes(1);
});

test("pressing Enter while focused invokes onSelect", async () => {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  renderItem({ onSelect });

  screen.getByRole("button", { name: "Row content" }).focus();
  await user.keyboard("{Enter}");

  expect(onSelect).toHaveBeenCalledTimes(1);
});

test("pressing Space while focused invokes onSelect", async () => {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  renderItem({ onSelect });

  screen.getByRole("button", { name: "Row content" }).focus();
  await user.keyboard(" ");

  expect(onSelect).toHaveBeenCalledTimes(1);
});

test("row is a focusable button reachable by Tab, with the border bar present regardless of selection", async () => {
  const user = userEvent.setup();
  renderItem({ selected: false });

  await user.tab();

  const button = screen.getByRole("button", { name: "Row content" });
  expect(button).toHaveFocus();
  expect(button.className).toContain("border-l-4");
});
