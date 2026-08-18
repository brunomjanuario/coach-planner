import { useState } from "react";
import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import Settings from "../Settings";
import { teamService } from "../../services/teamService";
import { AuthProvider } from "../../context/AuthContext";
import { useAuth } from "../../context/useAuth";
import Tabs from "../../components/Tabs";
import { apiFetch, silentRefresh } from "../../lib/apiClient";
import { setTokens, clearTokens, getRefreshToken } from "../../lib/tokenStore";
import { ValidationError, AuthError } from "../../lib/errors";

// Spies on the real Tabs implementation (no behaviour change) so the tests
// below can assert exactly what `active` value Settings computed and passed
// down — independently of Tabs.jsx's own `tabs.find(...) ?? tabs[0]`
// fallback, which would otherwise rescue a bogus value and mask a removed
// TAB_IDS guard (AC TABUI-03.1, closing 23's SETT-04.3 test-strength gap).
vi.mock("../../components/Tabs", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, default: vi.fn(actual.default) };
});

// AuthContext now talks to the real API through apiClient.js. These tests
// don't run against a live backend, so apiFetch is mocked with a tiny
// in-memory fake that mimics the endpoints Settings/AuthContext exercise
// (GET/PATCH /users/me, PUT /users/me/password, POST /auth/login|logout).
vi.mock("../../lib/apiClient", () => ({
  apiFetch: vi.fn(),
  silentRefresh: vi.fn(),
}));

const CONFIRM_MESSAGE =
  "Reset all data to the demo seed? This cannot be undone.";

const DEFAULT_ACCOUNT = {
  id: "u1",
  name: "Coach Bruno",
  email: "user@email.com",
  password: "password",
};

let account;

function publicUser() {
  return { id: account.id, name: account.name, email: account.email };
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** A minimal fake backend behind apiFetch, stateful across calls within a test. */
function fakeBackend(path, { method = "GET", body } = {}) {
  if (path === "/users/me" && method === "GET") {
    return Promise.resolve(publicUser());
  }

  if (path === "/users/me" && method === "PATCH") {
    const { name, email } = body;
    if (!name || name.trim() === "") {
      return Promise.reject(new ValidationError("Name cannot be empty"));
    }
    if (!isValidEmail(email)) {
      return Promise.reject(new ValidationError("Enter a valid email address"));
    }
    account = { ...account, name, email };
    return Promise.resolve(publicUser());
  }

  if (path === "/users/me/password" && method === "PUT") {
    const { currentPassword, newPassword } = body;
    if (currentPassword !== account.password) {
      return Promise.reject(new ValidationError("Incorrect current password"));
    }
    if (!newPassword) {
      return Promise.reject(
        new ValidationError("Validation failed", {
          newPassword: "New password cannot be empty",
        })
      );
    }
    account = { ...account, password: newPassword };
    return Promise.resolve(null);
  }

  if (path === "/auth/login" && method === "POST") {
    const { email, password } = body;
    if (email !== account.email || password !== account.password) {
      return Promise.reject(new AuthError("Invalid email or password"));
    }
    return Promise.resolve({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: publicUser(),
    });
  }

  if (path === "/auth/logout" && method === "POST") {
    return Promise.resolve(null);
  }

  return Promise.reject(new Error(`Unhandled apiFetch call in test: ${method} ${path}`));
}

beforeEach(() => {
  account = { ...DEFAULT_ACCOUNT };
  apiFetch.mockReset();
  apiFetch.mockImplementation(fakeBackend);
  silentRefresh.mockReset();
  silentRefresh.mockResolvedValue("access-token");
  clearTokens();
  setTokens("access-token", "refresh-token");
});

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

// Mirrors App.jsx's PrivateRoute: don't mount children until AuthProvider's
// mount-time boot flow has resolved, so `user` is never null here — exactly
// the guarantee the real route guard gives Settings in production. Used only
// by the round-trip harness below, which needs to render its own inline
// sign-in UI once `user` goes null (production instead swaps routes, which
// this in-page harness deliberately doesn't depend on).
function Gate({ children }) {
  const { loading } = useAuth();
  if (loading) return null;
  return children;
}

// Same idea as Gate, but also unmounts once `user` goes null — the accurate
// mirror of PrivateRoute for pages like Settings that assume a signed-in
// user and would otherwise crash reading `user.name` after a sign-out
// triggered mid-test (e.g. a successful password change, F3 AC4).
function SettingsGate({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return null;
  return children;
}

async function render(ui, { initialEntries = ["/settings"] } = {}) {
  const utils = rtlRender(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <SettingsGate>
          {ui}
          <LocationDisplay />
        </SettingsGate>
      </AuthProvider>
    </MemoryRouter>
  );
  // AuthProvider's boot-time silent refresh is async (F1 AC6); wait for it
  // to resolve and SettingsGate to mount its children before interacting.
  await screen.findByText("Settings");
  return utils;
}

async function goToAdvanced(user) {
  await user.click(screen.getByRole("tab", { name: "Advanced" }));
}

test("opens on the Profile tab and the reset button is not in the document", async () => {
  await render(<Settings />);

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
  await render(<Settings />);

  await goToAdvanced(user);

  expect(
    screen.getByRole("button", { name: "Reset demo data" })
  ).toBeInTheDocument();
  expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
});

test("switching back to Profile hides the Advanced panel again", async () => {
  const user = userEvent.setup();
  await render(<Settings />);

  await goToAdvanced(user);
  await user.click(screen.getByRole("tab", { name: "Profile" }));

  expect(screen.getByLabelText("Name")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Reset demo data" })
  ).not.toBeInTheDocument();
});

test("selecting a tab marks only that tab selected", async () => {
  const user = userEvent.setup();
  await render(<Settings />);

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
  await render(<Settings />);

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

  await render(<Settings />);
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

  await render(<Settings />);
  await goToAdvanced(user);
  await user.click(screen.getByRole("button", { name: "Reset demo data" }));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  const teams = await teamService.getAll();
  expect(teams.map((t) => t.name)).toEqual(["Sub-11", "Sub-19"]);
});

test("confirming the popup leaves the auth session untouched", async () => {
  const user = userEvent.setup();

  await render(<Settings />);
  await goToAdvanced(user);
  await user.click(screen.getByRole("button", { name: "Reset demo data" }));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(getRefreshToken()).toBe("refresh-token");
  await user.click(screen.getByRole("tab", { name: "Profile" }));
  expect(screen.getByLabelText("Name")).toBeInTheDocument();
});

test("canceling the popup changes nothing", async () => {
  const user = userEvent.setup();
  await teamService.create({
    name: "Extra",
    club: "Extra",
    season: "24/25",
    players: [],
  });

  await render(<Settings />);
  await goToAdvanced(user);
  await user.click(screen.getByRole("button", { name: "Reset demo data" }));
  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByText(CONFIRM_MESSAGE)).not.toBeInTheDocument();
  const teams = await teamService.getAll();
  expect(teams.map((t) => t.name)).toEqual(["Sub-11", "Sub-19", "Extra"]);
});

test("after a reset the page stays on the Advanced tab", async () => {
  const user = userEvent.setup();

  await render(<Settings />);
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

  await render(<Settings />);
  await goToAdvanced(user);
  await user.click(screen.getByRole("button", { name: "Reset demo data" }));
  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.getByRole("tab", { name: "Advanced" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
});

test("?tab=advanced in the URL opens the Advanced panel", async () => {
  await render(<Settings />, { initialEntries: ["/settings?tab=advanced"] });

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
  await render(<Settings />);

  await goToAdvanced(user);

  expect(screen.getByTestId("location")).toHaveTextContent(
    "/settings?tab=advanced"
  );
});

test("an unrecognised tab value falls back to Profile without an error (AC TABUI-03.2)", async () => {
  await render(<Settings />, { initialEntries: ["/settings?tab=bogus"] });

  expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  expect(
    screen.queryByRole("button", { name: "Reset demo data" })
  ).not.toBeInTheDocument();
});

test("a missing tab param opens Profile", async () => {
  await render(<Settings />, { initialEntries: ["/settings"] });

  expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
});

test("Settings' own TAB_IDS guard resolves a bogus ?tab= to 'profile' before it ever reaches Tabs (AC TABUI-03.1)", async () => {
  await render(<Settings />, { initialEntries: ["/settings?tab=bogus"] });

  const lastCall = Tabs.mock.calls[Tabs.mock.calls.length - 1][0];
  expect(lastCall.active).toBe("profile");
});

test("Settings' own TAB_IDS guard resolves a missing ?tab= to 'profile' before it ever reaches Tabs", async () => {
  await render(<Settings />, { initialEntries: ["/settings"] });

  const lastCall = Tabs.mock.calls[Tabs.mock.calls.length - 1][0];
  expect(lastCall.active).toBe("profile");
});

test("reopening the page with the same URL restores the same tab", async () => {
  await render(<Settings />, { initialEntries: ["/settings?tab=advanced"] });

  expect(screen.getByRole("tab", { name: "Advanced" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
});

describe("profile name/email form", () => {
  test("renders editable name and email fields pre-filled with the current values", async () => {
    await render(<Settings />);

    expect(screen.getByLabelText("Name")).toHaveValue("Coach Bruno");
    expect(screen.getByLabelText("Email")).toHaveValue("user@email.com");
  });

  test("saving a changed name persists it and reflects it in the UI without a page reload", async () => {
    const user = userEvent.setup();
    const { unmount } = await render(<Settings />);

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "New Name");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText("Name")).toHaveValue("New Name");

    // Re-mount the same tree (an SPA navigation, not a browser reload) to
    // confirm the new name was actually persisted, not just left in the input.
    unmount();
    await render(<Settings />);
    expect(screen.getByLabelText("Name")).toHaveValue("New Name");
  });

  test("an invalid email is rejected with a message and saves nothing", async () => {
    const user = userEvent.setup();
    await render(<Settings />);

    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a valid email address"
    );
    expect(account.email).toBe("user@email.com");
  });

  test("an empty name is rejected with a message and saves nothing", async () => {
    const user = userEvent.setup();
    await render(<Settings />);

    await user.clear(screen.getByLabelText("Name"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Name cannot be empty"
    );
    expect(account.name).toBe("Coach Bruno");
  });

  test("a failed save keeps the typed values in the form", async () => {
    const user = userEvent.setup();
    await render(<Settings />);

    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText("Email")).toHaveValue("not-an-email");
  });

  test("a successful save renders an explicit confirmation", async () => {
    const user = userEvent.setup();
    await render(<Settings />);

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "New Name");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("status")).toHaveTextContent("Profile updated");
  });

  test("the read-only display from feature 23 is replaced, not duplicated", async () => {
    await render(<Settings />);

    expect(
      screen.queryByText("Editing your profile is coming soon.")
    ).not.toBeInTheDocument();
    expect(screen.getAllByDisplayValue("user@email.com")).toHaveLength(1);
  });
});

describe("password form", () => {
  // The fake backend's DEFAULT_ACCOUNT starts with this password.
  const CURRENT_PASSWORD = "password";

  test("current, new and confirm render as password inputs", async () => {
    await render(<Settings />);

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
    await render(<Settings />);

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
    await render(<Settings />);

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
    await render(<Settings />);

    await user.type(
      screen.getByLabelText("Current password"),
      CURRENT_PASSWORD
    );
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "New password cannot be empty"
    );
  });

  test("a successful change confirms, clears the fields, and signs the user out (AC PROF-04.4)", async () => {
    const user = userEvent.setup();
    await render(<Settings />);

    await user.type(
      screen.getByLabelText("Current password"),
      CURRENT_PASSWORD
    );
    await user.type(screen.getByLabelText("New password"), "newpass");
    await user.type(screen.getByLabelText("Confirm new password"), "newpass");
    await user.click(screen.getByRole("button", { name: "Change password" }));

    // The API has already revoked the session server-side (F3 AC4): the
    // local refresh token is cleared and Settings (which requires a
    // signed-in user) unmounts via SettingsGate, mirroring PrivateRoute.
    expect(getRefreshToken()).toBeNull();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  test("a failed change leaves the fields as typed", async () => {
    const user = userEvent.setup();
    await render(<Settings />);

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
    await render(<Settings />);

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
// goes null, without depending on either page's own routing. Uses the plain
// (loading-only) Gate, not SettingsGate, because it renders its own inline
// sign-in UI whenever `user` is null instead of assuming one is always set.
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
          onClick={async () =>
            setResult(await signIn(creds.email, creds.password))
          }
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

test("change the email and password, then the old pair is rejected and the new pair signs in (AC PROF-04.6)", async () => {
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

  await screen.findByLabelText("Email");

  await user.clear(screen.getByLabelText("Email"));
  await user.type(screen.getByLabelText("Email"), "new@club.pt");
  await user.click(screen.getByRole("button", { name: "Save" }));

  await user.type(screen.getByLabelText("Current password"), "password");
  await user.type(screen.getByLabelText("New password"), "newpass");
  await user.type(screen.getByLabelText("Confirm new password"), "newpass");
  await user.click(screen.getByRole("button", { name: "Change password" }));

  // Changing the password revokes the session server-side (F3 AC4) — the
  // harness swaps straight to its own sign-in form, no separate Sign out
  // step needed.
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
  await render(<Settings />);

  await user.clear(screen.getByLabelText("Name"));
  await user.type(screen.getByLabelText("Name"), "New Name");
  await user.click(screen.getByRole("button", { name: "Save" }));

  await goToAdvanced(user);
  await user.click(screen.getByRole("button", { name: "Reset demo data" }));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  await user.click(screen.getByRole("tab", { name: "Profile" }));
  expect(screen.getByLabelText("Name")).toHaveValue("New Name");
});

test("does not declare its own h-screen or min-h-screen — the app shell owns that (AC SHELL-03.1)", async () => {
  const { container } = await render(<Settings />);

  expect(container.querySelector(".h-screen")).not.toBeInTheDocument();
  expect(container.querySelector(".min-h-screen")).not.toBeInTheDocument();
});

test("has no overflow-y-auto container of its own — the shell's <main> is the only scroll region (AC SHELL-03.2)", async () => {
  const { container } = await render(<Settings />);

  expect(container.querySelector(".overflow-y-auto")).not.toBeInTheDocument();
});
