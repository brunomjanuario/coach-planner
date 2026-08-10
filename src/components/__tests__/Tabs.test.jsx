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

test("the strip renders as a segmented track with a background and radius, not a border-bottom hairline (AC TABUI-01.1)", () => {
  render(<Tabs tabs={TABS} active="profile" onChange={() => {}} />);

  const tablist = screen.getByRole("tablist");
  expect(tablist.className).toMatch(/bg-gray-100/);
  expect(tablist.className).toMatch(/rounded-lg/);
  screen.getAllByRole("tab").forEach((tab) => {
    expect(tab.className).not.toMatch(/border-b-2/);
  });
});

test("the active tab carries the pill class set and the inactive tab does not (AC TABUI-01.2, TABUI-01.3)", () => {
  render(<Tabs tabs={TABS} active="profile" onChange={() => {}} />);

  const activeTab = screen.getByRole("tab", { name: "Profile" });
  const inactiveTab = screen.getByRole("tab", { name: "Advanced" });
  expect(activeTab.className).toMatch(/bg-white/);
  expect(activeTab.className).toMatch(/shadow-sm/);
  expect(inactiveTab.className).not.toMatch(/bg-white/);
  expect(inactiveTab.className).not.toMatch(/shadow-sm/);
});

test("switching the active tab swaps the pill class set", () => {
  const { rerender } = render(
    <Tabs tabs={TABS} active="profile" onChange={() => {}} />
  );

  expect(screen.getByRole("tab", { name: "Profile" }).className).toMatch(
    /bg-white/
  );
  expect(screen.getByRole("tab", { name: "Advanced" }).className).not.toMatch(
    /bg-white/
  );

  rerender(<Tabs tabs={TABS} active="advanced" onChange={() => {}} />);

  expect(screen.getByRole("tab", { name: "Advanced" }).className).toMatch(
    /bg-white/
  );
  expect(screen.getByRole("tab", { name: "Profile" }).className).not.toMatch(
    /bg-white/
  );
});

test("neither state carries font-semibold, so no tab's width changes on select (AC TABUI-01.4)", () => {
  render(<Tabs tabs={TABS} active="profile" onChange={() => {}} />);

  screen.getAllByRole("tab").forEach((tab) => {
    expect(tab.className).not.toMatch(/font-semibold/);
  });
});

test("the focus-ring class is present on both the active and the inactive tab (AC TABUI-01.5)", () => {
  render(<Tabs tabs={TABS} active="profile" onChange={() => {}} />);

  const activeTab = screen.getByRole("tab", { name: "Profile" });
  const inactiveTab = screen.getByRole("tab", { name: "Advanced" });
  expect(activeTab.className).toMatch(/focus:outline/);
  expect(inactiveTab.className).toMatch(/focus:outline/);
});

test("the inactive tab carries a hover class (AC TABUI-01.3)", () => {
  render(<Tabs tabs={TABS} active="profile" onChange={() => {}} />);

  expect(screen.getByRole("tab", { name: "Advanced" }).className).toMatch(
    /hover:/
  );
});

test("a long label does not force truncation and the strip keeps its horizontal-scroll class (edge case)", () => {
  const longLabelTabs = [
    { id: "profile", label: "Profile", panel: <p>Profile content</p> },
    {
      id: "advanced",
      label: "A very long tab label that would overflow a narrow strip",
      panel: <p>Advanced content</p>,
    },
  ];
  render(<Tabs tabs={longLabelTabs} active="profile" onChange={() => {}} />);

  expect(
    screen.getByText(
      "A very long tab label that would overflow a narrow strip"
    )
  ).toBeInTheDocument();
  expect(screen.getByRole("tablist").className).toMatch(/overflow-x-auto/);
});
