import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import Settings from "../Settings";
import { teamService } from "../../services/teamService";
import { AuthContext } from "../../context/AuthContextInstance";

const CONFIRM_MESSAGE =
  "Reset all data to the demo seed? This cannot be undone.";

const SIGNED_IN_USER = { username: "Coach Bruno", email: "user@email.com" };

beforeEach(() => {
  localStorage.setItem("user", JSON.stringify(SIGNED_IN_USER));
});

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

// PrivateRoute in App.jsx already guarantees a resolved, non-null user
// before Settings mounts in production — mirror that here instead of
// racing AuthProvider's async localStorage read on first render.
function render(ui, { initialEntries = ["/settings"] } = {}) {
  return rtlRender(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthContext.Provider value={{ user: SIGNED_IN_USER }}>
        {ui}
        <LocationDisplay />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

async function goToAdvanced(user) {
  await user.click(screen.getByRole("tab", { name: "Advanced" }));
}

test("opens on the Profile tab and the reset button is not in the document", () => {
  render(<Settings />);

  expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  expect(
    screen.queryByRole("button", { name: "Reset demo data" })
  ).not.toBeInTheDocument();
});

test("the Profile panel shows the signed-in user's name and email read-only", () => {
  render(<Settings />);

  expect(screen.getByText("Coach Bruno")).toBeInTheDocument();
  expect(screen.getByText("user@email.com")).toBeInTheDocument();
  expect(
    screen.queryByRole("textbox")
  ).not.toBeInTheDocument();
});

test("switching to Advanced shows its panel and hides Profile's", async () => {
  const user = userEvent.setup();
  render(<Settings />);

  await goToAdvanced(user);

  expect(
    screen.getByRole("button", { name: "Reset demo data" })
  ).toBeInTheDocument();
  expect(screen.queryByText("Coach Bruno")).not.toBeInTheDocument();
});

test("switching back to Profile hides the Advanced panel again", async () => {
  const user = userEvent.setup();
  render(<Settings />);

  await goToAdvanced(user);
  await user.click(screen.getByRole("tab", { name: "Profile" }));

  expect(screen.getByText("Coach Bruno")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Reset demo data" })
  ).not.toBeInTheDocument();
});

test("selecting a tab marks only that tab selected", async () => {
  const user = userEvent.setup();
  render(<Settings />);

  await goToAdvanced(user);

  expect(screen.getByRole("tab", { name: "Advanced" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute(
    "aria-selected",
    "false"
  );
});

test("the Advanced panel explains what reset does before it is clicked", async () => {
  const user = userEvent.setup();
  render(<Settings />);

  await goToAdvanced(user);

  expect(
    screen.getByText(/resetting clears all your teams, players, trainings/i)
  ).toBeInTheDocument();
});

test("clicking reset on Advanced opens a confirmation popup without resetting anything yet", async () => {
  const user = userEvent.setup();
  await teamService.create({
    name: "Extra",
    club: "Extra",
    season: "24/25",
    players: [],
  });

  render(<Settings />);
  await goToAdvanced(user);
  await user.click(screen.getByRole("button", { name: "Reset demo data" }));

  expect(screen.getByText(CONFIRM_MESSAGE)).toBeInTheDocument();
  const teams = await teamService.getAll();
  expect(teams).toHaveLength(3);
});

test("confirming the popup clears stored data and re-seeds", async () => {
  const user = userEvent.setup();
  await teamService.create({
    name: "Extra",
    club: "Extra",
    season: "24/25",
    players: [],
  });

  render(<Settings />);
  await goToAdvanced(user);
  await user.click(screen.getByRole("button", { name: "Reset demo data" }));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  const teams = await teamService.getAll();
  expect(teams.map((t) => t.name)).toEqual(["Sub-11", "Sub-19"]);
});

test("confirming the popup leaves the auth session untouched", async () => {
  const user = userEvent.setup();

  render(<Settings />);
  await goToAdvanced(user);
  await user.click(screen.getByRole("button", { name: "Reset demo data" }));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(JSON.parse(localStorage.getItem("user"))).toEqual({
    username: "Coach Bruno",
    email: "user@email.com",
  });
});

test("canceling the popup changes nothing", async () => {
  const user = userEvent.setup();
  await teamService.create({
    name: "Extra",
    club: "Extra",
    season: "24/25",
    players: [],
  });

  render(<Settings />);
  await goToAdvanced(user);
  await user.click(screen.getByRole("button", { name: "Reset demo data" }));
  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByText(CONFIRM_MESSAGE)).not.toBeInTheDocument();
  const teams = await teamService.getAll();
  expect(teams.map((t) => t.name)).toEqual(["Sub-11", "Sub-19", "Extra"]);
});

test("after a reset the page stays on the Advanced tab", async () => {
  const user = userEvent.setup();

  render(<Settings />);
  await goToAdvanced(user);
  await user.click(screen.getByRole("button", { name: "Reset demo data" }));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(screen.getByRole("tab", { name: "Advanced" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  expect(
    screen.getByRole("button", { name: "Reset demo data" })
  ).toBeInTheDocument();
});

test("declining to reset leaves the tab on Advanced and nothing changed", async () => {
  const user = userEvent.setup();

  render(<Settings />);
  await goToAdvanced(user);
  await user.click(screen.getByRole("button", { name: "Reset demo data" }));
  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.getByRole("tab", { name: "Advanced" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
});

test("?tab=advanced in the URL opens the Advanced panel", () => {
  render(<Settings />, { initialEntries: ["/settings?tab=advanced"] });

  expect(screen.getByRole("tab", { name: "Advanced" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  expect(
    screen.getByRole("button", { name: "Reset demo data" })
  ).toBeInTheDocument();
});

test("selecting a tab updates the URL with no page reload", async () => {
  const user = userEvent.setup();
  render(<Settings />);

  await goToAdvanced(user);

  expect(screen.getByTestId("location")).toHaveTextContent(
    "/settings?tab=advanced"
  );
});

test("an unrecognised tab value falls back to Profile without an error", () => {
  render(<Settings />, { initialEntries: ["/settings?tab=bogus"] });

  expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  expect(
    screen.queryByRole("button", { name: "Reset demo data" })
  ).not.toBeInTheDocument();
});

test("a missing tab param opens Profile", () => {
  render(<Settings />, { initialEntries: ["/settings"] });

  expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
});

test("reopening the page with the same URL restores the same tab", () => {
  render(<Settings />, { initialEntries: ["/settings?tab=advanced"] });

  expect(screen.getByRole("tab", { name: "Advanced" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
});
