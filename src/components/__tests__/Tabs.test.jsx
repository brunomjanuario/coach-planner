import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import Tabs from "../Tabs";

const TABS = [
  { id: "profile", label: "Profile", panel: <p>Profile content</p> },
  { id: "advanced", label: "Advanced", panel: <p>Advanced content</p> },
];

function ControlledTabs({ initial = "profile" }) {
  const [active, setActive] = useState(initial);
  return <Tabs tabs={TABS} active={active} onChange={setActive} />;
}

test("renders a tablist with one tab per entry", () => {
  render(<Tabs tabs={TABS} active="profile" onChange={() => {}} />);

  expect(screen.getByRole("tablist")).toBeInTheDocument();
  expect(screen.getAllByRole("tab")).toHaveLength(2);
});

test("only the active tab is marked selected", () => {
  render(<Tabs tabs={TABS} active="profile" onChange={() => {}} />);

  expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  expect(screen.getByRole("tab", { name: "Advanced" })).toHaveAttribute(
    "aria-selected",
    "false"
  );
});

test("switching active flips which tab is selected", () => {
  render(<Tabs tabs={TABS} active="advanced" onChange={() => {}} />);

  expect(screen.getByRole("tab", { name: "Advanced" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute(
    "aria-selected",
    "false"
  );
});

test("exactly one tabpanel is in the document", () => {
  render(<Tabs tabs={TABS} active="profile" onChange={() => {}} />);

  expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
});

test("the active tab's panel is wired via aria-controls/aria-labelledby", () => {
  render(<Tabs tabs={TABS} active="advanced" onChange={() => {}} />);

  const tab = screen.getByRole("tab", { name: "Advanced" });
  const panel = screen.getByRole("tabpanel");
  expect(tab).toHaveAttribute("aria-controls", panel.id);
  expect(panel).toHaveAttribute("aria-labelledby", tab.id);
});

test("only the active tab's panel content renders", () => {
  render(<Tabs tabs={TABS} active="profile" onChange={() => {}} />);

  expect(screen.getByText("Profile content")).toBeInTheDocument();
  expect(screen.queryByText("Advanced content")).not.toBeInTheDocument();
});

test("clicking a tab calls onChange with that tab's id", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<Tabs tabs={TABS} active="profile" onChange={onChange} />);

  await user.click(screen.getByRole("tab", { name: "Advanced" }));

  expect(onChange).toHaveBeenCalledWith("advanced");
});

test("clicking a tab does not change state on its own — the parent owns it", async () => {
  const user = userEvent.setup();
  render(<Tabs tabs={TABS} active="profile" onChange={() => {}} />);

  await user.click(screen.getByRole("tab", { name: "Advanced" }));

  expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
});

test("ArrowRight moves focus to the next tab", async () => {
  const user = userEvent.setup();
  render(<ControlledTabs />);

  screen.getByRole("tab", { name: "Profile" }).focus();
  await user.keyboard("{ArrowRight}");

  expect(screen.getByRole("tab", { name: "Advanced" })).toHaveFocus();
});

test("ArrowRight wraps from the last tab to the first", async () => {
  const user = userEvent.setup();
  render(<ControlledTabs initial="advanced" />);

  screen.getByRole("tab", { name: "Advanced" }).focus();
  await user.keyboard("{ArrowRight}");

  expect(screen.getByRole("tab", { name: "Profile" })).toHaveFocus();
});

test("ArrowLeft wraps from the first tab to the last", async () => {
  const user = userEvent.setup();
  render(<ControlledTabs initial="profile" />);

  screen.getByRole("tab", { name: "Profile" }).focus();
  await user.keyboard("{ArrowLeft}");

  expect(screen.getByRole("tab", { name: "Advanced" })).toHaveFocus();
});

test("a visible focus indicator class is present on each tab", () => {
  render(<Tabs tabs={TABS} active="profile" onChange={() => {}} />);

  screen.getAllByRole("tab").forEach((tab) => {
    expect(tab.className).toMatch(/focus:outline/);
  });
});

test("the tablist stays reachable rather than clipped at a narrow width", () => {
  render(<Tabs tabs={TABS} active="profile" onChange={() => {}} />);

  expect(screen.getByRole("tablist").className).toMatch(/overflow-x-auto/);
});
