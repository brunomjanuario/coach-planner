import { useState } from "react";
import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import Settings from "../Settings";
import { teamService } from "../../services/teamService";
import { AuthProvider } from "../../context/AuthContext";
import { useAuth } from "../../context/useAuth";

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

// Mirrors App.jsx's PrivateRoute: don't mount children until AuthProvider's
// mount-time localStorage read has resolved, so `user` is never null here —
// exactly the guarantee the real route guard gives Settings in production.
function Gate({ children }) {
  const { loading } = useAuth();
  if (loading) return null;
  return children;
}

function render(ui, { initialEntries = ["/settings"] } = {}) {
  return rtlRender(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Gate>
          {ui}
          <LocationDisplay />
        </Gate>
      </AuthProvider>
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

test("switching to Advanced shows its panel and hides Profile's", async () => {
  const user = userEvent.setup();
  render(<Settings />);

  await goToAdvanced(user);

  expect(
    screen.getByRole("button", { name: "Reset demo data" })
  ).toBeInTheDocument();
  expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
});

test("switching back to Profile hides the Advanced panel again", async () => {
  const user = userEvent.setup();
  render(<Settings />);

  await goToAdvanced(user);
  await user.click(screen.getByRole("tab", { name: "Profile" }));

  expect(screen.getByLabelText("Name")).toBeInTheDocument();
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

describe("profile name/email form", () => {
  test("renders editable name and email fields pre-filled with the current values", () => {
    render(<Settings />);

    expect(screen.getByLabelText("Name")).toHaveValue("Coach Bruno");
    expect(screen.getByLabelText("Email")).toHaveValue("user@email.com");
  });

  test("saving a changed name persists it and reflects it in the UI without a page reload", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Settings />);

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "New Name");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText("Name")).toHaveValue("New Name");

    // Re-mount the same tree (an SPA navigation, not a browser reload) to
    // confirm the new name was actually persisted, not just left in the input.
    unmount();
    render(<Settings />);
    expect(screen.getByLabelText("Name")).toHaveValue("New Name");
  });

  test("an invalid email is rejected with a message and saves nothing", async () => {
    const user = userEvent.setup();
    render(<Settings />);

    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a valid email address"
    );
    expect(JSON.parse(localStorage.getItem("user")).email).toBe(
      "user@email.com"
    );
  });

  test("an empty name is rejected with a message and saves nothing", async () => {
    const user = userEvent.setup();
    render(<Settings />);

    await user.clear(screen.getByLabelText("Name"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Name cannot be empty"
    );
    const stored = JSON.parse(localStorage.getItem("user"));
    expect(stored.name).toBeUndefined();
    expect(stored.username).toBe("Coach Bruno");
  });

  test("a failed save keeps the typed values in the form", async () => {
    const user = userEvent.setup();
    render(<Settings />);

    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText("Email")).toHaveValue("not-an-email");
  });

  test("a successful save renders an explicit confirmation", async () => {
    const user = userEvent.setup();
    render(<Settings />);

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "New Name");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("status")).toHaveTextContent("Profile updated");
  });

  test("the read-only display from feature 23 is replaced, not duplicated", () => {
    render(<Settings />);

    expect(
      screen.queryByText("Editing your profile is coming soon.")
    ).not.toBeInTheDocument();
    expect(screen.getAllByDisplayValue("user@email.com")).toHaveLength(1);
  });
});

describe("password form", () => {
  // SIGNED_IN_USER has no stored password, so it falls back to the demo
  // password ("password") — see AuthContext's PROF-01.4 behaviour.
  const CURRENT_PASSWORD = "password";

  test("current, new and confirm render as password inputs", () => {
    render(<Settings />);

    expect(screen.getByLabelText("Current password")).toHaveAttribute(
      "type",
      "password"
    );
    expect(screen.getByLabelText("New password")).toHaveAttribute(
      "type",
      "password"
    );
    expect(screen.getByLabelText("Confirm new password")).toHaveAttribute(
      "type",
      "password"
    );
  });

  test("a wrong current password renders its own message", async () => {
    const user = userEvent.setup();
    render(<Settings />);

    await user.type(screen.getByLabelText("Current password"), "wrong");
    await user.type(screen.getByLabelText("New password"), "newpass");
    await user.type(screen.getByLabelText("Confirm new password"), "newpass");
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Current password is incorrect"
    );
  });

  test("a mismatched confirmation renders its own, different message", async () => {
    const user = userEvent.setup();
    render(<Settings />);

    await user.type(
      screen.getByLabelText("Current password"),
      CURRENT_PASSWORD
    );
    await user.type(screen.getByLabelText("New password"), "newpass");
    await user.type(
      screen.getByLabelText("Confirm new password"),
      "different"
    );
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "New passwords do not match"
    );
  });

  test("an empty new password renders its own, different message", async () => {
    const user = userEvent.setup();
    render(<Settings />);

    await user.type(
      screen.getByLabelText("Current password"),
      CURRENT_PASSWORD
    );
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "New password cannot be empty"
    );
  });

  test("a successful change clears all three fields, confirms, and keeps the user signed in", async () => {
    const user = userEvent.setup();
    render(<Settings />);

    await user.type(
      screen.getByLabelText("Current password"),
      CURRENT_PASSWORD
    );
    await user.type(screen.getByLabelText("New password"), "newpass");
    await user.type(screen.getByLabelText("Confirm new password"), "newpass");
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(screen.getByRole("status")).toHaveTextContent("Password updated");
    expect(screen.getByLabelText("Current password")).toHaveValue("");
    expect(screen.getByLabelText("New password")).toHaveValue("");
    expect(screen.getByLabelText("Confirm new password")).toHaveValue("");
    // Still signed in: the Profile panel (with its own form) is still on screen.
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  test("a failed change leaves the fields as typed", async () => {
    const user = userEvent.setup();
    render(<Settings />);

    await user.type(screen.getByLabelText("Current password"), "wrong");
    await user.type(screen.getByLabelText("New password"), "newpass");
    await user.type(screen.getByLabelText("Confirm new password"), "newpass");
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(screen.getByLabelText("Current password")).toHaveValue("wrong");
    expect(screen.getByLabelText("New password")).toHaveValue("newpass");
    expect(screen.getByLabelText("Confirm new password")).toHaveValue(
      "newpass"
    );
  });

  test("is a separate form from the name/email form — submitting one does not submit the other", async () => {
    const user = userEvent.setup();
    render(<Settings />);

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "New Name");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      screen.getByLabelText("Current password").closest("form")
    ).not.toBe(screen.getByLabelText("Name").closest("form"));
    expect(screen.getByLabelText("Current password")).toHaveValue("");
  });
});

// A minimal sign-in/sign-out harness for the round-trip test below — Settings
// alone can't prove the credential round trip, since sign-in/sign-out live
// outside it. This mirrors how App.jsx swaps Settings for SignIn once `user`
// goes null, without depending on either page's own routing.
function RoundTripHarness() {
  const { user, signOut, signIn } = useAuth();
  const [creds, setCreds] = useState({ email: "", password: "" });
  const [result, setResult] = useState(null);

  if (!user) {
    return (
      <div>
        <label htmlFor="rt-email">Sign-in email</label>
        <input
          id="rt-email"
          value={creds.email}
          onChange={(e) =>
            setCreds((c) => ({ ...c, email: e.target.value }))
          }
        />
        <label htmlFor="rt-password">Sign-in password</label>
        <input
          id="rt-password"
          type="password"
          value={creds.password}
          onChange={(e) =>
            setCreds((c) => ({ ...c, password: e.target.value }))
          }
        />
        <button
          type="button"
          onClick={() => setResult(signIn(creds.email, creds.password))}
        >
          Attempt sign in
        </button>
        {result && (
          <p data-testid="signin-result">
            {result.success ? "success" : result.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <Settings />
      <button type="button" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}

test("change the email and password, sign out, then the old pair is rejected and the new pair signs in (AC PROF-04.6)", async () => {
  const user = userEvent.setup();
  rtlRender(
    <MemoryRouter initialEntries={["/settings"]}>
      <AuthProvider>
        <Gate>
          <RoundTripHarness />
        </Gate>
      </AuthProvider>
    </MemoryRouter>
  );

  await user.clear(screen.getByLabelText("Email"));
  await user.type(screen.getByLabelText("Email"), "new@club.pt");
  await user.click(screen.getByRole("button", { name: "Save" }));

  await user.type(screen.getByLabelText("Current password"), "password");
  await user.type(screen.getByLabelText("New password"), "newpass");
  await user.type(screen.getByLabelText("Confirm new password"), "newpass");
  await user.click(screen.getByRole("button", { name: "Change password" }));

  await user.click(screen.getByRole("button", { name: "Sign out" }));

  await user.type(screen.getByLabelText("Sign-in email"), "user@email.com");
  await user.type(screen.getByLabelText("Sign-in password"), "password");
  await user.click(screen.getByRole("button", { name: "Attempt sign in" }));
  expect(screen.getByTestId("signin-result")).toHaveTextContent(
    "Invalid email or password"
  );

  await user.clear(screen.getByLabelText("Sign-in email"));
  await user.type(screen.getByLabelText("Sign-in email"), "new@club.pt");
  await user.clear(screen.getByLabelText("Sign-in password"));
  await user.type(screen.getByLabelText("Sign-in password"), "newpass");
  await user.click(screen.getByRole("button", { name: "Attempt sign in" }));
  // A successful sign-in swaps the harness back to Settings, so the
  // sign-in form (and its result text) is gone — Settings reappearing is
  // itself the proof the new pair worked.
  expect(screen.getByLabelText("Name")).toBeInTheDocument();
});

test("editing the profile and then resetting demo data leaves the profile unchanged and the user still signed in", async () => {
  const user = userEvent.setup();
  render(<Settings />);

  await user.clear(screen.getByLabelText("Name"));
  await user.type(screen.getByLabelText("Name"), "New Name");
  await user.click(screen.getByRole("button", { name: "Save" }));

  await goToAdvanced(user);
  await user.click(screen.getByRole("button", { name: "Reset demo data" }));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  await user.click(screen.getByRole("tab", { name: "Profile" }));
  expect(screen.getByLabelText("Name")).toHaveValue("New Name");
});

test("does not declare its own h-screen or min-h-screen — the app shell owns that (AC SHELL-03.1)", () => {
  const { container } = render(<Settings />);

  expect(container.querySelector(".h-screen")).not.toBeInTheDocument();
  expect(container.querySelector(".min-h-screen")).not.toBeInTheDocument();
});

test("has no overflow-y-auto container of its own — the shell's <main> is the only scroll region (AC SHELL-03.2)", () => {
  const { container } = render(<Settings />);

  expect(container.querySelector(".overflow-y-auto")).not.toBeInTheDocument();
});
